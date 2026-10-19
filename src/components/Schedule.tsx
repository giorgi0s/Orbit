import type { CSSProperties } from 'react'
import { Repeat } from '@phosphor-icons/react'
import { AREAS, timeLabel, type CalEvent, type Occurrence } from '../lib/calendar'

/** A day's events, with times in the planner margin. */
export function Schedule({ items, now, onOpen }: { items: Occurrence[]; now: Date; onOpen: (e: CalEvent) => void }) {
  return (
    <ol className="sched">
      {items.map(o => {
        const over = (o.end ?? o.start) < now && !o.event.all_day
        const happening = !o.event.all_day && o.start <= now && (o.end ?? new Date(o.start.getTime() + 3_600_000)) > now
        return (
          <li key={`${o.event.id}:${o.day}`} className={`${over ? 'past' : ''} ${happening ? 'now' : ''}`}>
            <time dateTime={o.start.toISOString()}>{o.event.all_day ? 'all day' : timeLabel(o.start)}</time>
            <button type="button" className="sched-item" onClick={() => onOpen(o.event)} style={{ '--hl': AREAS[o.event.area].highlight } as CSSProperties}>
              <span className="sched-title">{o.event.title}</span>
              {o.event.repeat_days && <Repeat className="sched-repeat" weight="bold" aria-label="Repeats" />}
              {(o.end || o.event.location) && (
                <span className="sched-sub">
                  {[o.end && !o.event.all_day ? `until ${timeLabel(o.end)}` : null, o.event.location].filter(Boolean).join(' · ')}
                </span>
              )}
            </button>
          </li>
        )
      })}
    </ol>
  )
}
