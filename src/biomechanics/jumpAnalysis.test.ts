import { describe, expect, it } from 'vitest'
import { calculateAngle, calculateSignedArmAngle } from './angles'
import { analyzeJump } from './jumpAnalysis'
import type { PoseFrame, PoseLandmark } from '../pose/types'

function landmark(x: number, y: number): PoseLandmark {
  return { x, y, z: 0, visibility: 0.95 }
}

function frame(
  frameIndex: number,
  hipY: number,
  kneeAngle: number,
  armAngle: number,
  hipX = frameIndex * 0.03,
): PoseFrame {
  const radians = (kneeAngle * Math.PI) / 180
  const armRadians = (armAngle * Math.PI) / 180
  const landmarks = Array.from({ length: 33 }, () => landmark(0.5, 0.5))
  for (const [hip, knee, ankle] of [
    [23, 25, 27],
    [24, 26, 28],
  ]) {
    landmarks[hip] = landmark(hipX, hipY)
    landmarks[knee] = landmark(hipX, hipY + 0.15)
    landmarks[ankle] = landmark(hipX + Math.sin(radians) * 0.15, hipY + 0.15 - Math.cos(radians) * 0.15)
  }
  for (const [shoulder, elbow] of [
    [11, 13],
    [12, 14],
  ]) {
    landmarks[shoulder] = landmark(hipX, hipY - 0.25)
    landmarks[elbow] = landmark(hipX + Math.sin(armRadians) * 0.16, hipY - 0.25 + Math.cos(armRadians) * 0.16)
  }
  return {
    frameIndex,
    mediaTimeMs: frameIndex * 120,
    inferenceTimeMs: 8,
    imageWidth: 1000,
    imageHeight: 600,
    landmarks,
    worldLandmarks: [],
    modelVariant: 'full',
    delegate: 'CPU',
  }
}

describe('动作角度与规则分析', () => {
  it('计算膝关节夹角和带方向摆臂角', () => {
    expect(calculateAngle({ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 })).toBeCloseTo(90)
    expect(calculateSignedArmAngle({ x: 0, y: 0 }, { x: 1, y: 0 }, 1)).toBeCloseTo(90)
    expect(calculateSignedArmAngle({ x: 0, y: 0 }, { x: -1, y: 0 }, 1)).toBeCloseTo(-90)
  })

  it('从姿态帧提取阶段指标并生成完成度与优先问题', () => {
    const frames = [
      frame(0, 0.55, 145, -15),
      frame(1, 0.65, 105, -30),
      frame(2, 0.5, 168, 95),
      frame(3, 0.35, 175, 85),
      frame(4, 0.3, 160, 80),
      frame(5, 0.44, 155, 75),
      frame(6, 0.58, 112, 60),
    ]
    const analysis = analyzeJump(frames)
    expect(analysis).toBeDefined()
    expect(analysis?.primarySide).toBe('left')
    expect(analysis?.metrics.find((item) => item.id === 'pre-squat-knee')?.value).toBeCloseTo(105, 0)
    expect(analysis?.metrics.find((item) => item.id === 'landing-buffer')?.value).toBeCloseTo(43, 0)
    expect(analysis?.score).toBeDefined()
  })
})
