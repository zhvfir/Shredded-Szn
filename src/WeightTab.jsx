import { useMemo, useRef, useState } from 'react'
import { todayISO, fromISO, daysBetween, fmtDay, goalConfigured } from './db.js'

const W = 340
const H = 200
const PAD = { l: 34, r: 12, t: 14, b: 22 }

export default function WeightTab({ store, openSettings }) {
  const { weights } = store.state
  const s = store.settings
  const [kg, setKg] = useState('')
  const [date, setDate] = useState(todayISO())

  const latest = weights[weights.length - 1]
  const configured = goalConfigured(s)

  // Glide-path anchors come straight from the goal the user set.
  const startDate = s.startDate ?? weights[0]?.date ?? todayISO()
  const startKg = s.startKg ?? weights[0]?.kg ?? (latest?.kg ?? 0)
  const endDate = s.goalDate
  const endKg = s.goalKg

  // Linear glide from (startDate, startKg) to (goalDate, goalKg).
  const glideAt = (iso) => {
    const total = daysBetween(startDate, endDate)
    if (!total) return endKg
    const t = Math.min(Math.max(daysBetween(startDate, iso) / total, 0), 1)
    return startKg + (endKg - startKg) * t
  }

  const save = () => {
    const v = parseFloat(kg)
    if (!v || v < 30 || v > 200) return
    store.setWeight(date, v)
    setKg('')
  }

  if (!configured) {
    return (
      <section>
        <div className="sec">Weight</div>
        <div className="card">
          <div className="dim" style={{ fontSize: 14, marginBottom: 12 }}>
            Set your current weight, goal weight and goal date to see your glide path.
          </div>
          <button className="primary" style={{ width: '100%' }} onClick={openSettings}>
            Set Your Goal →
          </button>
        </div>
      </section>
    )
  }

  const daysLeft = Math.max(daysBetween(todayISO(), endDate), 0)
  const toGo = latest ? (latest.kg - endKg) : startKg - endKg
  const vsPath = latest ? latest.kg - glideAt(latest.date) : null
  const vsPathColor = vsPath == null ? '' : vsPath <= 0 ? 'c-green' : vsPath <= 0.4 ? 'c-amber' : 'c-red'

  return (
    <>
      <div className="weight-stats">
        <div className="stat">
          <div className="v num">{latest ? latest.kg.toFixed(1) : '—'}</div>
          <div className="k">current kg</div>
        </div>
        <div className="stat">
          <div className={`v num ${vsPathColor}`}>
            {vsPath == null ? '—' : `${vsPath > 0 ? '+' : ''}${vsPath.toFixed(1)}`}
          </div>
          <div className="k">vs Glide Path</div>
        </div>
        <div className="stat">
          <div className="v num">{daysLeft}</div>
          <div className="k">days left</div>
        </div>
      </div>

      <section>
        <div className="sec">Glide Path — to {endKg} kg by {fmtDay(endDate)}</div>
        <div className="card">
          <WeightChart weights={weights} startDate={startDate} startKg={startKg} endDate={endDate} endKg={endKg} glideAt={glideAt} />
          <div className="dim" style={{ fontSize: 13, marginTop: 8 }}>
            <span style={{ color: 'var(--blue)' }}>●</span> Actual&nbsp;&nbsp;
            <span className="dim">╌╌</span> Target&nbsp;&nbsp;
            {toGo > 0 ? `${toGo.toFixed(1)} kg to go` : 'Goal Reached ✓'}
          </div>
        </div>
      </section>

      <section>
        <div className="sec">Log Weight</div>
        <div className="card">
        <div className="add-row" style={{ marginTop: 0 }}>
          <input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} style={{ flex: 1, width: 'auto' }} />
          <input
            type="number" inputMode="decimal" step="0.1" placeholder="kg"
            value={kg}
            onChange={(e) => setKg(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
          />
          <button className="primary" onClick={save}>Save</button>
        </div>
        {weights.length > 0 && (
          <ul className="weight-list" style={{ marginTop: 12 }}>
            {[...weights].reverse().map((w) => (
              <li key={w.date}>
                <span className="d">{fmtDay(w.date)}</span>
                <span className="kg num">{w.kg.toFixed(1)} kg</span>
                <button className="del" onClick={() => store.setWeight(w.date, null)} aria-label={`Remove ${w.date}`}>✕</button>
              </li>
            ))}
          </ul>
        )}
        </div>
      </section>
    </>
  )
}

function WeightChart({ weights, startDate, startKg, endDate, endKg, glideAt }) {
  const [tip, setTip] = useState(null)
  const svgRef = useRef(null)

  const { xOf, yOf, ticks, actualPts, glidePts } = useMemo(() => {
    const allDates = [startDate, endDate, ...weights.map((w) => w.date)]
    const minT = Math.min(...allDates.map((d) => fromISO(d).getTime()))
    const maxT = Math.max(...allDates.map((d) => fromISO(d).getTime()))
    const kgs = [startKg, endKg, ...weights.map((w) => w.kg)]
    const minKg = Math.floor(Math.min(...kgs) - 0.5)
    const maxKg = Math.ceil(Math.max(...kgs) + 0.5)

    const xOf = (iso) =>
      PAD.l + ((fromISO(iso).getTime() - minT) / Math.max(maxT - minT, 1)) * (W - PAD.l - PAD.r)
    const yOf = (kg) =>
      PAD.t + ((maxKg - kg) / Math.max(maxKg - minKg, 0.1)) * (H - PAD.t - PAD.b)

    const ticks = []
    for (let k = minKg; k <= maxKg; k++) ticks.push(k)

    const actualPts = weights.map((w) => ({ ...w, x: xOf(w.date), y: yOf(w.kg) }))
    const glidePts = [
      { x: xOf(startDate), y: yOf(glideAt(startDate)) },
      { x: xOf(endDate), y: yOf(glideAt(endDate)) },
    ]
    return { xOf, yOf, ticks, actualPts, glidePts }
  }, [weights, startDate, startKg, endDate, endKg, glideAt])

  const linePath = actualPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  const onMove = (e) => {
    if (!actualPts.length || !svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * W
    let best = actualPts[0]
    for (const p of actualPts) if (Math.abs(p.x - px) < Math.abs(best.x - px)) best = p
    setTip({
      left: (best.x / W) * rect.width,
      top: (best.y / H) * rect.height,
      text: `${fmtDay(best.date)} · ${best.kg.toFixed(1)} kg`,
    })
  }

  return (
    <div className="chart-wrap">
      {tip && <div className="chart-tip" style={{ left: tip.left, top: tip.top }}>{tip.text}</div>}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', display: 'block', touchAction: 'pan-y' }}
        onPointerMove={onMove}
        onPointerLeave={() => setTip(null)}
        role="img"
        aria-label="Weight over time versus target glide path"
      >
        {ticks.map((k) => (
          <g key={k}>
            <line x1={PAD.l} x2={W - PAD.r} y1={yOf(k)} y2={yOf(k)} stroke="var(--surface-alt)" strokeWidth="1" />
            <text x={PAD.l - 6} y={yOf(k) + 3.5} textAnchor="end" fontSize="9"
              fill="var(--text-dim)">{k}</text>
          </g>
        ))}

        {/* target glide path — dashed, dim */}
        <line
          x1={glidePts[0].x} y1={glidePts[0].y} x2={glidePts[1].x} y2={glidePts[1].y}
          stroke="var(--text-dim)" strokeWidth="1.5" strokeDasharray="5 4"
        />
        <text x={glidePts[1].x - 2} y={glidePts[1].y - 5} textAnchor="end" fontSize="9"
          fill="var(--text-dim)">
          {endKg} kg
        </text>

        {/* actual weight */}
        {actualPts.length > 1 && (
          <path d={linePath} fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinejoin="round" />
        )}
        {actualPts.map((p) => (
          <circle key={p.date} cx={p.x} cy={p.y} r="4" fill="var(--blue)" stroke="var(--surface)" strokeWidth="2" />
        ))}
        {actualPts.length > 0 && (
          <text
            x={Math.min(actualPts[actualPts.length - 1].x + 6, W - PAD.r - 24)}
            y={actualPts[actualPts.length - 1].y - 7}
            fontSize="9" fill="var(--blue)"
          >
            {actualPts[actualPts.length - 1].kg.toFixed(1)}
          </text>
        )}

        {actualPts.length === 0 && (
          <text x={W / 2} y={H / 2} textAnchor="middle" fontSize="11" fill="var(--text-dim)">
            Log your first weigh-in below
          </text>
        )}
      </svg>
    </div>
  )
}
