import { afterEach, describe, expect, it } from 'vitest'
import { clearLocalReports, listLocalReports, saveLocalReport } from './localReports'
import type { JumpAnalysis } from '../biomechanics/types'
import type { CoachReport } from './diagnosis'

const analysis = {
  ruleVersion: 'mvp-v0.1',
  direction: 'unknown',
  primarySide: 'left',
  quality: 0.8,
  usableFrameCount: 3,
  phases: {},
  series: [],
  metrics: [],
  note: '',
} satisfies JumpAnalysis
const coachReport = {
  hasPriority: false,
  headline: '测试',
  priority: '保持动作节奏',
  observation: '',
  impact: '',
  coachingCue: '',
  drill: '',
  confidenceNote: '',
} satisfies CoachReport

describe('本机历史报告', () => {
  afterEach(() => clearLocalReports())

  it('保存并读取当前设备上的报告', () => {
    const report = saveLocalReport({ videoName: 'jump.mp4', videoSize: 120, analysis, coachReport })
    expect(report?.id).toMatch(/^report-/)
    expect(listLocalReports()).toHaveLength(1)
    expect(listLocalReports()[0].videoName).toBe('jump.mp4')
  })
})
