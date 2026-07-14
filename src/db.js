// Canonical food values — single source of truth for all macro math.
// Meat quantities are RAW weights; rice is COOKED weight.
// Fruits are buffer foods: logged but excluded from tracked totals.

export const TARGETS = { kcal: 2150, p: 190, c: 195, f: 68 }
export const STEP_GOAL = 10000

export const GOAL = {
  startKg: 78.7,
  endKg: 75.7,
  endDate: '2026-07-31',
  defaultStartDate: '2026-07-13',
}

// per = macros per 1 unit (per gram for g-based foods)
export const FOODS = {
  rice:         { name: 'White Rice (Cooked)',        unit: 'g',     step: 50, kcal: 1.30,  p: 0.028, c: 0.28,  f: 0.003 },
  sweetpotato:  { name: 'Sweet Potato (Raw)',         unit: 'g',     step: 50, kcal: 1.04,  p: 0.012, c: 0.244, f: 0.001 },
  chicken:      { name: 'Chicken Breast (Raw)',       unit: 'g',     step: 10, kcal: 1.10,  p: 0.23,  c: 0,     f: 0.024 },
  beef:         { name: 'Beef Mince (Raw)',  unit: 'g',     step: 10, kcal: 2.50,  p: 0.18,  c: 0,     f: 0.198 },
  egg:          { name: 'Whole Egg',                  unit: 'egg',   step: 1,  kcal: 72,    p: 6,     c: 0.4,   f: 5 },
  whey:         { name: 'Titan Whey Chocolate',       unit: 'scoop', step: 1,  kcal: 130,   p: 24,    c: 5,     f: 1.5 },
  multi:        { name: 'New Multi Chicken Breast',   unit: 'pc',    step: 1,  kcal: 72,    p: 15,    c: 0.7,   f: 1 },
  roastchicken: { name: '½ Roasted Chicken (no skin)', unit: 'half', step: 1, kcal: 600, p: 60,  c: 0,     f: 40 },
  oil:          { name: 'Olive Oil',                  unit: 'tbsp',  step: 1,  kcal: 119,   p: 0,     c: 0,     f: 13.5 },
  ricecake:     { name: 'Rice Cake',                  unit: 'pc',    step: 1,  kcal: 35,    p: 0.7,   c: 7.3,   f: 0.2 },
  honey:        { name: 'Honey Drizzle',              unit: 'tsp',   step: 1,  kcal: 20,    p: 0,     c: 5.5,   f: 0 },
  apple:        { name: 'Apple',                      unit: 'pc',    step: 1,  kcal: 95,    p: 0.5,   c: 25,    f: 0.3, buffer: true },
  banana:       { name: 'Banana',                     unit: 'pc',    step: 1,  kcal: 105,   p: 1.3,   c: 27,    f: 0.4, buffer: true },
  grapes:       { name: 'Grapes (Serving)',           unit: 'serv',  step: 1,  kcal: 60,    p: 0.6,   c: 16,    f: 0.1, buffer: true },
  avocado:      { name: 'Avocado (½)',           unit: 'half',  step: 1,  kcal: 120,   p: 1.5,   c: 6,     f: 11,  buffer: true },
}

// Quick-add presets. `counted: true` overrides the buffer flag —
// the pre-workout banana is part of the tracked 231 kcal spec.
// One-tap staples.
export const PRESETS = [
  { name: 'Rice — 200 g', items: [['rice', 200]] },
  { name: 'Sweet Potato — 250 g', items: [['sweetpotato', 250]] },
  { name: 'Titan Whey — 2 Scoops', items: [['whey', 2]] },
  { name: 'New Multi — 4 Pieces', items: [['multi', 4]] },
  { name: '½ Roasted Chicken', items: [['roastchicken', 1]] },
  { name: 'Eggs — 2', items: [['egg', 2]] },
  { name: 'Pre-workout Bowl',
    items: [['ricecake', 3], ['banana', 1, { counted: true }], ['honey', 1]] },
]

export const WORKOUT_TYPES = ['Chest & Back', 'Shoulders & Arms', 'Legs', 'Cardio', 'Run']
export const WORKOUT_SHORT = {
  'Chest & Back': 'C&B',
  'Shoulders & Arms': 'S&A',
  'Legs': 'Legs',
  'Cardio': 'Cardio',
  'Run': 'Run',
}

export const DEFAULT_SUPPLEMENTS = ['Creatine', 'Magnesium Glycinate']

export function entryFromFood(key, qty, opts = {}) {
  const food = FOODS[key]
  return {
    id: crypto.randomUUID(),
    name: food.name,
    qty,
    unit: food.unit,
    kcal: food.kcal * qty,
    p: food.p * qty,
    c: food.c * qty,
    f: food.f * qty,
    buffer: Boolean(food.buffer) && !opts.counted,
  }
}

export function totals(entries) {
  const t = { kcal: 0, p: 0, c: 0, f: 0, bufferKcal: 0 }
  for (const e of entries) {
    if (e.buffer) {
      t.bufferKcal += e.kcal
    } else {
      t.kcal += e.kcal
      t.p += e.p
      t.c += e.c
      t.f += e.f
    }
  }
  return t
}

// ---- local-time date helpers ----

export function toISODate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayISO() {
  return toISODate(new Date())
}

export function fromISO(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(iso, n) {
  const d = fromISO(iso)
  d.setDate(d.getDate() + n)
  return toISODate(d)
}

export function mondayOf(iso) {
  const d = fromISO(iso)
  const shift = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - shift)
  return toISODate(d)
}

export function daysBetween(a, b) {
  return Math.round((fromISO(b) - fromISO(a)) / 86400000)
}

export function fmtDay(iso) {
  return fromISO(iso).toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' })
}
