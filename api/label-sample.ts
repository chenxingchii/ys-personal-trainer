import {
  adminAuthorized,
  supabaseConfig,
  supabaseRequest,
  type ApiRequest,
  type ApiResponse,
} from './_supabase'

type LabelPayload = {
  sampleId: string
  annotationStatus: 'reviewed' | 'excluded'
  expertLabels: {
    quality: 'usable' | 'uncertain' | 'invalid'
    phaseLabels?: Record<string, number>
    issues: string[]
    overallLevel: 'excellent' | 'pass' | 'needs-improvement' | 'unavailable'
    expertNote?: string
  }
}

function isPayload(value: unknown): value is LabelPayload {
  if (!value || typeof value !== 'object') return false
  const payload = value as Partial<LabelPayload>
  return (
    typeof payload.sampleId === 'string' &&
    (payload.annotationStatus === 'reviewed' || payload.annotationStatus === 'excluded') &&
    Boolean(payload.expertLabels) &&
    typeof payload.expertLabels === 'object' &&
    Array.isArray(payload.expertLabels.issues)
  )
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'POST') return response.status(405).json({ error: '仅支持 POST 请求。' })
  if (!adminAuthorized(request)) return response.status(401).json({ error: '管理员权限不足。' })
  if (!isPayload(request.body)) return response.status(400).json({ error: '样本标注格式不正确。' })
  if (!supabaseConfig()) return response.status(503).json({ error: '后台训练数据采集尚未配置。' })

  const payload = request.body
  try {
    const result = await supabaseRequest(`training_samples?id=eq.${encodeURIComponent(payload.sampleId)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        annotation_status: payload.annotationStatus,
        expert_labels: payload.expertLabels,
      }),
    })
    if (!result?.ok) return response.status(502).json({ error: '样本标注保存失败。' })
    return response.status(200).json({ saved: true })
  } catch {
    return response.status(502).json({ error: '后台标注服务暂时不可用。' })
  }
}
