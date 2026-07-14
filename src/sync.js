// Garmin steps via intervals.icu wellness API.
// Basic auth: username API_KEY, password = the user's key.
// Athlete id 0 auto-resolves from the key.

const SYNC_KEY = 'cutlog-sync-v1'
const API_BASE = 'https://intervals.icu/api/v1'

export function getSyncConfig() {
  try {
    return JSON.parse(localStorage.getItem(SYNC_KEY)) ?? {}
  } catch {
    return {}
  }
}

export function setSyncConfig(patch) {
  const next = { ...getSyncConfig(), ...patch }
  localStorage.setItem(SYNC_KEY, JSON.stringify(next))
  return next
}

export function clearSyncConfig() {
  localStorage.removeItem(SYNC_KEY)
}

export async function fetchSteps(apiKey, oldestISO, newestISO) {
  let res
  try {
    res = await fetch(
      `${API_BASE}/athlete/0/wellness?oldest=${oldestISO}&newest=${newestISO}`,
      {
        headers: { Authorization: 'Basic ' + btoa('API_KEY:' + apiKey) },
        signal: AbortSignal.timeout(15000),
      }
    )
  } catch (e) {
    // fetch() only throws before a response is readable — network, CORS, or timeout
    if (e?.name === 'TimeoutError') {
      throw new Error('intervals.icu did not respond within 15s — Try again')
    }
    throw new Error('Could not reach intervals.icu (Offline, or the browser blocked the request)')
  }
  if (res.status === 401 || res.status === 403) {
    throw new Error('intervals.icu rejected the API key — Check it in Settings → Developer')
  }
  if (!res.ok) {
    throw new Error(`intervals.icu error (HTTP ${res.status})`)
  }
  const rows = await res.json()
  return (Array.isArray(rows) ? rows : [])
    .filter((r) => r.steps != null && r.id)
    .map((r) => ({ date: r.id, steps: r.steps }))
}
