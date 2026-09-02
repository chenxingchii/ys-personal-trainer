import { describe, expect, it } from 'vitest'
import { buildCoachReport } from './diagnosis'
import type { JumpAnalysis } from '../biomechanics/types'

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
})
