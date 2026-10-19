import { supabase } from './supabase'

const PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

export type PushState = 'unsupported' | 'needs-install' | 'blocked' | 'off' | 'on'

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const isInstalled = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true

function keyBytes(base64: string) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0))
}

function deviceName() {
  if (isIOS()) return 'iPhone'
  if (/Macintosh/.test(navigator.userAgent)) return 'Mac'
  return 'Browser'
}

export async function pushState(): Promise<PushState> {
  if (!('serviceWorker' in navigator) || !('Notification' in window)) return isIOS() && !isInstalled() ? 'needs-install' : 'unsupported'
  if (!('PushManager' in window)) return isIOS() && !isInstalled() ? 'needs-install' : 'unsupported'
  if (Notification.permission === 'denied') return 'blocked'
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  return sub && Notification.permission === 'granted' ? 'on' : 'off'
}

/** Must be called from a tap (iOS only shows the permission prompt for a user action). */
export async function turnOnPush() {
  if (!supabase || !PUBLIC_KEY) throw new Error('Push key missing')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return pushState()
  const reg = await navigator.serviceWorker.ready
  const sub = (await reg.pushManager.getSubscription())
    ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(PUBLIC_KEY) }))
  const json = sub.toJSON()
  const { error } = await supabase.from('push_subscriptions').upsert(
    { endpoint: sub.endpoint, p256dh: json.keys!.p256dh, auth: json.keys!.auth, device: deviceName() },
    { onConflict: 'endpoint' },
  )
  if (error) throw error
  return 'on' as const
}

export async function turnOffPush() {
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  if (sub) {
    await supabase?.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
    await sub.unsubscribe()
  }
  return pushState()
}

/** Asks the reminder sender to send a test notification to every device you've turned on. */
export async function sendTestPush() {
  if (!supabase) throw new Error('Not connected')
  const { data, error } = await supabase.functions.invoke('send-reminders', { body: { test: true } })
  if (error) throw error
  return data as { sent: number }
}

/** Remember this device's time zone so reminders arrive at 8am and 7pm local time. */
export async function saveTimezone(userId: string) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  await supabase?.from('settings').upsert({ user_id: userId, timezone }, { onConflict: 'user_id' })
}
