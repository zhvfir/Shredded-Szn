// Network-first with cache fallback: the app keeps working offline
// after the first successful load. Data itself lives in localStorage.
const CACHE = 'cutlog-shell-v2'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) =>
  e.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  )
)

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return
  // Leave cross-origin requests (e.g. intervals.icu API) untouched
  if (new URL(e.request.url).origin !== self.location.origin) return
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

// --- Push reminders ---
// Pushes are payload-less; pick the message by the nearest scheduled time
// (device clock, which is SGT for this user). Slots are >=60 min apart so a
// short delivery delay still lands on the right reminder.
self.addEventListener('push', (event) => {
  const slots = [
    { t: 6 * 60,  title: 'Weigh-In',     body: 'Log your morning weight before breakfast.' },
    { t: 21 * 60, title: 'Daily Review', body: 'Log any missed meals, steps and workout.' },
    { t: 22 * 60, title: 'Supplements',  body: 'Creatine + Magnesium Glycinate.' },
  ]
  const now = new Date()
  const mins = now.getHours() * 60 + now.getMinutes()
  let best = slots[0], bestD = Infinity
  for (const s of slots) {
    const d = Math.abs(s.t - mins)
    if (d < bestD) { bestD = d; best = s }
  }
  event.waitUntil(
    self.registration.showNotification(best.title, {
      body: best.body,
      icon: './icon-512.png',
      badge: './icon-512.png',
      tag: best.title,
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) return c.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow('./')
    })
  )
})
