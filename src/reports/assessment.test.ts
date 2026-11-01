import { describe, expect, it } from 'vitest'
import { buildAssessment, METRIC_PHASE } from './assessment'
import { JUMP_RULES } from '../rules/jumpRules'
import type { JumpAnalysis, MetricId, MetricResult, MetricStatus } from '../biomechanics/types'

const ALL_METRIC_IDS: MetricId[] = [
  'pre-squat-knee',
  'pre-push-shin',
  'pre-push-hip',
  'takeoff-knee',
  'backward-arm',
  'forward-arm',
  'arm-swing-range',
  'landing-contact-knee',
  'landing-lowest-knee',
  'landing-buffer',
  'knee-asymmetry',
]

function makeMetric(
  id: MetricId,
  value: number | undefined,
  status: MetricStatus = 'needs-improvement',
): MetricResult {
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

function makeAnalysis(metrics: MetricResult[], score?: number): JumpAnalysis {
  return {
    ruleVersion: 'mvp-v0.1',
    direction: 'right',
    primarySide: 'left',
    quality: 0.9,
    usableFrameCount: 30,
    phases: {},
    series: [],
    metrics,
    score,
    note: '',
  }
}

function allMetrics(): MetricResult[] {
  return ALL_METRIC_IDS.map((id) => makeMetric(id, JUMP_RULES.find((r) => r.id === id)!.target, 'pass'))
}

describe('动作评价', () => {
  it('11 项指标全部出现在评价结果中', () => {
    const assessment = buildAssessment(makeAnalysis(allMetrics(), 88))
    const ids = assessment.phases.flatMap((phase) => phase.items.map((item) => item.metric.id))

    expect(ids).toHaveLength(11)
    expect(new Set(ids)).toEqual(new Set(ALL_METRIC_IDS))
  })

  it('沿用分析阶段算出的总分，并给出等级', () => {
    const assessment = buildAssessment(makeAnalysis(allMetrics(), 88))

    expect(assessment.totalScore).toBe(88)
    expect(assessment.level).toBe('A')
    expect(assessment.levelLabel).toContain('88')
  })

  it('把 11 项按动作阶段归组，且每项只属于一个阶段', () => {
    const assessment = buildAssessment(makeAnalysis(allMetrics(), 88))

    expect(assessment.phases.map((phase) => phase.phase)).toEqual([
      'preparation',
      'pushoff',
      'flight',
      'landing',
    ])
    const grouped = assessment.phases.flatMap((phase) =>
      phase.items.map((item) => [item.metric.id, phase.phase] as const),
    )
    for (const [id, phase] of grouped) {
      expect(phase).toBe(METRIC_PHASE[id])
    }
  })

  it('待改进项全部进入 priorities，按严重度降序而不是只取一项', () => {
    const assessment = buildAssessment(
      makeAnalysis([
        makeMetric('pre-squat-knee', 60), // 离目标 105 差 45，容差 15 → 严重
        makeMetric('backward-arm', -25), // 离目标 -30 差 5，容差 10 → 较轻
        makeMetric('takeoff-knee', 168, 'pass'),
      ]),
    )

    expect(assessment.priorities.length).toBe(2)
    expect(assessment.priorities[0].metric.id).toBe('pre-squat-knee')
    expect(assessment.priorities[1].metric.id).toBe('backward-arm')
  })

  it('表现达标的指标进入 strengths', () => {
    const assessment = buildAssessment(
      makeAnalysis([makeMetric('takeoff-knee', 168, 'pass'), makeMetric('pre-squat-knee', 60)]),
    )

    expect(assessment.strengths.map((item) => item.metric.id)).toContain('takeoff-knee')
  })

  it('不可用指标不会让总分崩掉，但会出现在明细中并标记为不可评', () => {
    const assessment = buildAssessment(
      makeAnalysis([makeMetric('takeoff-knee', undefined, 'unavailable')], 70),
    )
    const item = assessment.phases
      .flatMap((phase) => phase.items)
      .find((entry) => entry.metric.id === 'takeoff-knee')

    expect(item?.gap).toBeNull()
    expect(item?.grade).toBe('unavailable')
    expect(assessment.totalScore).toBe(70)
  })

  it('没有总分时等级标记为不可评', () => {
    const assessment = buildAssessment(makeAnalysis(allMetrics()))

    expect(assessment.totalScore).toBeUndefined()
    expect(assessment.level).toBe('unavailable')
  })

  it('后摆不足且摆臂幅度不足时给出可推导的因果链', () => {
    const assessment = buildAssessment(
      makeAnalysis([
        makeMetric('backward-arm', -10), // 目标 -30，偏小
        makeMetric('arm-swing-range', 90), // 目标 130，偏小
      ]),
    )

    expect(assessment.causality.some((line) => line.includes('后摆') && line.includes('摆臂总幅度'))).toBe(
      true,
    )
  })

  it('不输出没有代码依据的生物力学推断', () => {
    const assessment = buildAssessment(
      makeAnalysis([makeMetric('pre-squat-knee', 60), makeMetric('takeoff-knee', 140)]),
    )

    expect(assessment.causality).toEqual([])
  })
})
