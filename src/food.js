// AI food lookup — asks the Cloudflare Worker (which holds the Anthropic API
// key server-side; it is never shipped to the browser) to estimate macros for
// a free-text food description. Recent results are cached in localStorage so
// repeat lookups are instant and free.
const BASE = 'https://shredded-szn-push.zhafiriduan.workers.dev'
const CACHE_KEY = 'cutlog-food-cache'
const MAX_CACHED = 30

function readCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY)) || {}
  } catch {
    return {}
  }
}

function writeCache(cache) {
  // Keep only the most recent lookups so the cache can't grow without bound.
  const trimmed = Object.entries(cache)
    .sort((a, b) => b[1].at - a[1].at)
    .slice(0, MAX_CACHED)
  localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(trimmed)))
}

export async function lookupFood(query) {
  const q = query.trim()
  if (!q) throw new Error('Type a food to look up.')
  const key = q.toLowerCase()

  const cache = readCache()
  if (cache[key]) return cache[key].food

  let res
  try {
    res = await fetch(`${BASE}/food`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: q }),
      signal: AbortSignal.timeout(20000),
    })
  } catch {
    throw new Error('Could not reach the food estimator. Check your connection.')
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Estimate failed (HTTP ${res.status})`)
  if (!data.food) throw new Error('No estimate came back — try rephrasing.')

  cache[key] = { food: data.food, at: Date.now() }
  writeCache(cache)
  return data.food
}
