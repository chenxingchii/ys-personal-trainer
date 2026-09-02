import { describe, expect, it } from 'vitest'
import { checkAnalysisQuality, checkVideoMetadata } from './quality'
import type { JumpAnalysis } from '../biomechanics/types'

const analysis: JumpAnalysis = {
  ruleVersion: 'mvp-v0.1',
  direction: 'right',
  primarySide: 'left',
  quality: 0.8,
  usableFrameCount: 5,
  phases: { preSquat: 1, takeoff: 2, landingContact: 3, landingLowest: 4 },
  series: [],
  metrics: [],
  note: '',
}

describe('视频质量检查', () => {
  it('拦截过短或低分辨率视频', () => {
    const result = checkVideoMetadata({ duration: 0.5, videoWidth: 320, videoHeight: 240 })
    expect(result.passed).toBe(false)
    expect(result.issues).toHaveLength(2)
  })

  it('允许完整视频进入诊断', () => {
    expect(checkAnalysisQuality(analysis, { duration: 3, width: 1280, height: 720 }).passed).toBe(true)
  })

  it('拦截关键阶段缺失的姿态结果', () => {
    const result = checkAnalysisQuality({ ...analysis, phases: { preSquat: 1 } })
    expect(result.passed).toBe(false)
    expect(result.issues[0]).toContain('蹬地离地')
  })
})
