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

/**
 * 补录主结局与测试时点。
 *
 * 立定跳远成绩系统测不出来，但它是干预实验的主结局；
 * 测试时点（T0/T1/T2）也只有在补录时才能可靠绑定，
 * 事后再按 createdAt 推断前测/后测极易错配。
 */
export async function updateReport(
  id: string,
  patch: Partial<Pick<LocalReport, 'longJumpCm' | 'timepoint'>>,
): Promise<void> {
  const db = await getDB()
  const existing = await db.get('reports', id)
  if (!existing) return
  await db.put('reports', slim({ ...existing, ...patch }))
}
