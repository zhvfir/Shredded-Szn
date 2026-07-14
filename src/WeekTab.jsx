import { useRef, useState } from 'react'
import { WORKOUT_SHORT, STEP_GOAL, totals, mondayOf, addDays, todayISO, fromISO, fmtDay } from './db.js'
import { getSyncConfig, setSyncConfig, clearSyncConfig, fetchSteps } from './sync.js'
import { pushSupported, remindersOn, enableReminders, disableReminders, sendTest } from './push.js'

export default function WeekTab({ store, openDay }) {
  const [weekStart, setWeekStart] = useState(mondayOf(todayISO()))
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const today = todayISO()

  const label = `${fmtShort(weekStart)} – ${fmtShort(addDays(weekStart, 6))}`

  return (
    <>
      <div className="week-nav">
        <button className="icon" onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label="Previous week">‹</button>
        <span className="label">{label}</span>
        <button className="icon" onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label="Next week">›</button>
        {weekStart !== mondayOf(today) && (
          <button className="icon" onClick={() => setWeekStart(mondayOf(today))}>Now</button>
        )}
      </div>

      {days.map((date) => {
        const day = store.getDay(date)
        const t = totals(day.foods)
        const stepPct = day.steps ? day.steps / STEP_GOAL : 0
        const stepClass = !day.steps ? 'dim' : stepPct >= 1 ? 'c-green' : stepPct >= 0.7 ? 'c-amber' : 'c-red'
        return (
          <button
            key={date}
            className={`week-day ${date === today ? 'today' : ''}`}
            onClick={() => openDay(date)}
          >
            <span className="wd">
              <span className="dn">{fromISO(date).toLocaleDateString('en-SG', { weekday: 'short' })}</span>
              <br />
              <span className="dt">{fromISO(date).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })}</span>
            </span>
            <span className="tags">
              {day.workouts.map((w) => (
                <span key={w} className="chip small">
                  {w === 'Run' && day.runNote ? `Run · ${titleCase(day.runNote)}` : WORKOUT_SHORT[w]}
                </span>
              ))}
              {t.kcal > 0 && <span className="chip small dim">{Math.round(t.kcal / 5) * 5} kcal</span>}
            </span>
            <span className={`steps ${stepClass}`}>
              {day.steps ? `${(day.steps / 1000).toFixed(1)}k steps` : '—'}
            </span>
          </button>
        )
      })}

      <RemindersCard />
      <SyncCard store={store} />
      <DataCard store={store} />
    </>
  )
}

function SyncCard({ store }) {
  const [cfg, setCfg] = useState(getSyncConfig)
  const [keyInput, setKeyInput] = useState('')
  const [status, setStatus] = useState(cfg.lastStatus ?? '')
  const [busy, setBusy] = useState(false)

  const saveKey = () => {
    const apiKey = keyInput.trim()
    if (!apiKey) return
    setCfg(setSyncConfig({ apiKey }))
    setKeyInput('')
  }

  const removeKey = () => {
    if (!confirm('Remove the intervals.icu API key from this device?')) return
    clearSyncConfig()
    setCfg({})
    setStatus('')
  }

  const syncNow = async () => {
    setBusy(true)
    setStatus('Syncing…')
    try {
      const rows = await fetchSteps(cfg.apiKey, addDays(todayISO(), -14), todayISO())
      const filled = store.applySyncedSteps(rows)
      const msg = `Last sync: ${fmtDay(todayISO())} — ${filled} day${filled === 1 ? '' : 's'} updated`
      setStatus(msg)
      setCfg(setSyncConfig({ lastSync: Date.now(), lastStatus: msg }))
    } catch (e) {
      setStatus(e.message)
      setSyncConfig({ lastStatus: e.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section style={{ marginTop: 24 }}>
      <div className="sec">Garmin Sync</div>
      <div className="card">
        {!cfg.apiKey ? (
          <>
            <div className="dim" style={{ fontSize: 13, marginBottom: 10 }}>
              Auto-fill daily steps from your Garmin via intervals.icu.
              Connect Garmin at intervals.icu, then paste your API key
              (Settings → Developer) here.
            </div>
            <div className="add-row" style={{ marginTop: 0 }}>
              <input
                type="password"
                placeholder="intervals.icu API key"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveKey()}
                style={{ flex: 1, width: 'auto' }}
              />
              <button className="primary" onClick={saveKey}>Save</button>
            </div>
          </>
        ) : (
          <>
            <div className="add-row" style={{ marginTop: 0 }}>
              <button className="primary" style={{ flex: 1 }} onClick={syncNow} disabled={busy}>
                {busy ? 'Syncing…' : 'Sync Steps Now'}
              </button>
              <button onClick={removeKey}>Remove Key</button>
            </div>
            {status && (
              <div className="dim" style={{ fontSize: 12, marginTop: 8 }}>{status}</div>
            )}
            <div className="dim" style={{ fontSize: 12, marginTop: 4 }}>
              Steps you typed in yourself are never overwritten.
            </div>
          </>
        )}
      </div>
    </section>
  )
}

function RemindersCard() {
  const [on, setOn] = useState(remindersOn())
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const supported = pushSupported()

  const enable = async () => {
    setBusy(true); setStatus('')
    try { await enableReminders(); setOn(true) }
    catch (e) { setStatus(e.message) }
    finally { setBusy(false) }
  }
  const disable = async () => {
    setBusy(true); setStatus('')
    try { await disableReminders(); setOn(false) }
    catch (e) { setStatus(e.message) }
    finally { setBusy(false) }
  }
  const test = async () => {
    setBusy(true); setStatus('')
    try { await sendTest(); setStatus('Test sent — check your notifications.') }
    catch (e) { setStatus(e.message) }
    finally { setBusy(false) }
  }

  return (
    <section style={{ marginTop: 24 }}>
      <div className="sec">Reminders</div>
      <div className="card">
        {!supported ? (
          <div className="dim" style={{ fontSize: 13 }}>
            Add the app to your Home Screen and open it from there to enable reminders.
          </div>
        ) : !on ? (
          <>
            <div className="dim" style={{ fontSize: 13, marginBottom: 10 }}>
              Daily push reminders: Weigh-In 06:00, Daily Review 21:00, Supplements 22:00.
            </div>
            <button className="primary" style={{ width: '100%' }} onClick={enable} disabled={busy}>
              {busy ? 'Enabling…' : 'Enable Reminders'}
            </button>
          </>
        ) : (
          <>
            <ul className="supp-list" style={{ marginBottom: 10 }}>
              <li><span>Weigh-In</span><span className="num dim" style={{ fontSize: 13 }}>06:00</span></li>
              <li><span>Daily Review</span><span className="num dim" style={{ fontSize: 13 }}>21:00</span></li>
              <li><span>Supplements</span><span className="num dim" style={{ fontSize: 13 }}>22:00</span></li>
            </ul>
            <div className="add-row" style={{ marginTop: 0 }}>
              <button style={{ flex: 1 }} onClick={test} disabled={busy}>Send Test Notification</button>
              <button onClick={disable} disabled={busy}>Disable</button>
            </div>
          </>
        )}
        {status && <div className="dim" style={{ fontSize: 12, marginTop: 8 }}>{status}</div>}
      </div>
    </section>
  )
}

function DataCard({ store }) {
  const fileRef = useRef(null)

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(store.exportJSON(), null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `shredded-szn-backup-${todayISO()}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const onImportFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const data = JSON.parse(await file.text())
      if (!data || typeof data.days !== 'object' || !Array.isArray(data.weights)) {
        alert('That file is not a Shredded Szn backup.')
        return
      }
      const dayCount = Object.keys(data.days).length
      const from = data.exportedAt ? fmtDay(data.exportedAt.slice(0, 10)) : 'unknown date'
      if (confirm(`Replace the current log with the backup from ${from}? (${dayCount} days, ${data.weights.length} weigh-in${data.weights.length === 1 ? '' : 's'})`)) {
        store.replaceState(data)
      }
    } catch {
      alert('Could not read that file as JSON.')
    }
  }

  return (
    <section style={{ marginTop: 24 }}>
      <div className="sec">Data</div>
      <div className="card">
        <div className="add-row" style={{ marginTop: 0 }}>
          <button style={{ flex: 1 }} onClick={exportBackup}>Export Backup</button>
          <button style={{ flex: 1 }} onClick={() => fileRef.current?.click()}>Import Backup</button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          onChange={onImportFile}
          style={{ display: 'none' }}
          aria-label="Import backup file"
        />
        <div className="dim" style={{ fontSize: 12, marginTop: 8 }}>
          Your log lives only on this device. Export a backup now and then — Importing replaces everything with the backup.
        </div>
        <div className="dim" style={{ fontSize: 11, marginTop: 6 }}>
          Version {__APP_VERSION__}
        </div>
      </div>
    </section>
  )
}

// Display-only: run notes are free text; show them formally without
// changing what was typed. Distances use capital K (5k → 5K).
function titleCase(s) {
  return s.replace(/\b[a-z]/g, (c) => c.toUpperCase()).replace(/(\d)k\b/gi, '$1K')
}

function fmtShort(iso) {
  return fromISO(iso).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })
}
