// Push reminders — talks to the Cloudflare Worker push server.
// PUSH_BASE is filled in after the worker's first deploy (its workers.dev
// subdomain is only known then).
const PUSH_BASE = 'https://shredded-szn-push.zhafiriduan.workers.dev'
const FLAG = 'cutlog-push'

export function pushSupported() {
  return (
    typeof Notification !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  )
}

export function remindersOn() {
  return localStorage.getItem(FLAG) === '1'
}

function b64urlToBytes(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/')
  while (s.length % 4) s += '='
  const bin = atob(s)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function reg() {
  return navigator.serviceWorker.ready
}

export async function enableReminders() {
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') throw new Error('Notifications were not allowed')
  const res = await fetch(`${PUSH_BASE}/vapid`)
  if (!res.ok) throw new Error('Could not reach the reminder server')
  const { key } = await res.json()
  const r = await reg()
  const sub = await r.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: b64urlToBytes(key),
  })
  const sr = await fetch(`${PUSH_BASE}/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sub),
  })
  if (!sr.ok) throw new Error('Could not register for reminders')
  localStorage.setItem(FLAG, '1')
}

export async function disableReminders() {
  const r = await reg()
  const sub = await r.pushManager.getSubscription()
  if (sub) {
    await fetch(`${PUSH_BASE}/unsubscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    }).catch(() => {})
    await sub.unsubscribe().catch(() => {})
  }
  localStorage.removeItem(FLAG)
}

export async function sendTest() {
  const r = await reg()
  const sub = await r.pushManager.getSubscription()
  if (!sub) throw new Error('Enable reminders first')
  const res = await fetch(`${PUSH_BASE}/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: sub.endpoint }),
  })
  if (!res.ok) throw new Error('Test failed (HTTP ' + res.status + ')')
}
