import { supabase } from './supabase'
import { save, useLive } from './live'
import type { StickerKind } from '../components/Sticker'

export type Task = { id: string; title: string; done: boolean; done_at: string | null; created_at: string }
export type Goal = { id: string; slug: string; title: string; target: number; sticker: StickerKind; sort: number; archived: boolean }
type Stamp = { goal_id: string; week_start: string; count: number }
type TimerRow = { user_id: string; project: string; started_at: string | null }
type Entry = { id: string; project: string; started_at: string; ended_at: string }

const db = () => supabase!

export function useTasks() {
  const live = useLive<Task>('tasks', { order: 'created_at' })

  return {
    tasks: live.rows,
    add: (title: string) => {
      const task: Task = { id: crypto.randomUUID(), title, done: false, done_at: null, created_at: new Date().toISOString() }
      return save(live, rows => [...rows, task], () => db().from('tasks').insert(task))
    },
    toggle: (id: string) => {
      const task = live.rowsRef.current.find(t => t.id === id)
      if (!task) return
      const patch = { done: !task.done, done_at: task.done ? null : new Date().toISOString() }
      return save(live, rows => rows.map(t => (t.id === id ? { ...t, ...patch } : t)), () => db().from('tasks').update(patch).eq('id', id))
    },
    tidy: () => {
      const ids = live.rowsRef.current.filter(t => t.done).map(t => t.id)
      return save(live, rows => rows.filter(t => !t.done), () => db().from('tasks').delete().in('id', ids))
    },
  }
}

export function useGoals(week: string) {
  const goals = useLive<Goal>('goals', { order: 'sort' })
  // Filtered to one week, so goal_id is unique and works as the row key.
  const stamps = useLive<Stamp>('goal_stamps', { key: 'goal_id', filter: { column: 'week_start', op: 'eq', value: week } })

  return {
    goals: goals.rows.filter(g => !g.archived),
    ready: goals.ready,
    count: (goalId: string) => stamps.rows.find(s => s.goal_id === goalId)?.count ?? 0,
    setCount: (goalId: string, count: number) => {
      const row: Stamp = { goal_id: goalId, week_start: week, count }
      return save(
        stamps,
        rows => [...rows.filter(s => s.goal_id !== goalId), row],
        () => db().from('goal_stamps').upsert(row, { onConflict: 'goal_id,week_start' }),
      )
    },
  }
}

export function useTimer(userId: string, todayStartIso: string) {
  const timer = useLive<TimerRow>('timer', { key: 'user_id' })
  const entries = useLive<Entry>('time_entries', { order: 'ended_at', filter: { column: 'ended_at', op: 'gte', value: todayStartIso } })
  const current: TimerRow = timer.rows[0] ?? { user_id: userId, project: 'Work', started_at: null }

  const write = (patch: Partial<TimerRow>) => {
    const row = { ...current, ...patch, user_id: userId }
    return save(timer, () => [row], () => db().from('timer').upsert(row, { onConflict: 'user_id' }))
  }

  return {
    project: current.project,
    startedAt: current.started_at ? new Date(current.started_at).getTime() : null,
    entries: entries.rows,
    rename: (project: string) => write({ project }),
    start: () => write({ started_at: new Date().toISOString() }),
    stop: async () => {
      if (!current.started_at) return
      const entry: Entry = { id: crypto.randomUUID(), project: current.project || 'Work', started_at: current.started_at, ended_at: new Date().toISOString() }
      await save(entries, rows => [...rows, entry], () => db().from('time_entries').insert(entry))
      await write({ started_at: null })
    },
  }
}
