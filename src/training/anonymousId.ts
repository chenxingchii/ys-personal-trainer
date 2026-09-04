const STORAGE_KEY = 'ys-personal-trainer.anonymous-athlete-id.v1'

export function getAnonymousAthleteId() {
  if (typeof window === 'undefined') return 'server'
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY)
    if (existing) return existing
    const generated = `athlete-${crypto.randomUUID()}`
    window.localStorage.setItem(STORAGE_KEY, generated)
    return generated
  } catch {
    return `session-${Math.random().toString(36).slice(2)}`
  }
}
