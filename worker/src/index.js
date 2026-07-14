// Shredded Szn push server (Cloudflare Worker).
// Stores browser push subscriptions in KV and sends payload-less Web Push
// notifications on a cron schedule. Payload-less avoids RFC 8291 body
// encryption entirely — the service worker picks the message by clock time
// (the three reminders sit at distinct hours). Only VAPID (RFC 8292) signing
// is needed, done here with WebCrypto.

const ALLOW_ORIGIN = 'https://zhvfir.github.io'
const SUBJECT = 'mailto:zhafiriduan@gmail.com'

function cors(extra = {}) {
  return {
    'Access-Control-Allow-Origin': ALLOW_ORIGIN,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    ...extra,
  }
}

// ---- base64url ----
function b64urlEncode(buf) {
  const bytes = new Uint8Array(buf)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function sha256Hex(str) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

// ---- VAPID keypair (generated once, persisted in KV) ----
async function getVapid(env) {
  let stored = await env.SUBS.get('vapid', 'json')
  if (!stored) {
    const kp = await crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']
    )
    const priv = await crypto.subtle.exportKey('jwk', kp.privateKey)
    const pubRaw = await crypto.subtle.exportKey('raw', kp.publicKey) // 65-byte point
    stored = { priv, pub: b64urlEncode(pubRaw) }
    await env.SUBS.put('vapid', JSON.stringify(stored))
  }
  return stored
}

async function signVapidJWT(vapid, audience) {
  const header = b64urlEncode(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const payload = b64urlEncode(new TextEncoder().encode(JSON.stringify({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: SUBJECT,
  })))
  const unsigned = `${header}.${payload}`
  const key = await crypto.subtle.importKey(
    'jwk', vapid.priv, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(unsigned)
  )
  return `${unsigned}.${b64urlEncode(sig)}` // WebCrypto ECDSA sig is already r||s (ES256)
}

async function sendPush(sub, vapid) {
  const audience = new URL(sub.endpoint).origin
  const jwt = await signVapidJWT(vapid, audience)
  return fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      Authorization: `vapid t=${jwt}, k=${vapid.pub}`,
      TTL: '2419200',
      'Content-Length': '0',
    },
  })
}

async function broadcast(env) {
  const vapid = await getVapid(env)
  const list = await env.SUBS.list({ prefix: 'sub:' })
  for (const k of list.keys) {
    const sub = await env.SUBS.get(k.name, 'json')
    if (!sub) continue
    try {
      const res = await sendPush(sub, vapid)
      if (res.status === 404 || res.status === 410) await env.SUBS.delete(k.name)
    } catch {
      // isolate: one bad subscription must not block the rest
    }
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors() })

    if (url.pathname === '/vapid' && request.method === 'GET') {
      const vapid = await getVapid(env)
      return Response.json({ key: vapid.pub }, { headers: cors() })
    }

    if (url.pathname === '/subscribe' && request.method === 'POST') {
      const sub = await request.json()
      if (!sub?.endpoint) return new Response('bad', { status: 400, headers: cors() })
      await env.SUBS.put('sub:' + (await sha256Hex(sub.endpoint)), JSON.stringify(sub))
      return Response.json({ ok: true }, { headers: cors() })
    }

    if (url.pathname === '/unsubscribe' && request.method === 'POST') {
      const { endpoint } = await request.json()
      if (endpoint) await env.SUBS.delete('sub:' + (await sha256Hex(endpoint)))
      return Response.json({ ok: true }, { headers: cors() })
    }

    if (url.pathname === '/test' && request.method === 'POST') {
      const { endpoint } = await request.json()
      const vapid = await getVapid(env)
      const key = 'sub:' + (await sha256Hex(endpoint || ''))
      const sub = await env.SUBS.get(key, 'json')
      if (!sub) return new Response('no sub', { status: 404, headers: cors() })
      try {
        const res = await sendPush(sub, vapid)
        return Response.json({ ok: res.ok, status: res.status }, { headers: cors() })
      } catch (e) {
        return Response.json({ ok: false, error: String(e) }, { status: 502, headers: cors() })
      }
    }

    return new Response('Shredded Szn push server', { headers: cors() })
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(broadcast(env))
  },
}
