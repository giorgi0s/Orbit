import { useState, type FormEvent } from 'react'
import { Bean, Squiggle } from '../components/Doodles'
import { supabase } from '../lib/supabase'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) setError('That email and password didn’t match. Check them and try again.')
  }

  return (
    <form className="login" onSubmit={submit}>
      <Bean size={96} />
      <h1 className="page-title">Orbit <Squiggle width={90} /></h1>
      <p className="login-hello">It’s only you in here. Sign in to open your planner.</p>
      <label className="pen-field">
        <span>Email</span>
        <input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
      </label>
      <label className="pen-field">
        <span>Password</span>
        <input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} />
      </label>
      {error && <p className="login-error" role="alert">{error}</p>}
      <button className="pen-btn login-go" type="submit" disabled={busy}>{busy ? 'Opening…' : 'Open my planner'}</button>
    </form>
  )
}
