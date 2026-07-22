// Canonical food values — single source of truth for all macro math.
// Meat quantities are RAW weights; rice is COOKED weight.
// Fruits are buffer foods: logged but excluded from tracked totals.

export const STEP_GOAL = 10000

// ---- Dynamic goal + targets ----
// Nothing about the goal is hard-coded into the app any more. Targets are
// derived from whatever the user sets in Settings; the constants below are
// only defaults for the estimator and a one-time migration seed.

// Rough energy density of body mass — used to turn a weight goal into a
// daily calorie deficit.
export const KCAL_PER_KG = 7700

// Biometrics that feed the Mifflin-St Jeor estimate. Editable per-field,
// but seeded to the owner's stats so the estimate is right out of the box.
export const DEFAULT_BODY = { heightCm: 183, age: 25, sex: 'male', activity: 1.55 }

export const DEFAULT_SETTINGS = {
  startKg: null,    // "current weight" — anchors the glide path
  startDate: null,  // when the goal was set
  goalKg: null,
  goalDate: null,
  kcalTarget: null, // explicit override; null → estimated from the goal
  macros: null,     // { p, c, f } override; null → suggested from kcal
  ...DEFAULT_BODY,
}

// One-time seed for devices upgrading from the hard-coded-target build, so
// the live app keeps its numbers. After migration everything is editable.
export const LEGACY_SEED = {
  ...DEFAULT_BODY,
  startKg: 78.7,
  startDate: '2026-07-13',
  goalKg: 75.7,
  goalDate: '2026-07-31',
  kcalTarget: 2150,
  macros: { p: 190, c: 195, f: 68 },
}

export function bmr(s) {
  const base = 10 * (s.startKg ?? 75) + 6.25 * (s.heightCm ?? 183) - 5 * (s.age ?? 25)
  return base + (s.sex === 'female' ? -161 : 5)
}

export function tdee(s) {
  return bmr(s) * (s.activity ?? 1.55)
}

// Suggested daily calories: maintenance minus the deficit needed to hit the
// goal by its date, never dipping below BMR. Rounded to the nearest 10.
export function suggestKcal(s) {
  const maint = tdee(s)
  if (s.startKg == null || s.goalKg == null || !s.startDate || !s.goalDate) {
    return Math.round(maint / 10) * 10
  }
  const days = Math.max(daysBetween(s.startDate, s.goalDate), 1)
  const kgToLose = Math.max(s.startKg - s.goalKg, 0)
  const deficit = (kgToLose * KCAL_PER_KG) / days
  return Math.round(Math.max(maint - deficit, bmr(s)) / 10) * 10
}

// Suggested macros for a cut: high protein, moderate fat, carbs fill the rest.
export function suggestMacros(s, kcal) {
  const w = s.startKg ?? 75
  const p = Math.round(2.2 * w)
  const f = Math.round(0.8 * w)
  const c = Math.max(Math.round((kcal - p * 4 - f * 9) / 4), 0)
  return { p, c, f }
}

// The numbers every screen actually uses.
export function effectiveTargets(s) {
  const kcal = s.kcalTarget ?? suggestKcal(s)
  const m = s.macros ?? suggestMacros(s, kcal)
  return { kcal, p: m.p, c: m.c, f: m.f }
}

export function goalConfigured(s) {
  return s.startKg != null && s.startDate && s.goalKg != null && s.goalDate
}

// Weight goal reached when the latest weigh-in is at or below the target.
export function goalReached(s, latestKg) {
  return goalConfigured(s) && latestKg != null && latestKg <= s.goalKg
}

// per = macros per 1 unit (per gram for g-based foods)
export const FOODS = {
  rice:         { name: 'White Rice (Cooked)',        unit: 'g',     step: 50, kcal: 1.30,  p: 0.028, c: 0.28,  f: 0.003 },
  sweetpotato:  { name: 'Sweet Potato (Raw)',         unit: 'g',     step: 50, kcal: 1.04,  p: 0.012, c: 0.244, f: 0.001 },
  chicken:      { name: 'Chicken Breast (Raw)',       unit: 'g',     step: 10, kcal: 1.10,  p: 0.23,  c: 0,     f: 0.024 },
  beef:         { name: 'Beef Mince (Raw)',  unit: 'g',     step: 10, kcal: 2.50,  p: 0.18,  c: 0,     f: 0.198 },
  egg:          { name: 'Whole Egg',                  unit: 'egg',   step: 1,  kcal: 72,    p: 6,     c: 0.4,   f: 5 },
  whey:         { name: 'Titan Whey Chocolate',       unit: 'scoop', step: 1,  kcal: 130,   p: 24,    c: 5,     f: 1.5 },
  multi:        { name: 'New Multi Chicken Breast',   unit: 'pc',    step: 1,  kcal: 72,    p: 14.9,  c: 0,     f: 1.1 },
  roastchicken: { name: '½ Roasted Chicken (no skin)', unit: 'half', step: 1, kcal: 450, p: 65,  c: 0,     f: 12 },
  salmon:       { name: 'Salmon (Raw)',               unit: 'g',     step: 10, kcal: 2.08,  p: 0.20,  c: 0,     f: 0.132 },
  oil:          { name: 'Olive Oil',                  unit: 'tsp',   step: 1,  kcal: 40,    p: 0,     c: 0,     f: 4 },
  kopi:         { name: 'Iced Kopi C Kosong',         unit: 'cup',   step: 1,  kcal: 45,    p: 2,     c: 4,     f: 2 },
  ricecake:     { name: 'Rice Cake',                  unit: 'pc',    step: 1,  kcal: 35,    p: 0.7,   c: 7.3,   f: 0.2 },
  honey:        { name: 'Honey Drizzle',              unit: 'tsp',   step: 1,  kcal: 20,    p: 0,     c: 5.5,   f: 0 },
  apple:        { name: 'Apple',                      unit: 'pc',    step: 1,  kcal: 95,    p: 0.5,   c: 25,    f: 0.3, buffer: true },
  banana:       { name: 'Banana',                     unit: 'pc',    step: 1,  kcal: 105,   p: 1.3,   c: 27,    f: 0.4, buffer: true },
  grapes:       { name: 'Grapes (Serving)',           unit: 'serv',  step: 1,  kcal: 60,    p: 0.6,   c: 16,    f: 0.1, buffer: true },
  avocado:      { name: 'Avocado (½)',           unit: 'half',  step: 1,  kcal: 120,   p: 1.5,   c: 6,     f: 11,  buffer: true },
}

// Quick-add presets — one-tap staples the owner eats often. Each carries an
// explicit macro snapshot (not a FOODS multiple) so the tapped values match
// the real-world portion exactly.
export const PRESETS = [
  { name: 'Rice — 200 g Cooked',         kcal: 260, p: 5,  c: 56, f: 1 },
  { name: 'Rice — 150 g Cooked',         kcal: 195, p: 4,  c: 42, f: 1 },
  { name: 'Sweet Potato — 250 g Raw',    kcal: 215, p: 4,  c: 50, f: 0 },
  { name: 'Titan Whey — 2 Scoops',       kcal: 260, p: 48, c: 8,  f: 4 },
  { name: 'New Multi — 3.5 Pieces',      kcal: 252, p: 52, c: 0,  f: 4 },
  { name: '½ Roasted Chicken (No Skin)', kcal: 450, p: 65, c: 0,  f: 12 },
  { name: 'Salmon — 250 g Raw',          kcal: 520, p: 50, c: 0,  f: 33 },
  { name: 'Eggs — 2',                    kcal: 140, p: 12, c: 1,  f: 10 },
  { name: 'Olive Oil — 1 tsp',           kcal: 40,  p: 0,  c: 0,  f: 4 },
  { name: 'Iced Kopi C Kosong',          kcal: 45,  p: 2,  c: 4,  f: 2 },
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

// One log entry from an explicit macro snapshot (presets, AI lookups,
// custom foods all share this shape).
export function entryFromMacros({ name, kcal, p, c, f, qty = 1, unit = 'serv' }) {
  return {
    id: crypto.randomUUID(),
    name,
    qty,
    unit,
    kcal: Number(kcal) || 0,
    p: Number(p) || 0,
    c: Number(c) || 0,
    f: Number(f) || 0,
    buffer: false,
  }
}

export function entryFromPreset(preset) {
  return entryFromMacros(preset)
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
