import { beforeEach, describe, expect, it } from 'vitest'
import { resetDbForTests } from './db'
import { createSubject } from './subjects'
import { saveReport } from './reports'
import { buildExportPayload, exportFileName } from './exportData'
import type { LocalReport } from '../reports/localReports'

function makeReport(id: string, subjectId: string, createdAt: string): LocalReport {
  return {
    id,
    subjectId,
    createdAt,
    videoName: `${id}.mp4`,
    videoSize: 1024,
    analysis: {
      ruleVersion: 'mvp-v0.1',
      direction: 'right',
      primarySide: 'left',
      quality: 0.9,
      usableFrameCount: 42,
      phases: {},
      series: [],
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

describe('数据导出', () => {
  it('导出内容包含全部受试者与全部报告，不只是当前选中的那个人', async () => {
    await createSubject({ id: 'S01', name: '张同学', group: '1班' })
    await createSubject({ id: 'S02', name: '李同学', group: '2班' })
    await saveReport(makeReport('r1', 'S01', '2026-03-01T10:00:00.000Z'))
    await saveReport(makeReport('r2', 'S02', '2026-03-01T11:00:00.000Z'))

    const payload = await buildExportPayload()

    expect(payload.subjects.map((subject) => subject.id).sort()).toEqual(['S01', 'S02'])
    expect(payload.reports.map((report) => report.id).sort()).toEqual(['r1', 'r2'])
  })

  it('带上版本号与导出时间，便于日后识别格式', async () => {
    const payload = await buildExportPayload()

    expect(payload.version).toBe(1)
    expect(Number.isNaN(new Date(payload.exportedAt).getTime())).toBe(false)
  })

  it('空库也能正常导出，不抛错', async () => {
    const payload = await buildExportPayload()

    expect(payload.subjects).toEqual([])
    expect(payload.reports).toEqual([])
  })

  it('导出文件名带日期，多次导出不互相覆盖', () => {
    expect(exportFileName('2026-11-01T13:38:58Z')).toBe('ys-trainer-2026-11-01.json')
  })

  it('导出的报告仍可读：指标与报告正文都在', async () => {
    await createSubject({ id: 'S01', group: '1班' })
    await saveReport(makeReport('r1', 'S01', '2026-03-01T10:00:00.000Z'))

    const payload = await buildExportPayload()
    const [report] = payload.reports

    expect(report.analysis.score).toBe(78)
    expect(report.coachReport.priority).toBe('离地蹬伸完成度')
    expect(report.qualityTier).toBe('verified')
    expect(report.subjectId).toBe('S01')
  })
})
