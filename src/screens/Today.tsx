import { useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { Play, Stop } from '@phosphor-icons/react'
import { Bean, PenBox, Squiggle } from '../components/Doodles'
import { Sticker, type StickerKind } from '../components/Sticker'
import { useStored } from '../lib/storage'
import { clock, duration, isBedtime, useNow, weekKey } from '../lib/time'
import { play, tap } from '../lib/feel'

export type Task = { id: string; title: string; done: boolean; createdAt: number }
type Goal = { id: string; title: string; target: number; sticker: StickerKind }
type TimerState = { project: string; startedAt: number | null }
type TimeEntry = { project: string; start: number; end: number }

const GOALS: Goal[] = [
  { id: 'gym', title: 'Gym', target: 3, sticker: 'star' },
  { id: 'cook', title: 'Cook at home', target: 4, sticker: 'heart' },
  { id: 'out', title: 'Go out', target: 2, sticker: 'sun' },
]

function beanLines(now: Date, left: number): string[] {
  const things = left === 0 ? 'Nothing left on the list' : left === 1 ? 'One thing left on the list' : `${left} things left on the list`
  const h = now.getHours()
  if (isBedtime(now)) return [
    `Bedtime! ${left === 0 ? 'You cleared the whole list today.' : 'Whatever’s left can wait for tomorrow.'}`,
    'Phone down soon? I’ll keep an eye on everything.',
    'Big day tomorrow? Jot it down now and stop thinking about it.',
  ]
  const hello = h < 12 ? 'Morning!' : h < 17 ? 'Afternoon!' : 'Evening!'
  return [
    `${hello} ${things}. One at a time.`,
    'Small reminder that water exists and you are allowed to drink it.',
    'Been outside today? Even a lap of the block counts.',
    'Anything rattling around your head? Jot it down at the bottom.',
  ]
}

export function Today({ tasks, setTasks }: { tasks: Task[]; setTasks: (fn: (t: Task[]) => Task[]) => void }) {
  const now = useNow()
  const bedtime = isBedtime(now)
  const left = tasks.filter(t => !t.done).length
  const lines = beanLines(now, left)
  const [lineIdx, setLineIdx] = useState(0)

  const [timer, setTimer] = useStored<TimerState>('timer', { project: 'Work', startedAt: null })
  const [entries, setEntries] = useStored<TimeEntry[]>('time-entries', [])
  const [progress, setProgress] = useStored<Record<string, Record<string, number>>>('goal-progress', {})
  const week = weekKey(now)
  const thisWeek = progress[week] ?? {}

  const todayStart = new Date(now).setHours(0, 0, 0, 0)
  const loggedToday = entries
    .filter(e => e.end >= todayStart)
    .reduce((sum, e) => sum + (e.end - Math.max(e.start, todayStart)) / 1000, 0)
  const lastEntry = entries.at(-1)

  function toggleTimer() {
    tap()
    play('pop')
    if (timer.startedAt) {
      setEntries(list => [...list, { project: timer.project || 'Work', start: timer.startedAt!, end: Date.now() }])
      setTimer(t => ({ ...t, startedAt: null }))
    } else {
      setTimer(t => ({ ...t, startedAt: Date.now() }))
    }
  }

  function toggleTask(id: string) {
    if (tasks.find(t => t.id === id)?.done === false) { play('stamp'); tap() }
    setTasks(list => list.map(t => (t.id === id ? { ...t, done: !t.done } : t)))
  }

  function stamp(goal: Goal, slot: number) {
    const n = thisWeek[goal.id] ?? 0
    const next = slot < n ? slot : slot + 1 // tap a filled slot to peel back to it
    if (next > n) { play('stamp'); tap() }
    setProgress(p => ({ ...p, [week]: { ...(p[week] ?? {}), [goal.id]: Math.min(next, goal.target) } }))
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
            value={timer.project}
            onChange={e => setTimer(t => ({ ...t, project: e.target.value }))}
            aria-label="What are you working on?"
            placeholder="What are you working on?"
            disabled={running}
          />
          {running && (
            <span className="since">since {new Date(timer.startedAt!).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
          )}
        </div>
        <div className="note-row">
          <span className="note-clock">{clock(running ? (now.getTime() - timer.startedAt!) / 1000 : 0)}</span>
          <button className="pen-btn" type="button" onClick={toggleTimer}>
            {running ? <><Stop weight="bold" />Stop</> : <><Play weight="bold" />Start</>}
          </button>
        </div>
        {!running && loggedToday > 0 && lastEntry && (
          <p className="note-log">Logged today: {duration(loggedToday)}. Last one was {lastEntry.project}.</p>
        )}
      </section>

      <h2 className="page-h">Today <Squiggle width={78} /></h2>
      <p className="empty">Nothing on the calendar yet. The calendar moves in during Phase 2.</p>

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
        <button className="tidy" type="button" onClick={() => setTasks(list => list.filter(t => !t.done))}>
          Tidy away {doneCount} ticked {doneCount === 1 ? 'thing' : 'things'}
        </button>
      )}

      <h2 className="page-h">This week <Squiggle width={108} /></h2>
      <ul className="chart">
        {GOALS.map(g => {
          const n = thisWeek[g.id] ?? 0
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
