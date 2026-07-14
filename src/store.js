import { useEffect, useState } from 'react'
import { DEFAULT_SUPPLEMENTS } from './db.js'

const KEY = 'cutlog-v1'

const emptyState = {
  weights: [],           // [{ date, kg }] kept sorted by date
  days: {},              // date -> { foods: [], workouts: [], runNote: '', steps: null, supplements: {} }
  customSupplements: [], // names appended to DEFAULT_SUPPLEMENTS
}

export function emptyDay() {
  return { foods: [], workouts: [], runNote: '', steps: null, supplements: {} }
}

// Supplement names double as storage keys; carry ticks across renames.
const RENAMED_SUPPLEMENTS = { 'Creatine monohydrate 5g': 'Creatine' }

function migrate(state) {
  for (const day of Object.values(state.days ?? {})) {
    for (const [oldName, newName] of Object.entries(RENAMED_SUPPLEMENTS)) {
      if (day.supplements && oldName in day.supplements) {
        day.supplements[newName] = day.supplements[newName] || day.supplements[oldName]
        delete day.supplements[oldName]
      }
    }
  }
  return state
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyState
    return migrate({ ...emptyState, ...JSON.parse(raw) })
  } catch {
    return emptyState
  }
}

export function useCutLog() {
  const [state, setState] = useState(load)

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(state))
  }, [state])

  const getDay = (date) => state.days[date] ?? emptyDay()

  const updateDay = (date, patch) =>
    setState((s) => ({
      ...s,
      days: { ...s.days, [date]: { ...emptyDay(), ...s.days[date], ...patch } },
    }))

  const addFoods = (date, entries) =>
    updateDayFn(date, (d) => ({ foods: [...d.foods, ...entries] }))

  const removeFood = (date, id) =>
    updateDayFn(date, (d) => ({ foods: d.foods.filter((f) => f.id !== id) }))

  const updateFood = (date, id, patch) =>
    updateDayFn(date, (d) => ({
      foods: d.foods.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    }))

  function updateDayFn(date, fn) {
    setState((s) => {
      const d = { ...emptyDay(), ...s.days[date] }
      return { ...s, days: { ...s.days, [date]: { ...d, ...fn(d) } } }
    })
  }

  const setWeight = (date, kg) =>
    setState((s) => {
      const weights = s.weights.filter((w) => w.date !== date)
      if (kg != null) weights.push({ date, kg })
      weights.sort((a, b) => (a.date < b.date ? -1 : 1))
      return { ...s, weights }
    })

  const allSupplements = () => [...DEFAULT_SUPPLEMENTS, ...state.customSupplements]

  const addSupplement = (name) =>
    setState((s) =>
      allSupplementNames(s).includes(name)
        ? s
        : { ...s, customSupplements: [...s.customSupplements, name] }
    )

  const removeSupplement = (name) =>
    setState((s) => ({
      ...s,
      customSupplements: s.customSupplements.filter((n) => n !== name),
    }))

  // Synced steps fill empty days and refresh sync-sourced days,
  // but never overwrite a manually typed value.
  const applySyncedSteps = (rows) => {
    let filled = 0
    setState((s) => {
      const days = { ...s.days }
      for (const { date, steps } of rows) {
        const d = { ...emptyDay(), ...days[date] }
        if (d.steps == null || d.stepsSource === 'sync') {
          if (d.steps !== steps) filled++
          days[date] = { ...d, steps, stepsSource: 'sync' }
        }
      }
      return { ...s, days }
    })
    return filled
  }

  const exportJSON = () => ({
    app: 'shredded-szn',
    version: 1,
    exportedAt: new Date().toISOString(),
    weights: state.weights,
    days: state.days,
    customSupplements: state.customSupplements,
  })

  // Wholesale replace — import is restore, not merge.
  const replaceState = (next) =>
    setState(migrate({
      weights: Array.isArray(next.weights) ? next.weights : [],
      days: next.days && typeof next.days === 'object' ? next.days : {},
      customSupplements: Array.isArray(next.customSupplements) ? next.customSupplements : [],
    }))

  return {
    state,
    getDay,
    updateDay,
    updateDayFn,
    addFoods,
    removeFood,
    updateFood,
    applySyncedSteps,
    setWeight,
    allSupplements,
    addSupplement,
    removeSupplement,
    exportJSON,
    replaceState,
  }
}

function allSupplementNames(s) {
  return [...DEFAULT_SUPPLEMENTS, ...s.customSupplements]
}
