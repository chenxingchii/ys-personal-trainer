import { beforeEach, describe, expect, it } from 'vitest'
import { resetDbForTests } from './db'
import { createSubject, deleteSubject, listSubjects } from './subjects'
import { listReportsBySubject, saveReport } from './reports'
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
      // 故意塞满逐帧数据，用来验证持久化时会剔除
      series: Array.from({ length: 42 }, (_, index) => ({
        frameIndex: index,
        mediaTimeMs: index * 120,
        leftKnee: 120 + index,
      })),
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

async function seedSubjects() {
  await createSubject({ id: 'S01', name: '张同学', group: '1班' })
  await createSubject({ id: 'S02', name: '李同学', group: '2班' })
}

beforeEach(async () => {
  await resetDbForTests()
})

describe('受试者名册', () => {
  it('新建后能按编号取回，并记录班级', async () => {
    await createSubject({ id: 'S01', name: '张同学', group: '1班' })
    const subjects = await listSubjects()

    expect(subjects).toHaveLength(1)
    expect(subjects[0].id).toBe('S01')
    expect(subjects[0].group).toBe('1班')
  })
})

describe('多人数据隔离', () => {
  it('两个受试者的报告互不可见', async () => {
    await seedSubjects()
    await saveReport(makeReport('r1', 'S01', '2026-03-01T10:00:00.000Z'))
    await saveReport(makeReport('r2', 'S02', '2026-03-01T11:00:00.000Z'))

    const s01 = await listReportsBySubject('S01')
    const s02 = await listReportsBySubject('S02')

    expect(s01.map((report) => report.id)).toEqual(['r1'])
    expect(s02.map((report) => report.id)).toEqual(['r2'])
  })

  it('同一受试者的报告按创建时间倒序，不依赖写入顺序', async () => {
    await seedSubjects()
    await saveReport(makeReport('early', 'S01', '2026-03-01T09:00:00.000Z'))
    await saveReport(makeReport('late', 'S01', '2026-03-20T09:00:00.000Z'))
    await saveReport(makeReport('middle', 'S01', '2026-03-10T09:00:00.000Z'))

    const reports = await listReportsBySubject('S01')

    expect(reports.map((report) => report.id)).toEqual(['late', 'middle', 'early'])
  })

  it('保留超过 20 条记录，不再截断', async () => {
    await seedSubjects()
    for (let index = 0; index < 25; index += 1) {
      await saveReport(makeReport(`r${index}`, 'S01', `2026-03-${String(index + 1).padStart(2, '0')}T09:00:00.000Z`))
    }

    const reports = await listReportsBySubject('S01')

    expect(reports).toHaveLength(25)
  })

  it('删除受试者时连带删除其全部报告，不误伤其他人', async () => {
    await seedSubjects()
    await saveReport(makeReport('a1', 'S01', '2026-03-01T10:00:00.000Z'))
    await saveReport(makeReport('a2', 'S01', '2026-03-02T10:00:00.000Z'))
    await saveReport(makeReport('b1', 'S02', '2026-03-01T11:00:00.000Z'))

    await deleteSubject('S01')

    expect(await listSubjects()).toHaveLength(1)
    expect(await listReportsBySubject('S01')).toHaveLength(0)
    expect((await listReportsBySubject('S02')).map((report) => report.id)).toEqual(['b1'])
  })
})

describe('持久化体积', () => {
  it('保存时剔除逐帧 series，但保留指标与报告正文', async () => {
    await seedSubjects()
    await saveReport(makeReport('r1', 'S01', '2026-03-01T10:00:00.000Z'))

    const [saved] = await listReportsBySubject('S01')

    expect(saved.analysis.series).toEqual([])
    expect(saved.analysis.score).toBe(78)
    expect(saved.coachReport.priority).toBe('离地蹬伸完成度')
    expect(saved.qualityTier).toBe('verified')
  })
})
