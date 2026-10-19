import * as chrono from 'chrono-node'

export type Area = 'work' | 'body' | 'food' | 'out' | 'home' | 'mind' | 'other'

export type CalEvent = {
  id: string
  title: string
  starts_at: string
  ends_at: string | null
  all_day: boolean
  area: Area
  location: string | null
  notes: string | null
  repeat_days: number[] | null
  repeat_until: string | null
  remind_day_before: boolean
  remind_hour_before: boolean
  created_at: string
}

export type Occurrence = { event: CalEvent; start: Date; end: Date | null; day: string }

export const AREAS: Record<Area, { label: string; highlight: string }> = {
  work: { label: 'Work', highlight: 'rgba(110, 205, 255, .5)' },
  body: { label: 'Gym & body', highlight: 'rgba(255, 176, 70, .55)' },
  food: { label: 'Food', highlight: 'rgba(190, 244, 70, .7)' },
  out: { label: 'Going out', highlight: 'rgba(255, 122, 182, .45)' },
  home: { label: 'Home', highlight: 'rgba(196, 160, 255, .5)' },
  mind: { label: 'Mind', highlight: 'rgba(120, 225, 200, .55)' },
  other: { label: 'Other', highlight: 'rgba(200, 205, 225, .55)' },
}

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** Local calendar date as YYYY-MM-DD. */
export function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function addDays(d: Date, n: number) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export const timeLabel = (d: Date) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

/** Every occurrence (repeats expanded) that starts on a day in [from, to). */
export function occurrencesBetween(events: CalEvent[], from: Date, to: Date): Occurrence[] {
  const out: Occurrence[] = []
  for (const event of events) {
    const first = new Date(event.starts_at)
    const length = event.ends_at ? new Date(event.ends_at).getTime() - first.getTime() : null

    if (!event.repeat_days?.length) {
      if (first >= startOfDay(from) && first < to) out.push({ event, start: first, end: length != null ? new Date(first.getTime() + length) : null, day: dayKey(first) })
      continue
    }

    const until = event.repeat_until ? addDays(startOfDay(new Date(`${event.repeat_until}T00:00`)), 1) : to
    for (let day = startOfDay(from > first ? from : first); day < to && day < until; day = addDays(day, 1)) {
      if (!event.repeat_days.includes(day.getDay())) continue
      const start = new Date(day)
      start.setHours(first.getHours(), first.getMinutes(), 0, 0)
      out.push({ event, start, end: length != null ? new Date(start.getTime() + length) : null, day: dayKey(start) })
    }
  }
  return out.sort((a, b) => Number(b.event.all_day) - Number(a.event.all_day) || a.start.getTime() - b.start.getTime())
}

// ───────── quick add: "dentist fri 3pm", "gym mon wed fri 6pm", "buy oat milk" ─────────

export type Parsed =
  | { kind: 'task'; title: string }
  | { kind: 'event'; title: string; start: Date; end: Date | null; allDay: boolean; repeatDays: number[] | null; area: Area }

const DAY_WORDS: [RegExp, number][] = [
  [/^sun(day)?s?$/, 0], [/^mon(day)?s?$/, 1], [/^tue(s(day)?)?s?$/, 2], [/^wed(s|nesday)?s?$/, 3],
  [/^thu(r(s(day)?)?)?s?$/, 4], [/^fri(day)?s?$/, 5], [/^sat(urday)?s?$/, 6],
]

const AREA_WORDS: [RegExp, Area][] = [
  [/\b(gym|run|running|workout|swim|yoga|legs|push|pull|climb|football|5k|physio)\b/i, 'body'],
  [/\b(lunch|dinner|breakfast|cook|meal ?prep|brunch|bake|food shop|groceries)\b/i, 'food'],
  [/\b(quiz|pub|drinks|party|cinema|gig|concert|date|walk|park|museum|friends?|birthday|bar)\b/i, 'out'],
  [/\b(work|meeting|standup|client|deadline|interview|shift)\b/i, 'work'],
  [/\b(clean|laundry|bins|landlord|rent|plumber|tidy|hoover|washing)\b/i, 'home'],
  [/\b(dentist|doctor|gp|therapy|read|journal|meditat\w*|haircut|barber)\b/i, 'mind'],
]

export function guessArea(title: string): Area {
  return AREA_WORDS.find(([re]) => re.test(title))?.[1] ?? 'other'
}

function tidyTitle(text: string) {
  const t = text
    .replace(/\s+/g, ' ')
    .replace(/\b(at|on|from|every|this|next|until|till|by)\s*$/i, '')
    .replace(/^\s*(at|on|from)\b/i, '')
    .replace(/[\s,–-]+$/, '')
    .replace(/^[\s,–-]+/, '')
    .trim()
  return t.charAt(0).toUpperCase() + t.slice(1)
}

export function parseQuickAdd(input: string, now = new Date()): Parsed {
  let text = input.trim()

  // Weekly repeats first, because chrono only understands one day at a time.
  let repeatDays: number[] | null = null
  if (/\b(every ?day|daily)\b/i.test(text)) { repeatDays = [0, 1, 2, 3, 4, 5, 6]; text = text.replace(/\b(every ?day|daily)\b/i, ' ') }
  else if (/\b(every )?weekdays?\b/i.test(text)) { repeatDays = [1, 2, 3, 4, 5]; text = text.replace(/\b(every )?weekdays?\b/i, ' ') }
  else if (/\b(every )?weekends?\b/i.test(text)) { repeatDays = [0, 6]; text = text.replace(/\b(every )?weekends?\b/i, ' ') }
  else {
    const words = text.split(/(\s+|,|&|\band\b)/)
    const found = new Set<number>()
    const isEvery = /\bevery\b/i.test(text)
    const dayIdx: number[] = []
    words.forEach((w, i) => {
      const hit = DAY_WORDS.find(([re]) => re.test(w.toLowerCase()))
      if (hit) { found.add(hit[1]); dayIdx.push(i) }
    })
    if (found.size >= 2 || (found.size === 1 && isEvery)) {
      repeatDays = [...found].sort()
      dayIdx.forEach(i => { words[i] = ' ' })
      text = words.join('').replace(/\bevery\b/i, ' ').replace(/(\s*(,|&|\band\b)\s*)+/g, ' ')
    }
  }

  const results = chrono.en.GB.parse(text, now, { forwardDate: true })
  const hit = results[0]
  if (!hit && !repeatDays) return { kind: 'task', title: tidyTitle(input) }

  const title = tidyTitle(hit ? text.slice(0, hit.index) + ' ' + text.slice(hit.index + hit.text.length) : text) || 'Something'
  const hasTime = !!hit && hit.start.isCertain('hour')
  let start = hit ? hit.start.date() : startOfDay(now)
  let end = hit?.end ? hit.end.date() : null

  // "dinner at 7:30" means the evening: read a bare 1–7 o'clock as pm.
  if (hit && hasTime && !hit.start.isCertain('meridiem') && start.getHours() >= 1 && start.getHours() <= 7) {
    start = new Date(start.getTime() + 12 * 3_600_000)
    if (end) end = new Date(end.getTime() + 12 * 3_600_000)
    // chrono pushed it to tomorrow because 7:30am had passed; 7:30pm today may not have.
    if (!hit.start.isCertain('day') && !hit.start.isCertain('weekday')) {
      const today = new Date(start.getTime() - 86_400_000)
      if (dayKey(today) === dayKey(now) && today > now) {
        start = today
        if (end) end = new Date(end.getTime() - 86_400_000)
      }
    }
  }

  if (repeatDays) {
    // First occurrence: the next matching day (today counts if the time hasn't passed).
    for (let i = 0; i < 8; i++) {
      const day = addDays(startOfDay(now), i)
      if (!repeatDays.includes(day.getDay())) continue
      const candidate = new Date(day)
      if (hasTime) candidate.setHours(start.getHours(), start.getMinutes(), 0, 0)
      if (!hasTime || candidate >= now || i > 0) { start = candidate; break }
    }
  }
  if (!hasTime) start = startOfDay(start)

  return { kind: 'event', title, start, end: hasTime ? end : null, allDay: !hasTime, repeatDays, area: guessArea(title) }
}

export function describeWhen(p: { start: Date; end: Date | null; allDay: boolean; repeatDays: number[] | null }, now = new Date()) {
  const time = p.allDay ? 'all day' : timeLabel(p.start) + (p.end ? `–${timeLabel(p.end)}` : '')
  if (p.repeatDays) {
    const days = p.repeatDays.length === 7 ? 'Every day' : p.repeatDays.join() === '1,2,3,4,5' ? 'Weekdays' : p.repeatDays.join() === '0,6' ? 'Weekends' : `Every ${p.repeatDays.map(d => WEEKDAYS[d]).join(', ')}`
    return `${days}, ${time}`
  }
  const today = startOfDay(now)
  const d = startOfDay(p.start)
  const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000)
  const day = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : p.start.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  return `${day}, ${time}`
}
