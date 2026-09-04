import { describe, expect, it } from 'vitest'
import championModelData from './champion-v1.json'
import { compareAnalysisToChampion, type ChampionModel } from './championModel'
import type { JumpAnalysis } from '../biomechanics/types'

const champion = championModelData as unknown as ChampionModel

function candidateFromChampion(): JumpAnalysis {
  return {
    ruleVersion: champion.ruleVersion,
    direction: champion.direction,
    primarySide: champion.primarySide,
    quality: champion.quality,
    usableFrameCount: champion.series.length,
    phases: champion.phases,
    series: champion.series,
    score: champion.score,
    metrics: champion.metrics.map((metric) => ({
      id: metric.id,
      label: metric.label,
      value: metric.value,
      unit: metric.unit,
      target: metric.value,
      range: [metric.value - metric.tolerance, metric.value + metric.tolerance] as [number, number],
      tolerance: metric.tolerance,
      status: 'excellent' as const,
      confidence: metric.confidence,
      weight: metric.weight,
      hint: '',
    })),
    note: '',
  }
}

describe('冠军标准比较', () => {
  it('冠军视频本身应得到接近满分的比较结果', () => {
    const result = compareAnalysisToChampion(candidateFromChampion(), champion)
    expect(result.modelId).toBe('champion-v1')
    expect(result.closeness).toBe(100)
    expect(result.priority).toBeUndefined()
  })

  it('能按冠军标准差异选出优先问题', () => {
    const candidate = candidateFromChampion()
    candidate.metrics = candidate.metrics.map((metric) =>
      metric.id === 'takeoff-knee'
        ? { ...metric, value: metric.value! - 30, status: 'needs-improvement' }
        : metric,
    )
    const result = compareAnalysisToChampion(candidate, champion)
    expect(result.closeness).toBeLessThan(100)
    expect(result.priority?.id).toBe('takeoff-knee')
    expect(result.summary).toContain('离地膝角')
  })
})
