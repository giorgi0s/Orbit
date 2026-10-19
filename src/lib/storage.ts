import { useEffect, useState } from 'react'

// Phase 0 keeps everything on this device. Phase 1 moves it into Supabase.
function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`orbit:${key}`)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function useStored<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => read(key, fallback))
  useEffect(() => {
    try {
      localStorage.setItem(`orbit:${key}`, JSON.stringify(value))
    } catch {
      /* private mode or full storage: keep working in memory */
    }
  }, [key, value])
  return [value, setValue] as const
}
