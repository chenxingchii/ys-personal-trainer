import { useCallback, useEffect, useRef, useState } from 'react'
import type { PoseEngineState, PoseFrame, PoseWorkerRequest, PoseWorkerResponse } from './types'

const INITIAL_STATE: PoseEngineState = {
  phase: 'idle',
  modelVariant: 'full',
}

type PendingRequest = {
  resolve: (frame: PoseFrame | null) => void
  reject: (error: Error) => void
}

type Initialization = {
  promise: Promise<void>
  resolve: () => void
  reject: (error: Error) => void
}

export function usePoseLandmarker() {
  const [state, setState] = useState<PoseEngineState>(INITIAL_STATE)
  const workerRef = useRef<Worker | null>(null)
  const initializationRef = useRef<Initialization | null>(null)
  const pendingRef = useRef<Map<string, PendingRequest>>(new Map())
  const requestIndexRef = useRef(0)
  const sessionRef = useRef(0)

  const rejectPending = useCallback((error: Error) => {
    initializationRef.current?.reject(error)
    initializationRef.current = null
    pendingRef.current.forEach(({ reject }) => reject(error))
    pendingRef.current.clear()
  }, [])

  const disposeWorker = useCallback(
    (updateState: boolean) => {
      sessionRef.current += 1
      const worker = workerRef.current
      workerRef.current = null
      if (worker) {
        const message: PoseWorkerRequest = { type: 'dispose' }
        worker.postMessage(message)
        worker.terminate()
      }
      rejectPending(new Error('姿态识别任务已取消。'))
      if (updateState) setState(INITIAL_STATE)
    },
    [rejectPending],
  )

  const handleMessage = useCallback(
    (message: PoseWorkerResponse) => {
      if (message.type === 'loading') {
        setState((current) => ({
          ...current,
          phase: 'loading',
          loadingStage: message.stage,
          error: undefined,
        }))
        return
      }

      if (message.type === 'ready') {
        setState({
          phase: 'ready',
          delegate: message.delegate,
          modelVariant: message.modelVariant,
          loadTimeMs: message.loadTimeMs,
          fallbackReason: message.fallbackReason,
        })
        initializationRef.current?.resolve()
        initializationRef.current = null
        return
      }

      if (message.type === 'result') {
        pendingRef.current.get(message.requestId)?.resolve(message.frame)
        pendingRef.current.delete(message.requestId)
        setState((current) => ({ ...current, phase: 'success', frame: message.frame, error: undefined }))
        return
      }

      if (message.type === 'no-pose') {
        pendingRef.current.get(message.requestId)?.resolve(null)
        pendingRef.current.delete(message.requestId)
        setState((current) => ({ ...current, phase: 'no-pose', frame: undefined, error: undefined }))
        return
      }

      const error = new Error(message.message)
      if (message.requestId) {
        pendingRef.current.get(message.requestId)?.reject(error)
        pendingRef.current.delete(message.requestId)
      } else {
        workerRef.current?.terminate()
        workerRef.current = null
        rejectPending(error)
      }
      setState((current) => ({ ...current, phase: 'error', frame: undefined, error: message.message }))
    },
    [rejectPending],
  )

  const ensureWorker = useCallback(() => {
    if (initializationRef.current) return initializationRef.current.promise
    if (workerRef.current) return Promise.resolve()

    const worker = new Worker(new URL('./pose.worker.ts', import.meta.url), { type: 'module' })
    workerRef.current = worker
    worker.addEventListener('message', (event: MessageEvent<PoseWorkerResponse>) => handleMessage(event.data))
    worker.addEventListener('error', () => {
      if (workerRef.current === worker) workerRef.current = null
      worker.terminate()
      const error = new Error('姿态识别服务启动失败，请刷新页面后重试。')
      rejectPending(error)
      setState((current) => ({ ...current, phase: 'error', frame: undefined, error: error.message }))
    })

    let resolveInitialization!: () => void
    let rejectInitialization!: (error: Error) => void
    const promise = new Promise<void>((resolve, reject) => {
      resolveInitialization = resolve
      rejectInitialization = reject
    })
    initializationRef.current = {
      promise,
      resolve: resolveInitialization,
      reject: rejectInitialization,
    }

    const message: PoseWorkerRequest = { type: 'init', modelVariant: 'full' }
    worker.postMessage(message)
    return promise
  }, [handleMessage, rejectPending])

  const analyzeFrame = useCallback(
    async (video: HTMLVideoElement) => {
      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        const message = '视频画面尚未准备好，请等待画面显示后重试。'
        setState((current) => ({ ...current, phase: 'error', error: message }))
        throw new Error(message)
      }
      if (pendingRef.current.size > 0) return null

      const session = sessionRef.current
      await ensureWorker()
      if (session !== sessionRef.current) return null

      setState((current) => ({ ...current, phase: 'analyzing', frame: undefined, error: undefined }))
      const image = await createImageBitmap(video)
      if (session !== sessionRef.current) {
        image.close()
        return null
      }

      requestIndexRef.current += 1
      const requestId = `pose-${session}-${requestIndexRef.current}`
      const mediaTimeMs = video.currentTime * 1000
      const message: PoseWorkerRequest = {
        type: 'analyze-frame',
        requestId,
        frameIndex: requestIndexRef.current - 1,
        mediaTimeMs,
        imageWidth: video.videoWidth,
        imageHeight: video.videoHeight,
        image,
      }

      return new Promise<PoseFrame | null>((resolve, reject) => {
        pendingRef.current.set(requestId, { resolve, reject })
        try {
          workerRef.current?.postMessage(message, [image])
        } catch (error) {
          pendingRef.current.delete(requestId)
          image.close()
          reject(error)
        }
      })
    },
    [ensureWorker],
  )

  const reset = useCallback(() => disposeWorker(true), [disposeWorker])

  const clearResult = useCallback(() => {
    setState((current) => {
      if (current.phase === 'loading' || current.phase === 'analyzing') return current
      return {
        ...current,
        phase: workerRef.current ? 'ready' : 'idle',
        frame: undefined,
        error: undefined,
      }
    })
  }, [])

  useEffect(() => () => disposeWorker(false), [disposeWorker])

  return { analyzeFrame, clearResult, reset, state }
}
