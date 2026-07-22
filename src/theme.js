// Light / Dark / Auto theming. The whole app draws from CSS variables, so a
// theme is just which variable set is active. We resolve the effective theme in
// JS and stamp data-theme on <html>; index.css supplies the light override.
const KEY = 'cutlog-theme' // 'light' | 'dark' | 'auto'
const BG = { light: '#EEF2F6', dark: '#0D1117' }

export function getThemePref() {
  const v = localStorage.getItem(KEY)
  return v === 'light' || v === 'dark' || v === 'auto' ? v : 'dark'
}

function systemPrefersLight() {
  return typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: light)').matches
    : false
}

export function resolveTheme(pref = getThemePref()) {
  if (pref === 'auto') return systemPrefersLight() ? 'light' : 'dark'
  return pref === 'light' ? 'light' : 'dark'
}

// Apply the current preference to the document: data-theme drives the CSS
// variables, and we keep the root background + iOS status-bar colour in sync so
// nothing flashes the wrong colour at the edges.
export function applyTheme() {
  const eff = resolveTheme()
  const root = document.documentElement
  root.dataset.theme = eff
  root.style.background = BG[eff]
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', BG[eff])
}

export function setThemePref(pref) {
  localStorage.setItem(KEY, pref)
  applyTheme()
}

export function initTheme() {
  applyTheme()
  if (typeof window !== 'undefined' && window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const onChange = () => { if (getThemePref() === 'auto') applyTheme() }
    if (mq.addEventListener) mq.addEventListener('change', onChange)
    else if (mq.addListener) mq.addListener(onChange)
  }
}
