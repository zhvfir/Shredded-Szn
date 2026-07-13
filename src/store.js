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

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyState
    return { ...emptyState, ...JSON.parse(raw) }
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

  return {
    state,
    getDay,
    updateDay,
    updateDayFn,
    addFoods,
    removeFood,
    setWeight,
    allSupplements,
    addSupplement,
    removeSupplement,
  }
}

function allSupplementNames(s) {
  return [...DEFAULT_SUPPLEMENTS, ...s.customSupplements]
}
