import { describe, expect, it, vi } from 'vitest'
import { createWithDelegateFallback, GPU_FALLBACK_REASON } from './delegateFallback'

describe('createWithDelegateFallback', () => {
  it('GPU 初始化成功时不创建 CPU 实例', async () => {
    const create = vi.fn().mockResolvedValue('gpu-landmarker')

    await expect(createWithDelegateFallback(create)).resolves.toEqual({
      value: 'gpu-landmarker',
      delegate: 'GPU',
    })
    expect(create).toHaveBeenCalledOnce()
    expect(create).toHaveBeenCalledWith('GPU')
  })

  it('GPU 初始化失败后自动回退 CPU', async () => {
    const create = vi
      .fn()
      .mockRejectedValueOnce(new Error('GPU unavailable'))
      .mockResolvedValueOnce('cpu-landmarker')
    const attempts = vi.fn()

    await expect(createWithDelegateFallback(create, attempts)).resolves.toEqual({
      value: 'cpu-landmarker',
      delegate: 'CPU',
      fallbackReason: GPU_FALLBACK_REASON,
    })
    expect(create).toHaveBeenNthCalledWith(1, 'GPU')
    expect(create).toHaveBeenNthCalledWith(2, 'CPU')
    expect(attempts.mock.calls).toEqual([['GPU'], ['CPU']])
  })

  it('CPU 也初始化失败时向上返回错误', async () => {
    const create = vi
      .fn()
      .mockRejectedValueOnce(new Error('GPU unavailable'))
      .mockRejectedValueOnce(new Error('CPU unavailable'))

    await expect(createWithDelegateFallback(create)).rejects.toThrow('CPU unavailable')
  })
})
