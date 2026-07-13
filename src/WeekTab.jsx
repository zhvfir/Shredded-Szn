import { useState } from 'react'
import { WORKOUT_SHORT, STEP_GOAL, totals, mondayOf, addDays, todayISO, fromISO } from './db.js'

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
    </>
  )
}

function fmtShort(iso) {
  return fromISO(iso).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })
}
