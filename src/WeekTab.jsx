import { useRef, useState } from 'react'
import { WORKOUT_SHORT, STEP_GOAL, totals, mondayOf, addDays, todayISO, fromISO, fmtDay } from './db.js'

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
          <button className="icon" onClick={() => setWeekStart(mondayOf(today))}>now</button>
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
                  {w === 'Run' && day.runNote ? `Run · ${day.runNote}` : WORKOUT_SHORT[w]}
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

      <DataCard store={store} />
    </>
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
      if (confirm(`Replace the current log with the backup from ${from}? (${dayCount} days, ${data.weights.length} weigh-ins)`)) {
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
          <button style={{ flex: 1 }} onClick={exportBackup}>Export backup</button>
          <button style={{ flex: 1 }} onClick={() => fileRef.current?.click()}>Import backup</button>
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
          Your log lives only on this device. Export a backup now and then — importing replaces everything with the backup.
        </div>
      </div>
    </section>
  )
}

function fmtShort(iso) {
  return fromISO(iso).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })
}
