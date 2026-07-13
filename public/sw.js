// Network-first with cache fallback: the app keeps working offline
// after the first successful load. Data itself lives in localStorage.
const CACHE = 'cutlog-shell-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      try {
        const fresh = await fetch(e.request)
        if (new URL(e.request.url).origin === self.location.origin) {
          cache.put(e.request, fresh.clone())
        }
        return fresh
      } catch {
        const cached = await cache.match(e.request, { ignoreSearch: true })
        if (cached) return cached
        if (e.request.mode === 'navigate') {
          const shell = await cache.match('./index.html')
          if (shell) return shell
        }
        throw new Error('offline and not cached')
      }
    })
  )
})
