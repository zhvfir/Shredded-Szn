import { useEffect, useState } from 'react'
import { useCutLog } from './store.js'
import { todayISO, addDays } from './db.js'
import { getSyncConfig, setSyncConfig, fetchSteps } from './sync.js'
import TodayTab from './TodayTab.jsx'
import LogTab from './LogTab.jsx'
import WeightTab from './WeightTab.jsx'
import WeekTab from './WeekTab.jsx'
import SettingsView from './SettingsView.jsx'

const LogoMark = () => (
  <img src={`${import.meta.env.BASE_URL}logo-mark.png`} alt="" aria-hidden="true" />
)

const ICONS = {
  today: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  ),
  log: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  ),
  weight: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17l6-6 4 4 8-9" />
      <path d="M21 10V6h-4" />
    </svg>
  ),
  week: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  ),
}

export default function App() {
  const store = useCutLog()
  const [tab, setTab] = useState('today')
  const [date, setDate] = useState(todayISO())
  const [settingsOpen, setSettingsOpen] = useState(false)

  const openDay = (d) => {
    setDate(d)
    setTab('today')
  }

  // Silent background sync on launch, at most hourly; failures only
  // surface in the Sync card's status, never block the app.
  useEffect(() => {
    const cfg = getSyncConfig()
    if (!cfg.apiKey || Date.now() - (cfg.lastSync ?? 0) < 3600_000) return
    fetchSteps(cfg.apiKey, addDays(todayISO(), -14), todayISO())
      .then((rows) => {
        const filled = store.applySyncedSteps(rows)
        setSyncConfig({ lastSync: Date.now(), lastStatus: `Auto-synced — ${filled} day${filled === 1 ? '' : 's'} updated` })
      })
      .catch((e) => setSyncConfig({ lastStatus: e.message }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (settingsOpen) {
    return (
      <>
        <div className="header">
          <h1>Shredded Szn</h1>
        </div>
        <SettingsView store={store} onBack={() => setSettingsOpen(false)} />
      </>
    )
  }

  return (
    <>
      <div className="header">
        <h1>Shredded Szn</h1>
        <button className="logo-btn" onClick={() => setSettingsOpen(true)} aria-label="Settings">
          <LogoMark />
        </button>
      </div>

      {tab === 'today' && (
        <TodayTab store={store} date={date} setDate={setDate} goLog={() => setTab('log')} openSettings={() => setSettingsOpen(true)} />
      )}
      {tab === 'log' && <LogTab store={store} date={date} setDate={setDate} />}
      {tab === 'weight' && <WeightTab store={store} openSettings={() => setSettingsOpen(true)} />}
      {tab === 'week' && <WeekTab store={store} openDay={openDay} />}

      <nav className="tabbar">
        {[
          ['today', 'Today'],
          ['log', 'Log'],
          ['weight', 'Weight'],
          ['week', 'Week'],
        ].map(([k, label]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)} aria-label={label}>
            {ICONS[k]}
            {label}
          </button>
        ))}
      </nav>
    </>
  )
}
