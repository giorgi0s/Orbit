import { useEffect, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { Play, Stop } from '@phosphor-icons/react'
import { Bean, PenBox, Squiggle } from '../components/Doodles'
import { Sticker } from '../components/Sticker'
import { Schedule } from '../components/Schedule'
import { useGoals, useTimer, type Goal, type useTasks } from '../lib/data'
import { addDays, occurrencesBetween, startOfDay, timeLabel, type CalEvent, type Occurrence } from '../lib/calendar'
import { clock, duration, isBedtime, useNow, weekKey } from '../lib/time'
import { play, tap } from '../lib/feel'

function beanLines(now: Date, left: number, next?: Occurrence): string[] {
  const things = left === 0 ? 'Nothing left on the list' : left === 1 ? 'One thing left on the list' : `${left} things left on the list`
  const h = now.getHours()
  if (isBedtime(now)) return [
    `Bedtime! ${left === 0 ? 'You cleared the whole list today.' : 'Whatever’s left can wait for tomorrow.'}`,
    'Phone down soon? I’ll keep an eye on everything.',
    'Big day tomorrow? Jot it down now and stop thinking about it.',
  ]
  const hello = h < 12 ? 'Morning!' : h < 17 ? 'Afternoon!' : 'Evening!'
  return [
    `${hello} ${things}.${next ? ` Next up: ${next.event.title} at ${timeLabel(next.start)}.` : ' One at a time.'}`,
    'Small reminder that water exists and you are allowed to drink it.',
    'Been outside today? Even a lap of the block counts.',
    'Anything rattling around your head? Jot it down at the bottom.',
  ]
}

export function Today({ userId, tasks: taskList, events, onOpen }: {
  userId: string
  tasks: ReturnType<typeof useTasks>
  events: CalEvent[]
  onOpen: (e: CalEvent) => void
}) {
  const now = useNow()
  const bedtime = isBedtime(now)
  const { tasks } = taskList
  const left = tasks.filter(t => !t.done).length
  const [lineIdx, setLineIdx] = useState(0)

  const week = weekKey(now)
  const todayStart = new Date(now).setHours(0, 0, 0, 0)
  const timer = useTimer(userId, new Date(todayStart).toISOString())
  const goals = useGoals(week)

  // The project name is edited locally and saved when you leave the field,
  // so a sync from the other device can't overwrite half-typed text.
  const [projectDraft, setProjectDraft] = useState(timer.project)
  useEffect(() => setProjectDraft(timer.project), [timer.project])

  const loggedToday = timer.entries.reduce((sum, e) => {
    const start = Math.max(new Date(e.started_at).getTime(), todayStart)
    return sum + Math.max(0, new Date(e.ended_at).getTime() - start) / 1000
  }, 0)
  const lastEntry = timer.entries.at(-1)
  const todays = occurrencesBetween(events, startOfDay(now), addDays(startOfDay(now), 1))
  const lines = beanLines(now, left, todays.find(o => !o.event.all_day && o.start > now))

  function toggleTimer() {
    tap()
    play('pop')
    if (timer.startedAt) timer.stop()
    else timer.start()
  }

  function toggleTask(id: string) {
    if (tasks.find(t => t.id === id)?.done === false) { play('stamp'); tap() }
    taskList.toggle(id)
  }

  function stamp(goal: Goal, slot: number) {
    const n = goals.count(goal.id)
    const next = slot < n ? slot : slot + 1 // tap a filled slot to peel back to it
    if (next > n) { play('stamp'); tap() }
    goals.setCount(goal.id, Math.min(next, goal.target))
  }

  const running = timer.startedAt != null
  const doneCount = tasks.filter(t => t.done).length

  return (
    <div className="today">
      <header className="today-head">
        <h1 className="dayname">{now.toLocaleDateString('en-GB', { weekday: 'long' })}</h1>
        <button
          className="bean"
          type="button"
          aria-label="Poke Bean"
          onClick={() => { setLineIdx(i => (i + 1) % lines.length); play('page') }}
        >
          <Bean sleepy={bedtime} />
        </button>
        <p className="date">{now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}</p>
      </header>
      <p className="bean-says" aria-live="polite">
        <span className="who">Bean:</span> {lines[lineIdx % lines.length]}
      </p>

      <section className="note" aria-label="Work timer">
        <span className="washi" aria-hidden="true" />
        <div className="note-top">
          <input
            className="note-project"
            value={projectDraft}
            onChange={e => setProjectDraft(e.target.value)}
            onBlur={() => { const p = projectDraft.trim() || 'Work'; setProjectDraft(p); if (p !== timer.project) timer.rename(p) }}
            onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
            aria-label="What are you working on?"
            placeholder="What are you working on?"
            disabled={running}
          />
          {running && (
            <span className="since">since {new Date(timer.startedAt!).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
          )}
        </div>
        <div className="note-row">
          <span className="note-clock">{clock(running ? Math.max(0, now.getTime() - timer.startedAt!) / 1000 : 0)}</span>
          <button className="pen-btn" type="button" onClick={toggleTimer}>
            {running ? <><Stop weight="bold" />Stop</> : <><Play weight="bold" />Start</>}
          </button>
        </div>
        {!running && loggedToday > 0 && lastEntry && (
          <p className="note-log">Logged today: {duration(loggedToday)}. Last one was {lastEntry.project}.</p>
        )}
      </section>

      <h2 className="page-h">Today <Squiggle width={78} /></h2>
      {todays.length ? <Schedule items={todays} now={now} onOpen={onOpen} /> : <p className="empty">Nothing booked today. Jot something like ‘gym 6pm’ at the bottom.</p>}

      <h2 className="page-h">To do <Squiggle width={70} /></h2>
      {tasks.length === 0 ? (
        <p className="empty">The list is empty. Jot something on the line at the bottom.</p>
      ) : (
        <ul className="tasks">
          {tasks.map(t => (
            <li key={t.id}>
              <button
                type="button"
                className={`task ${t.done ? 'done' : ''}`}
                role="checkbox"
                aria-checked={t.done}
                onClick={() => toggleTask(t.id)}
              >
                <span className="box">
                  <PenBox />
                  <AnimatePresence>{t.done && <Sticker kind="star" tilt={-9} className="task-sticker" />}</AnimatePresence>
                </span>
                <span className="label">{t.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {doneCount > 0 && (
        <button className="tidy" type="button" onClick={() => taskList.tidy()}>
          Tidy away {doneCount} ticked {doneCount === 1 ? 'thing' : 'things'}
        </button>
      )}

      <h2 className="page-h">This week <Squiggle width={108} /></h2>
      {goals.ready && goals.goals.length === 0 && (
        <p className="empty">No weekly goals yet. They arrive with the Sunday reset in Phase 5.</p>
      )}
      <ul className="chart">
        {goals.goals.map(g => {
          const n = goals.count(g.id)
          return (
            <li key={g.id}>
              <span className="goal">{g.title}<small>{n} of {g.target}</small></span>
              <span className="slots">
                {Array.from({ length: g.target }, (_, k) => (
                  <button key={k} type="button" className="slot" aria-label={`${g.title} ${k + 1}`} aria-pressed={k < n} onClick={() => stamp(g, k)}>
                    <svg className="slot-ring" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth={1.6} strokeDasharray="3 3.4" aria-hidden="true"><circle cx="14" cy="14" r="12" /></svg>
                    <AnimatePresence>{k < n && <Sticker kind={g.sticker} tilt={k % 2 ? 8 : -6} />}</AnimatePresence>
                  </button>
                ))}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
