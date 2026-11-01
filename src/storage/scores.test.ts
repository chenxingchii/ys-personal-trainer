import { beforeEach, describe, expect, it } from 'vitest'
import { resetDbForTests } from './db'
import { createSubject, listSubjects } from './subjects'
import { listReportsBySubject, saveReport, updateReport } from './reports'
import { buildExportPayload } from './exportData'
import type { LocalReport } from '../reports/localReports'

function makeReport(id: string, subjectId: string): LocalReport {
  return {
    id,
    subjectId,
    createdAt: '2026-03-02T10:00:00.000Z',
    videoName: `${id}.mp4`,
    videoSize: 1024,
    analysis: {
      ruleVersion: 'mvp-v0.1',
      direction: 'right',
      primarySide: 'left',
      quality: 0.9,
      usableFrameCount: 42,
      phases: {},
      series: [{ frameIndex: 0, mediaTimeMs: 0, leftKnee: 120 }],
      metrics: [],
      score: 78,
      note: '',
    },
    coachReport: {
      hasPriority: true,
      headline: '离地前把蹬伸做到底',
      priority: '离地蹬伸完成度',
      observation: '离地前膝关节伸展不充分。',
      impact: '地面反作用力不能充分转化。',
      coachingCue: '脚底推地，膝盖和髋部连续打开。',
      drill: '做 3 组连续纵跳。',
      confidenceNote: '来自侧面视频估计。',
    },
    qualityTier: 'verified',
  }
}

beforeEach(async () => {
  await resetDbForTests()
})

describe('成绩补录', () => {
  it('可以给已保存的报告补录成绩与测试时点', async () => {
    await createSubject({ id: 'S01', group: '1班' })
    await saveReport(makeReport('r1', 'S01'))

    await updateReport('r1', { longJumpCm: 198.5, timepoint: 'T0' })

    const [report] = await listReportsBySubject('S01')
    expect(report.longJumpCm).toBe(198.5)
    expect(report.timepoint).toBe('T0')
  })

  it('补录不会破坏报告其余内容，也不会把 series 写回存储', async () => {
    await createSubject({ id: 'S01', group: '1班' })
    await saveReport(makeReport('r1', 'S01'))

    await updateReport('r1', { longJumpCm: 198.5, timepoint: 'T0' })

    const [report] = await listReportsBySubject('S01')
    expect(report.analysis.score).toBe(78)
    expect(report.coachReport.priority).toBe('离地蹬伸完成度')
    expect(report.analysis.series).toEqual([])
  })

  it('成绩会随导出一起带出，供 CSV 统计使用', async () => {
    await createSubject({ id: 'S01', group: '1班' })
    await saveReport(makeReport('r1', 'S01'))
    await updateReport('r1', { longJumpCm: 204, timepoint: 'T1' })

    const payload = await buildExportPayload()

    expect(payload.reports[0].longJumpCm).toBe(204)
    expect(payload.reports[0].timepoint).toBe('T1')
  })

  it('受试者可记录实验分组，与班级分开', async () => {
    await createSubject({ id: 'S01', group: '1班', experimentGroup: 'G1' })

    const [subject] = await listSubjects()
    expect(subject.group).toBe('1班')
    expect(subject.experimentGroup).toBe('G1')
  })

  it('更新不存在的报告不会抛错', async () => {
    await expect(updateReport('missing', { longJumpCm: 180 })).resolves.toBeUndefined()
  })
})
