import { describe, expect, it, vi } from 'vitest'
import { drawPose } from './drawPose'
import type { PoseFrame, PoseLandmark } from './types'

function createContext() {
  return {
    canvas: { width: 1000, height: 500 },
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    lineCap: 'butt',
    lineJoin: 'miter',
    lineWidth: 1,
    strokeStyle: '',
    fillStyle: '',
  } as unknown as CanvasRenderingContext2D
}

function createFrame(landmarks: PoseLandmark[]): PoseFrame {
  return {
    frameIndex: 0,
    mediaTimeMs: 0,
    inferenceTimeMs: 12,
    imageWidth: 1000,
    imageHeight: 500,
    landmarks,
    worldLandmarks: [],
    modelVariant: 'full',
    delegate: 'GPU',
  }
}

describe('drawPose', () => {
  it('按画面尺寸绘制可见关键点和骨架线', () => {
    const context = createContext()
    const landmarks: PoseLandmark[] = [
      { x: 0.25, y: 0.4, z: 0, visibility: 0.9 },
      { x: 0.5, y: 0.6, z: 0, visibility: 0.8 },
    ]

    drawPose(context, createFrame(landmarks))

    expect(context.clearRect).toHaveBeenCalledWith(0, 0, 1000, 500)
    expect(context.moveTo).toHaveBeenCalledWith(250, 200)
    expect(context.lineTo).toHaveBeenCalledWith(500, 300)
    expect(context.stroke).toHaveBeenCalledTimes(2)
    expect(context.arc).toHaveBeenCalledTimes(4)
  })

  it('忽略低可见度关键点', () => {
    const context = createContext()
    const landmarks: PoseLandmark[] = [
      { x: 0.25, y: 0.4, z: 0, visibility: 0.2 },
      { x: 0.5, y: 0.6, z: 0, visibility: 0.9 },
    ]

    drawPose(context, createFrame(landmarks))

    expect(context.moveTo).not.toHaveBeenCalled()
    expect(context.lineTo).not.toHaveBeenCalled()
    expect(context.arc).toHaveBeenCalledTimes(2)
  })
})
