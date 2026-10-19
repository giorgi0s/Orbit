import { useEffect, useState } from 'react'
import { BellRinging, BellSlash, PaperPlaneTilt, SignOut } from '@phosphor-icons/react'
import { Squiggle } from '../components/Doodles'
import { isSoundOn, play, setSoundOn } from '../lib/feel'
import { supabase } from '../lib/supabase'
import { pushState, sendTestPush, turnOffPush, turnOnPush, type PushState } from '../lib/push'

export type PageMode = 'auto' | 'day' | 'night'

export function Me({ email, pageMode, setPageMode }: { email: string | null; pageMode: PageMode; setPageMode: (m: PageMode) => void }) {
  const [sound, setSound] = useState(isSoundOn())
  const [push, setPush] = useState<PushState | null>(null)
  const [pushMsg, setPushMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => { pushState().then(setPush) }, [])

  async function run(action: () => Promise<unknown>) {
    setBusy(true)
    setPushMsg(null)
    try { await action() } catch (e) {
      console.error(e)
      setPushMsg('That didn’t work. Check your signal and try again.')
    }
    setPush(await pushState())
    setBusy(false)
  }

  return (
    <div className="me">
      <h1 className="page-title">Me <Squiggle width={44} /></h1>

      <h2 className="page-h">Page colour</h2>
      <div className="pen-choice" role="radiogroup" aria-label="Page colour">
        {([['auto', 'Follow the clock'], ['day', 'Always day'], ['night', 'Always bedtime']] as const).map(([value, label]) => (
          <button key={value} type="button" role="radio" aria-checked={pageMode === value} onClick={() => { setPageMode(value); play('page') }}>
            {label}
          </button>
        ))}
      </div>

      <h2 className="page-h">Reminders</h2>
      <div className="account">
        {push === 'needs-install' && <p className="empty flush">On iPhone, reminders only work in the home-screen app. Open Orbit from its icon, then come back here.</p>}
        {push === 'unsupported' && <p className="empty flush">This browser can’t show notifications. Use Safari’s Add to Dock (Mac) or Add to Home Screen (iPhone).</p>}
        {push === 'blocked' && <p className="empty flush">Notifications are switched off for Orbit. Turn them on in Settings → Notifications → Orbit, then come back.</p>}
        {push === 'off' && (
          <>
            <p className="empty flush">Get a note the evening before, an hour before, and an 8am rundown of the day.</p>
            <button className="pen-btn" type="button" disabled={busy} onClick={() => run(async () => { await turnOnPush(); play('stamp') })}>
              <BellRinging weight="bold" />Turn on reminders here
            </button>
          </>
        )}
        {push === 'on' && (
          <>
            <p>Reminders are <b>on</b> for this device.</p>
            <div className="btn-row">
              <button className="pen-btn" type="button" disabled={busy} onClick={() => run(async () => { const r = await sendTestPush(); setPushMsg(r.sent ? 'Sent! It should pop up in a few seconds.' : 'No devices to send to yet.') })}>
                <PaperPlaneTilt weight="bold" />Send a test
              </button>
              <button className="pen-btn quiet" type="button" disabled={busy} onClick={() => run(turnOffPush)}>
                <BellSlash weight="bold" />Turn off here
              </button>
            </div>
          </>
        )}
        {pushMsg && <p className="field-hint" role="status">{pushMsg}</p>}
      </div>

      <h2 className="page-h">Sounds</h2>
      <div className="pen-choice" role="radiogroup" aria-label="Sounds">
        {([[true, 'On'], [false, 'Off']] as const).map(([value, label]) => (
          <button key={label} type="button" role="radio" aria-checked={sound === value} onClick={() => { setSoundOn(value); setSound(value); play('pop') }}>
            {label}
          </button>
        ))}
      </div>

      <h2 className="page-h">Account</h2>
      {supabase ? (
        <div className="account">
          <p>Signed in as <b>{email}</b></p>
          <button className="pen-btn" type="button" onClick={() => supabase!.auth.signOut()}>
            <SignOut weight="bold" />Sign out
          </button>
        </div>
      ) : (
        <p className="empty">
          Not connected to Supabase yet, so everything is saved on this device only. Follow SETUP.md to connect it.
        </p>
      )}
    </div>
  )
}
