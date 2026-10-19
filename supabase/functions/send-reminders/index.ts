// Orbit reminder sender (Supabase Edge Function).
// Woken every 5 minutes by pg_cron. Sends, in your own time zone:
//   · 08:00  a rundown of today's events
//   · 19:00  a heads-up for tomorrow's events (those with "the evening before" on)
//   · 1 hour before each timed event (those with "an hour before" on)
// Also answers "Send a test" from the Me page.
//
// Secrets it needs (Edge Functions → Secrets): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, CRON_SECRET.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.
// Deploy with "Verify JWT" turned OFF: the cron call has no login, so this checks CRON_SECRET or your login itself.

import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2.118.0'

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const secret = (name: string) => Deno.env.get(name)?.trim()

/** Checks the secrets once; returns a plain-English problem instead of crashing. */
let setupProblem: string | null | undefined
function checkSetup() {
  if (setupProblem !== undefined) return setupProblem
  const missing = ['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_SUBJECT', 'CRON_SECRET'].filter(n => !secret(n))
  if (missing.length) return (setupProblem = `Missing Edge Function secrets: ${missing.join(', ')}`)
  try {
    webpush.setVapidDetails(secret('VAPID_SUBJECT')!, secret('VAPID_PUBLIC_KEY')!, secret('VAPID_PRIVATE_KEY')!)
    return (setupProblem = null)
  } catch (err) {
    return (setupProblem = `A VAPID secret looks wrong: ${(err as Error).message}`)
  }
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type Sub = { id: string; user_id: string; endpoint: string; p256dh: string; auth: string }
type Event = {
  id: string; title: string; starts_at: string; ends_at: string | null; all_day: boolean; area: string
  location: string | null; repeat_days: number[] | null; repeat_until: string | null
  remind_day_before: boolean; remind_hour_before: boolean
}
type Payload = { title: string; body: string; tag?: string; url?: string }

const LINES: Record<string, string> = {
  body: 'Your muscles have been notified.',
  out: 'Shoes on. You’re leaving the room!',
  food: 'Your fridge believes in you.',
  work: 'Deep breath. You’ve got this.',
  mind: 'Future you says thanks.',
  home: 'Small jobs, big relief.',
  other: 'Bean has been watching the clock for you.',
}

// ───────── time-zone helpers ─────────

type Local = { y: number; m: number; d: number; h: number; min: number }

function local(tz: string, at: Date): Local {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(at).map(p => [p.type, p.value]),
  )
  return { y: +parts.year, m: +parts.month, d: +parts.day, h: +parts.hour, min: +parts.minute }
}

const key = (l: { y: number; m: number; d: number }) => `${l.y}-${String(l.m).padStart(2, '0')}-${String(l.d).padStart(2, '0')}`

function plusDays(l: Local, n: number): Local {
  const t = new Date(Date.UTC(l.y, l.m - 1, l.d + n))
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), h: 0, min: 0 }
}

/** The instant when the clock in `tz` shows this local date and time. */
function instant(tz: string, l: Local): Date {
  const wanted = Date.UTC(l.y, l.m - 1, l.d, l.h, l.min)
  let guess = wanted
  for (let i = 0; i < 2; i++) {
    const seen = local(tz, new Date(guess))
    guess += wanted - Date.UTC(seen.y, seen.m - 1, seen.d, seen.h, seen.min)
  }
  return new Date(guess)
}

const hhmm = (tz: string, at: Date) => {
  const l = local(tz, at)
  return `${String(l.h).padStart(2, '0')}:${String(l.min).padStart(2, '0')}`
}

/** Events happening on one local day, repeats included. */
function occurrencesOn(events: Event[], tz: string, day: Local) {
  const dayKey = key(day)
  const weekday = new Date(Date.UTC(day.y, day.m - 1, day.d)).getUTCDay()
  const out: { event: Event; start: Date }[] = []
  for (const e of events) {
    const first = new Date(e.starts_at)
    const firstLocal = local(tz, first)
    if (!e.repeat_days?.length) {
      if (key(firstLocal) === dayKey) out.push({ event: e, start: first })
      continue
    }
    if (dayKey < key(firstLocal) || (e.repeat_until && dayKey > e.repeat_until) || !e.repeat_days.includes(weekday)) continue
    out.push({ event: e, start: instant(tz, { ...day, h: firstLocal.h, min: firstLocal.min }) })
  }
  return out.sort((a, b) => Number(b.event.all_day) - Number(a.event.all_day) || a.start.getTime() - b.start.getTime())
}

const listOf = (tz: string, items: { event: Event; start: Date }[]) =>
  items.map(o => (o.event.all_day ? o.event.title : `${o.event.title} at ${hhmm(tz, o.start)}`)).join(' · ')

// ───────── sending ─────────

async function send(subs: Sub[], payload: Payload) {
  let sent = 0
  for (const s of subs) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 3600 })
      sent++
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) await admin.from('push_subscriptions').delete().eq('id', s.id) // device unsubscribed
      else console.error('push failed', status, err)
    }
  }
  return sent
}

/** Records that a note went out; false if it already had (so nothing is sent twice). */
async function claim(userId: string, kind: string, ref: string, occurrence: string) {
  const { data, error } = await admin
    .from('sent_notifications')
    .upsert({ user_id: userId, kind, ref, occurrence }, { onConflict: 'user_id,kind,ref,occurrence', ignoreDuplicates: true })
    .select()
  if (error) { console.error(error); return false }
  return (data?.length ?? 0) > 0
}

async function remindUser(userId: string, subs: Sub[], now: Date) {
  const { data: settings } = await admin.from('settings').select('timezone').eq('user_id', userId).maybeSingle()
  const tz = settings?.timezone ?? 'Europe/London'
  const { data: events } = await admin.from('events').select('*').eq('user_id', userId)
  if (!events) return 0

  const today = local(tz, now)
  const tomorrow = plusDays(today, 1)
  let sent = 0

  if (today.h >= 8 && today.h < 12 && await claim(userId, 'morning', '', key(today))) {
    const items = occurrencesOn(events, tz, today)
    if (items.length) sent += await send(subs, { title: 'Morning! Here’s today', body: listOf(tz, items), tag: `morning-${key(today)}` })
  }

  if (today.h >= 19 && today.h < 23 && await claim(userId, 'evening', '', key(today))) {
    const items = occurrencesOn(events, tz, tomorrow).filter(o => o.event.remind_day_before)
    if (items.length) sent += await send(subs, { title: 'Tomorrow', body: `${listOf(tz, items)}. I’ll nudge you again on the day.`, tag: `evening-${key(today)}` })
  }

  for (const o of [...occurrencesOn(events, tz, today), ...occurrencesOn(events, tz, tomorrow)]) {
    if (o.event.all_day || !o.event.remind_hour_before) continue
    const minutes = Math.round((o.start.getTime() - now.getTime()) / 60_000)
    if (minutes <= 0 || minutes > 65) continue
    if (!(await claim(userId, 'hour', o.event.id, key(local(tz, o.start))))) continue
    const when = minutes >= 55 ? 'in an hour' : `in ${minutes} min`
    const where = o.event.location ? ` · ${o.event.location}` : ''
    sent += await send(subs, {
      title: `${o.event.title} ${when}`,
      body: `${hhmm(tz, o.start)}${where}. ${LINES[o.event.area] ?? LINES.other}`,
      tag: `hour-${o.event.id}`,
    })
  }
  return sent
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
  const problem = checkSetup()
  if (problem) return json({ error: problem }, 500)

  // From the Me page: "Send a test".
  if (req.headers.get('x-cron-secret') !== secret('CRON_SECRET')) {
    const jwt = req.headers.get('Authorization')?.replace(/^Bearer /, '')
    const { data } = jwt ? await admin.auth.getUser(jwt) : { data: { user: null } }
    if (!data.user) return json({ error: 'not allowed' }, 401)
    const { data: subs } = await admin.from('push_subscriptions').select('*').eq('user_id', data.user.id)
    const sent = await send(subs ?? [], { title: 'Hello from Bean', body: 'Reminders are working. I’ll take it from here.', tag: 'test' })
    return json({ sent })
  }

  // From pg_cron, every 5 minutes.
  const { data: subs, error } = await admin.from('push_subscriptions').select('*')
  if (error) return json({ error: error.message }, 500)
  const byUser = new Map<string, Sub[]>()
  for (const s of (subs ?? []) as Sub[]) byUser.set(s.user_id, [...(byUser.get(s.user_id) ?? []), s])
  const now = new Date()
  let sent = 0
  for (const [userId, userSubs] of byUser) sent += await remindUser(userId, userSubs, now)

  // Tidy the bookkeeping now and then.
  if (now.getUTCHours() === 3 && now.getUTCMinutes() < 5) {
    await admin.from('sent_notifications').delete().lt('occurrence', key(plusDays(local('UTC', now), -14)))
  }
  return json({ sent })
})
