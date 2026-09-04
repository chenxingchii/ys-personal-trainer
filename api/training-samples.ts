import type { ChampionComparison } from '../src/reports/championModel'
import type { JumpAnalysis } from '../src/biomechanics/types'
import {
  adminAuthorized,
  supabaseConfig,
  supabaseRequest,
  type ApiRequest,
  type ApiResponse,
} from './_supabase'

type TrainingSamplePayload = {
  consent: true
  consentVersion: string
  athleteIdHash: string
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
    typeof payload.athleteIdHash === 'string' &&
    Boolean(payload.analysis) &&
    typeof payload.analysis === 'object' &&
    Array.isArray(payload.analysis.metrics) &&
    Array.isArray(payload.analysis.series)
  )
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method === 'GET') {
    if (!adminAuthorized(request)) return response.status(401).json({ error: '管理员权限不足。' })
    if (!supabaseConfig()) return response.status(503).json({ error: '后台训练数据采集尚未配置。' })
    const status = typeof request.query?.status === 'string' ? request.query.status : 'unreviewed'
    const result = await supabaseRequest(
      `training_samples?select=*&annotation_status=eq.${encodeURIComponent(status)}&order=created_at.desc&limit=100`,
    )
    if (!result?.ok) return response.status(502).json({ error: '样本查询失败。' })
    return response.status(200).json(await result.json())
  }
  if (request.method !== 'POST') return response.status(405).json({ error: '仅支持 GET 或 POST 请求。' })
  if (!isPayload(request.body)) return response.status(400).json({ error: '训练样本数据格式不正确。' })

  if (!supabaseConfig()) {
    return response.status(503).json({ error: '后台训练数据采集尚未配置。' })
  }

  const payload = request.body
  const sample = {
    athlete_id_hash: payload.athleteIdHash,
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
    const result = await supabaseRequest('training_samples', {
      method: 'POST',
      headers: {
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
