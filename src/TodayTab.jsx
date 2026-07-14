import { useState } from 'react'
import { TARGETS, STEP_GOAL, WORKOUT_TYPES, totals } from './db.js'
import DateNav from './DateNav.jsx'

const r5 = (x) => Math.round(x / 5) * 5
const r1 = (x) => Math.round(x)

export function macroColor(kind, pct) {
  if (kind === 'p') {
    // goal macro: hitting or exceeding is good
    if (pct >= 95) return 'var(--green)'
    if (pct >= 75) return 'var(--amber)'
    return 'var(--red)'
  }
  // limit macros: staying at/under target is good
  if (pct <= 100) return 'var(--green)'
  if (pct <= 110) return 'var(--amber)'
  return 'var(--red)'
}

function MacroDashboard({ day, goLog }) {
  const t = totals(day.foods)
  const eaten = r5(t.kcal)
  const left = TARGETS.kcal - eaten
  const kcalPct = (eaten / TARGETS.kcal) * 100
  const minis = [
    { kind: 'p', name: 'Protein', val: r1(t.p), target: TARGETS.p },
    { kind: 'c', name: 'Carbs', val: r1(t.c), target: TARGETS.c },
    { kind: 'f', name: 'Fat', val: r1(t.f), target: TARGETS.f },
  ]
  return (
    <section>
      <div className="sec">Calories</div>
      <div className="card hero">
        <div className="hero-num num">
          {Math.abs(left)}
          <span className="hero-unit"> kcal {left >= 0 ? 'left' : 'over'}</span>
        </div>
        <div className="hero-sub">{eaten} of {TARGETS.kcal} eaten</div>
        <div className="bar big" role="progressbar" aria-valuenow={eaten} aria-valuemax={TARGETS.kcal} aria-label="Calories">
          <div style={{ width: `${Math.min(kcalPct, 100)}%`, background: macroColor('kcal', kcalPct) }} />
        </div>
        {t.bufferKcal > 0 && (
          <div className="buffer-note">+ ~{r5(t.bufferKcal)} kcal fruit buffer (untracked)</div>
        )}
      </div>
      <div className="macro-minis">
        {minis.map((m) => {
          const pct = (m.val / m.target) * 100
          return (
            <div className="mini" key={m.kind}>
              <div className="k">{m.name}</div>
              <div className="v num">
                {m.val}<span className="t"> / {m.target}g</span>
              </div>
              <div className="bar" role="progressbar" aria-valuenow={m.val} aria-valuemax={m.target} aria-label={m.name}>
                <div style={{ width: `${Math.min(pct, 100)}%`, background: macroColor(m.kind, pct) }} />
              </div>
            </div>
          )
        })}
      </div>
      <button style={{ marginTop: 10, width: '100%' }} onClick={goLog}>
        Log food →
      </button>
    </section>
  )
}

function WorkoutCard({ day, date, updateDayFn }) {
  const toggle = (type) =>
    updateDayFn(date, (d) => ({
      workouts: d.workouts.includes(type)
        ? d.workouts.filter((w) => w !== type)
        : [...d.workouts, type],
    }))

  return (
    <section>
      <div className="sec">Workout</div>
      <div className="card">
        <div className="chips">
          {WORKOUT_TYPES.map((t) => (
            <button
              key={t}
              className={`chip ${day.workouts.includes(t) ? 'on' : ''}`}
              onClick={() => toggle(t)}
              aria-pressed={day.workouts.includes(t)}
            >
              {t}
            </button>
          ))}
        </div>
        {day.workouts.includes('Run') && (
          <div className="run-note">
            <input
              placeholder="Run type — easy 5k, intervals, 4x4 Norwegian…"
              value={day.runNote}
              onChange={(e) => updateDayFn(date, () => ({ runNote: e.target.value }))}
            />
          </div>
        )}
      </div>
    </section>
  )
}

function StepsCard({ day, date, updateDayFn }) {
  const steps = day.steps ?? ''
  const stepPct = day.steps ? (day.steps / STEP_GOAL) * 100 : 0
  const stepColor = stepPct >= 100 ? 'var(--green)' : stepPct >= 70 ? 'var(--amber)' : 'var(--red)'

  return (
    <section>
      <div className="sec">Steps</div>
      <div className="card">
        <div className="steps-row">
          <input
            type="number"
            inputMode="numeric"
            placeholder="Steps"
            value={steps}
            onChange={(e) =>
              updateDayFn(date, () => ({
                steps: e.target.value === '' ? null : parseInt(e.target.value, 10) || 0,
                stepsSource: e.target.value === '' ? null : 'manual',
              }))
            }
            aria-label="Steps"
          />
          <div style={{ flex: 1 }}>
            <div className="bar">
              <div style={{ width: `${Math.min(stepPct, 100)}%`, background: stepColor }} />
            </div>
          </div>
          <span className="status num" style={{ color: stepColor }}>
            {day.steps ? `${Math.round(stepPct)}%` : `of ${STEP_GOAL / 1000}k`}
          </span>
        </div>
      </div>
    </section>
  )
}

function SupplementsCard({ day, date, updateDayFn, allSupplements, addSupplement, removeSupplement, defaultCount }) {
  const [newSupp, setNewSupp] = useState('')
  const supps = allSupplements()

  const toggle = (name) =>
    updateDayFn(date, (d) => ({
      supplements: { ...d.supplements, [name]: !d.supplements[name] },
    }))

  const add = () => {
    const name = newSupp.trim()
    if (!name) return
    addSupplement(name)
    setNewSupp('')
  }

  return (
    <section>
      <div className="sec">Supplements</div>
      <div className="card">
        <ul className="supp-list">
          {supps.map((name, i) => (
            <li key={name}>
              <label>
                <input
                  type="checkbox"
                  checked={Boolean(day.supplements[name])}
                  onChange={() => toggle(name)}
                />
                <span className={day.supplements[name] ? 'done' : ''}>{name}</span>
              </label>
              {i >= defaultCount && (
                <button className="del" onClick={() => removeSupplement(name)} aria-label={`Remove ${name}`}>✕</button>
              )}
            </li>
          ))}
        </ul>
        <div className="add-row">
          <input
            placeholder="Add supplement…"
            value={newSupp}
            onChange={(e) => setNewSupp(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            style={{ flex: 1, width: 'auto' }}
          />
          <button onClick={add}>Add</button>
        </div>
      </div>
    </section>
  )
}

export default function TodayTab({ store, date, setDate, goLog }) {
  const day = store.getDay(date)

  return (
    <>
      <DateNav date={date} setDate={setDate} />
      <MacroDashboard day={day} goLog={goLog} />
      <WorkoutCard day={day} date={date} updateDayFn={store.updateDayFn} />
      <StepsCard day={day} date={date} updateDayFn={store.updateDayFn} />
      <SupplementsCard
        day={day}
        date={date}
        updateDayFn={store.updateDayFn}
        allSupplements={store.allSupplements}
        addSupplement={store.addSupplement}
        removeSupplement={store.removeSupplement}
        defaultCount={2}
      />
    </>
  )
}
