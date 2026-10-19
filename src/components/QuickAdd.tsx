import { useMemo, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CalendarBlank, CheckSquare, PencilSimpleLine, Repeat } from '@phosphor-icons/react'
import { describeWhen, parseQuickAdd, type Parsed } from '../lib/calendar'
import { play } from '../lib/feel'

/**
 * The "Jot it down…" line. Plain text becomes a to-do; anything with a day or time becomes
 * a calendar event, previewed on a chip before it's saved so mistakes are obvious.
 */
export function QuickAdd({ onTask, onEvent }: { onTask: (title: string) => void; onEvent: (p: Extract<Parsed, { kind: 'event' }>) => void }) {
  const [text, setText] = useState('')
  const [forceTask, setForceTask] = useState(false)
  const parsed = useMemo(() => (text.trim() ? parseQuickAdd(text) : null), [text])
  const asEvent = parsed?.kind === 'event' && !forceTask ? parsed : null

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!parsed) return
    if (asEvent) onEvent(asEvent)
    else onTask(parsed.kind === 'task' ? parsed.title : text.trim())
    setText('')
    setForceTask(false)
    play('pop')
  }

  return (
    <form className="quick" onSubmit={submit}>
      <AnimatePresence>
        {parsed?.kind === 'event' && (
          <motion.div
            className="quick-chip"
            initial={{ opacity: 0, y: 8, rotate: -2 }}
            animate={{ opacity: 1, y: 0, rotate: -1 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ type: 'spring', stiffness: 500, damping: 26 }}
          >
            {asEvent ? (
              <>
                {asEvent.repeatDays ? <Repeat weight="bold" aria-hidden="true" /> : <CalendarBlank weight="bold" aria-hidden="true" />}
                <span><b>{asEvent.title}</b> · {describeWhen(asEvent)}</span>
                <button type="button" onClick={() => setForceTask(true)}>to-do instead</button>
              </>
            ) : (
              <>
                <CheckSquare weight="bold" aria-hidden="true" />
                <span>Adding as a to-do</span>
                <button type="button" onClick={() => setForceTask(false)}>calendar instead</button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <label>
        <PencilSimpleLine aria-hidden="true" />
        <span className="sr-only">Add a to-do or an event</span>
        <input
          value={text}
          onChange={e => { setText(e.target.value); if (!e.target.value) setForceTask(false) }}
          placeholder="Jot it down… ‘gym fri 6pm’"
          enterKeyHint="done"
          autoComplete="off"
        />
      </label>
    </form>
  )
}
