import { useState, type CSSProperties, type FormEvent } from 'react'
import { motion } from 'motion/react'
import { Trash, X } from '@phosphor-icons/react'
import { AREAS, WEEKDAYS, dayKey, timeLabel, type Area, type CalEvent } from '../lib/calendar'

export type EventDraft = Omit<CalEvent, 'id' | 'created_at'>

const toTime = (iso: string) => timeLabel(new Date(iso))

function fromForm(date: string, time: string) {
  return new Date(`${date}T${time || '00:00'}`)
}

/** A page that slides up over the planner to add or edit one event. */
export function EventSheet({ initial, isNew, onSave, onDelete, onClose }: {
  initial: EventDraft
  isNew: boolean
  onSave: (e: EventDraft) => void
  onDelete?: () => void
  onClose: () => void
}) {
  const [title, setTitle] = useState(initial.title)
  const [date, setDate] = useState(dayKey(new Date(initial.starts_at)))
  const [allDay, setAllDay] = useState(initial.all_day)
  const [start, setStart] = useState(initial.all_day ? '09:00' : toTime(initial.starts_at))
  const [end, setEnd] = useState(initial.ends_at && !initial.all_day ? toTime(initial.ends_at) : '')
  const [repeat, setRepeat] = useState<number[]>(initial.repeat_days ?? [])
  const [until, setUntil] = useState(initial.repeat_until ?? '')
  const [area, setArea] = useState<Area>(initial.area)
  const [location, setLocation] = useState(initial.location ?? '')
  const [dayBefore, setDayBefore] = useState(initial.remind_day_before)
  const [hourBefore, setHourBefore] = useState(initial.remind_hour_before)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const endsBeforeStart = !allDay && end && end < start

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() || endsBeforeStart) return
    const startsAt = fromForm(date, allDay ? '00:00' : start)
    onSave({
      title: title.trim(),
      starts_at: startsAt.toISOString(),
      ends_at: !allDay && end ? fromForm(date, end).toISOString() : null,
      all_day: allDay,
      area,
      location: location.trim() || null,
      notes: initial.notes,
      repeat_days: repeat.length ? [...repeat].sort() : null,
      repeat_until: repeat.length && until ? until : null,
      remind_day_before: dayBefore,
      remind_hour_before: hourBefore,
    })
  }

  return (
    <div className="sheet-layer" role="dialog" aria-modal="true" aria-label={isNew ? 'New event' : 'Edit event'}>
      <motion.div className="sheet-backdrop" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.form
        className="event-sheet"
        onSubmit={submit}
        initial={{ y: '100%', rotate: 1.5 }}
        animate={{ y: 0, rotate: 0 }}
        exit={{ y: '100%', rotate: 1.5, transition: { duration: .22, ease: [.4, 0, 1, 1] } }}
        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
      >
        <span className="washi" aria-hidden="true" />
        <div className="sheet-top">
          <input className="sheet-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="What’s happening?" aria-label="Title" autoFocus={isNew && !title} required />
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><X weight="bold" /></button>
        </div>

        <div className="field-row">
          <label className="pen-field"><span>{repeat.length ? 'Starting' : 'Day'}</span><input type="date" value={date} onChange={e => setDate(e.target.value)} required /></label>
          <label className="toggle"><input type="checkbox" checked={allDay} onChange={e => setAllDay(e.target.checked)} /> All day</label>
        </div>
        {!allDay && (
          <div className="field-row">
            <label className="pen-field"><span>From</span><input type="time" value={start} onChange={e => setStart(e.target.value)} required /></label>
            <label className="pen-field"><span>Until (optional)</span><input type="time" value={end} onChange={e => setEnd(e.target.value)} /></label>
          </div>
        )}
        {endsBeforeStart && <p className="field-error">It ends before it starts. Check the times.</p>}

        <fieldset className="pen-fieldset">
          <legend>Repeats every</legend>
          <div className="day-chips">
            {[1, 2, 3, 4, 5, 6, 0].map(d => (
              <button key={d} type="button" aria-pressed={repeat.includes(d)} onClick={() => setRepeat(r => (r.includes(d) ? r.filter(x => x !== d) : [...r, d]))}>
                {WEEKDAYS[d]}
              </button>
            ))}
          </div>
          {repeat.length > 0 && (
            <label className="pen-field narrow"><span>Stop repeating after (optional)</span><input type="date" value={until} min={date} onChange={e => setUntil(e.target.value)} /></label>
          )}
        </fieldset>

        <fieldset className="pen-fieldset">
          <legend>Part of life</legend>
          <div className="area-chips">
            {(Object.keys(AREAS) as Area[]).map(a => (
              <button key={a} type="button" aria-pressed={area === a} style={{ '--hl': AREAS[a].highlight } as CSSProperties} onClick={() => setArea(a)}>
                {AREAS[a].label}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="pen-field"><span>Where (optional)</span><input value={location} onChange={e => setLocation(e.target.value)} /></label>

        <fieldset className="pen-fieldset">
          <legend>Remind me</legend>
          <label className="toggle"><input type="checkbox" checked={dayBefore} onChange={e => setDayBefore(e.target.checked)} /> The evening before (7pm)</label>
          {!allDay && <label className="toggle"><input type="checkbox" checked={hourBefore} onChange={e => setHourBefore(e.target.checked)} /> An hour before</label>}
          <p className="field-hint">Everything on today also shows up in the 8am morning note.</p>
        </fieldset>

        <div className="sheet-actions">
          {onDelete && (confirmDelete ? (
            <button type="button" className="pen-btn danger" onClick={onDelete}><Trash weight="bold" />{repeat.length ? 'Delete every repeat' : 'Yes, delete it'}</button>
          ) : (
            <button type="button" className="pen-btn quiet" onClick={() => setConfirmDelete(true)}><Trash weight="bold" />Delete</button>
          ))}
          <button type="submit" className="pen-btn primary">{isNew ? 'Add to calendar' : 'Save'}</button>
        </div>
      </motion.form>
    </div>
  )
}
