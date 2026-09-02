import type { PoseDelegate } from './types'

export const GPU_FALLBACK_REASON = 'GPU 初始化失败，已自动切换到 CPU。'

export async function createWithDelegateFallback<T>(
  create: (delegate: PoseDelegate) => Promise<T>,
  onAttempt?: (delegate: PoseDelegate) => void,
) {
  onAttempt?.('GPU')
  try {
    return { value: await create('GPU'), delegate: 'GPU' as const }
  } catch {
    onAttempt?.('CPU')
    return {
      value: await create('CPU'),
      delegate: 'CPU' as const,
      fallbackReason: GPU_FALLBACK_REASON,
    }
  }
}
