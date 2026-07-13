import { useState } from 'react'
import { FOODS, PRESETS, entryFromFood } from './db.js'
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
                  <span className="qty">{formatQty(f.qty)} {f.unit}</span>
                  <span className="fname">{f.name}</span>
                  {f.buffer && <span className="tag-buffer">buffer</span>}
                  <span className="kcal">{r5(f.kcal)} kcal · {r1(f.p)}P</span>
                  <button className="del" onClick={() => store.removeFood(date, f.id)} aria-label={`Remove ${f.name}`}>✕</button>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  )
}

function formatQty(q) {
  return Number.isInteger(q) ? q : q.toFixed(1)
}
