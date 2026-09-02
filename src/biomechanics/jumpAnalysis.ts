import { calculateAngle, calculateSignedArmAngle, pointOf, POSE_LANDMARKS, visibilityOf } from './angles'
import type { PoseFrame } from '../pose/types'
import { JUMP_RULES, JUMP_RULE_VERSION, type JumpRule } from '../rules/jumpRules'
import type { JumpAnalysis, JumpPhaseFrames, JumpSeriesPoint, MetricId, MetricResult } from './types'

type Side = 'left' | 'right'
type FrameObservation = {
  frame: PoseFrame
  hipX?: number
  hipY?: number
  leftKnee?: number
  rightKnee?: number
  leftArm?: number
  rightArm?: number
  leftQuality: number
  rightQuality: number
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}

function median(values: number[]) {
  if (!values.length) return undefined
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

function smooth(values: Array<number | undefined>, windowSize = 3) {
  const radius = Math.floor(windowSize / 2)
  return values.map((value, index) => {
    if (value === undefined) return undefined
    const nearby = values
      .slice(Math.max(0, index - radius), index + radius + 1)
      .filter((item): item is number => item !== undefined)
    if (nearby.length < windowSize) return value
    if (nearby.length >= 3 && (value <= Math.min(...nearby) || value >= Math.max(...nearby))) return value
    return median(nearby)
  })
}

function sideQuality(frame: PoseFrame, side: Side) {
  const indices =
    side === 'left'
      ? [
          POSE_LANDMARKS.leftHip,
          POSE_LANDMARKS.leftKnee,
          POSE_LANDMARKS.leftAnkle,
          POSE_LANDMARKS.leftShoulder,
          POSE_LANDMARKS.leftElbow,
        ]
      : [
          POSE_LANDMARKS.rightHip,
          POSE_LANDMARKS.rightKnee,
          POSE_LANDMARKS.rightAnkle,
          POSE_LANDMARKS.rightShoulder,
          POSE_LANDMARKS.rightElbow,
        ]
  return average(indices.map((index) => visibilityOf(frame.landmarks[index])))
}

function observe(frame: PoseFrame, direction: -1 | 1): FrameObservation {
  const leftHip = pointOf(frame, POSE_LANDMARKS.leftHip)
  const leftKnee = pointOf(frame, POSE_LANDMARKS.leftKnee)
  const leftAnkle = pointOf(frame, POSE_LANDMARKS.leftAnkle)
  const leftShoulder = pointOf(frame, POSE_LANDMARKS.leftShoulder)
  const leftElbow = pointOf(frame, POSE_LANDMARKS.leftElbow)
  const rightHip = pointOf(frame, POSE_LANDMARKS.rightHip)
  const rightKnee = pointOf(frame, POSE_LANDMARKS.rightKnee)
  const rightAnkle = pointOf(frame, POSE_LANDMARKS.rightAnkle)
  const rightShoulder = pointOf(frame, POSE_LANDMARKS.rightShoulder)
  const rightElbow = pointOf(frame, POSE_LANDMARKS.rightElbow)
  return {
    frame,
    hipX: leftHip && rightHip ? (leftHip.x + rightHip.x) / 2 : (leftHip?.x ?? rightHip?.x),
    hipY: leftHip && rightHip ? (leftHip.y + rightHip.y) / 2 : (leftHip?.y ?? rightHip?.y),
    leftKnee: leftHip && leftKnee && leftAnkle ? calculateAngle(leftHip, leftKnee, leftAnkle) : undefined,
    rightKnee:
      rightHip && rightKnee && rightAnkle ? calculateAngle(rightHip, rightKnee, rightAnkle) : undefined,
    leftArm:
      leftShoulder && leftElbow ? calculateSignedArmAngle(leftShoulder, leftElbow, direction) : undefined,
    rightArm:
      rightShoulder && rightElbow ? calculateSignedArmAngle(rightShoulder, rightElbow, direction) : undefined,
    leftQuality: sideQuality(frame, 'left'),
    rightQuality: sideQuality(frame, 'right'),
  }
}

function chooseSide(observations: FrameObservation[]): Side | undefined {
  const left = average(observations.map((item) => item.leftQuality))
  const right = average(observations.map((item) => item.rightQuality))
  if (Math.max(left, right) < 0.35) return undefined
  return left >= right ? 'left' : 'right'
}

function bestIndex(values: Array<number | undefined>, start: number, end: number, mode: 'min' | 'max') {
  let selected: number | undefined
  for (let index = start; index <= end; index += 1) {
    const value = values[index]
    if (value === undefined) continue
    if (selected === undefined || (mode === 'min' ? value < values[selected]! : value > values[selected]!))
      selected = index
  }
  return selected
}

function buildPhases(observations: FrameObservation[], knee: Array<number | undefined>): JumpPhaseFrames {
  const last = observations.length - 1
  const preEnd = Math.max(1, Math.floor(last * 0.45))
  const preSquat = bestIndex(knee, 0, preEnd, 'min')
  const takeoffStart = Math.min(last, (preSquat ?? 0) + 1)
  const takeoffEnd = Math.min(last, Math.max(takeoffStart, Math.floor(last * 0.7)))
  const takeoff = bestIndex(knee, takeoffStart, takeoffEnd, 'max')
  const apexStart = Math.min(last, (takeoff ?? takeoffStart) + 1)
  const apex = bestIndex(
    observations.map((item) => item.hipY),
    apexStart,
    last,
    'min',
  )
  const contactStart = Math.min(last, (apex ?? apexStart) + 1)
  const hipValues = observations.map((item) => item.hipY)
  const apexY = apex === undefined ? undefined : hipValues[apex]
  const hipRange = hipValues.filter((value): value is number => value !== undefined)
  const threshold = hipRange.length
    ? Math.max(0.015, (Math.max(...hipRange) - Math.min(...hipRange)) * 0.12)
    : 0.02
  let landingContact: number | undefined
  if (apexY !== undefined) {
    for (let index = contactStart; index <= last; index += 1) {
      const current = hipValues[index]
      const previous = hipValues[index - 1]
      if (
        current !== undefined &&
        previous !== undefined &&
        current >= apexY + threshold &&
        current >= previous
      ) {
        landingContact = index
        break
      }
    }
  }
  landingContact ??= contactStart <= last ? contactStart : undefined
  const landingLowest =
    landingContact === undefined ? undefined : bestIndex(knee, landingContact, last, 'min')
  return {
    preSquat: preSquat === undefined ? undefined : observations[preSquat].frame.frameIndex,
    takeoff: takeoff === undefined ? undefined : observations[takeoff].frame.frameIndex,
    apex: apex === undefined ? undefined : observations[apex].frame.frameIndex,
    landingContact: landingContact === undefined ? undefined : observations[landingContact].frame.frameIndex,
    landingLowest: landingLowest === undefined ? undefined : observations[landingLowest].frame.frameIndex,
  }
}

function metric(
  rule: JumpRule,
  value: number | undefined,
  confidence: number,
  sourceFrameIndex?: number,
  side?: MetricResult['side'],
): MetricResult {
  if (value === undefined || confidence < 0.35) {
    return {
      id: rule.id,
      label: rule.label,
      unit: '°',
      target: rule.target,
      range: rule.range,
      tolerance: rule.tolerance,
      status: 'unavailable',
      confidence,
      weight: rule.weight,
      sourceFrameIndex,
      side,
      hint: '当前视频关键点质量不足，暂不判断。',
    }
  }
  const distance = Math.abs(value - rule.target)
  const status =
    distance <= rule.tolerance * 0.45
      ? 'excellent'
      : value >= rule.range[0] && value <= rule.range[1]
        ? 'pass'
        : 'needs-improvement'
  return {
    id: rule.id,
    label: rule.label,
    value,
    unit: '°',
    target: rule.target,
    range: rule.range,
    tolerance: rule.tolerance,
    status,
    confidence,
    weight: rule.weight,
    sourceFrameIndex,
    side,
    hint: rule.hint,
  }
}

function scoreMetric(result: MetricResult) {
  if (result.value === undefined || result.status === 'unavailable') return undefined
  return Math.max(0, 100 - (Math.abs(result.value - result.target) / result.tolerance) * 50)
}

function priorityScore(result: MetricResult) {
  const score = scoreMetric(result)
  return score === undefined ? -1 : (100 - score) * result.weight * result.confidence
}

export function analyzeJump(
  frames: PoseFrame[],
  phaseOverrides: Partial<JumpPhaseFrames> = {},
): JumpAnalysis | undefined {
  if (frames.length < 3) return undefined
  const firstHip = pointOf(frames[0], POSE_LANDMARKS.leftHip) ?? pointOf(frames[0], POSE_LANDMARKS.rightHip)
  const lastHip =
    pointOf(frames[frames.length - 1], POSE_LANDMARKS.leftHip) ??
    pointOf(frames[frames.length - 1], POSE_LANDMARKS.rightHip)
  const deltaX = firstHip && lastHip ? lastHip.x - firstHip.x : 0
  const directionSign: -1 | 1 = deltaX < 0 ? -1 : 1
  const direction = Math.abs(deltaX) < 0.02 ? 'unknown' : directionSign === 1 ? 'right' : 'left'
  const observations = frames.map((frame) => observe(frame, directionSign))
  const primarySide = chooseSide(observations)
  if (!primarySide) return undefined
  const knee = smooth(observations.map((item) => (primarySide === 'left' ? item.leftKnee : item.rightKnee)))
  const arm = smooth(observations.map((item) => (primarySide === 'left' ? item.leftArm : item.rightArm)))
  const phases = { ...buildPhases(observations, knee), ...phaseOverrides }
  const frameAt = (frameIndex: number | undefined) =>
    observations.findIndex((item) => item.frame.frameIndex === frameIndex)
  const pre = frameAt(phases.preSquat)
  const takeoff = frameAt(phases.takeoff)
  const apex = frameAt(phases.apex)
  const contact = frameAt(phases.landingContact)
  const lowest = frameAt(phases.landingLowest)
  const backwardIndex = bestIndex(arm, 0, Math.max(0, takeoff), 'min')
  const forwardIndex = bestIndex(arm, Math.max(0, backwardIndex ?? 0), Math.max(0, apex), 'max')
  const backward = backwardIndex === undefined ? undefined : arm[backwardIndex]
  const forward = forwardIndex === undefined ? undefined : arm[forwardIndex]
  const asymmetryValues = [pre, takeoff, contact, lowest]
    .map((index) => {
      if (index < 0) return undefined
      const left = observations[index].leftKnee
      const right = observations[index].rightKnee
      return left !== undefined &&
        right !== undefined &&
        Math.min(observations[index].leftQuality, observations[index].rightQuality) >= 0.45
        ? Math.abs(left - right)
        : undefined
    })
    .filter((value): value is number => value !== undefined)
  const rules = new Map(JUMP_RULES.map((rule) => [rule.id, rule]))
  const make = (
    id: MetricId,
    value: number | undefined,
    index: number | undefined,
    confidence = primarySide === 'left'
      ? observations[index ?? 0].leftQuality
      : observations[index ?? 0].rightQuality,
    side: MetricResult['side'] = primarySide,
  ) =>
    metric(
      rules.get(id)!,
      value,
      confidence,
      index === undefined || index < 0 ? undefined : observations[index].frame.frameIndex,
      side,
    )
  const results = [
    make('pre-squat-knee', pre < 0 ? undefined : knee[pre], pre),
    make('takeoff-knee', takeoff < 0 ? undefined : knee[takeoff], takeoff),
    make('backward-arm', backward, backwardIndex),
    make('forward-arm', forward, forwardIndex),
    make(
      'arm-swing-range',
      backward !== undefined && forward !== undefined ? forward - backward : undefined,
      forwardIndex,
    ),
    make('landing-contact-knee', contact < 0 ? undefined : knee[contact], contact),
    make('landing-lowest-knee', lowest < 0 ? undefined : knee[lowest], lowest),
    make(
      'landing-buffer',
      contact >= 0 && lowest >= 0 && knee[contact] !== undefined && knee[lowest] !== undefined
        ? knee[contact]! - knee[lowest]!
        : undefined,
      lowest,
    ),
    metric(
      rules.get('knee-asymmetry')!,
      median(asymmetryValues),
      asymmetryValues.length ? Math.min(1, asymmetryValues.length / 4) : 0,
      phases.preSquat,
      asymmetryValues.length ? 'both' : undefined,
    ),
  ]
  const weighted = results
    .map((item) => ({ item, score: scoreMetric(item) }))
    .filter((entry): entry is { item: MetricResult; score: number } => entry.score !== undefined)
  const score = weighted.length
    ? Math.round(
        weighted.reduce((sum, entry) => sum + entry.score * entry.item.weight, 0) /
          weighted.reduce((sum, entry) => sum + entry.item.weight, 0),
      )
    : undefined
  const ranked = results
    .filter((item) => item.status === 'needs-improvement')
    .sort((a, b) => priorityScore(b) - priorityScore(a))
  const quality = average(observations.map((item) => Math.max(item.leftQuality, item.rightQuality)))
  const series: JumpSeriesPoint[] = observations.map((item) => ({
    frameIndex: item.frame.frameIndex,
    mediaTimeMs: item.frame.mediaTimeMs,
    leftKnee: item.leftKnee,
    rightKnee: item.rightKnee,
    leftArm: item.leftArm,
    rightArm: item.rightArm,
  }))
  return {
    ruleVersion: JUMP_RULE_VERSION,
    direction,
    primarySide,
    quality,
    usableFrameCount: frames.length,
    phases,
    series,
    metrics: results,
    score,
    priority: ranked[0],
    secondary: ranked[1],
    note: '指标来自侧面视频二维关键点估计，建议结合下一次视频观察趋势。',
  }
}
