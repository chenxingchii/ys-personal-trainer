export type PoseModelVariant = 'full' | 'lite'

export type PoseDelegate = 'GPU' | 'CPU'

export type PoseLandmark = {
  x: number
  y: number
  z: number
  visibility?: number
  presence?: number
}

export type PoseFrame = {
  frameIndex: number
  mediaTimeMs: number
  inferenceTimeMs: number
  imageWidth: number
  imageHeight: number
  landmarks: PoseLandmark[]
  worldLandmarks: PoseLandmark[]
  modelVariant: PoseModelVariant
  delegate: PoseDelegate
}

export type PoseLoadingStage = 'wasm' | 'gpu' | 'cpu'

export type PoseWorkerRequest =
  | {
      type: 'init'
      modelVariant: PoseModelVariant
    }
  | {
      type: 'analyze-frame'
      requestId: string
      frameIndex: number
      mediaTimeMs: number
      imageWidth: number
      imageHeight: number
      image: ImageBitmap
    }
  | {
      type: 'dispose'
    }

export type PoseWorkerResponse =
  | {
      type: 'loading'
      stage: PoseLoadingStage
    }
  | {
      type: 'ready'
      delegate: PoseDelegate
      modelVariant: PoseModelVariant
      loadTimeMs: number
      fallbackReason?: string
    }
  | {
      type: 'result'
      requestId: string
      frame: PoseFrame
    }
  | {
      type: 'no-pose'
      requestId: string
      frameIndex?: number
      mediaTimeMs: number
      inferenceTimeMs: number
    }
  | {
      type: 'error'
      code: 'MODEL_LOAD_FAILED' | 'MODEL_NOT_READY' | 'INFERENCE_FAILED' | 'WORKER_FAILED'
      message: string
      requestId?: string
    }

export type PoseEnginePhase = 'idle' | 'loading' | 'ready' | 'analyzing' | 'success' | 'no-pose' | 'error'

export type PoseEngineState = {
  phase: PoseEnginePhase
  loadingStage?: PoseLoadingStage
  delegate?: PoseDelegate
  modelVariant: PoseModelVariant
  loadTimeMs?: number
  fallbackReason?: string
  frame?: PoseFrame
  analysis?: PoseAnalysisProgress
  frames: PoseFrame[]
  error?: string
}

export type PoseAnalysisProgress = {
  processedFrames: number
  totalFrames?: number
  progress?: number
  completed: boolean
}
