import { describe, expect, it } from 'vitest'
import { FREQUENCY_NOTE, generateTrainingPlan } from './planGenerator'
import { JUMP_RULES } from '../rules/jumpRules'
import type { JumpAnalysis, MetricId, MetricResult, MetricStatus } from '../biomechanics/types'

function makeMetric(id: MetricId, value: number, status: MetricStatus = 'needs-improvement'): MetricResult {
  const rule = JUMP_RULES.find((item) => item.id === id)!
  return {
    id,
    label: rule.label,
    value,
    unit: '°',
    target: rule.target,
    range: rule.range,
    tolerance: rule.tolerance,
    status,
    confidence: 0.9,
    weight: rule.weight,
    hint: rule.hint,
  }
}

function makeAnalysis(metrics: MetricResult[]): JumpAnalysis {
  return {
    ruleVersion: 'mvp-v0.1',
    direction: 'right',
    primarySide: 'left',
    quality: 0.9,
    usableFrameCount: 30,
    phases: {},
    series: [],
    metrics,
    note: '',
  }
}

function parseMinutes(totalMinutes: string) {
  const match = totalMinutes.match(/(\d+)–(\d+)/)
  if (!match) throw new Error(`无法解析时长：${totalMinutes}`)
  return { low: Number(match[1]), high: Number(match[2]) }
}

function mainItems(plan: ReturnType<typeof generateTrainingPlan>) {
  return plan.sections.find((section) => section.kind === 'main')?.items ?? []
}

describe('训练方案生成', () => {
  it('按待改进指标匹配针对性动作，并给出组数与次数', () => {
    const plan = generateTrainingPlan(makeAnalysis([makeMetric('takeoff-knee', 150)]))

    expect(plan.focusMetrics).toContain('离地膝角')
    expect(mainItems(plan).some((item) => item.exercise.name === '连续纵跳')).toBe(true)
    expect(mainItems(plan).every((item) => item.exercise.sets > 0 && item.exercise.reps > 0)).toBe(true)
  })

  it('输出热身、主体和放松三个部分', () => {
    const plan = generateTrainingPlan(makeAnalysis([makeMetric('takeoff-knee', 150)]))
    expect(plan.sections.map((section) => section.kind)).toEqual(['warmup', 'main', 'cooldown'])
  })

  it('给出训练频率建议与两次之间的间隔', () => {
    const plan = generateTrainingPlan(makeAnalysis([makeMetric('takeoff-knee', 150)]))

    expect(plan.frequency).toBe('每周 2 次')
    expect(FREQUENCY_NOTE).toContain('48–72 小时')
  })

  it('整节课时长落在 30–60 分钟', () => {
    const cases: MetricResult[][] = [
      [makeMetric('takeoff-knee', 150)],
      [makeMetric('backward-arm', -10), makeMetric('forward-arm', 60), makeMetric('arm-swing-range', 70)],
      [makeMetric('knee-asymmetry', 22)],
      [],
    ]

    for (const metrics of cases) {
      const { low, high } = parseMinutes(generateTrainingPlan(makeAnalysis(metrics)).totalMinutes)
      expect(low).toBeGreaterThanOrEqual(30)
      expect(high).toBeLessThanOrEqual(60)
    }
  })

  it('没有待改进指标时给出巩固方案', () => {
    const plan = generateTrainingPlan(makeAnalysis([makeMetric('takeoff-knee', 168, 'pass')]))

    expect(plan.isMaintenance).toBe(true)
    expect(plan.focusMetrics).toEqual([])
    expect(mainItems(plan).length).toBeGreaterThanOrEqual(4)
  })

  it('同一个动作不会被重复安排', () => {
    const plan = generateTrainingPlan(
      makeAnalysis([makeMetric('takeoff-knee', 150), makeMetric('landing-buffer', 20)]),
    )
    const ids = mainItems(plan).map((item) => item.exercise.id)

    expect(new Set(ids).size).toBe(ids.length)
  })

  it('没有诊断结果时也能生成可用的训练课', () => {
    const plan = generateTrainingPlan(undefined)

    expect(plan.isMaintenance).toBe(true)
    expect(mainItems(plan).length).toBeGreaterThanOrEqual(4)
  })
})
