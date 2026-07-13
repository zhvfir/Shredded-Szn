import { useState } from 'react'
import { FOODS, PRESETS, entryFromFood, addDays, fmtDay } from './db.js'
import DateNav from './DateNav.jsx'

const r5 = (x) => Math.round(x / 5) * 5
const r1 = (x) => Math.round(x)

export default function LogTab({ store, date, setDate }) {
  const day = store.getDay(date)
  const keys = Object.keys(FOODS)
  const [sel, setSel] = useState('rice')
  const [qty, setQty] = useState('')
  const [custom, setCustom] = useState({ name: '', kcal: '', p: '', c: '', f: '' })
  const [showCustom, setShowCustom] = useState(false)

  // Nearest earlier day (within 14) that has food logged — source for "copy day".
  let prevLogged = null
  for (let i = 1; i <= 14 && !prevLogged; i++) {
    const d = addDays(date, -i)
    if ((store.state.days[d]?.foods ?? []).length > 0) prevLogged = d
  }

  const copyPrevDay = () => {
    if (!prevLogged) return
    const src = store.state.days[prevLogged].foods
    store.addFoods(date, src.map((f) => ({ ...f, id: crypto.randomUUID() })))
  }

  const addGranular = () => {
    const q = parseFloat(qty)
    if (!q || q <= 0) return
    store.addFoods(date, [entryFromFood(sel, q)])
    setQty('')
  }

  const addPreset = (preset) => {
    store.addFoods(date, preset.items.map(([key, q, opts]) => entryFromFood(key, q, opts)))
  }

  const addCustom = () => {
    if (!custom.name || !custom.kcal) return
    store.addFoods(date, [{
      id: crypto.randomUUID(),
      name: custom.name,
      qty: 1,
      unit: 'serv',
      kcal: parseFloat(custom.kcal) || 0,
      p: parseFloat(custom.p) || 0,
      c: parseFloat(custom.c) || 0,
      f: parseFloat(custom.f) || 0,
      buffer: false,
    }])
    setCustom({ name: '', kcal: '', p: '', c: '', f: '' })
    setShowCustom(false)
  }

  const presetKcal = (preset) =>
    r5(preset.items.reduce((sum, [key, q]) => sum + FOODS[key].kcal * q, 0))

  return (
    <>
      <DateNav date={date} setDate={setDate} />

      <section>
        <div className="sec">Quick add</div>
        <div className="preset-grid">
          {PRESETS.map((p) => (
            <button key={p.name} onClick={() => addPreset(p)}>
              {p.name}
              <span className="pk">~{presetKcal(p)} kcal</span>
            </button>
          ))}
        </div>
        {prevLogged && (
          <button style={{ width: '100%', marginTop: 10 }} onClick={copyPrevDay}>
            Copy {fmtDay(prevLogged)}’s food log →
          </button>
        )}
      </section>

      <section>
        <div className="sec">Add food</div>
        <div className="card">
          <div className="add-row" style={{ marginTop: 0 }}>
            <select value={sel} onChange={(e) => setSel(e.target.value)} aria-label="Food">
              {keys.map((k) => (
                <option key={k} value={k}>{FOODS[k].name}</option>
              ))}
            </select>
            <input
              type="number"
              inputMode="decimal"
              placeholder={FOODS[sel].unit}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addGranular()}
              aria-label={`Quantity (${FOODS[sel].unit})`}
            />
            <button className="primary" onClick={addGranular}>Add</button>
          </div>

          <div style={{ marginTop: 10 }}>
            <button className="ghost" style={{ padding: '6px 0' }} onClick={() => setShowCustom(!showCustom)}>
              {showCustom ? '− Custom food' : '+ Custom food'}
            </button>
            {showCustom && (
              <div className="custom-grid">
                <input
                  name="cname" placeholder="Name (e.g. chicken rice)"
                  value={custom.name}
                  onChange={(e) => setCustom({ ...custom, name: e.target.value })}
                />
                {['kcal', 'p', 'c', 'f'].map((k) => (
                  <input
                    key={k} type="number" inputMode="decimal"
                    placeholder={k === 'kcal' ? 'kcal' : `${k.toUpperCase()} g`}
                    value={custom[k]}
                    onChange={(e) => setCustom({ ...custom, [k]: e.target.value })}
                  />
                ))}
                <button className="primary" style={{ gridColumn: '1 / -1' }} onClick={addCustom}>
                  Add custom food
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {day.foods.length > 0 && (
        <section>
          <div className="sec">Logged</div>
          <div className="card">
            <ul className="food-list">
              {day.foods.map((f) => (
                <li key={f.id}>
                  <EditableQty food={f} onCommit={(q) => rescale(store, date, f, q)} />
                  <span className="fname">{f.name}</span>
                  {f.buffer && <span className="tag-buffer">buffer</span>}
                  <span className="kcal">{r5(f.kcal)} kcal · {r1(f.p)}P</span>
                  <button className="del" onClick={() => store.removeFood(date, f.id)} aria-label={`Remove ${f.name}`}>✕</button>
                </li>
              ))}
            </ul>
            <div className="dim" style={{ fontSize: 12, marginTop: 8 }}>Tap a quantity to edit it</div>
          </div>
        </section>
      )}
    </>
  )
}

function formatQty(q) {
  return Number.isInteger(q) ? q : q.toFixed(1)
}

// Entries carry their own macro snapshot, so editing qty rescales it linearly.
function rescale(store, date, food, newQty) {
  if (!newQty || newQty <= 0 || newQty === food.qty) return
  const k = newQty / food.qty
  store.updateFood(date, food.id, {
    qty: newQty,
    kcal: food.kcal * k,
    p: food.p * k,
    c: food.c * k,
    f: food.f * k,
  })
}

function EditableQty({ food, onCommit }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState('')

  const commit = () => {
    onCommit(parseFloat(val))
    setEditing(false)
  }

  if (!editing) {
    return (
      <button
        className="qty"
        style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', textDecoration: 'underline dotted' }}
        onClick={() => { setVal(String(food.qty)); setEditing(true) }}
        aria-label={`Edit quantity of ${food.name}`}
      >
        {formatQty(food.qty)} {food.unit}
      </button>
    )
  }
  return (
    <input
      type="number"
      inputMode="decimal"
      autoFocus
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && commit()}
      style={{ width: 72, flex: 'none', padding: '4px 8px' }}
      aria-label={`Quantity (${food.unit})`}
    />
  )
}
