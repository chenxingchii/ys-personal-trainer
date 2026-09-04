import { Check, Download, RefreshCw, ShieldAlert, X } from 'lucide-react'
import { useState } from 'react'
import './Admin.css'

type TrainingSample = {
  id: string
  created_at: string
  quality: number
  usable_frame_count: number
  analysis: { metrics?: Array<{ label: string; value?: number }>; phases?: Record<string, number> }
  champion_comparison?: { closeness?: number; summary?: string }
}

const issueOptions = [
  ['takeoff-insufficient', '蹬伸不足'],
  ['pre-squat-too-deep', '预蹲过深'],
  ['pre-squat-too-shallow', '预蹲不足'],
  ['arm-swing-small', '摆臂幅度不足'],
  ['landing-buffer-small', '落地缓冲不足'],
  ['landing-buffer-deep', '落地缓冲过深'],
]

export default function Admin() {
  const [token, setToken] = useState('')
  const [status, setStatus] = useState<'unreviewed' | 'reviewed' | 'excluded'>('unreviewed')
  const [samples, setSamples] = useState<TrainingSample[]>([])
  const [selected, setSelected] = useState<TrainingSample | null>(null)
  const [issues, setIssues] = useState<string[]>([])
  const [quality, setQuality] = useState<'usable' | 'uncertain' | 'invalid'>('usable')
  const [level, setLevel] = useState<'excellent' | 'pass' | 'needs-improvement' | 'unavailable'>(
    'needs-improvement',
  )
  const [note, setNote] = useState('')
  const [message, setMessage] = useState('请输入管理员令牌后加载样本。')

  async function loadSamples() {
    if (!token) return setMessage('请输入管理员令牌。')
    const response = await fetch(`/api/training-samples?status=${status}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) return setMessage((await response.json()).error ?? '样本加载失败。')
    setSamples((await response.json()) as TrainingSample[])
    setSelected(null)
    setMessage('样本已刷新。')
  }

  function chooseSample(sample: TrainingSample) {
    setSelected(sample)
    setIssues([])
    setQuality('usable')
    setLevel('needs-improvement')
    setNote('')
  }

  async function saveLabel(annotationStatus: 'reviewed' | 'excluded') {
    if (!selected) return
    const response = await fetch('/api/label-sample', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sampleId: selected.id,
        annotationStatus,
        expertLabels: { quality, issues, overallLevel: level, expertNote: note },
      }),
    })
    if (!response.ok) return setMessage((await response.json()).error ?? '标注保存失败。')
    setMessage('标注已保存。')
    await loadSamples()
  }

  async function exportDataset() {
    const response = await fetch('/api/training-dataset', { headers: { Authorization: `Bearer ${token}` } })
    if (!response.ok) return setMessage((await response.json()).error ?? '训练集导出失败。')
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'training-dataset-v1.jsonl'
    anchor.click()
    URL.revokeObjectURL(url)
    setMessage('训练集已导出。')
  }

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <span className="admin-kicker">YS TRAINER / INTERNAL</span>
          <h1>训练样本审核</h1>
        </div>
        <ShieldAlert aria-hidden="true" size={28} />
      </header>
      <section className="admin-toolbar">
        <label>
          管理员令牌
          <input type="password" value={token} onChange={(event) => setToken(event.target.value)} />
        </label>
        <label>
          样本状态
          <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
            <option value="unreviewed">待审核</option>
            <option value="reviewed">已审核</option>
            <option value="excluded">已排除</option>
          </select>
        </label>
        <button type="button" onClick={() => void loadSamples()}>
          <RefreshCw aria-hidden="true" size={16} /> 加载样本
        </button>
        <button type="button" onClick={() => void exportDataset()}>
          <Download aria-hidden="true" size={16} /> 导出训练集
        </button>
      </section>
      <p className="admin-message" role="status">
        {message}
      </p>
      <section className="admin-grid">
        <div className="sample-list">
          {samples.map((sample) => (
            <button
              className={selected?.id === sample.id ? 'sample-row sample-row--active' : 'sample-row'}
              type="button"
              key={sample.id}
              onClick={() => chooseSample(sample)}
            >
              <strong>{sample.id.slice(0, 12)}</strong>
              <span>{new Date(sample.created_at).toLocaleString('zh-CN')}</span>
              <span>
                质量 {Math.round(sample.quality * 100)}% · {sample.champion_comparison?.closeness ?? '--'}%
                接近冠军
              </span>
            </button>
          ))}
          {!samples.length ? <p className="admin-empty">当前筛选下没有样本。</p> : null}
        </div>
        <div className="sample-editor">
          {selected ? (
            <>
              <h2>样本标注</h2>
              <p className="sample-summary">
                {selected.champion_comparison?.summary ?? '暂无冠军比较摘要。'}
              </p>
              <label>
                样本质量
                <select
                  value={quality}
                  onChange={(event) => setQuality(event.target.value as typeof quality)}
                >
                  <option value="usable">可用于训练</option>
                  <option value="uncertain">需要复核</option>
                  <option value="invalid">无效样本</option>
                </select>
              </label>
              <label>
                整体等级
                <select value={level} onChange={(event) => setLevel(event.target.value as typeof level)}>
                  <option value="excellent">优秀</option>
                  <option value="pass">达标</option>
                  <option value="needs-improvement">待改进</option>
                  <option value="unavailable">无法判断</option>
                </select>
              </label>
              <fieldset>
                <legend>技术问题</legend>
                {issueOptions.map(([value, label]) => (
                  <label key={value} className="issue-option">
                    <input
                      type="checkbox"
                      checked={issues.includes(value)}
                      onChange={(event) =>
                        setIssues((current) =>
                          event.target.checked
                            ? [...current, value]
                            : current.filter((item) => item !== value),
                        )
                      }
                    />
                    {label}
                  </label>
                ))}
              </fieldset>
              <label>
                教练备注
                <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} />
              </label>
              <div className="editor-actions">
                <button type="button" onClick={() => void saveLabel('excluded')}>
                  <X aria-hidden="true" size={16} /> 排除样本
                </button>
                <button
                  type="button"
                  className="editor-actions--primary"
                  onClick={() => void saveLabel('reviewed')}
                >
                  <Check aria-hidden="true" size={16} /> 保存审核结果
                </button>
              </div>
            </>
          ) : (
            <p className="admin-empty">从左侧选择一个样本开始标注。</p>
          )}
        </div>
      </section>
    </main>
  )
}
