import type { JumpAnalysis, MetricId, MetricResult } from '../biomechanics/types'

/**
 * 动作评价层：把 jummpAnalysis 算出的 11 项指标翻译成「可评价的结构」。
 *
 * 与 reports/diagnosis.ts 的分工：本文件只负责分级、分组与可推导的因果链，
 * 不产生任何面向用户的文案。文案仍留在 diagnosis.ts，便于两处独立迭代。
 */

export type MetricGrade = 'A' | 'B' | 'C' | 'D' | 'unavailable'

export type ActionPhase = 'preparation' | 'pushoff' | 'flight' | 'landing'

/**
 * 11 项指标 → 动作阶段。
 * 依据 jumpAnalysis.ts 的 buildPhases 阶段定义与各指标的取样帧：
 * - 准备期：预蹲膝角、后摆臂
 * - 蹬伸期：预蹬地胫骨角、预蹬地髋角、离地膝角、前摆臂
 * - 腾空期：摆臂总幅度（后摆→前摆的跨阶段量）
 * - 落地期：落地接触膝角、落地最低膝角、落地缓冲幅度、左右膝角差
 */
export const METRIC_PHASE: Record<MetricId, ActionPhase> = {
  'pre-squat-knee': 'preparation',
  'backward-arm': 'preparation',
  'pre-push-shin': 'pushoff',
  'pre-push-hip': 'pushoff',
  'takeoff-knee': 'pushoff',
  'forward-arm': 'pushoff',
  'arm-swing-range': 'flight',
  'landing-contact-knee': 'landing',
  'landing-lowest-knee': 'landing',
  'landing-buffer': 'landing',
  'knee-asymmetry': 'landing',
}

export const PHASE_LABELS: Record<ActionPhase, string> = {
  preparation: '准备期',
  pushoff: '蹬伸期',
  flight: '腾空期',
  landing: '落地期',
}

export const PHASE_ORDER: ActionPhase[] = ['preparation', 'pushoff', 'flight', 'landing']

export type AssessmentItem = {
  metric: MetricResult
  grade: MetricGrade
  /** 与目标值的差（度）。不可评时为 null。 */
  gap: number | null
  gapDirection: 'excessive' | 'insufficient' | null
}

export type PhaseAssessment = {
  phase: ActionPhase
  label: string
  /** 该阶段按权重加权后的得分；阶段内无可用指标时为空。 */
  score?: number
  items: AssessmentItem[]
  /** 该阶段待改进项数。 */
  weakCount: number
}

export type Assessment = {
  totalScore?: number
  level: 'A' | 'B' | 'C' | 'D' | 'unavailable'
  levelLabel: string
  headline: string
  phases: PhaseAssessment[]
  strengths: AssessmentItem[]
  /** 全部待改进项，按严重度降序——不是只取第一名。 */
  priorities: AssessmentItem[]
  /** 可从代码恒等式直接推导的因果链；没有则为空数组。 */
  causality: string[]
}

const LEVEL_HEADLINES: Record<Assessment['level'], string> = {
  A: '动作整体完成度高，保持当前节奏即可。',
  B: '动作基本达标，还有可以打磨的环节。',
  C: '有几处动作环节需要重点调整。',
  D: '多处动作环节需要从基础重新建立。',
  unavailable: '本次关键点不足，暂不给出整体评价。',
}

/** 与 biomechanics/jumpAnalysis.ts 的 scoreMetric 同一算法，保证总分与分项口径一致。 */
function metricScore(metric: MetricResult): number | undefined {
  if (metric.value === undefined || metric.status === 'unavailable') return undefined
  return Math.max(0, 100 - (Math.abs(metric.value - metric.target) / metric.tolerance) * 50)
}

/** 偏离程度：以容差为单位。1 表示刚好差出一个容差。 */
function deviation(metric: MetricResult): number | undefined {
  if (metric.value === undefined || metric.status === 'unavailable') return undefined
  return Math.abs(metric.value - metric.target) / Math.max(metric.tolerance, 1)
}

function gradeOf(metric: MetricResult): MetricGrade {
  if (metric.status === 'unavailable' || metric.value === undefined) return 'unavailable'
  if (metric.status === 'excellent') return 'A'
  if (metric.status === 'pass') return 'B'
  const excess = deviation(metric)
  return excess !== undefined && excess >= 1 ? 'D' : 'C'
}

function toItem(metric: MetricResult): AssessmentItem {
  const gap = metric.value === undefined ? null : Math.abs(metric.value - metric.target)
  const gapDirection =
    metric.value === undefined || metric.value === metric.target
      ? null
      : metric.value > metric.target
        ? 'excessive'
        : 'insufficient'
  return { metric, grade: gradeOf(metric), gap, gapDirection }
}

function levelOf(totalScore: number | undefined): Assessment['level'] {
  if (totalScore === undefined) return 'unavailable'
  if (totalScore >= 85) return 'A'
  if (totalScore >= 70) return 'B'
  if (totalScore >= 50) return 'C'
  return 'D'
}

/**
 * 因果链：**只输出能从代码恒等式直接推导的关系**，不做生物力学推断。
 *
 * 当前只有两条，因为只有这两条有代码依据：
 * 1. arm-swing-range 的计算式就是 forward - backward（见 jumpAnalysis.ts 的 make('arm-swing-range', ...)）
 * 2. landing-buffer 的计算式就是 knee[contact] - knee[lowest]（见 make('landing-buffer', ...)）
 *
 * 其余如「预蹲不足导致蹬伸不充分」属于未验证的假说，一律不输出。
 */
function buildCausality(items: AssessmentItem[]): string[] {
  const lines: string[] = []
  const byId = (id: MetricId) => items.find((item) => item.metric.id === id)

  const backward = byId('backward-arm')
  const range = byId('arm-swing-range')
  if (backward?.gapDirection === 'excessive' && range?.gapDirection === 'insufficient') {
    lines.push(
      '后摆臂幅度不足，直接压缩了摆臂总幅度的上限（总幅度 = 前摆 − 后摆），先补后摆往往比单纯练前摆更有效。',
    )
  }

  const contact = byId('landing-contact-knee')
  const buffer = byId('landing-buffer')
  if (contact && buffer && buffer.gapDirection !== null && contact.gapDirection !== null) {
    lines.push(
      '落地缓冲幅度由落地接触膝角与最低膝角共同决定（缓冲幅度 = 接触膝角 − 最低膝角），两者需要一起看。',
    )
  }

  return lines
}

export function buildAssessment(analysis: JumpAnalysis): Assessment {
  const items = analysis.metrics.map(toItem)
  const byPhase = new Map<ActionPhase, AssessmentItem[]>()
  for (const phase of PHASE_ORDER) byPhase.set(phase, [])
  for (const item of items) {
    byPhase.get(METRIC_PHASE[item.metric.id])?.push(item)
  }

  const phases: PhaseAssessment[] = PHASE_ORDER.map((phase) => {
    const phaseItems = byPhase.get(phase) ?? []
    const scored = phaseItems
      .map((item) => ({ item, score: metricScore(item.metric) }))
      .filter((entry): entry is { item: AssessmentItem; score: number } => entry.score !== undefined)
    const weightSum = scored.reduce((sum, entry) => sum + entry.item.metric.weight, 0)
    return {
      phase,
      label: PHASE_LABELS[phase],
      score: weightSum
        ? Math.round(
            scored.reduce((sum, entry) => sum + entry.score * entry.item.metric.weight, 0) / weightSum,
          )
        : undefined,
      items: phaseItems,
      weakCount: phaseItems.filter((item) => item.grade === 'C' || item.grade === 'D').length,
    }
  })

  const priorities = items
    .filter((item) => item.grade === 'C' || item.grade === 'D')
    .sort((a, b) => (deviation(b.metric) ?? -1) - (deviation(a.metric) ?? -1))
  const strengths = items.filter((item) => item.grade === 'A' || item.grade === 'B')
  const totalScore = analysis.score
  const level = levelOf(totalScore)

  return {
    totalScore,
    level,
    levelLabel: totalScore === undefined ? '暂不可评' : `${level} · ${totalScore} 分`,
    headline: LEVEL_HEADLINES[level],
    phases,
    strengths,
    priorities,
    causality: buildCausality(items),
  }
}
