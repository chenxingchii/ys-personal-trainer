import {
  Activity,
  ArrowLeftRight,
  Camera,
  Check,
  ClipboardList,
  Dumbbell,
  FileVideo,
  FileText,
  FolderOpen,
  History,
  LoaderCircle,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  Square,
  Trash2,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { useVideoSelection } from './capture/useVideoSelection'
import { formatBytes, formatDuration } from './capture/video'
import { checkAnalysisQuality, checkVideoMetadata, type VideoQualityResult } from './capture/quality'
import { PoseOverlay } from './pose/PoseOverlay'
import type { PoseEngineState } from './pose/types'
import { usePoseLandmarker } from './pose/usePoseLandmarker'
import { analyzeJump } from './biomechanics/jumpAnalysis'
import {
  buildCoachReport,
  compareCoachReports,
  type CoachReport,
  type ComparisonReport,
} from './reports/diagnosis'
import { listLocalReports, saveLocalReport, type LocalReport } from './reports/localReports'

type VideoInputProps = {
  capture?: 'environment'
  icon: typeof Camera
  label: string
  tone: 'primary' | 'secondary'
  onSelect: (file: File | null) => void
}

type AppView = 'home' | 'diagnosis' | 'history' | 'training' | 'movement'

const viewItems: Array<{ id: AppView; label: string; icon: typeof ClipboardList }> = [
  { id: 'diagnosis', label: '动作诊断', icon: ClipboardList },
  { id: 'history', label: '历史报告', icon: History },
  { id: 'training', label: '训练计划', icon: Dumbbell },
  { id: 'movement', label: '动作切换', icon: ArrowLeftRight },
]

function VideoInput({ capture, icon: Icon, label, tone, onSelect }: VideoInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const openPicker = () => {
    const input = inputRef.current
    if (!input) return
    try {
      if (typeof input.showPicker === 'function') {
        input.showPicker()
        return
      }
    } catch {
      // 某些 Android WebView 不允许 showPicker，继续使用 click 回退。
    }
    input.click()
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onSelect(event.target.files?.[0] ?? null)
    event.target.value = ''
  }

  return (
    <>
      <button className={`video-input video-input--${tone}`} type="button" onClick={openPicker}>
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

function AnalysisReport({ report, comparison }: { report: CoachReport; comparison?: ComparisonReport }) {
  return (
    <section className="analysis-report" aria-labelledby="analysis-report-title">
      <div className="report-heading">
        <div>
          <span className="report-kicker">02 · 训练建议</span>
          <h2 id="analysis-report-title">{report.headline}</h2>
        </div>
      </div>

      {report.hasPriority ? (
        <div className="priority-report">
          <div className="priority-icon">
            <Activity aria-hidden="true" size={20} />
          </div>
          <div>
            <span>优先建议</span>
            <strong>{report.priority}</strong>
            <p>{report.observation}</p>
          </div>
        </div>
      ) : (
        <div className="priority-report priority-report--quiet">
          <div className="priority-icon">
            <Check aria-hidden="true" size={20} />
          </div>
          <div>
            <span>本次结果</span>
            <strong>{report.priority}</strong>
            <p>{report.observation}</p>
          </div>
        </div>
      )}
      <div className="report-sections">
        <div className="report-section">
          <span>教练观察</span>
          <p>{report.observation}</p>
        </div>
        <div className="report-section">
          <span>可能影响</span>
          <p>{report.impact}</p>
        </div>
        <div className="report-section report-section--cue">
          <span>下一次这样做</span>
          <p>{report.coachingCue}</p>
        </div>
        <div className="report-section">
          <span>建议练习</span>
          <p>{report.drill}</p>
        </div>
      </div>
      <p className="analysis-note">{report.confidenceNote}</p>
      {comparison ? (
        <div className="comparison-report">
          <span>复测对比</span>
          <strong>{comparison.title}</strong>
          <p>{comparison.detail}</p>
          <p>{comparison.action}</p>
        </div>
      ) : null}
    </section>
  )
}

function LocalHistory({ reports }: { reports: LocalReport[] }) {
  if (!reports.length) return null
  return (
    <div className="local-history" aria-label="本机历史报告">
      <div>
        <strong>本机历史</strong>
        <span>仅保存在这台设备</span>
      </div>
      <div className="history-items">
        {reports.slice(0, 3).map((report) => (
          <div className="history-item" key={report.id}>
            <span>{new Date(report.createdAt).toLocaleDateString('zh-CN')}</span>
            <strong>{report.coachReport.priority}</strong>
          </div>
        ))}
      </div>
    </div>
  )
}

function MainNavigation({
  activeView,
  onNavigate,
}: {
  activeView: AppView
  onNavigate: (view: AppView) => void
}) {
  return (
    <nav className="main-navigation" aria-label="主功能导航">
      {viewItems.map(({ id, label, icon: Icon }) => (
        <button
          className={`main-navigation__item ${activeView === id ? 'main-navigation__item--active' : ''}`}
          key={id}
          type="button"
          onClick={() => onNavigate(id)}
          aria-current={activeView === id ? 'page' : undefined}
        >
          <Icon aria-hidden="true" size={18} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}

function Dashboard({ reports, onNavigate }: { reports: LocalReport[]; onNavigate: (view: AppView) => void }) {
  return (
    <section className="dashboard" aria-labelledby="dashboard-title">
      <div className="dashboard-heading">
        <span className="dashboard-kicker">YS TRAINER / HOME</span>
        <h1 id="dashboard-title">今天，先把这一跳看清楚。</h1>
        <p>从一次侧面视频开始，找到最值得优先调整的动作。</p>
      </div>
      <div className="dashboard-grid">
        <button
          className="dashboard-card dashboard-card--primary"
          type="button"
          onClick={() => onNavigate('diagnosis')}
        >
          <ClipboardList aria-hidden="true" size={24} />
          <span className="dashboard-card__label">动作诊断</span>
          <strong>拍摄或选择视频</strong>
          <span>生成一份教练式动作报告</span>
        </button>
        <button className="dashboard-card" type="button" onClick={() => onNavigate('history')}>
          <History aria-hidden="true" size={24} />
          <span className="dashboard-card__label">历史报告</span>
          <strong>{reports.length ? `${reports.length} 份本机记录` : '还没有历史记录'}</strong>
          <span>查看之前上传的视频与报告</span>
        </button>
        <button
          className="dashboard-card dashboard-card--disabled"
          type="button"
          onClick={() => onNavigate('training')}
        >
          <Dumbbell aria-hidden="true" size={24} />
          <span className="dashboard-card__label">训练计划</span>
          <strong>针对问题安排训练</strong>
          <span>即将开放 · 当前仅用于展示</span>
        </button>
        <button
          className="dashboard-card dashboard-card--disabled"
          type="button"
          onClick={() => onNavigate('movement')}
        >
          <ArrowLeftRight aria-hidden="true" size={24} />
          <span className="dashboard-card__label">动作切换</span>
          <strong>选择其他训练动作</strong>
          <span>即将开放 · 当前仅用于展示</span>
        </button>
      </div>
      <div className="dashboard-footnote">
        <span>当前支持</span>
        <strong>立定跳远 · 侧面固定机位</strong>
      </div>
    </section>
  )
}

function HistoryView({
  reports,
  selectedReport,
  onOpenReport,
  onCloseReport,
}: {
  reports: LocalReport[]
  selectedReport: LocalReport | null
  onOpenReport: (report: LocalReport) => void
  onCloseReport: () => void
}) {
  return (
    <section className="subpage" aria-labelledby="history-title">
      <div className="subpage-heading">
        <span className="dashboard-kicker">02 / HISTORY</span>
        <h1 id="history-title">历史报告</h1>
        <p>这里保存本机分析过的视频记录和对应的诊断报告。</p>
      </div>
      {selectedReport ? (
        <div className="history-detail">
          <button className="history-back" type="button" onClick={onCloseReport}>
            <ArrowLeftRight aria-hidden="true" size={16} />
            <span>返回历史列表</span>
          </button>
          <div className="history-detail__meta">
            <FileVideo aria-hidden="true" size={19} />
            <strong>{selectedReport.videoName}</strong>
            <span>{new Date(selectedReport.createdAt).toLocaleString('zh-CN')}</span>
          </div>
          <AnalysisReport report={selectedReport.coachReport} />
        </div>
      ) : null}
      {!selectedReport && reports.length ? (
        <div className="history-list">
          {reports.map((report) => (
            <article className="history-card" key={report.id}>
              <div className="history-card__icon">
                <FileVideo aria-hidden="true" size={22} />
              </div>
              <div className="history-card__body">
                <strong title={report.videoName}>{report.videoName}</strong>
                <span>
                  {new Date(report.createdAt).toLocaleString('zh-CN')} · {formatBytes(report.videoSize)}
                </span>
                <p>{report.coachReport.priority}</p>
              </div>
              <button className="history-card__action" type="button" onClick={() => onOpenReport(report)}>
                <FileText aria-hidden="true" size={17} />
                <span>查看报告</span>
              </button>
            </article>
          ))}
        </div>
      ) : !selectedReport ? (
        <div className="empty-subpage">
          <History aria-hidden="true" size={30} />
          <strong>还没有历史报告</strong>
          <span>完成第一次动作诊断后，报告会保存在这台设备上。</span>
        </div>
      ) : null}
    </section>
  )
}

function PlaceholderView({ view }: { view: 'training' | 'movement' }) {
  const isTraining = view === 'training'
  const Icon = isTraining ? Dumbbell : ArrowLeftRight
  return (
    <section className="subpage" aria-labelledby="placeholder-title">
      <div className="placeholder-panel">
        <span className="placeholder-icon">
          <Icon aria-hidden="true" size={30} />
        </span>
        <span className="dashboard-kicker">{isTraining ? '03 / TRAINING' : '04 / MOVEMENT'}</span>
        <h1 id="placeholder-title">{isTraining ? '训练计划' : '动作切换'}</h1>
        <p>
          {isTraining
            ? '这里会根据你的诊断问题安排训练动作和练习节奏。'
            : '这里会切换到深蹲、引体向上等其他动作。'}
        </p>
        <button className="placeholder-button" type="button" disabled>
          {isTraining ? '训练计划即将开放' : '更多动作即将开放'}
        </button>
      </div>
    </section>
  )
}

function App() {
  const { clearVideo, error, metadata, selectVideo, selectedVideo } = useVideoSelection()
  const { analyzeFrame, analyzeVideo, clearResult, reset: resetPose, state: poseState } = usePoseLandmarker()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [localReports, setLocalReports] = useState<LocalReport[]>(() => listLocalReports())
  const savedReportVideoRef = useRef<string | null>(null)
  const [qualityCheck, setQualityCheck] = useState<VideoQualityResult | null>(null)
  const [isRetest, setIsRetest] = useState(false)
  const comparisonBaseRef = useRef<CoachReport | null>(null)
  const [reportSnapshot, setReportSnapshot] = useState<{
    report: CoachReport
    comparison?: ComparisonReport
  } | null>(null)
  const [showReport, setShowReport] = useState(false)
  const [activeView, setActiveView] = useState<AppView>('home')
  const [selectedHistoryReport, setSelectedHistoryReport] = useState<LocalReport | null>(null)

  useEffect(() => resetPose(), [selectedVideo?.url, resetPose])
  useEffect(() => {
    savedReportVideoRef.current = null
  }, [selectedVideo?.url])
  useEffect(() => {
    setQualityCheck(
      metadata.value
        ? checkVideoMetadata({
            duration: metadata.value.duration,
            videoWidth: metadata.value.width,
            videoHeight: metadata.value.height,
          })
        : null,
    )
  }, [metadata.value])

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
  const analysisQuality = useMemo(
    () => (jumpAnalysis ? checkAnalysisQuality(jumpAnalysis, metadata.value) : null),
    [jumpAnalysis, metadata.value],
  )
  const coachReport = useMemo(
    () =>
      jumpAnalysis && (!analysisQuality || analysisQuality.passed)
        ? buildCoachReport(jumpAnalysis)
        : undefined,
    [analysisQuality, jumpAnalysis],
  )
  const previousReport = comparisonBaseRef.current ?? localReports[0]?.coachReport
  const comparison = useMemo(
    () =>
      isRetest && previousReport && coachReport
        ? compareCoachReports(previousReport, coachReport)
        : undefined,
    [coachReport, isRetest, previousReport],
  )

  useEffect(() => {
    if (!selectedVideo || !coachReport || !jumpAnalysis || savedReportVideoRef.current === selectedVideo.url)
      return
    const saved = saveLocalReport({
      videoName: selectedVideo.file.name,
      videoSize: selectedVideo.file.size,
      analysis: jumpAnalysis,
      coachReport,
    })
    if (saved) {
      savedReportVideoRef.current = selectedVideo.url
      setLocalReports(listLocalReports())
    }
  }, [coachReport, jumpAnalysis, selectedVideo])

  useEffect(() => {
    if (!coachReport) return
    setReportSnapshot({ report: coachReport, comparison })
    setShowReport(true)
  }, [coachReport, comparison])

  const qualityMessage =
    qualityCheck && !qualityCheck.passed
      ? qualityCheck.issues[0]
      : analysisQuality && !analysisQuality.passed
        ? analysisQuality.issues[0]
        : null
  const qualityAdvice =
    qualityCheck && !qualityCheck.passed
      ? qualityCheck.advice[0]
      : analysisQuality && !analysisQuality.passed
        ? analysisQuality.advice[0]
        : null

  const handleRetestSelect = useCallback(
    (file: File | null) => {
      comparisonBaseRef.current = coachReport ?? localReports[0]?.coachReport ?? null
      setIsRetest(true)
      setShowReport(false)
      selectVideo(file)
    },
    [coachReport, localReports, selectVideo],
  )

  const handleReplaceVideo = useCallback(
    (file: File | null) => {
      setShowReport(false)
      selectVideo(file)
    },
    [selectVideo],
  )

  const handleOpenHistoryReport = useCallback((report: LocalReport) => {
    setSelectedHistoryReport(report)
  }, [])

  return (
    <div className="app-shell">
      <header className="topbar">
        <button
          className="brand"
          type="button"
          onClick={() => setActiveView('home')}
          aria-label="YS专属训练师首页"
        >
          <span className="brand-mark">YS</span>
          <span>专属训练师</span>
        </button>
        <div className="privacy-status">
          <ShieldCheck aria-hidden="true" size={17} />
          <span>本地处理</span>
        </div>
      </header>

      <div className="navigation-wrap">
        <MainNavigation activeView={activeView} onNavigate={setActiveView} />
      </div>

      <main>
        {activeView === 'home' ? <Dashboard reports={localReports} onNavigate={setActiveView} /> : null}
        {activeView === 'history' ? (
          <HistoryView
            reports={localReports}
            selectedReport={selectedHistoryReport}
            onOpenReport={handleOpenHistoryReport}
            onCloseReport={() => setSelectedHistoryReport(null)}
          />
        ) : null}
        {activeView === 'training' || activeView === 'movement' ? (
          <PlaceholderView view={activeView} />
        ) : null}
        {activeView === 'diagnosis' ? (
          <>
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
                    <VideoInput
                      icon={FolderOpen}
                      label="选择已有视频"
                      tone="secondary"
                      onSelect={selectVideo}
                    />
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
                            disabled={
                              poseState.phase === 'loading' || Boolean(qualityCheck && !qualityCheck.passed)
                            }
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
                    {qualityMessage ? (
                      <div className="quality-warning" role="alert">
                        <strong>暂时不能生成可靠诊断</strong>
                        <span>{qualityMessage}</span>
                        {qualityAdvice ? <span>{qualityAdvice}</span> : null}
                      </div>
                    ) : null}
                    {reportSnapshot ? (
                      <button
                        className="report-toggle"
                        type="button"
                        onClick={() => setShowReport((visible) => !visible)}
                        aria-expanded={showReport}
                      >
                        <FileText aria-hidden="true" size={18} />
                        <span>{showReport ? '收起诊断报告' : '查看诊断报告'}</span>
                      </button>
                    ) : null}
                    {reportSnapshot && showReport ? (
                      <AnalysisReport report={reportSnapshot.report} comparison={reportSnapshot.comparison} />
                    ) : null}
                    {reportSnapshot && showReport ? <LocalHistory reports={localReports} /> : null}
                    {reportSnapshot ? (
                      <div className="retest-prompt">
                        <div>
                          <strong>想看看训练有没有效果？</strong>
                          <span>再上传一次视频，系统会用同样的标准帮你做前后对比。</span>
                        </div>
                        <div className="retest-actions">
                          <VideoInput
                            capture="environment"
                            icon={Camera}
                            label="拍摄第二次视频"
                            tone="secondary"
                            onSelect={handleRetestSelect}
                          />
                          <VideoInput
                            icon={FolderOpen}
                            label="选择第二次视频"
                            tone="secondary"
                            onSelect={handleRetestSelect}
                          />
                        </div>
                      </div>
                    ) : null}
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
                        <VideoInput
                          icon={RotateCcw}
                          label="更换"
                          tone="secondary"
                          onSelect={handleReplaceVideo}
                        />
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
          </>
        ) : null}
      </main>

      <footer>
        <span>YS专属训练师</span>
        <span>当前阶段：动作指标分析</span>
      </footer>
    </div>
  )
}

export default App
