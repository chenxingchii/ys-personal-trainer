export type ApiRequest = {
  method?: string
  body?: unknown
  headers?: Record<string, string | string[] | undefined>
  query?: Record<string, string | string[] | undefined>
}

export type ApiResponse = {
  status: (code: number) => ApiResponse
  json: (body: unknown) => void
  send: (body: string) => void
  setHeader: (name: string, value: string) => void
}

export function adminAuthorized(request: ApiRequest) {
  const configuredToken = process.env.ADMIN_TOKEN
  const authorization = request.headers?.authorization
  const token = Array.isArray(authorization) ? authorization[0] : authorization
  return Boolean(configuredToken && token === `Bearer ${configuredToken}`)
}

export function supabaseConfig() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  return url && key ? { url: url.replace(/\/$/, ''), key } : undefined
}

export async function supabaseRequest(path: string, init: RequestInit = {}) {
  const config = supabaseConfig()
  if (!config) return undefined
  return fetch(`${config.url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
}
