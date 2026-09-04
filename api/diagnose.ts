import championModelData from './championModelData.js'
import { compareAnalysisToChampion, type ChampionModel } from '../src/reports/championModel.js'
import type { JumpAnalysis } from '../src/biomechanics/types'

type Request = {
  method?: string
  body?: unknown
}

type Response = {
  status: (code: number) => Response
  json: (body: unknown) => void
}

const championModel = championModelData as unknown as ChampionModel

function isJumpAnalysis(value: unknown): value is JumpAnalysis {
  if (!value || typeof value !== 'object') return false
  const analysis = value as Partial<JumpAnalysis>
  return (
    typeof analysis.ruleVersion === 'string' &&
    Array.isArray(analysis.metrics) &&
    Array.isArray(analysis.series) &&
    typeof analysis.quality === 'number'
  )
}

export default function handler(request: Request, response: Response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: '仅支持 POST 请求。' })
  }
  if (!isJumpAnalysis(request.body)) {
    return response.status(400).json({ error: '动作分析数据格式不正确。' })
  }
  return response.status(200).json(compareAnalysisToChampion(request.body, championModel))
}
