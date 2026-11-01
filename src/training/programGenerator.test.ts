import { describe, expect, it } from 'vitest'
import { generateProgram, PHASE_OF_WEEK } from './programGenerator'
import { generateTrainingPlan, type TrainingPlan } from './planGenerator'
import { JUMP_RULES } from '../rules/jumpRules'
import type { JumpAnalysis, MetricId, MetricResult } from '../biomechanics/types'

function makeMetric(id: MetricId, value: number): MetricResult {
  const rule = JUMP_RULES.find((item) => item.id === id)!
  return {
    id,
    label: rule.label,
    value,
    unit: '°',
    target: rule.target,
    range: rule.range,
    tolerance: rule.tolerance,
    status: 'needs-improvement',
    confidence: 0.9,
    weight: rule.weight,
    hint: rule.hint,
  }
}

function makeAnalysis(): JumpAnalysis {
  return {
    ruleVersion: 'mvp-v0.1',
    direction: 'right',
    primarySide: 'left',
    quality: 0.9,
    usableFrameCount: 30,
    phases: {},
    series: [],
    metrics: [makeMetric('takeoff-knee', 150)],
    note: '',
  }
}

/** 主体动作的组数总和——用来衡量「负荷」。 */
function totalMainSets(plan: TrainingPlan) {
  return (
    plan.sections
      .find((section) => section.kind === 'main')
      ?.items.reduce((sum, item) => sum + item.exercise.sets, 0) ?? 0
  )
}

const START = '2026-03-02'

describe('8 周周期化计划', () => {
  it('把 8 周分成适应、强化、巩固三个阶段', () => {
    const program = generateProgram(makeAnalysis(), START, '2026-03-03')

    expect(program.weeks).toHaveLength(8)
    expect(program.weeks.map((week) => week.phase)).toEqual([
      'adaptation',
      'adaptation',
      'progression',
      'progression',
      'progression',
      'progression',
      'consolidation',
      'consolidation',
    ])
  })

  it('同一份诊断、不同训练周次，训练负荷不同', () => {
    // 复现测试：改造前的 generateTrainingPlan 只依赖 analysis，
    // 因此第 1 周与第 5 周必然产出完全相同的组数。
    const week1 = generateTrainingPlan(makeAnalysis(), { loadStep: PHASE_OF_WEEK[0].loadStep })
    const week5 = generateTrainingPlan(makeAnalysis(), { loadStep: PHASE_OF_WEEK[4].loadStep })

    expect(totalMainSets(week5)).toBeGreaterThan(totalMainSets(week1))
  })

  it('按开始日期推算当前是第几周', () => {
    expect(generateProgram(makeAnalysis(), START, '2026-03-03').currentWeek).toBe(1)
    expect(generateProgram(makeAnalysis(), START, '2026-03-16').currentWeek).toBe(3)
    expect(generateProgram(makeAnalysis(), START, '2026-04-20').currentWeek).toBe(8)
  })

  it('超过 8 周后当前周夹到第 8 周，不会越界', () => {
    const program = generateProgram(makeAnalysis(), START, '2026-06-30')

    expect(program.currentWeek).toBe(8)
    expect(program.currentPhase).toBe('consolidation')
  })

  it('开始日期之前不报错，按第 1 周处理', () => {
    const program = generateProgram(makeAnalysis(), START, '2026-02-01')

    expect(program.currentWeek).toBe(1)
    expect(program.currentPhase).toBe('adaptation')
  })

  it('没有诊断结果时也能生成完整 8 周计划', () => {
    const program = generateProgram(undefined, START, '2026-03-03')

    expect(program.weeks).toHaveLength(8)
    expect(program.currentWeek).toBe(1)
  })

  it('每个周次都带有可执行的负荷步进与阶段标签', () => {
    const program = generateProgram(makeAnalysis(), START, '2026-03-03')

    for (const week of program.weeks) {
      expect(week.phaseLabel.length).toBeGreaterThan(0)
      expect(week.loadStep).toBeGreaterThanOrEqual(0)
    }
    expect(program.weeks[4].loadStep).toBeGreaterThan(program.weeks[0].loadStep)
    expect(program.weeks[7].loadStep).toBeLessThan(program.weeks[5].loadStep)
  })
})
