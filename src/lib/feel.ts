// Little sounds (WebAudio, no files) and a light haptic tap.
let ctx: AudioContext | null = null
let soundOn = localStorage.getItem('orbit:sound') !== 'off'

export const isSoundOn = () => soundOn
export function setSoundOn(on: boolean) {
  soundOn = on
  try { localStorage.setItem('orbit:sound', on ? 'on' : 'off') } catch { /* ignore */ }
}

function tone(f: number, start: number, dur: number, type: OscillatorType, vol: number, glideTo?: number) {
  if (!ctx) return
  const t = ctx.currentTime
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = type
  o.frequency.setValueAtTime(f, t + start)
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + start + dur)
  g.gain.setValueAtTime(0.0001, t + start)
  g.gain.exponentialRampToValueAtTime(vol, t + start + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t + start + dur)
  o.connect(g).connect(ctx.destination)
  o.start(t + start)
  o.stop(t + start + dur + 0.02)
}

export function play(kind: 'stamp' | 'pop' | 'page') {
  if (!soundOn) return
  try {
    ctx ??= new AudioContext()
    if (kind === 'stamp') { tone(180, 0, 0.12, 'triangle', 0.22, 70); tone(900, 0, 0.05, 'sine', 0.05) }
    if (kind === 'pop') tone(600, 0, 0.08, 'sine', 0.08, 300)
    if (kind === 'page') tone(1400, 0, 0.06, 'sine', 0.03, 900)
  } catch { /* sound is a bonus */ }
}

/**
 * Light tap. Android supports navigator.vibrate; iOS Safari doesn't, but toggling a hidden
 * <input switch> (iOS 18+) gives a system haptic. If neither works, nothing happens.
 */
export function tap() {
  if (typeof navigator.vibrate === 'function') { navigator.vibrate(8); return }
  const label = document.createElement('label')
  const input = document.createElement('input')
  input.type = 'checkbox'
  input.setAttribute('switch', '')
  label.append(input)
  label.style.display = 'none'
  document.body.append(label)
  label.click()
  label.remove()
}
