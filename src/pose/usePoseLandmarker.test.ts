import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { usePoseLandmarker } from './usePoseLandmarker'
import type { PoseFrame, PoseWorkerRequest, PoseWorkerResponse } from './types'

class FakeWorker {
  static latest: FakeWorker

  readonly messages: Array<{ message: PoseWorkerRequest; transfer?: Transferable[] }> = []
  readonly terminate = vi.fn()
  private readonly messageListeners = new Set<(event: MessageEvent<PoseWorkerResponse>) => void>()
  private readonly errorListeners = new Set<() => void>()

  constructor() {
    FakeWorker.latest = this
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    if (type === 'message') {
      this.messageListeners.add(listener as (event: MessageEvent<PoseWorkerResponse>) => void)
    } else if (type === 'error') {
      this.errorListeners.add(listener as () => void)
    }
  }

  postMessage(message: PoseWorkerRequest, transfer?: Transferable[]) {
    this.messages.push({ message, transfer })
  }

  emit(message: PoseWorkerResponse) {
    this.messageListeners.forEach((listener) => listener(new MessageEvent('message', { data: message })))
  }

  emitError() {
    this.errorListeners.forEach((listener) => listener())
  }
}

const poseFrame: PoseFrame = {
  frameIndex: 0,
  mediaTimeMs: 1500,
  inferenceTimeMs: 18,
  imageWidth: 1920,
  imageHeight: 1080,
  landmarks: [{ x: 0.5, y: 0.25, z: -0.1, visibility: 0.99 }],
  worldLandmarks: [],
  modelVariant: 'full',
  delegate: 'GPU',
}

describe('usePoseLandmarker', () => {
  const imageBitmap = { close: vi.fn() } as unknown as ImageBitmap

  beforeEach(() => {
    vi.stubGlobal('Worker', FakeWorker)
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(imageBitmap))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('初始化 Worker 并返回识别到的姿态帧', async () => {
    const { result } = renderHook(() => usePoseLandmarker())
    const video = {
      readyState: HTMLMediaElement.HAVE_ENOUGH_DATA,
      currentTime: 1.5,
      videoWidth: 1920,
      videoHeight: 1080,
    } as HTMLVideoElement

    let analysis: Promise<PoseFrame | null>
    act(() => {
      analysis = result.current.analyzeFrame(video)
    })

    expect(FakeWorker.latest.messages[0]?.message).toEqual({ type: 'init', modelVariant: 'full' })

    act(() => {
      FakeWorker.latest.emit({
        type: 'ready',
        delegate: 'GPU',
        modelVariant: 'full',
        loadTimeMs: 240,
      })
    })

    await waitFor(() => expect(FakeWorker.latest.messages).toHaveLength(2))
    const analyzeMessage = FakeWorker.latest.messages[1]?.message
    expect(analyzeMessage).toMatchObject({
      type: 'analyze-frame',
      frameIndex: 0,
      mediaTimeMs: 1500,
      imageWidth: 1920,
      imageHeight: 1080,
    })

    act(() => {
      FakeWorker.latest.emit({
        type: 'result',
        requestId: (analyzeMessage as Extract<PoseWorkerRequest, { type: 'analyze-frame' }>).requestId,
        frame: poseFrame,
      })
    })

    await expect(analysis!).resolves.toEqual(poseFrame)
    expect(result.current.state.phase).toBe('success')
    expect(result.current.state.delegate).toBe('GPU')
  })

  it('没有识别到人体时返回空结果', async () => {
    const { result } = renderHook(() => usePoseLandmarker())
    const video = {
      readyState: HTMLMediaElement.HAVE_CURRENT_DATA,
      currentTime: 0,
      videoWidth: 1280,
      videoHeight: 720,
    } as HTMLVideoElement

    let analysis: Promise<PoseFrame | null>
    act(() => {
      analysis = result.current.analyzeFrame(video)
      FakeWorker.latest.emit({ type: 'ready', delegate: 'CPU', modelVariant: 'full', loadTimeMs: 300 })
    })

    await waitFor(() => expect(FakeWorker.latest.messages).toHaveLength(2))
    const analyzeMessage = FakeWorker.latest.messages[1]?.message as Extract<
      PoseWorkerRequest,
      { type: 'analyze-frame' }
    >
    act(() => {
      FakeWorker.latest.emit({
        type: 'no-pose',
        requestId: analyzeMessage.requestId,
        mediaTimeMs: 0,
        inferenceTimeMs: 22,
      })
    })

    await expect(analysis!).resolves.toBeNull()
    expect(result.current.state.phase).toBe('no-pose')
    expect(result.current.state.delegate).toBe('CPU')
  })

  it('重置时终止 Worker 并恢复初始状态', async () => {
    const { result } = renderHook(() => usePoseLandmarker())
    const video = {
      readyState: HTMLMediaElement.HAVE_CURRENT_DATA,
      currentTime: 0,
      videoWidth: 640,
      videoHeight: 360,
    } as HTMLVideoElement

    let analysis: Promise<PoseFrame | null>
    act(() => {
      analysis = result.current.analyzeFrame(video)
    })
    const worker = FakeWorker.latest

    act(() => result.current.reset())

    await expect(analysis!).rejects.toThrow('姿态识别任务已取消')
    expect(worker.messages.at(-1)?.message).toEqual({ type: 'dispose' })
    expect(worker.terminate).toHaveBeenCalledOnce()
    expect(result.current.state.phase).toBe('idle')
  })

  it('按媒体时间顺序分析整段有限时长视频并累计姿态帧', async () => {
    const { result } = renderHook(() => usePoseLandmarker())
    const target = new EventTarget()
    let currentTime = 0
    Object.defineProperties(target, {
      readyState: { value: HTMLMediaElement.HAVE_ENOUGH_DATA },
      duration: { value: 0.24 },
      videoWidth: { value: 640 },
      videoHeight: { value: 360 },
      currentTime: {
        get: () => currentTime,
        set: (value: number) => {
          currentTime = value
          queueMicrotask(() => target.dispatchEvent(new Event('seeked')))
        },
      },
      pause: { value: vi.fn() },
    })
    const video = target as unknown as HTMLVideoElement

    let analysis: Promise<PoseFrame[]>
    act(() => {
      analysis = result.current.analyzeVideo(video, 120)
      FakeWorker.latest.emit({ type: 'ready', delegate: 'CPU', modelVariant: 'full', loadTimeMs: 180 })
    })

    await waitFor(() => expect(FakeWorker.latest.messages).toHaveLength(2))
    const first = FakeWorker.latest.messages[1].message as Extract<
      PoseWorkerRequest,
      { type: 'analyze-frame' }
    >
    expect(first.mediaTimeMs).toBe(0)
    act(() =>
      FakeWorker.latest.emit({
        type: 'result',
        requestId: first.requestId,
        frame: { ...poseFrame, frameIndex: 0, mediaTimeMs: 0 },
      }),
    )

    await waitFor(() => expect(FakeWorker.latest.messages).toHaveLength(3))
    const second = FakeWorker.latest.messages[2].message as Extract<
      PoseWorkerRequest,
      { type: 'analyze-frame' }
    >
    expect(second.mediaTimeMs).toBe(120)
    act(() =>
      FakeWorker.latest.emit({
        type: 'result',
        requestId: second.requestId,
        frame: { ...poseFrame, frameIndex: 1, mediaTimeMs: 120 },
      }),
    )

    await waitFor(() => expect(FakeWorker.latest.messages).toHaveLength(4))
    const third = FakeWorker.latest.messages[3].message as Extract<
      PoseWorkerRequest,
      { type: 'analyze-frame' }
    >
    expect(third.mediaTimeMs).toBe(240)
    act(() =>
      FakeWorker.latest.emit({
        type: 'no-pose',
        requestId: third.requestId,
        frameIndex: 2,
        mediaTimeMs: 240,
        inferenceTimeMs: 20,
      }),
    )

    await expect(analysis!).resolves.toHaveLength(2)
    await waitFor(() => expect(result.current.state.phase).toBe('success'))
    expect(result.current.state.frames).toHaveLength(2)
    expect(result.current.state.analysis).toMatchObject({
      processedFrames: 3,
      totalFrames: 3,
      progress: 1,
      completed: true,
    })
  })
})
