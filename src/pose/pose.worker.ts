/// <reference lib="webworker" />

import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'
import { createWithDelegateFallback } from './delegateFallback'
import type {
  PoseDelegate,
  PoseFrame,
  PoseLandmark,
  PoseModelVariant,
  PoseWorkerRequest,
  PoseWorkerResponse,
} from './types'

const workerScope = self as unknown as DedicatedWorkerGlobalScope
const WASM_PATH = `${workerScope.location.origin}/wasm`
const MODEL_PATHS: Record<PoseModelVariant, string> = {
  full: `${workerScope.location.origin}/models/pose_landmarker_full-float16-v1.task`,
  lite: `${workerScope.location.origin}/models/pose_landmarker_lite-float16-v1.task`,
}

let poseLandmarker: PoseLandmarker | null = null
let activeDelegate: PoseDelegate = 'CPU'
let activeModel: PoseModelVariant = 'full'
let lastTimestampMs = -1

type VisionFileset = Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>

function send(message: PoseWorkerResponse) {
  workerScope.postMessage(message)
}

function copyLandmarks(landmarks: PoseLandmark[]): PoseLandmark[] {
  return landmarks.map(({ x, y, z, visibility, presence }) => ({ x, y, z, visibility, presence }))
}

async function createLandmarker(
  vision: VisionFileset,
  modelVariant: PoseModelVariant,
  delegate: PoseDelegate,
) {
  const canvas =
    delegate === 'GPU' && typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(1, 1) : undefined

  if (delegate === 'GPU' && !canvas) {
    throw new Error('当前浏览器不支持 Worker OffscreenCanvas')
  }

  return PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: MODEL_PATHS[modelVariant],
      delegate,
    },
    canvas,
    runningMode: 'VIDEO',
    numPoses: 1,
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    outputSegmentationMasks: false,
  })
}

async function initialize(modelVariant: PoseModelVariant) {
  const startedAt = performance.now()
  poseLandmarker?.close()
  poseLandmarker = null
  lastTimestampMs = -1
  activeModel = modelVariant
  send({ type: 'loading', stage: 'wasm' })
  const vision = await FilesetResolver.forVisionTasks(WASM_PATH, true)

  const created = await createWithDelegateFallback(
    (delegate) => createLandmarker(vision, modelVariant, delegate),
    (delegate) => send({ type: 'loading', stage: delegate === 'GPU' ? 'gpu' : 'cpu' }),
  )
  poseLandmarker = created.value
  activeDelegate = created.delegate

  send({
    type: 'ready',
    delegate: activeDelegate,
    modelVariant: activeModel,
    loadTimeMs: performance.now() - startedAt,
    fallbackReason: created.fallbackReason,
  })
}

function analyzeFrame(message: Extract<PoseWorkerRequest, { type: 'analyze-frame' }>) {
  const startedAt = performance.now()

  if (!poseLandmarker) {
    message.image.close()
    send({
      type: 'error',
      code: 'MODEL_NOT_READY',
      message: '姿态模型尚未准备好，请稍后重试。',
      requestId: message.requestId,
    })
    return
  }

  try {
    const timestampMs = Math.max(message.mediaTimeMs, lastTimestampMs + 1)
    lastTimestampMs = timestampMs
    const result = poseLandmarker.detectForVideo(message.image, timestampMs)
    const inferenceTimeMs = performance.now() - startedAt
    const landmarks = result.landmarks[0]

    if (!landmarks) {
      send({
        type: 'no-pose',
        requestId: message.requestId,
        frameIndex: message.frameIndex,
        mediaTimeMs: message.mediaTimeMs,
        inferenceTimeMs,
      })
      return
    }

    const frame: PoseFrame = {
      frameIndex: message.frameIndex,
      mediaTimeMs: message.mediaTimeMs,
      inferenceTimeMs,
      imageWidth: message.imageWidth,
      imageHeight: message.imageHeight,
      landmarks: copyLandmarks(landmarks),
      worldLandmarks: copyLandmarks(result.worldLandmarks[0] ?? []),
      modelVariant: activeModel,
      delegate: activeDelegate,
    }
    send({ type: 'result', requestId: message.requestId, frame })
  } catch {
    send({
      type: 'error',
      code: 'INFERENCE_FAILED',
      message: '当前画面识别失败，请暂停到人物全身清晰可见的位置后重试。',
      requestId: message.requestId,
    })
  } finally {
    message.image.close()
  }
}

workerScope.addEventListener('message', (event: MessageEvent<PoseWorkerRequest>) => {
  const message = event.data

  if (message.type === 'init') {
    initialize(message.modelVariant).catch(() => {
      poseLandmarker?.close()
      poseLandmarker = null
      send({
        type: 'error',
        code: 'MODEL_LOAD_FAILED',
        message: '姿态模型加载失败，请刷新页面或重新打开应用后重试。',
      })
    })
    return
  }

  if (message.type === 'analyze-frame') {
    analyzeFrame(message)
    return
  }

  poseLandmarker?.close()
  poseLandmarker = null
  workerScope.close()
})
