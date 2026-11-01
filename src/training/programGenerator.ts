import type { JumpAnalysis } from '../biomechanics/types'

/**
 * 8 周周期化：把「一节课」升级为「一段训练计划」。
 *
 * 存在意义：planGenerator.ts 的 generateTrainingPlan 是**无状态纯函数**，
 * 输出只由 analysis.metrics 决定。若只靠「每 2 周重新生成」，
 * 只要待改进指标没变，产出的课表就逐字相同，所谓「渐进负荷」不会发生。
 *
 * 因此本模块引入**时间驱动**的负荷步进：即使不复测，第 5 周的训练量也不同于第 1 周。
 * 复测到达时，由调用方换用新的 analysis 更新 focusMetrics，阶段进度保持不变。
 *
 * 阶段划分依据：《训练方案科学性依据》§2.4 —— [25] 建议周期 6–8 周、每周递增 5–10%。
 * 本课为低负荷自重动作（定位 A：矫正性练习课），无杠铃负荷可加，
 * 故用「组数 +1」实现渐进，属自重训练的标准做法。
 */

export type ProgramPhase = 'adaptation' | 'progression' | 'consolidation'

export type ProgramWeek = {
  week: number
  phase: ProgramPhase
  phaseLabel: string
  /** 相对基准课表的负荷步进：0 = 基准剂量。 */
  loadStep: number
  /** 本周重点指标中文名。 */
  focusMetrics: string[]
}

export type TrainingProgram = {
  startDate: string
  totalWeeks: number
  currentWeek: number
  currentPhase: ProgramPhase
  weeks: ProgramWeek[]
}

/** 8 个周次对应的阶段与负荷步进。索引 0 = 第 1 周。 */
export const PHASE_OF_WEEK: readonly {
  phase: ProgramPhase
  phaseLabel: string
  loadStep: number
}[] = [
  { phase: 'adaptation', phaseLabel: '适应期', loadStep: 0 },
  { phase: 'adaptation', phaseLabel: '适应期', loadStep: 0 },
  { phase: 'progression', phaseLabel: '强化期', loadStep: 1 },
  { phase: 'progression', phaseLabel: '强化期', loadStep: 1 },
  { phase: 'progression', phaseLabel: '强化期', loadStep: 2 },
  { phase: 'progression', phaseLabel: '强化期', loadStep: 2 },
  { phase: 'consolidation', phaseLabel: '巩固期', loadStep: 1 },
  { phase: 'consolidation', phaseLabel: '巩固期', loadStep: 1 },
]

const TOTAL_WEEKS = PHASE_OF_WEEK.length
const WEEK_MS = 7 * 24 * 60 * 60 * 1000

const PHASE_NOTES: Record<ProgramPhase, string> = {
  adaptation: '先把动作做对：剂量取基准值，重点在动作质量与节奏，不追求疲劳。',
  progression: '动作稳定后逐周加量：组数按阶段递增，仍以每次都能保持动作为前提。',
  consolidation: '把量收回来、把质量提上去：维持动作模式，避免为冲量而牺牲技术。',
}

/** 当前课表应使用的负荷步进与阶段说明。 */
export function phaseOf(program: TrainingProgram) {
  const index = Math.min(Math.max(program.currentWeek, 1), TOTAL_WEEKS) - 1
  const week = PHASE_OF_WEEK[index]
  return { ...week, note: PHASE_NOTES[week.phase] }
}

function toWeekIndex(today: number, start: number) {
  const elapsed = today - start
  if (!Number.isFinite(elapsed) || elapsed < 0) return 0
  return Math.min(Math.floor(elapsed / WEEK_MS), TOTAL_WEEKS - 1)
}

function focusMetricsOf(analysis: JumpAnalysis | undefined) {
  return (analysis?.metrics ?? [])
    .filter((metric) => metric.status === 'needs-improvement')
    .map((metric) => metric.label)
}

export function generateProgram(
  analysis: JumpAnalysis | undefined,
  startDate: string,
  today: string = new Date().toISOString(),
): TrainingProgram {
  const start = new Date(startDate).getTime()
  const now = new Date(today).getTime()
  const index = toWeekIndex(now, start)
  const focusMetrics = focusMetricsOf(analysis)
  const current = PHASE_OF_WEEK[index]

  return {
    startDate,
    totalWeeks: TOTAL_WEEKS,
    currentWeek: index + 1,
    currentPhase: current.phase,
    weeks: PHASE_OF_WEEK.map((week, position) => ({
      week: position + 1,
      phase: week.phase,
      phaseLabel: week.phaseLabel,
      loadStep: week.loadStep,
      focusMetrics,
    })),
  }
}
