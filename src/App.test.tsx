import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const objectUrl = 'blob:http://localhost/jump-video'

describe('视频准备页', () => {
  const createObjectURL = vi.fn(() => objectUrl)
  const revokeObjectURL = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL,
      revokeObjectURL,
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('提供拍摄和本地选择两个视频入口', () => {
    const { container } = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /^动作诊断$/ }))

    expect(screen.getByRole('button', { name: '拍摄视频' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '选择已有视频' })).toBeInTheDocument()

    const captureInput = container.querySelector<HTMLInputElement>('input[capture="environment"]')
    expect(captureInput).toHaveAttribute('accept', 'video/*')
  })

  it('选择非视频文件时显示错误', () => {
    const { container } = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /^动作诊断$/ }))
    const libraryInput = container.querySelector<HTMLInputElement>('input:not([capture])')

    fireEvent.change(libraryInput!, {
      target: { files: [new File(['not-a-video'], 'jump.txt', { type: 'text/plain' })] },
    })

    expect(screen.getByRole('alert')).toHaveTextContent('该文件不是可识别的视频')
    expect(createObjectURL).not.toHaveBeenCalled()
  })

  it('选择视频后显示准备状态和文件信息', () => {
    const { container } = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /^动作诊断$/ }))
    const libraryInput = container.querySelector<HTMLInputElement>('input:not([capture])')
    const file = new File(['video-data'], '立定跳远.mp4', { type: 'video/mp4' })

    fireEvent.change(libraryInput!, { target: { files: [file] } })

    expect(screen.getByRole('status')).toHaveTextContent('视频已准备')
    expect(screen.getByText('立定跳远.mp4')).toBeInTheDocument()
    expect(createObjectURL).toHaveBeenCalledWith(file)
  })

  it('视频元数据就绪后提供当前帧识别入口', () => {
    const { container } = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /^动作诊断$/ }))
    const libraryInput = container.querySelector<HTMLInputElement>('input:not([capture])')

    fireEvent.change(libraryInput!, {
      target: { files: [new File(['video-data'], 'jump.mp4', { type: 'video/mp4' })] },
    })
    const video = container.querySelector('video')!
    Object.defineProperties(video, {
      duration: { configurable: true, value: 3.2 },
      videoWidth: { configurable: true, value: 1920 },
      videoHeight: { configurable: true, value: 1080 },
    })
    fireEvent.loadedMetadata(video)

    expect(screen.getByRole('button', { name: '识别当前帧' })).toBeInTheDocument()
    expect(screen.getByText('暂停到身体完整可见的一帧')).toBeInTheDocument()
    expect(screen.getByText('1920 × 1080')).toBeInTheDocument()
  })

  it('移除视频时释放对象 URL 并恢复选择入口', async () => {
    const { container } = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /^动作诊断$/ }))
    const libraryInput = container.querySelector<HTMLInputElement>('input:not([capture])')

    fireEvent.change(libraryInput!, {
      target: { files: [new File(['video-data'], 'jump.mp4', { type: 'video/mp4' })] },
    })
    fireEvent.click(screen.getByRole('button', { name: '移除视频' }))

    await waitFor(() => expect(revokeObjectURL).toHaveBeenCalledTimes(1))
    expect(revokeObjectURL).toHaveBeenCalledWith(objectUrl)
    expect(screen.getByRole('button', { name: '拍摄视频' })).toBeInTheDocument()
  })

  it('默认进入主界面并提供四个功能入口', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: '今天，先把这一跳看清楚。' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '动作诊断' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '历史报告' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '训练计划' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '动作切换' })).toBeInTheDocument()
  })

  it('训练计划和动作切换显示 MVP 占位状态', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /^训练计划$/ }))
    expect(screen.getByRole('heading', { name: '训练计划' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '训练计划即将开放' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: /^动作切换$/ }))
    expect(screen.getByRole('heading', { name: '动作切换' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '更多动作即将开放' })).toBeDisabled()
  })
})
