export type MetricStatus = 'excellent' | 'pass' | 'needs-improvement' | 'unavailable'

export type MetricId =
  | 'pre-squat-knee'
  | 'pre-push-shin'
  | 'pre-push-hip'
  | 'takeoff-knee'
  | 'backward-arm'
  | 'forward-arm'
  | 'arm-swing-range'
  | 'landing-contact-knee'
  | 'landing-lowest-knee'
  | 'landing-buffer'
  | 'knee-asymmetry'

export type MetricResult = {
  id: MetricId
  label: string
  value?: number
  unit: '°'
  target: number
  range: [number, number]
  tolerance: number
  status: MetricStatus
  confidence: number
  weight: number
  sourceFrameIndex?: number
  side?: 'left' | 'right' | 'both'
  hint: string
}

export type JumpPhaseFrames = {
  preSquat?: number
  takeoff?: number
  apex?: number
  landingContact?: number
  landingLowest?: number
}

export type JumpSeriesPoint = {
  frameIndex: number
  mediaTimeMs: number
  leftKnee?: number
  rightKnee?: number
  leftArm?: number
  rightArm?: number
  leftShin?: number
  rightShin?: number
  leftHip?: number
  rightHip?: number
}

export type JumpAnalysis = {
  ruleVersion: string
  direction: 'left' | 'right' | 'unknown'
  primarySide: 'left' | 'right' | 'unknown'
  quality: number
  usableFrameCount: number
  phases: JumpPhaseFrames
  series: JumpSeriesPoint[]
  metrics: MetricResult[]
  score?: number
  priority?: MetricResult
  secondary?: MetricResult
  note: string
}
