import { useState } from 'react'
import { SignOut } from '@phosphor-icons/react'
import { Squiggle } from '../components/Doodles'
import { isSoundOn, play, setSoundOn } from '../lib/feel'
import { supabase } from '../lib/supabase'

export type PageMode = 'auto' | 'day' | 'night'

export function Me({ email, pageMode, setPageMode }: { email: string | null; pageMode: PageMode; setPageMode: (m: PageMode) => void }) {
  const [sound, setSound] = useState(isSoundOn())

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
