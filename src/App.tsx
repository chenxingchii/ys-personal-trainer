import {
  Activity,
  Camera,
  Check,
  FileVideo,
  FolderOpen,
  LoaderCircle,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  Square,
  Trash2,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import './App.css'
import { useVideoSelection } from './capture/useVideoSelection'
import { formatBytes, formatDuration } from './capture/video'
import { PoseOverlay } from './pose/PoseOverlay'
import type { PoseEngineState } from './pose/types'
import { usePoseLandmarker } from './pose/usePoseLandmarker'
import { analyzeJump } from './biomechanics/jumpAnalysis'
import type { JumpAnalysis, MetricResult } from './biomechanics/types'

type VideoInputProps = {
  capture?: 'environment'
  icon: typeof Camera
  label: string
  tone: 'primary' | 'secondary'
  onSelect: (file: File | null) => void
}

function VideoInput({ capture, icon: Icon, label, tone, onSelect }: VideoInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onSelect(event.target.files?.[0] ?? null)
    event.target.value = ''
  }

  return (
    <>
      <button
        className={`video-input video-input--${tone}`}
        type="button"
        onClick={() => inputRef.current?.click()}
      >
        <Icon aria-hidden="true" size={21} strokeWidth={2.2} />
        <span>{label}</span>
      </button>
      <input
        ref={inputRef}
        className="visually-hidden"
        type="file"
        accept="video/*"
        capture={capture}
        onChange={handleChange}
        tabIndex={-1}
      />
    </>
  )
}

function EmptyStage() {
  return (
    <div className="empty-stage" aria-hidden="true">
      <img src="/side-jump-guide.svg" alt="" />
      <div className="ground-line">
        <span>起跳区</span>
        <span>落地区</span>
      </div>
    </div>
  )
}

const loadingLabels = {
  wasm: '正在准备识别引擎',
  gpu: '正在启动 GPU 模型',
  cpu: '正在切换 CPU 模型',
} as const

function PoseStatus({ state }: { state: PoseEngineState }) {
  if (state.phase === 'loading') {
    return <span>{loadingLabels[state.loadingStage ?? 'wasm']}</span>
  }
  if (state.phase === 'analyzing') {
    if (state.analysis) {
      const progress = state.analysis.progress
      return (
        <span>
          正在分析整段视频 · 已处理 {state.analysis.processedFrames} 帧
          {state.analysis.totalFrames ? ` / ${state.analysis.totalFrames} 帧` : ''}
          {progress !== undefined ? ` · ${Math.round(progress * 100)}%` : ''}
        </span>
      )
    }
    return <span>正在识别当前画面</span>
  }
  if (state.analysis?.completed) {
    return <span>分析完成 · 有效姿态帧 {state.frames.length} 帧</span>
  }
  if (state.phase === 'success' && state.frame) {
    return (
      <span>
        已识别 {state.frame.landmarks.length} 个关键点 · {state.frame.delegate} ·{' '}
        {Math.round(state.frame.inferenceTimeMs)} ms
      </span>
    )
  }
  if (state.phase === 'no-pose') return <span>未识别到完整人体，请暂停到全身清晰可见的一帧</span>
  if (state.phase === 'error') return <span>{state.error}</span>
  if (state.phase === 'ready') return <span>模型已准备，暂停后可继续识别</span>
  return <span>暂停到身体完整可见的一帧</span>
}

const metricStatusLabels = {
  excellent: '优秀',
  pass: '达标',
  'needs-improvement': '待改进',
  unavailable: '无法判断',
} as const

function MetricCard({ metric }: { metric: MetricResult }) {
  return (
    <article className={`metric-card metric-card--${metric.status}`}>
      <div className="metric-card-heading">
        <strong>{metric.label}</strong>
        <span>{metricStatusLabels[metric.status]}</span>
      </div>
      <div className="metric-value">
        {metric.value === undefined ? '—' : `${Math.round(metric.value)}${metric.unit}`}
      </div>
      <div className="metric-range">
        建议 {metric.range[0]}°–{metric.range[1]}°
      </div>
    </article>
  )
}

function AnalysisReport({ analysis }: { analysis: JumpAnalysis }) {
  return (
    <section className="analysis-report" aria-labelledby="analysis-report-title">
      <div className="report-heading">
        <div>
          <span className="report-kicker">02 · 动作分析</span>
          <h2 id="analysis-report-title">这一次，先改哪一处？</h2>
        </div>
        {analysis.score !== undefined ? (
          <div className="score-display">
            <strong>{analysis.score}</strong>
            <span>动作技术完成度</span>
          </div>
        ) : null}
      </div>

      {analysis.priority ? (
        <div className="priority-report">
          <div className="priority-icon">
            <Activity aria-hidden="true" size={20} />
          </div>
          <div>
            <span>优先改进</span>
            <strong>{analysis.priority.label}</strong>
            <p>
              当前检测 {Math.round(analysis.priority.value ?? 0)}°，建议范围 {analysis.priority.range[0]}°–
              {analysis.priority.range[1]}°。{analysis.priority.hint}
            </p>
          </div>
        </div>
      ) : (
        <div className="priority-report priority-report--quiet">
          <div className="priority-icon">
            <Check aria-hidden="true" size={20} />
          </div>
          <div>
            <span>本次结果</span>
            <strong>主要指标都在建议区间内</strong>
            <p>保持当前动作节奏，再用下一次视频观察是否稳定。</p>
          </div>
        </div>
      )}

      <div className="report-meta">
        <span>主侧：{analysis.primarySide === 'left' ? '左侧' : '右侧'}</span>
        <span>
          方向：{analysis.direction === 'left' ? '向左' : analysis.direction === 'right' ? '向右' : '未确定'}
        </span>
        <span>有效帧：{analysis.usableFrameCount}</span>
        <span>规则：{analysis.ruleVersion}</span>
      </div>

      <div className="metric-grid">
        {analysis.metrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </div>
      <p className="analysis-note">{analysis.note}</p>
    </section>
  )
}

function App() {
  const { clearVideo, error, metadata, selectVideo, selectedVideo } = useVideoSelection()
  const { analyzeFrame, analyzeVideo, clearResult, reset: resetPose, state: poseState } = usePoseLandmarker()
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => resetPose(), [selectedVideo?.url, resetPose])

  const handleAnalyzeFrame = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    video.pause()
    void analyzeFrame(video).catch(() => undefined)
  }, [analyzeFrame])

  const handleAnalyzeVideo = useCallback(() => {
    if (poseState.phase === 'analyzing') {
      resetPose()
      return
    }
    const video = videoRef.current
    if (!video) return
    void analyzeVideo(video).catch(() => undefined)
  }, [analyzeVideo, poseState.phase, resetPose])

  const handleVideoPositionChange = useCallback(() => {
    if (poseState.analysis && !poseState.analysis.completed) return
    if (poseState.phase === 'loading' || poseState.phase === 'analyzing') {
      resetPose()
    } else {
      clearResult()
    }
  }, [clearResult, poseState.analysis, poseState.phase, resetPose])

  const poseIsBusy = poseState.phase === 'loading' || poseState.phase === 'analyzing'
  const analysisProgress = poseState.analysis?.progress
  const jumpAnalysis = useMemo(
    () => (poseState.analysis?.completed ? analyzeJump(poseState.frames) : undefined),
    [poseState.analysis?.completed, poseState.frames],
  )

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="YS专属训练师首页">
          <span className="brand-mark">YS</span>
          <span>专属训练师</span>
        </a>
        <div className="privacy-status">
          <ShieldCheck aria-hidden="true" size={17} />
          <span>本地处理</span>
        </div>
      </header>

      <main>
        <section className="capture-section" aria-labelledby="capture-title">
          <div className="capture-copy">
            <div className="step-label">
              <span>01</span>
              <span>准备视频</span>
            </div>
            <h1 id="capture-title">拍下这一跳，找到下一次的发力重点。</h1>
            <p className="lead">固定侧面机位，完整拍摄准备、起跳和落地。</p>

            {!selectedVideo ? (
              <div className="capture-actions" aria-label="选择视频来源">
                <VideoInput
                  capture="environment"
                  icon={Camera}
                  label="拍摄视频"
                  tone="primary"
                  onSelect={selectVideo}
                />
                <VideoInput icon={FolderOpen} label="选择已有视频" tone="secondary" onSelect={selectVideo} />
              </div>
            ) : (
              <div className="ready-status" role="status">
                <span className="ready-icon">
                  <Check aria-hidden="true" size={18} strokeWidth={3} />
                </span>
                <div>
                  <strong>视频已准备</strong>
                  <span>确认画面包含完整的准备、起跳和落地</span>
                </div>
              </div>
            )}

            {error ? (
              <p className="error-message" role="alert">
                {error}
              </p>
            ) : null}
          </div>

          <div className={`video-stage ${selectedVideo ? 'video-stage--active' : ''}`}>
            <div className="stage-toolbar">
              <span className="stage-state">
                <span className="stage-dot" />
                侧面固定机位
              </span>
              <span className="stage-format">单人 / 横屏</span>
            </div>

            {selectedVideo ? (
              <>
                <div className="video-frame">
                  <video
                    ref={videoRef}
                    key={selectedVideo.url}
                    src={selectedVideo.url}
                    controls
                    playsInline
                    preload="metadata"
                    onLoadedMetadata={metadata.handleLoadedMetadata}
                    onError={metadata.handleVideoError}
                    onPlay={handleVideoPositionChange}
                    onSeeking={handleVideoPositionChange}
                  />
                  {!metadata.value ? <div className="video-loading">正在读取视频信息</div> : null}
                  {poseState.frame ? <PoseOverlay frame={poseState.frame} /> : null}
                  {poseState.phase === 'success' ? (
                    <div className="pose-detected-badge">骨架已锁定</div>
                  ) : null}
                </div>
                {metadata.value ? (
                  <div className={`pose-controls pose-controls--${poseState.phase}`}>
                    <div className="pose-state" role={poseState.phase === 'error' ? 'alert' : 'status'}>
                      <span className="pose-state-icon">
                        {poseIsBusy ? (
                          <LoaderCircle className="spinner" aria-hidden="true" size={18} />
                        ) : (
                          <ScanLine aria-hidden="true" size={18} />
                        )}
                      </span>
                      <div>
                        <strong>姿态识别</strong>
                        <PoseStatus state={poseState} />
                        {poseState.fallbackReason ? <small>{poseState.fallbackReason}</small> : null}
                        {poseState.analysis ? (
                          <div className="analysis-progress" aria-label="整段分析进度">
                            <span
                              style={{
                                width: `${analysisProgress === undefined ? 100 : Math.round(analysisProgress * 100)}%`,
                              }}
                            />
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div className="analysis-actions">
                      <button
                        className="analyze-button"
                        type="button"
                        onClick={handleAnalyzeFrame}
                        disabled={poseIsBusy}
                      >
                        <ScanLine aria-hidden="true" size={19} />
                        <span>{poseState.phase === 'success' ? '重新识别当前帧' : '识别当前帧'}</span>
                      </button>
                      <button
                        className="analyze-button analyze-button--secondary"
                        type="button"
                        onClick={handleAnalyzeVideo}
                        disabled={poseState.phase === 'loading'}
                      >
                        {poseState.phase === 'analyzing' && poseState.analysis ? (
                          <Square aria-hidden="true" size={17} />
                        ) : (
                          <ScanLine aria-hidden="true" size={17} />
                        )}
                        <span>{poseState.phase === 'analyzing' ? '停止整段分析' : '分析整段视频'}</span>
                      </button>
                    </div>
                  </div>
                ) : null}
                {jumpAnalysis ? <AnalysisReport analysis={jumpAnalysis} /> : null}
                <div className="video-summary">
                  <div className="file-identity">
                    <FileVideo aria-hidden="true" size={21} />
                    <div>
                      <strong title={selectedVideo.file.name}>{selectedVideo.file.name}</strong>
                      <span>{formatBytes(selectedVideo.file.size)}</span>
                    </div>
                  </div>
                  {metadata.value ? (
                    <dl className="video-metadata">
                      <div>
                        <dt>时长</dt>
                        <dd>{formatDuration(metadata.value.duration)}</dd>
                      </div>
                      <div>
                        <dt>画面</dt>
                        <dd>
                          {metadata.value.width} × {metadata.value.height}
                        </dd>
                      </div>
                    </dl>
                  ) : null}
                  <div className="video-tools">
                    <VideoInput icon={RotateCcw} label="更换" tone="secondary" onSelect={selectVideo} />
                    <button
                      className="icon-button"
                      type="button"
                      onClick={clearVideo}
                      title="移除视频"
                      aria-label="移除视频"
                    >
                      <Trash2 aria-hidden="true" size={20} />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <EmptyStage />
            )}
          </div>
        </section>

        <section className="shooting-checks" aria-labelledby="checks-title">
          <div className="checks-heading">
            <span>拍摄基线</span>
            <h2 id="checks-title">一次拍全，分析才有依据。</h2>
          </div>
          <ol>
            <li>
              <span className="check-number">1</span>
              <div>
                <strong>机位固定</strong>
                <span>镜头与跳跃方向垂直</span>
              </div>
            </li>
            <li>
              <span className="check-number">2</span>
              <div>
                <strong>全身入镜</strong>
                <span>保留起跳与落地区域</span>
              </div>
            </li>
            <li>
              <span className="check-number">3</span>
              <div>
                <strong>动作完整</strong>
                <span>从站稳开始，到落地稳定结束</span>
              </div>
            </li>
          </ol>
        </section>
      </main>

      <footer>
        <span>YS专属训练师</span>
        <span>当前阶段：姿态识别基础</span>
      </footer>
    </div>
  )
}

export default App
