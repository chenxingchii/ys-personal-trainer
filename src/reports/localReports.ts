import type { JumpAnalysis } from '../biomechanics/types'
import type { CoachReport } from './diagnosis'

const STORAGE_KEY = 'ys-personal-trainer.reports.v1'

export type LocalReport = {
  id: string
  createdAt: string
  videoName: string
  videoSize: number
  analysis: JumpAnalysis
  coachReport: CoachReport
}

function readReports(): LocalReport[] {
  if (typeof window === 'undefined') return []
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    if (!value) return []
    const parsed: unknown = JSON.parse(value)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is LocalReport =>
      Boolean(item && typeof item === 'object' && 'id' in item && 'analysis' in item),
    )
  } catch {
    return []
  }
}

function writeReports(reports: LocalReport[]) {
  if (typeof window === 'undefined') return false
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reports.slice(0, 20)))
    return true
  } catch {
    return false
  }
}

export function saveLocalReport(input: Omit<LocalReport, 'id' | 'createdAt'>) {
  const report: LocalReport = {
    ...input,
    id: `report-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  }
  const saved = writeReports([report, ...readReports()])
  return saved ? report : undefined
}

export function listLocalReports() {
  return readReports()
}

export function clearLocalReports() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage may be disabled by the browser; the current analysis can still be viewed.
  }
}
