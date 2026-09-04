import type { JumpAnalysis, MetricResult } from '../biomechanics/types'
import type { ChampionComparison } from './championModel'

export type CoachReport = {
  hasPriority: boolean
  headline: string
  priority: string
  observation: string
  impact: string
  coachingCue: string
  drill: string
  confidenceNote: string
  evidence?: string
  trend?: string
}

export type ComparisonReport = {
  title: string
  detail: string
  action: string
}

export type DiagnosisContext = {
  championComparison?: ChampionComparison
  previousAnalysis?: JumpAnalysis
}

const coachLabels: Record<string, string> = {
  'pre-push-shin': '预蹬地小腿控制',
  'pre-squat-knee': '预蹲深度控制',
  'pre-push-hip': '预蹬地髋部配合',
  'arm-swing-range': '摆臂连贯性',
  'takeoff-knee': '离地蹬伸完成度',
  'landing-lowest-knee': '落地缓冲控制',
}

function directionOf(metric: MetricResult, low: string, high: string) {
  if (metric.value === undefined) return '当前阶段的关键点不够稳定，暂时不作强判断。'
  return metric.value < metric.range[0] ? low : high
}

function findPreviousMetric(analysis: JumpAnalysis | undefined, id: MetricResult['id']) {
  return analysis?.metrics.find((item) => item.id === id)
}

function severityFor(metric: MetricResult, championComparison?: ChampionComparison) {
  const comparison = championComparison?.metrics.find((item) => item.id === metric.id)
  if (comparison?.closeness === undefined || comparison.closeness >= 85) return '轻微'
  if (comparison.closeness >= 65) return '中等'
  return '明显'
}

function dynamicEvidence(metric: MetricResult, context: DiagnosisContext) {
  const comparison = context.championComparison?.metrics.find((item) => item.id === metric.id)
  if (!comparison || comparison.candidateValue === undefined) return undefined
  const severity = severityFor(metric, context.championComparison)
  const difference = Math.abs(comparison.difference ?? 0).toFixed(1)
  return `本次${metric.label}为 ${comparison.candidateValue.toFixed(1)}°，冠军标准为 ${comparison.championValue.toFixed(1)}°，相差约 ${difference}°，属于${severity}差异。`
}

function dynamicTrend(metric: MetricResult, context: DiagnosisContext) {
  const previous = findPreviousMetric(context.previousAnalysis, metric.id)
  const comparison = context.championComparison?.metrics.find((item) => item.id === metric.id)
  if (!previous || previous.value === undefined || !comparison || comparison.candidateValue === undefined)
    return undefined
  const currentGap = Math.abs(comparison.candidateValue - comparison.championValue)
  const previousGap = Math.abs(previous.value - comparison.championValue)
  if (currentGap <= previousGap - 2) return '相比上一次更接近冠军标准，当前方向是对的。'
  if (currentGap >= previousGap + 2) return '相比上一次差异有所扩大，建议先降低动作速度，重新找回稳定节奏。'
  return '与上一次相比变化不大，下一次重点观察动作能否稳定复现。'
}

export function buildCoachReport(analysis: JumpAnalysis, context: DiagnosisContext = {}): CoachReport {
  const metric = context.championComparison?.priority ?? analysis.priority
  if (!metric) {
    return {
      hasPriority: false,
      headline: '动作基础保持得不错',
      priority: '保持动作节奏',
      observation: '这次视频里暂时没有发现需要优先处理的明显偏差。',
      impact: '先保持当前节奏，再通过下一次视频确认动作是否稳定复现。',
      coachingCue: '准备、蹬地、摆臂和落地一气呵成，动作不要抢拍。',
      drill: '做 2 组连续纵跳，每组 8 次，重点保持落地安静、身体稳定。',
      confidenceNote: '本报告基于侧面视频估计，仅作为训练参考。',
      evidence: '当前没有发现需要优先处理的明显差异。',
    }
  }

  const reports: Record<string, Omit<CoachReport, 'priority' | 'hasPriority'>> = {
    'pre-push-shin': {
      headline: '先把预蹬地的小腿角度调顺',
      observation: `预蹬地时${directionOf(metric, '小腿前倾不够', '小腿前倾过多')}，蹬地路线还不够顺。`,
      impact: '小腿没有把力量有效传到地面，起跳会显得拖，身体重心也不容易快速向前上方移动。',
      coachingCue: '脚掌稳住，膝盖沿脚尖方向向前送，保持小腿和髋部一起推进。',
      drill: '做 3 组原地快速蹬伸，每组 6 次；每次都要求脚掌完整受力、膝盖不内扣。',
      confidenceNote: '小腿角度来自侧面视频估计，建议先按提示练习，再用下一次视频复测。',
    },
    'pre-squat-knee': {
      headline: '先把预蹲深度控制在合适位置',
      observation: `预蹲时${directionOf(metric, '下沉不够', '下沉过深')}，准备姿势还可以更稳定。`,
      impact: '预蹲深度不合适会影响蹬地的准备时间和发力顺序，容易出现起跳急、力量没有接上的情况。',
      coachingCue: '下蹲到位后停住一瞬间，再从脚底向上连续蹬伸。',
      drill: '做 3 组停顿预蹲，每组 5 次；最低点停半秒，再快速起身。',
      confidenceNote: '预蹲判断来自侧面视频估计，先追求每次深度一致。',
    },
    'pre-push-hip': {
      headline: '预蹬地时把髋部折叠和伸展做完整',
      observation: `预蹬地阶段髋部${directionOf(metric, '折叠不足', '折叠过深')}，躯干和下肢的配合需要更紧凑。`,
      impact: '髋部没有参与好，腿部力量会提前消耗，起跳高度和向前推进都会受到影响。',
      coachingCue: '髋部向后坐但胸口保持控制，随后带着膝盖和脚踝一起伸直。',
      drill: '做 2 组髋主导半蹲跳，每组 6 次；先找髋部发力，再追求速度。',
      confidenceNote: '髋角度来自侧面视频估计，动作感觉应以无痛、稳定为前提。',
    },
    'arm-swing-range': {
      headline: '把摆臂做得更完整、更连贯',
      observation: `这次摆臂${directionOf(metric, '幅度偏小', '幅度偏大')}，前后摆臂的衔接还可以更清楚。`,
      impact: '摆臂节奏不完整会削弱起跳时的协同，身体容易出现上肢抢先或下肢跟不上的情况。',
      coachingCue: '后摆要放松，前摆要果断，手臂和蹬地在同一拍完成。',
      drill: '做 3 组摆臂配合半蹲跳，每组 8 次；先练节奏，再逐步加快。',
      confidenceNote: '摆臂幅度来自侧面视频估计，重点观察动作节奏是否稳定。',
    },
    'takeoff-knee': {
      headline: '离地前把蹬伸做到底',
      observation: `离地前膝关节${directionOf(metric, '伸展不充分', '过早锁直')}，蹬地完成度需要加强。`,
      impact: '下肢没有在离地边界形成连续伸展，地面反作用力不能充分转化为起跳速度。',
      coachingCue: '脚底推地，膝盖和髋部连续打开，离地时不要提前收腿。',
      drill: '做 3 组连续纵跳，每组 6 次；每次离地前都确认膝髋伸展同步。',
      confidenceNote: '离地阶段来自侧面视频估计，建议用慢动作复看节奏。',
    },
    'landing-lowest-knee': {
      headline: '落地后用膝盖把冲击接住',
      observation: `落地后的屈膝缓冲${directionOf(metric, '不够', '偏深')}，身体稳定还可以更好。`,
      impact: '缓冲不足会让落地偏硬，缓冲过深则可能让重心塌下，影响下一次起跳准备。',
      coachingCue: '脚掌落地后膝盖顺势弯曲，胸口保持稳定，随后再站稳。',
      drill: '做 2 组落地定格，每组 5 次；落地后保持 2 秒再起身。',
      confidenceNote: '落地判断来自侧面视频估计，不代表医学或伤病结论。',
    },
  }
  const copy = reports[metric.id] ?? {
    headline: '先把动作节奏做稳定',
    observation: '视频里有一处动作衔接不够稳定。',
    impact: '动作衔接不稳定会影响力量传递和落地控制。',
    coachingCue: metric.hint,
    drill: '做 2 组技术动作练习，每组 6 次，优先保证动作质量。',
    confidenceNote: '本报告基于侧面视频估计，仅作为训练参考。',
  }
  const evidence = dynamicEvidence(metric, context)
  const trend = dynamicTrend(metric, context)
  return {
    ...copy,
    hasPriority: true,
    priority: coachLabels[metric.id] ?? '动作节奏稳定性',
    observation: evidence ? `${copy.observation} ${evidence}` : copy.observation,
    coachingCue: trend ? `${copy.coachingCue} ${trend}` : copy.coachingCue,
    evidence,
    trend,
  }
}

export function compareCoachReports(previous: CoachReport, current: CoachReport): ComparisonReport {
  if (!previous.hasPriority && !current.hasPriority) {
    return {
      title: '两次动作都保持稳定',
      detail: '这次复测没有发现新的优先问题，说明当前动作节奏保持得比较好。',
      action: '继续保持预蹬地、摆臂和落地的连贯性，再用后续视频观察稳定程度。',
    }
  }
  if (previous.hasPriority && !current.hasPriority) {
    return {
      title: '这次复测整体更稳定了',
      detail: `上次重点是“${previous.priority}”，这次暂时没有发现明确的优先问题。`,
      action: '先保持这次的动作节奏，不要急着增加动作幅度或速度。',
    }
  }
  if (!previous.hasPriority && current.hasPriority) {
    return {
      title: '这次出现了新的关注点',
      detail: `上次没有明确问题，这次建议先关注“${current.priority}”。`,
      action: current.coachingCue,
    }
  }
  if (previous.priority === current.priority) {
    return {
      title: '主要问题仍然相同',
      detail: `两次报告都指向“${current.priority}”，说明这是一项需要持续练习的基础能力。`,
      action: current.coachingCue,
    }
  }
  return {
    title: '动作重点发生了变化',
    detail: `上次重点是“${previous.priority}”，这次变为“${current.priority}”。`,
    action: current.coachingCue,
  }
}
