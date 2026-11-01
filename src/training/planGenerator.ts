import type { JumpAnalysis, MetricResult } from '../biomechanics/types'
import {
  COOLDOWN_EXERCISES,
  EXERCISES,
  findExerciseForMetric,
  WARMUP_EXERCISES,
  type Exercise,
} from './exerciseLibrary'

export type PlanItem = {
  exercise: Exercise
  /** 该动作针对的指标中文名；热身、放松与保底动作为空。 */
  metricLabel?: string
  /** 按偏离严重度追加的组数（0—2）；保底动作为空。 */
  severityBoost?: number
}

export type PlanSection = {
  kind: 'warmup' | 'main' | 'cooldown'
  title: string
  intro: string
  items: PlanItem[]
}

export type TrainingPlan = {
  generatedAt: string
  ruleVersion: string
  /** 整节课预计时长，形如「约 32–39 分钟」。 */
  totalMinutes: string
  /** 建议训练频率，形如「每周 2 次」。 */
  frequency: string
  /** 本次重点针对的指标中文名。 */
  focusMetrics: string[]
  /** true 表示本次没有发现待改进指标，方案以巩固节奏为主。 */
  isMaintenance: boolean
  sections: PlanSection[]
}

/** 一节训练课的时长下限与上限（秒）。 */
const MIN_TOTAL_SECONDS = 30 * 60
const MAX_TOTAL_SECONDS = 60 * 60
/** 主体动作数量下限：指标较少时补足，避免整节课过短。 */
const MIN_MAIN_EXERCISES = 4
/** 取偏离最明显的前若干项指标安排训练。 */
const MAX_FOCUS_METRICS = 5
/** 主体动作组数上限，用于满足最小时长。 */
const MAX_MAIN_SETS = 5

/**
 * 训练频率建议：两次课之间间隔 48–72 小时。
 * 依据 Davies 等（2015, Int J Sports Phys Ther）：超等长类训练建议每周 2 次、
 * 两次之间间隔 48–72 小时，且需持续 6–8 周（4 周过短）方能见效。
 * 被试为无训练监督的普通大学生，取每周 2 次的下限以利于依从性。
 */
const FREQUENCY_PER_WEEK = 2
const FREQUENCY_INTERVAL_HOURS = '48–72'

/** 训练频率提示，供方案页底部说明直接渲染。 */
export const FREQUENCY_NOTE = `建议每周练 ${FREQUENCY_PER_WEEK} 次、两次之间间隔 ${FREQUENCY_INTERVAL_HOURS} 小时，并持续 6–8 周，动作才会出现稳定变化。`

/** 单组耗时加组间休息，得到该动作的预计耗时（秒）。 */
function exerciseSeconds(exercise: Exercise) {
  return exercise.sets * exercise.setSeconds + Math.max(0, exercise.sets - 1) * exercise.restSeconds
}

function sectionSeconds(section: PlanSection) {
  return section.items.reduce((sum, item) => sum + exerciseSeconds(item.exercise), 0)
}

function planSeconds(sections: PlanSection[]) {
  return sections.reduce((sum, section) => sum + sectionSeconds(section), 0)
}

/**
 * 偏离得分：偏离建议区间越远、权重越高、关键点越可靠，得分越高。
 * 与 biomechanics/jumpAnalysis.ts 的 priorityScore 同一思路。
 */
function deviationScore(metric: MetricResult) {
  if (metric.value === undefined) return -1
  const distance = Math.abs(metric.value - metric.target) / Math.max(metric.tolerance, 1)
  return distance * metric.weight * metric.confidence
}

/**
 * 偏离程度 → 追加组数。同一项缺陷，偏离越明显，单次课剂量越大。
 * 这是「个性化」在剂量上的落地：同指标不同严重度的人拿到不同处方。
 * ⚠️ 分档阈值 0.5 / 1.0 为教学经验值，与 exerciseLibrary.ts 的 TODO(教练复核) 同属待复核项。
 */
function severityBoostOf(metric: MetricResult) {
  if (metric.value === undefined) return 0
  const excess = Math.abs(metric.value - metric.target) / Math.max(metric.tolerance, 1)
  if (excess >= 1) return 2
  if (excess >= 0.5) return 1
  return 0
}

function withSets(exercise: Exercise, sets: number): Exercise {
  return { ...exercise, sets }
}

function buildMainItems(analysis: JumpAnalysis | undefined): { items: PlanItem[]; focusMetrics: string[] } {
  const ranked = (analysis?.metrics ?? [])
    .filter((metric) => metric.status === 'needs-improvement')
    .sort((a, b) => deviationScore(b) - deviationScore(a))
    .slice(0, MAX_FOCUS_METRICS)

  const items: PlanItem[] = []
  const usedExerciseIds = new Set<string>()
  for (const metric of ranked) {
    const exercise = findExerciseForMetric(metric.id)
    if (!exercise || usedExerciseIds.has(exercise.id)) continue
    usedExerciseIds.add(exercise.id)
    items.push({ exercise, metricLabel: metric.label, severityBoost: severityBoostOf(metric) })
  }

  // 指标不足时按动作库顺序补位，保证训练课的主体容量；
  // 补位动作不带 metricLabel，界面上不会显示为「针对某项指标」。
  for (const exercise of EXERCISES) {
    if (items.length >= MIN_MAIN_EXERCISES) break
    if (usedExerciseIds.has(exercise.id)) continue
    usedExerciseIds.add(exercise.id)
    items.push({ exercise })
  }

  return { items, focusMetrics: items.flatMap((item) => (item.metricLabel ? [item.metricLabel] : [])) }
}

export type PlanOptions = {
  /** 周期化负荷步进：0 = 基准剂量。见 training/programGenerator.ts 的 PHASE_OF_WEEK。 */
  loadStep?: number
}

/**
 * 根据诊断结果生成一节 30–60 分钟的训练课。
 *
 * 待改进指标按偏离程度排序后匹配针对性动作；没有待改进指标时返回巩固方案。
 * 本课定位为「基于动作模式的矫正性练习课」（见 exerciseLibrary.ts 顶部说明）。
 *
 * `loadStep` 由 8 周周期化提供：同一份诊断在不同周次会得到不同组数，
 * 这是「渐进负荷」在代码里真正生效的地方（见 programGenerator.ts 顶部说明）。
 */
export function generateTrainingPlan(
  analysis: JumpAnalysis | undefined,
  options: PlanOptions = {},
): TrainingPlan {
  const loadStep = Math.max(0, Math.round(options.loadStep ?? 0))
  const { items: mainItems, focusMetrics } = buildMainItems(analysis)
  const isMaintenance = focusMetrics.length === 0

  const buildSections = (items: PlanItem[]): PlanSection[] => [
    {
      kind: 'warmup',
      title: '热身',
      intro: '先让身体进入状态，避免冷身直接做爆发动作。',
      items: WARMUP_EXERCISES.map((exercise) => ({ exercise })),
    },
    {
      kind: 'main',
      title: '主体训练',
      intro: isMaintenance
        ? '这次没有发现明显偏差，用下面几个动作保持动作节奏与稳定性。'
        : '按本次诊断的偏离程度排序，从上往下依次完成。',
      items,
    },
    {
      kind: 'cooldown',
      title: '放松整理',
      intro: '训练结束后做静态拉伸，帮助身体恢复。',
      items: COOLDOWN_EXERCISES.map((exercise) => ({ exercise })),
    },
  ]

  const withBoost = (boost: number) =>
    buildSections(
      mainItems.map((item) => ({
        ...item,
        exercise: withSets(
          item.exercise,
          Math.min(MAX_MAIN_SETS, item.exercise.sets + boost + (item.severityBoost ?? 0)),
        ),
      })),
    )

  // 先套用周期化负荷步进，再按需补足到 30 分钟下限。
  let sections = withBoost(loadStep)

  // 指标较少时整节课会偏短，逐轮增加主体组数直到落入 30–60 分钟。
  let setsBoost = 0
  while (planSeconds(sections) < MIN_TOTAL_SECONDS && setsBoost + 3 < MAX_MAIN_SETS) {
    setsBoost += 1
    sections = withBoost(setsBoost + loadStep)
  }

  // 报出估算区间，并把上下限夹在一节训练课的合理范围内。
  const minutes = Math.round(planSeconds(sections) / 60)
  const low = Math.max(Math.round(MIN_TOTAL_SECONDS / 60), minutes - 3)
  const high = Math.min(Math.round(MAX_TOTAL_SECONDS / 60), Math.max(low + 4, minutes + 5))

  return {
    generatedAt: new Date().toISOString(),
    ruleVersion: analysis?.ruleVersion ?? 'mvp-v0.1',
    totalMinutes: `约 ${low}–${high} 分钟`,
    frequency: `每周 ${FREQUENCY_PER_WEEK} 次`,
    focusMetrics,
    isMaintenance,
    sections,
  }
}
