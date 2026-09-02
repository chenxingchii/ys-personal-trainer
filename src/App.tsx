import { Camera, Check, FileVideo, FolderOpen, RotateCcw, ShieldCheck, Trash2 } from 'lucide-react'
import { useRef } from 'react'
import './App.css'
import { useVideoSelection } from './capture/useVideoSelection'
import { formatBytes, formatDuration } from './capture/video'

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

function App() {
  const { clearVideo, error, metadata, selectVideo, selectedVideo } = useVideoSelection()

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
                    key={selectedVideo.url}
                    src={selectedVideo.url}
                    controls
                    playsInline
                    preload="metadata"
                    onLoadedMetadata={metadata.handleLoadedMetadata}
                    onError={metadata.handleVideoError}
                  />
                  {!metadata.value ? <div className="video-loading">正在读取视频信息</div> : null}
                </div>
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
        <span>当前阶段：视频准备</span>
      </footer>
    </div>
  )
}

export default App
