import type { ChampionComparison } from '../src/reports/championModel'
import type { JumpAnalysis } from '../src/biomechanics/types'

type Request = {
  method?: string
  body?: unknown
}

type Response = {
  status: (code: number) => Response
  json: (body: unknown) => void
}

type TrainingSamplePayload = {
  consent: true
  consentVersion: string
  analysis: JumpAnalysis
  championComparison?: ChampionComparison
  metadata?: {
    duration: number
    width: number
    height: number
  }
}

function isPayload(value: unknown): value is TrainingSamplePayload {
  if (!value || typeof value !== 'object') return false
  const payload = value as Partial<TrainingSamplePayload>
  return (
    payload.consent === true &&
    typeof payload.consentVersion === 'string' &&
    Boolean(payload.analysis) &&
    typeof payload.analysis === 'object' &&
    Array.isArray(payload.analysis.metrics) &&
    Array.isArray(payload.analysis.series)
  )
}

export default async function handler(request: Request, response: Response) {
  if (request.method !== 'POST') return response.status(405).json({ error: '仅支持 POST 请求。' })
  if (!isPayload(request.body)) return response.status(400).json({ error: '训练样本数据格式不正确。' })

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    return response.status(503).json({ error: '后台训练数据采集尚未配置。' })
  }

  const payload = request.body
  const sample = {
    consent_version: payload.consentVersion,
    rule_version: payload.analysis.ruleVersion,
    champion_model_version: payload.championComparison?.modelId ?? 'champion-v1',
    quality: payload.analysis.quality,
    usable_frame_count: payload.analysis.usableFrameCount,
    metadata: payload.metadata ?? null,
    analysis: payload.analysis,
    champion_comparison: payload.championComparison ?? null,
  }
  try {
    const result = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/training_samples`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(sample),
    })
    if (!result.ok) return response.status(502).json({ error: '训练样本保存失败。' })
    return response.status(201).json({ saved: true })
  } catch {
    return response.status(502).json({ error: '训练样本服务暂时不可用。' })
  }
}
