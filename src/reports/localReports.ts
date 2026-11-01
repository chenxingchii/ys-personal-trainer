import type { JumpAnalysis } from '../biomechanics/types'
import type { CoachReport } from './diagnosis'
import type { ChampionComparison } from './championModel'
import type { Assessment } from './assessment'

/**
 * 一条诊断报告的数据形状。
 *
 * 持久化已迁到 `YS专属训练师/src/storage/reports.ts`（IndexedDB），本文件只保留类型定义。
 * 迁走的原因：实测单条报告约 10.1 KB，120 人 × 6 次诊断约 7.10 MB，
 * 超过 localStorage 约 5 MB 上限；且原实现有 `reports.slice(0, 20)` 的硬截断，
 * 一节课 20 人各测一次就会开始挤掉前测记录。
 */
export type LocalReport = {
  id: string
  /** 归属受试者编号。教师一机管多人时，全部查询都以此为分区键。 */
  subjectId: string
  createdAt: string
  videoName: string
  videoSize: number
  analysis: JumpAnalysis
  coachReport: CoachReport
  championComparison?: ChampionComparison
  /** verified = 全部门通过，具备实验数据采集资格；degraded = 存在可降级缺陷，仅作个人参考 */
  qualityTier?: 'verified' | 'degraded'
  /** 完整动作评价；早期报告没有这个字段。 */
  assessment?: Assessment
}
