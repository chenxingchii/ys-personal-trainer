const CACHE_VERSION = 'ys-trainer-shell-v2'
// 部署基准路径：Vercel 根路径部署时为 `/`；GitHub Pages 子路径部署时为 `/ys-personal-trainer/`。
// 从 SW 作用域推导，保证缓存键与页面真实请求路径一致。
const basePath = new URL(self.registration.scope).pathname
const atBase = (file) => basePath + file

const SHELL_CACHE = [
  basePath,
  atBase('index.html'),
  atBase('manifest.webmanifest'),
  atBase('favicon.svg'),
  atBase('side-jump-guide.svg'),
  atBase('icons/icon-192.svg'),
  atBase('icons/icon-512.svg'),
]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL_CACHE)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))),
      ),
  )
  self.clients.claim()
})

function putInCache(request, response) {
  if (!response || response.status !== 200 || response.type !== 'basic') return
  const copy = response.clone()
  caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy))
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // 页面导航走「网络优先」：否则旧的 index.html 会一直命中缓存，
  // 它引用的旧 bundle 让用户永远看不到新版本（缓存版本号曾长期停在 v1）。
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          putInCache(request, response)
          return response
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached || caches.match(basePath))
            .then((cached) => cached || Response.error()),
        ),
    )
    return
  }

  // 其余静态资源仍缓存优先：构建产物文件名带内容 hash，内容不会变。
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached

      return fetch(request).then((response) => {
        putInCache(request, response)
        return response
      })
    }),
  )
})
