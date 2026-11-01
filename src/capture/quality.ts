import type { VideoMetadata } from './video'
import type { JumpAnalysis } from '../biomechanics/types'

export type VideoQualityResult = {
  /** 全部门通过：只有 passed 的结果才具备实验数据采集资格 */
  passed: boolean
  /** 存在不可降级的阻断项：视频根本不具备分析条件 */
  blocked: boolean
  /** 可降级的缺陷：仍能给出部分结论，但必须在报告中标注 */
  degraded: string[]
  issues: string[]
  advice: string[]
}

export function checkVideoMetadata(
  video: Pick<HTMLVideoElement, 'duration' | 'videoWidth' | 'videoHeight'>,
): VideoQualityResult {
  const issues: string[] = []
  const advice: string[] = []
  const duration = video.duration
  if (Number.isFinite(duration) && duration < 1) {
    issues.push('视频太短，可能没有完整记录一次动作。')
    advice.push('请从站稳准备开始拍摄，并保留落地后的稳定阶段。')
  }
  if (!video.videoWidth || !video.videoHeight || video.videoWidth < 480 || video.videoHeight < 360) {
    issues.push('画面尺寸偏低，关节位置可能无法稳定识别。')
    advice.push('建议使用横屏视频，并尽量选择更清晰的原视频。')
  }
  const blocked = issues.length > 0
  return { passed: !blocked, blocked, degraded: [], issues, advice }
}

export function checkAnalysisQuality(
  analysis: JumpAnalysis,
  metadata?: VideoMetadata | null,
): VideoQualityResult {
  const issues: string[] = []
  const advice: string[] = []
  const degraded: string[] = []
  let blocked = false
  if (metadata) {
    const metadataResult = checkVideoMetadata({
      duration: metadata.duration,
      videoWidth: metadata.width,
      videoHeight: metadata.height,
    })
    issues.push(...metadataResult.issues)
    advice.push(...metadataResult.advice)
    blocked = blocked || metadataResult.blocked
  }
  if (analysis.usableFrameCount < 3) {
    issues.push('可识别的动作画面太少，无法完成阶段判断。')
    advice.push('请确保全身始终在画面内，避免人物被遮挡或离开画面。')
    blocked = true
  }
  if (analysis.quality < 0.55) {
    degraded.push('身体关键点稳定性偏低，本次指标可能存在偏差')
    advice.push('请固定手机、补足光线，并让身体和落地区域完整入镜。')
  }
  const missingPhases = [
    ['preSquat', '预蹲准备'],
    ['takeoff', '蹬地离地'],
    ['landingContact', '落地接触'],
    ['landingLowest', '落地缓冲'],
  ] as const
  const missing = missingPhases.filter(([phase]) => analysis.phases[phase] === undefined)
  if (missing.length) {
    degraded.push(`未稳定识别到${missing.map(([, label]) => label).join('、')}，相关指标本次不参与判断`)
    advice.push('请完整拍摄准备、起跳和落地，不要在动作中途开始或停止录像。')
  }
  return {
    passed: !blocked && degraded.length === 0,
    blocked,
    degraded,
    issues,
    advice,
  }
}
