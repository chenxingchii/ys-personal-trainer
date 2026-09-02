import { describe, expect, it } from 'vitest'
import { formatBytes, formatDuration, isVideoFile } from './video'

describe('isVideoFile', () => {
  it('识别视频 MIME 类型', () => {
    expect(isVideoFile(new File([], 'jump.mp4', { type: 'video/mp4' }))).toBe(true)
  })

  it('拒绝非视频文件和缺少 MIME 类型的文件', () => {
    expect(isVideoFile(new File([], 'jump.jpg', { type: 'image/jpeg' }))).toBe(false)
    expect(isVideoFile(new File([], 'jump.mp4'))).toBe(false)
  })
})

describe('formatBytes', () => {
  it.each([
    [0, '0 B'],
    [1023, '1023 B'],
    [1024, '1.0 KB'],
    [10 * 1024, '10 KB'],
    [1.5 * 1024 * 1024, '1.5 MB'],
    [2 * 1024 * 1024 * 1024, '2.0 GB'],
  ])('将 %d 字节格式化为 %s', (bytes, expected) => {
    expect(formatBytes(bytes)).toBe(expected)
  })
})

describe('formatDuration', () => {
  it.each([
    [0, '0:00'],
    [9.6, '0:10'],
    [65, '1:05'],
    [3599.5, '60:00'],
  ])('将 %d 秒格式化为 %s', (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected)
  })

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -1])('无效时长 %s 使用占位符', (seconds) => {
    expect(formatDuration(seconds)).toBe('--:--')
  })
})
