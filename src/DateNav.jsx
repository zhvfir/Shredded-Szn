import { addDays, todayISO, fmtDay } from './db.js'

export default function DateNav({ date, setDate }) {
  const isToday = date === todayISO()
  return (
    <div className="date-nav">
      <button className="icon" onClick={() => setDate(addDays(date, -1))} aria-label="Previous day">‹</button>
      <span className="label">
        {isToday ? 'Today' : fmtDay(date)}
        {!isToday && (
          <button className="today-link" onClick={() => setDate(todayISO())}>Today</button>
        )}
      </span>
      <button className="icon" onClick={() => setDate(addDays(date, 1))} aria-label="Next day">›</button>
    </div>
  )
}
