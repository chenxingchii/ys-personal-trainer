import {
  adminAuthorized,
  supabaseConfig,
  supabaseRequest,
  type ApiRequest,
  type ApiResponse,
} from './_supabase'

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'GET') return response.status(405).json({ error: '仅支持 GET 请求。' })
  if (!adminAuthorized(request)) return response.status(401).json({ error: '管理员权限不足。' })
  if (!supabaseConfig()) return response.status(503).json({ error: '后台训练数据采集尚未配置。' })
  try {
    const result = await supabaseRequest(
      'training_samples?select=id,created_at,athlete_id_hash,rule_version,champion_model_version,quality,usable_frame_count,analysis,champion_comparison,expert_labels&annotation_status=eq.reviewed&order=created_at.asc',
    )
    if (!result?.ok) return response.status(502).json({ error: '训练集查询失败。' })
    const samples = (await result.json()) as Array<Record<string, unknown>>
    const usable = samples.filter((sample) => {
      const labels = sample.expert_labels
      return (
        sample.quality !== undefined &&
        Number(sample.quality) >= 0.55 &&
        labels &&
        typeof labels === 'object' &&
        (labels as { quality?: string }).quality === 'usable'
      )
    })
    const athleteIds = new Set(usable.map((sample) => String(sample.athlete_id_hash ?? 'unknown')))
    const issueCounts: Record<string, number> = {}
    for (const sample of usable) {
      const labels = sample.expert_labels
      const issues =
        labels && typeof labels === 'object' ? (labels as { issues?: unknown }).issues : undefined
      if (Array.isArray(issues)) {
        for (const issue of issues) issueCounts[String(issue)] = (issueCounts[String(issue)] ?? 0) + 1
      }
    }
    if (request.query?.format === 'manifest') {
      return response.status(200).json({
        datasetVersion: 'dataset-v1',
        sampleCount: usable.length,
        athleteCount: athleteIds.size,
        issueCounts,
        championModelVersions: [...new Set(usable.map((sample) => sample.champion_model_version))],
        createdAt: new Date().toISOString(),
      })
    }
    response.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8')
    response.setHeader('Content-Disposition', 'attachment; filename="training-dataset-v1.jsonl"')
    return response.status(200).send(usable.map((sample) => JSON.stringify(sample)).join('\n'))
  } catch {
    return response.status(502).json({ error: '训练集导出服务暂时不可用。' })
  }
}
