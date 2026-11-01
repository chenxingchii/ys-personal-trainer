import { getDB } from './db'
import type { LocalReport } from '../reports/localReports'

/**
 * 报告的持久化入口。
 *
 * 存前剔除 `analysis.series`（逐帧角度数据）：
 * 实测 series 占单条报告的 68%（6.9 KB / 10.1 KB），
 * 而历史报告路径（HistoryView / LocalHistory / TrainingView）从不读取它——
 * 只有当次分析的绘图需要，那份数据留在内存里即可。
 */

function slim(report: LocalReport): LocalReport {
  return { ...report, analysis: { ...report.analysis, series: [] } }
}

export function createReportId() {
  return `report-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export async function saveReport(
  input: Omit<LocalReport, 'id' | 'createdAt'> & { id?: string; createdAt?: string },
): Promise<LocalReport> {
  const db = await getDB()
  const report: LocalReport = {
    ...input,
    id: input.id ?? createReportId(),
    createdAt: input.createdAt ?? new Date().toISOString(),
  }
  await db.put('reports', slim(report))
  return report
}

export async function listReportsBySubject(subjectId: string): Promise<LocalReport[]> {
  const db = await getDB()
  const reports = await db.getAllFromIndex('reports', 'bySubject', subjectId)
  // 显式按创建时间倒序，不再依赖写入顺序。
  return reports.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function listAllReports(): Promise<LocalReport[]> {
  const db = await getDB()
  const reports = await db.getAll('reports')
  return reports.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function removeReport(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('reports', id)
}
