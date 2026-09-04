import { describe, expect, it } from 'vitest'
import { buildCoachReport, compareCoachReports } from './diagnosis'
import type { JumpAnalysis } from '../biomechanics/types'
import type { ChampionComparison } from './championModel'

const base: JumpAnalysis = {
  ruleVersion: 'mvp-v0.1',
  direction: 'right',
  primarySide: 'left',
  quality: 0.9,
  usableFrameCount: 10,
  phases: {},
  series: [],
  metrics: [],
  priority: {
    id: 'pre-push-shin',
    label: '预蹬地胫骨角',
    value: 4,
    unit: '°',
    target: 18,
    range: [8, 30],
    tolerance: 12,
    status: 'needs-improvement',
    confidence: 0.9,
    weight: 0.3,
    hint: '原始提示',
  },
  note: '',
}

describe('教练诊断报告', () => {
  it('把胫骨指标转成教练口吻的可执行建议，不暴露角度数值', () => {
    const report = buildCoachReport(base)
    expect(report.headline).toContain('小腿')
    expect(report.coachingCue).toContain('膝盖')
    expect(report.observation).not.toContain('4')
    expect(report.drill).toContain('组')
  })

  it('比较前后两次报告时只输出自然语言变化', () => {
    const previous = buildCoachReport(base)
    const current = buildCoachReport({ ...base, priority: undefined })
    const comparison = compareCoachReports(previous, current)
    expect(comparison.title).toContain('稳定')
    expect(comparison.detail).toContain('预蹬地')
  })

  it('根据冠军差异写入本次实际判断依据', () => {
    const championComparison: ChampionComparison = {
      modelId: 'champion-v1',
      modelName: '冠军动作标准 v1',
      title: '与冠军动作存在明显差异',
      summary: '当前最需要对齐的是“预蹬地胫骨角”。',
      closeness: 42,
      priority: base.priority,
      metrics: [
        {
          id: 'pre-push-shin',
          label: '预蹬地胫骨角',
          candidateValue: 4,
          championValue: 18,
          difference: -14,
          closeness: 40,
          status: 'behind',
          confidence: 0.9,
        },
      ],
    }
    const report = buildCoachReport(base, { championComparison })
    expect(report.evidence).toContain('本次预蹬地胫骨角为 4.0°')
    expect(report.observation).toContain('属于明显差异')
  })
})
