import { useRef, useState } from 'react'
import { addDays, todayISO, fmtDay } from './db.js'
import { getSyncConfig, setSyncConfig, clearSyncConfig, fetchSteps } from './sync.js'
import { pushSupported, remindersOn, enableReminders, disableReminders, sendTest } from './push.js'

export default function SettingsView({ store, onBack }) {
  return (
    <>
      <div className="settings-head">
        <button className="icon" onClick={onBack} aria-label="Back">‹</button>
        <span className="label">Settings</span>
        <span style={{ width: 40 }} />
      </div>
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
