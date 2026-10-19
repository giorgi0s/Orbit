import { supabase } from './supabase'
import { reportSyncError } from './live'

// Phase 0 saved everything on each device. This moves it into Supabase once, then clears it.
type OldTask = { id: string; title: string; done: boolean; createdAt: number }
type OldEntry = { project: string; start: number; end: number }
type OldTimer = { project: string; startedAt: number | null }

let running = false

function take<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(`orbit:${key}`)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export async function importLocalData(userId: string) {
  if (running || !supabase) return
  running = true
  const db = supabase
  try {
    const tasks = take<OldTask[]>('tasks')
    if (tasks?.length) {
      const { error } = await db.from('tasks').upsert(
        tasks.map(t => ({ id: t.id, title: t.title, done: t.done, done_at: t.done ? new Date().toISOString() : null, created_at: new Date(t.createdAt).toISOString() })),
        { onConflict: 'id', ignoreDuplicates: true },
      )
      if (error) throw error
    }
    localStorage.removeItem('orbit:tasks')

    const progress = take<Record<string, Record<string, number>>>('goal-progress')
    if (progress && Object.keys(progress).length) {
      const { data: goals, error } = await db.from('goals').select('id, slug')
      if (error) throw error
      const { data: existing } = await db.from('goal_stamps').select('goal_id, week_start, count')
      const rows = Object.entries(progress).flatMap(([week, bySlug]) =>
        Object.entries(bySlug).flatMap(([slug, count]) => {
          const goal = goals?.find(g => g.slug === slug)
          if (!goal || !count) return []
          const have = existing?.find(s => s.goal_id === goal.id && s.week_start === week)?.count ?? 0
          return count > have ? [{ goal_id: goal.id, week_start: week, count }] : []
        }),
      )
      if (rows.length) {
        const { error: upsertError } = await db.from('goal_stamps').upsert(rows, { onConflict: 'goal_id,week_start' })
        if (upsertError) throw upsertError
      }
    }
    localStorage.removeItem('orbit:goal-progress')

    const entries = take<OldEntry[]>('time-entries')
    if (entries?.length) {
      const { error } = await db.from('time_entries').insert(
        entries.map(e => ({ project: e.project, started_at: new Date(e.start).toISOString(), ended_at: new Date(e.end).toISOString() })),
      )
      if (error) throw error
    }
    localStorage.removeItem('orbit:time-entries')

    const timer = take<OldTimer>('timer')
    if (timer?.startedAt) {
      const { data } = await db.from('timer').select('started_at').maybeSingle()
      if (!data?.started_at) {
        const { error } = await db.from('timer').upsert(
          { user_id: userId, project: timer.project || 'Work', started_at: new Date(timer.startedAt).toISOString() },
          { onConflict: 'user_id' },
        )
        if (error) throw error
      }
    }
    localStorage.removeItem('orbit:timer')
  } catch (error) {
    // Leave whatever didn't make it on the device; the next launch tries again.
    reportSyncError(error)
  } finally {
    running = false
  }
}
