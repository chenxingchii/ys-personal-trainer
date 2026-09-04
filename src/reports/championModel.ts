import type { JumpAnalysis, MetricId, MetricResult } from '../biomechanics/types'

export type ChampionMetric = {
  id: MetricId
  label: string
  value: number
  unit: '°'
  confidence: number
  tolerance: number
  weight: number
}

export type ChampionModel = {
  version: 1
  id: string
  name: string
  createdAt: string
  sourceFile: string
  sourceCodec: string
  preprocessedCodec: string
  ruleVersion: string
  quality: number
  score?: number
  primarySide: 'left' | 'right' | 'unknown'
  direction: 'left' | 'right' | 'unknown'
  phases: JumpAnalysis['phases']
  metrics: ChampionMetric[]
  series: JumpAnalysis['series']
}

export type ChampionMetricComparison = {
  id: MetricId
  label: string
  candidateValue?: number
  championValue: number
  difference?: number
  closeness?: number
  status: 'close' | 'behind' | 'unavailable'
  confidence: number
}

export type ChampionComparison = {
  modelId: string
  modelName: string
  title: string
  summary: string
  closeness: number
  priority?: MetricResult
  metrics: ChampionMetricComparison[]
}

export function compareAnalysisToChampion(
  analysis: JumpAnalysis,
  champion: ChampionModel,
): ChampionComparison {
  const championById = new Map(champion.metrics.map((metric) => [metric.id, metric]))
  const comparisons = analysis.metrics
    .map((candidate) => {
      const reference = championById.get(candidate.id)
      if (!reference) return undefined
      if (candidate.value === undefined || candidate.status === 'unavailable') {
        return {
          id: candidate.id,
          label: candidate.label,
          championValue: reference.value,
          status: 'unavailable' as const,
          confidence: candidate.confidence,
        }
      }
      const distance = Math.abs(candidate.value - reference.value) / Math.max(reference.tolerance, 1)
      return {
        id: candidate.id,
        label: candidate.label,
        candidateValue: candidate.value,
        championValue: reference.value,
        difference: candidate.value - reference.value,
        closeness: Math.max(0, 100 - distance * 50),
        status: distance <= 0.5 ? ('close' as const) : ('behind' as const),
        confidence: Math.min(candidate.confidence, reference.confidence),
      }
    })
    .filter(Boolean) as ChampionMetricComparison[]

  const comparable = comparisons.filter(
    (item): item is ChampionMetricComparison & { closeness: number } => item.closeness !== undefined,
  )
  const closeness = comparable.length
    ? Math.round(
        comparable.reduce((sum, item) => sum + item.closeness * item.confidence, 0) /
          comparable.reduce((sum, item) => sum + item.confidence, 0),
      )
    : 0
  const priorityComparison = comparable
    .filter((item) => item.status === 'behind')
    .sort((a, b) => (a.closeness ?? 0) - (b.closeness ?? 0))[0]
  const priority = priorityComparison
    ? analysis.metrics.find((metric) => metric.id === priorityComparison.id)
    : undefined
  const title =
    closeness >= 85
      ? '整体接近冠军动作'
      : closeness >= 65
        ? '动作基础接近，仍有重点差异'
        : '与冠军动作存在明显差异'
  const summary = priorityComparison
    ? `当前最需要对齐的是“${priorityComparison.label}”，与冠军标准相差 ${Math.abs(priorityComparison.difference ?? 0).toFixed(1)}°。`
    : '当前可比较指标都接近冠军标准，继续保持动作节奏并观察稳定性。'
  return {
    modelId: champion.id,
    modelName: champion.name,
    title,
    summary,
    closeness,
    priority,
    metrics: comparisons,
  }
}
