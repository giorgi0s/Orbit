import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'

type Filter = { column: string; op: 'eq' | 'gte'; value: string }
type Row = Record<string, unknown>

/** Tell the app a save failed; App shows a small note on the page. */
export function reportSyncError(error: unknown) {
  console.error('[orbit] sync failed', error)
  window.dispatchEvent(new CustomEvent('orbit:sync-error'))
}

/**
 * Rows from one Supabase table, kept live:
 * - shows the last copy saved on this device straight away (so the app opens instantly, even offline)
 * - fetches fresh rows, then listens for changes made on other devices
 * - refetches whenever the app comes back to the foreground (iOS pauses web apps in the background)
 */
export function useLive<T extends Row>(table: string, opts: { key?: keyof T & string; filter?: Filter; order?: keyof T & string } = {}) {
  const key = opts.key ?? 'id'
  const { filter, order } = opts
  const cacheKey = `orbit:cache:${table}:${filter ? `${filter.column}.${filter.op}.${filter.value}` : 'all'}`

  const [rows, setRowsState] = useState<T[]>(() => {
    try { return JSON.parse(localStorage.getItem(cacheKey) ?? '[]') as T[] } catch { return [] }
  })
  const [ready, setReady] = useState(false)
  const rowsRef = useRef(rows)

  const setRows = useCallback((next: T[] | ((prev: T[]) => T[])) => {
    setRowsState(prev => {
      const value = typeof next === 'function' ? next(prev) : next
      const sorted = order ? [...value].sort((a, b) => String(a[order]).localeCompare(String(b[order]))) : value
      rowsRef.current = sorted
      try { localStorage.setItem(cacheKey, JSON.stringify(sorted)) } catch { /* cache is optional */ }
      return sorted
    })
  }, [cacheKey, order])

  useEffect(() => {
    if (!supabase) return
    const db = supabase
    let cancelled = false

    async function fetchAll() {
      let q = db.from(table).select('*')
      if (filter) q = filter.op === 'eq' ? q.eq(filter.column, filter.value) : q.gte(filter.column, filter.value)
      const { data, error } = await q
      if (cancelled) return
      if (error) { reportSyncError(error); return }
      setRows(data as T[])
      setReady(true)
    }

    const matches = (r: Row) => !filter || (filter.op === 'eq' ? String(r[filter.column]) === filter.value : String(r[filter.column]) >= filter.value)

    const channel = db
      // A fresh name each time: supabase-js hands back an existing channel with the same name,
      // even one that's mid-teardown, which would leave this view deaf to changes.
      .channel(`live:${cacheKey}:${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table, ...(filter ? { filter: `${filter.column}=${filter.op}.${filter.value}` } : {}) }, payload => {
        if (payload.eventType === 'DELETE') {
          const gone = (payload.old as Row)[key]
          setRows(prev => prev.filter(r => r[key] !== gone))
          return
        }
        const row = payload.new as T
        if (!matches(row)) return
        setRows(prev => [...prev.filter(r => r[key] !== row[key]), row])
      })
      .subscribe(status => { if (status === 'SUBSCRIBED') fetchAll() })

    const onVisible = () => { if (document.visibilityState === 'visible') fetchAll() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', fetchAll)
    fetchAll()

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', fetchAll)
      db.removeChannel(channel)
    }
  }, [table, cacheKey, key, filter?.column, filter?.op, filter?.value, setRows])

  return { rows, setRows, ready, rowsRef }
}

/** Run a save; if it fails, put the rows back how they were and tell the app. */
export async function save<T extends Row>(
  live: { rowsRef: { current: T[] }; setRows: (r: T[]) => void },
  optimistic: (rows: T[]) => T[],
  write: () => PromiseLike<{ error: unknown }>,
) {
  const before = live.rowsRef.current
  live.setRows(optimistic(before))
  const { error } = await write()
  if (error) {
    live.setRows(before)
    reportSyncError(error)
  }
}
