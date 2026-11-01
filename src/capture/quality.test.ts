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
    expect(result.blocked).toBe(true)
    expect(result.issues).toHaveLength(2)
  })

  it('允许完整视频进入诊断', () => {
    const result = checkAnalysisQuality(analysis, { duration: 3, width: 1280, height: 720 })
    expect(result.passed).toBe(true)
    expect(result.blocked).toBe(false)
    expect(result.degraded).toHaveLength(0)
  })

  it('关键阶段缺失时降级而非阻断', () => {
    const result = checkAnalysisQuality({ ...analysis, phases: { preSquat: 1 } })
    expect(result.passed).toBe(false)
    expect(result.blocked).toBe(false)
    expect(result.degraded[0]).toContain('蹬地离地')
    expect(result.degraded[0]).toContain('落地缓冲')
  })

  it('可识别帧不足视为阻断', () => {
    const result = checkAnalysisQuality({ ...analysis, usableFrameCount: 2 })
    expect(result.passed).toBe(false)
    expect(result.blocked).toBe(true)
    expect(result.issues[0]).toContain('可识别的动作画面太少')
  })

  it('关键点稳定性偏低时降级而非阻断', () => {
    const result = checkAnalysisQuality({ ...analysis, quality: 0.4 })
    expect(result.passed).toBe(false)
    expect(result.blocked).toBe(false)
    expect(result.degraded[0]).toContain('稳定性偏低')
    expect(result.issues).toHaveLength(0)
  })
})
