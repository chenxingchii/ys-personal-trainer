const CACHE_VERSION = 'ys-trainer-shell-v1'
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

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached

      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') return response
        const copy = response.clone()
        caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy))
        return response
      })
    }),
  )
})
