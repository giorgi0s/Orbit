import { useState } from 'react'
import { CaretLeft, CaretRight, Plus } from '@phosphor-icons/react'
import { Squiggle } from '../components/Doodles'
import { Schedule } from '../components/Schedule'
import { addDays, dayKey, occurrencesBetween, startOfDay, type CalEvent } from '../lib/calendar'
import { useNow } from '../lib/time'
import { play } from '../lib/feel'

function mondayOf(d: Date) {
  return addDays(startOfDay(d), -((d.getDay() + 6) % 7))
}

/** A week spread: seven days down the page, times in the margin. */
export function Week({ events, onOpen, onAddOn }: { events: CalEvent[]; onOpen: (e: CalEvent) => void; onAddOn: (day: Date) => void }) {
  const now = useNow(60_000)
  const [offset, setOffset] = useState(0)
  const monday = addDays(mondayOf(now), offset * 7)
  const sunday = addDays(monday, 6)
  const items = occurrencesBetween(events, monday, addDays(monday, 7))
  const today = dayKey(now)

  const range = monday.getMonth() === sunday.getMonth()
    ? `${monday.getDate()}–${sunday.getDate()} ${sunday.toLocaleDateString('en-GB', { month: 'long' })}`
    : `${monday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${sunday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`

  const go = (n: number) => { setOffset(n); play('page') }

  return (
    <div className="week">
      <h1 className="page-title">Week <Squiggle width={90} /></h1>
      <div className="week-nav">
        <button type="button" className="icon-btn" onClick={() => go(offset - 1)} aria-label="Previous week"><CaretLeft weight="bold" /></button>
        <span className="week-range">{offset === 0 ? 'This week' : offset === 1 ? 'Next week' : offset === -1 ? 'Last week' : range}<small>{offset === 0 || Math.abs(offset) === 1 ? range : ''}</small></span>
        <button type="button" className="icon-btn" onClick={() => go(offset + 1)} aria-label="Next week"><CaretRight weight="bold" /></button>
        {offset !== 0 && <button type="button" className="back-today" onClick={() => go(0)}>back to this week</button>}
      </div>

      {Array.from({ length: 7 }, (_, i) => {
        const day = addDays(monday, i)
        const key = dayKey(day)
        const dayItems = items.filter(o => o.day === key)
        return (
          <section key={key} className={`week-day ${key === today ? 'is-today' : ''} ${key < today ? 'is-past' : ''}`} aria-label={day.toDateString()}>
            <h2 className="week-day-h">
              <span className="wd">{day.toLocaleDateString('en-GB', { weekday: 'long' })}</span>
              <span className="dt">{day.getDate()}</span>
              <button type="button" className="add-on" onClick={() => onAddOn(day)} aria-label={`Add something on ${day.toDateString()}`}><Plus weight="bold" /></button>
            </h2>
            {dayItems.length ? <Schedule items={dayItems} now={now} onOpen={onOpen} /> : <p className="week-free">free</p>}
          </section>
        )
      })}
    </div>
  )
}
