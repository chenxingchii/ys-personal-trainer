import { listSubjects, type Subject } from './subjects'
import { listAllReports } from './reports'
import type { LocalReport } from '../reports/localReports'

/**
 * 实验数据导出。
 *
 * 背景：全部实验数据存在教师这一台手机的 IndexedDB 里，是单点。
 * 手机丢失、清浏览器数据、换设备都会一次性丢失整批数据，所以每节课后必须导出一次。
 * 导出内容是**全库**，不是当前选中的受试者——教师每节课后导一次即可覆盖全班。
 */

export type ExportPayload = {
  version: 1
  exportedAt: string
  subjects: Subject[]
  reports: LocalReport[]
}

export function exportFileName(exportedAt: string): string {
  return `ys-trainer-${exportedAt.slice(0, 10)}.json`
}

export async function buildExportPayload(): Promise<ExportPayload> {
  const [subjects, reports] = await Promise.all([listSubjects(), listAllReports()])
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    subjects,
    reports,
  }
}

/** 触发浏览器下载。缩进两格，便于人工核对。 */
export function downloadExport(payload: ExportPayload): void {
  if (typeof document === 'undefined') return
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = exportFileName(payload.exportedAt)
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
