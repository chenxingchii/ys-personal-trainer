import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  PoseAnalysisProgress,
  PoseEngineState,
  PoseFrame,
  PoseWorkerRequest,
  PoseWorkerResponse,
} from './types'

const INITIAL_STATE: PoseEngineState = { phase: 'idle', modelVariant: 'full', frames: [] }
type PendingRequest = { resolve: (frame: PoseFrame | null) => void; reject: (error: Error) => void }
type Initialization = { promise: Promise<void>; resolve: () => void; reject: (error: Error) => void }
type AnalysisSession = { session: number; active: boolean }
const DEFAULT_SAMPLE_INTERVAL_MS = 120

function isVideoReady(video: HTMLVideoElement) {
  return video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
}

function waitForSeek(video: HTMLVideoElement, targetTimeMs: number) {
  if (Math.abs(video.currentTime * 1000 - targetTimeMs) < 2) return Promise.resolve()
  return new Promise<void>((resolve, reject) => {
    const onSeeked = () => {
      cleanup()
      resolve()
    }
    const onError = () => {
      cleanup()
      reject(new Error('视频定位失败，请重试或更换视频。'))
    }
    const cleanup = () => {
      video.removeEventListener('seeked', onSeeked)
      video.removeEventListener('error', onError)
    }
    video.addEventListener('seeked', onSeeked, { once: true })
    video.addEventListener('error', onError, { once: true })
    try {
      video.currentTime = targetTimeMs / 1000
    } catch {
      cleanup()
      reject(new Error('视频定位失败，请重试或更换视频。'))
    }
  })
}

export function usePoseLandmarker() {
  const [state, setState] = useState<PoseEngineState>(INITIAL_STATE)
  const workerRef = useRef<Worker | null>(null)
  const initializationRef = useRef<Initialization | null>(null)
  const pendingRef = useRef<Map<string, PendingRequest>>(new Map())
  const requestIndexRef = useRef(0)
  const sessionRef = useRef(0)
  const analysisRef = useRef<AnalysisSession | null>(null)

  const rejectPending = useCallback((error: Error) => {
    initializationRef.current?.reject(error)
    initializationRef.current = null
    pendingRef.current.forEach(({ reject }) => reject(error))
    pendingRef.current.clear()
  }, [])

  const disposeWorker = useCallback(
    (updateState: boolean) => {
      sessionRef.current += 1
      analysisRef.current = null
      const worker = workerRef.current
      workerRef.current = null
      if (worker) {
        worker.postMessage({ type: 'dispose' } satisfies PoseWorkerRequest)
        worker.terminate()
      }
      rejectPending(new Error('姿态识别任务已取消。'))
      if (updateState) setState(INITIAL_STATE)
    },
    [rejectPending],
  )

  const handleMessage = useCallback(
    (message: PoseWorkerResponse) => {
      const batchIsActive = analysisRef.current?.active === true
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
        setState((current) => ({
          ...current,
          phase: batchIsActive ? 'analyzing' : 'ready',
          delegate: message.delegate,
          modelVariant: message.modelVariant,
          loadTimeMs: message.loadTimeMs,
          fallbackReason: message.fallbackReason,
          error: undefined,
        }))
        initializationRef.current?.resolve()
        initializationRef.current = null
        return
      }
      if (message.type === 'result') {
        pendingRef.current.get(message.requestId)?.resolve(message.frame)
        pendingRef.current.delete(message.requestId)
        setState((current) => ({
          ...current,
          phase: batchIsActive ? 'analyzing' : 'success',
          frame: message.frame,
          error: undefined,
        }))
        return
      }
      if (message.type === 'no-pose') {
        pendingRef.current.get(message.requestId)?.resolve(null)
        pendingRef.current.delete(message.requestId)
        setState((current) => ({
          ...current,
          phase: batchIsActive ? 'analyzing' : 'no-pose',
          frame: batchIsActive ? current.frame : undefined,
          error: undefined,
        }))
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
    initializationRef.current = { promise, resolve: resolveInitialization, reject: rejectInitialization }
    worker.postMessage({ type: 'init', modelVariant: 'full' } satisfies PoseWorkerRequest)
    return promise
  }, [handleMessage, rejectPending])

  const requestFrame = useCallback(async (video: HTMLVideoElement, session: number, frameIndex: number) => {
    const image = await createImageBitmap(video)
    if (session !== sessionRef.current) {
      image.close()
      return null
    }
    requestIndexRef.current += 1
    const requestId = `pose-${session}-${requestIndexRef.current}`
    const message: PoseWorkerRequest = {
      type: 'analyze-frame',
      requestId,
      frameIndex,
      mediaTimeMs: video.currentTime * 1000,
      imageWidth: video.videoWidth,
      imageHeight: video.videoHeight,
      image,
    }
    const worker = workerRef.current
    if (!worker) {
      image.close()
      throw new Error('姿态识别服务不可用，请刷新页面后重试。')
    }
    return new Promise<PoseFrame | null>((resolve, reject) => {
      pendingRef.current.set(requestId, { resolve, reject })
      try {
        worker.postMessage(message, [image])
      } catch (error) {
        pendingRef.current.delete(requestId)
        image.close()
        reject(error instanceof Error ? error : new Error('姿态识别请求发送失败。'))
      }
    })
  }, [])

  const analyzeFrame = useCallback(
    async (video: HTMLVideoElement) => {
      if (!isVideoReady(video)) {
        const message = '视频画面尚未准备好，请等待画面显示后重试。'
        setState((current) => ({ ...current, phase: 'error', error: message }))
        throw new Error(message)
      }
      if (pendingRef.current.size > 0 || analysisRef.current?.active) return null
      const session = sessionRef.current
      await ensureWorker()
      if (session !== sessionRef.current) return null
      setState((current) => ({
        ...current,
        phase: 'analyzing',
        frame: undefined,
        frames: [],
        error: undefined,
      }))
      return requestFrame(video, session, 0)
    },
    [ensureWorker, requestFrame],
  )

  const analyzeVideo = useCallback(
    async (video: HTMLVideoElement, sampleIntervalMs = DEFAULT_SAMPLE_INTERVAL_MS) => {
      if (!isVideoReady(video)) {
        const message = '视频画面尚未准备好，请等待画面显示后重试。'
        setState((current) => ({ ...current, phase: 'error', error: message }))
        throw new Error(message)
      }
      if (pendingRef.current.size > 0 || analysisRef.current?.active) return []
      const session = sessionRef.current
      const analysis: AnalysisSession = { session, active: true }
      analysisRef.current = analysis
      video.pause()
      await ensureWorker()
      if (session !== sessionRef.current || analysisRef.current !== analysis) return []

      const durationMs =
        Number.isFinite(video.duration) && video.duration > 0 ? video.duration * 1000 : undefined
      const targets: number[] = []
      if (durationMs !== undefined) {
        for (let target = 0; target < durationMs; target += sampleIntervalMs) targets.push(target)
        if (targets.length === 0 || durationMs - targets[targets.length - 1] > 2) targets.push(durationMs)
      }
      const totalFrames = targets.length || undefined
      const frames: PoseFrame[] = []
      let processedFrames = 0
      const updateProgress = (completed: boolean) => {
        const progress = totalFrames ? Math.min(1, processedFrames / totalFrames) : undefined
        const next: PoseAnalysisProgress = { processedFrames, totalFrames, progress, completed }
        setState((current) => ({
          ...current,
          phase: completed ? (frames.length ? 'success' : 'no-pose') : 'analyzing',
          frame: frames.at(-1),
          frames: [...frames],
          analysis: next,
          error: undefined,
        }))
      }

      try {
        if (targets.length > 0) {
          setState((current) => ({
            ...current,
            phase: 'analyzing',
            frame: undefined,
            frames: [],
            analysis: { processedFrames: 0, totalFrames, progress: 0, completed: false },
            error: undefined,
          }))
          for (const [frameIndex, target] of targets.entries()) {
            if (session !== sessionRef.current || analysisRef.current !== analysis) return []
            await waitForSeek(video, target)
            const frame = await requestFrame(video, session, frameIndex)
            if (frame) frames.push(frame)
            processedFrames += 1
            updateProgress(false)
          }
        } else {
          setState((current) => ({
            ...current,
            phase: 'analyzing',
            frame: undefined,
            frames: [],
            analysis: { processedFrames: 0, completed: false },
            error: undefined,
          }))
          let lastSampleMs = -Infinity
          await video.play()
          await new Promise<void>((resolve, reject) => {
            let timer: ReturnType<typeof setTimeout> | undefined
            const cleanup = () => {
              if (timer) clearTimeout(timer)
              video.removeEventListener('ended', onEnded)
              video.removeEventListener('error', onError)
            }
            const onEnded = () => {
              cleanup()
              resolve()
            }
            const onError = () => {
              cleanup()
              reject(new Error('视频播放失败，无法完成整段分析。'))
            }
            const tick = async () => {
              if (session !== sessionRef.current || analysisRef.current !== analysis) {
                cleanup()
                resolve()
                return
              }
              try {
                const mediaTimeMs = video.currentTime * 1000
                if (mediaTimeMs >= lastSampleMs + sampleIntervalMs || processedFrames === 0) {
                  lastSampleMs = mediaTimeMs
                  const frame = await requestFrame(video, session, processedFrames)
                  if (frame) frames.push(frame)
                  processedFrames += 1
                  updateProgress(false)
                }
                if (!video.ended) timer = setTimeout(() => void tick(), 40)
              } catch (error) {
                cleanup()
                reject(error instanceof Error ? error : new Error('整段视频分析失败，请重试。'))
              }
            }
            video.addEventListener('ended', onEnded, { once: true })
            video.addEventListener('error', onError, { once: true })
            timer = setTimeout(() => void tick(), 0)
          })
        }
        video.pause()
        updateProgress(true)
        return frames
      } catch (error) {
        if (session === sessionRef.current && analysisRef.current === analysis) {
          const message = error instanceof Error ? error.message : '整段视频分析失败，请重试。'
          setState((current) => ({
            ...current,
            phase: 'error',
            error: message,
            analysis: {
              processedFrames,
              totalFrames,
              progress: totalFrames ? processedFrames / totalFrames : undefined,
              completed: false,
            },
          }))
          throw error
        }
        return []
      } finally {
        if (analysisRef.current === analysis) analysisRef.current = null
      }
    },
    [ensureWorker, requestFrame],
  )

  const reset = useCallback(() => disposeWorker(true), [disposeWorker])
  const clearResult = useCallback(() => {
    setState((current) => {
      if (current.phase === 'loading' || current.phase === 'analyzing') return current
      return {
        ...current,
        phase: workerRef.current ? 'ready' : 'idle',
        frame: undefined,
        frames: [],
        analysis: undefined,
        error: undefined,
      }
    })
  }, [])
  useEffect(() => () => disposeWorker(false), [disposeWorker])
  return { analyzeFrame, analyzeVideo, clearResult, reset, state }
}
