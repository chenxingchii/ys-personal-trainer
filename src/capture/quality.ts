import type { VideoMetadata } from './video'
import type { JumpAnalysis } from '../biomechanics/types'

export type VideoQualityResult = {
  passed: boolean
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
  return { passed: issues.length === 0, issues, advice }
}

export function checkAnalysisQuality(
  analysis: JumpAnalysis,
  metadata?: VideoMetadata | null,
): VideoQualityResult {
  const issues: string[] = []
  const advice: string[] = []
  if (metadata) {
    const metadataResult = checkVideoMetadata({
      duration: metadata.duration,
      videoWidth: metadata.width,
      videoHeight: metadata.height,
    })
    issues.push(...metadataResult.issues)
    advice.push(...metadataResult.advice)
  }
  if (analysis.usableFrameCount < 3) {
    issues.push('可识别的动作画面太少，无法完成阶段判断。')
    advice.push('请确保全身始终在画面内，避免人物被遮挡或离开画面。')
  }
  if (analysis.quality < 0.55) {
    issues.push('身体关键点不够稳定，当前结果不适合下明确结论。')
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
    issues.push(`没有稳定识别到${missing.map(([, label]) => label).join('、')}。`)
    advice.push('请完整拍摄准备、起跳和落地，不要在动作中途开始或停止录像。')
  }
  return { passed: issues.length === 0, issues, advice }
}
