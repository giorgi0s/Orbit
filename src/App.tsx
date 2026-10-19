import { useEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import type { Session } from '@supabase/supabase-js'
import { CalendarBlank, CookingPot, Heart, SunHorizon, Timer } from '@phosphor-icons/react'
import { Today } from './screens/Today'
import { Week } from './screens/Week'
import { QuickAdd } from './components/QuickAdd'
import { EventSheet, type EventDraft } from './components/EventSheet'
import { useEvents, useTasks } from './lib/data'
import { guessArea, type CalEvent } from './lib/calendar'
import { importLocalData } from './lib/importLocal'
import { saveTimezone } from './lib/push'
import { Blank } from './screens/Blank'
import { Me, type PageMode } from './screens/Me'
import { Login } from './screens/Login'
import { supabase } from './lib/supabase'
import { useStored } from './lib/storage'
import { isBedtime, useNow } from './lib/time'
import { play } from './lib/feel'

type Tab = 'today' | 'week' | 'timer' | 'meals' | 'me'

const BLANK_EVENT: EventDraft = {
  title: '',
  starts_at: new Date().toISOString(),
  ends_at: null,
  all_day: false,
  area: 'other',
  location: null,
  notes: null,
  repeat_days: null,
  repeat_until: null,
  remind_day_before: true,
  remind_hour_before: true,
}

const TABS: { id: Tab; label: string; Icon: typeof SunHorizon; colour: string }[] = [
  { id: 'today', label: 'Today', Icon: SunHorizon, colour: '#FFF1A8' },
  { id: 'week', label: 'Week', Icon: CalendarBlank, colour: '#9ED8FF' },
  { id: 'timer', label: 'Timer', Icon: Timer, colour: '#FFB25E' },
  { id: 'meals', label: 'Meals', Icon: CookingPot, colour: '#C6F06A' },
  { id: 'me', label: 'Me', Icon: Heart, colour: '#FF9CC8' },
]

export default function App() {
  const now = useNow(60_000)
  const [pageMode, setPageMode] = useStored<PageMode>('page-mode', 'auto')
  const night = pageMode === 'night' || (pageMode === 'auto' && isBedtime(now))

  useEffect(() => {
    document.documentElement.dataset.page = night ? 'night' : 'day'
  }, [night])

  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(false)
  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthReady(true) })
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  return (
    <div className="cover">
      <div className="sheet">
        <div className="margin-rule" aria-hidden="true" />
        <div className="strap" aria-hidden="true" />
        {!supabase ? (
          <main className="sheet-scroll">
            <Blank title="Orbit" phase="a moment" note="Orbit can’t find its Supabase keys. Add them to .env.local (or to Vercel) as SETUP.md describes." />
          </main>
        ) : !authReady ? null : !session ? (
          <main className="sheet-scroll"><Login /></main>
        ) : (
          <Planner session={session} pageMode={pageMode} setPageMode={setPageMode} />
        )}
      </div>
    </div>
  )
}

function Planner({ session, pageMode, setPageMode }: { session: Session; pageMode: PageMode; setPageMode: (m: PageMode) => void }) {
  const [tab, setTab] = useState<Tab>('today')
  const tasks = useTasks()
  const cal = useEvents()
  const [sheet, setSheet] = useState<{ id?: string; draft: EventDraft } | null>(null)

  const openEvent = (e: CalEvent) => { setSheet({ id: e.id, draft: e }); play('page') }
  const newEventOn = (day: Date) => {
    const start = new Date(day)
    start.setHours(18, 0, 0, 0)
    setSheet({ draft: { ...BLANK_EVENT, starts_at: start.toISOString() } })
    play('page')
  }
  const scrollRef = useRef<HTMLElement>(null)

  // Bring over anything this device saved before Phase 1, once.
  useEffect(() => { importLocalData(session.user.id); saveTimezone(session.user.id) }, [session.user.id])

  // A failed save shows a short note for a few seconds.
  const [syncError, setSyncError] = useState(false)
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>
    const onError = () => { setSyncError(true); clearTimeout(timeout); timeout = setTimeout(() => setSyncError(false), 5000) }
    window.addEventListener('orbit:sync-error', onError)
    return () => { window.removeEventListener('orbit:sync-error', onError); clearTimeout(timeout) }
  }, [])

  return (
    <>
      <main className="sheet-scroll" ref={scrollRef}>
        {tab === 'today' && <Today userId={session.user.id} tasks={tasks} events={cal.events} onOpen={openEvent} />}
        {tab === 'week' && <Week events={cal.events} onOpen={openEvent} onAddOn={newEventOn} />}
        {tab === 'timer' && <Blank title="Timer" phase="Phase 3" note="Projects, weekly hours and the export for work. For now the sticky note on Today keeps time." />}
        {tab === 'meals' && <Blank title="Meals" phase="Phase 4" note="Recipes, the weekly meal grid and a shopping list that writes itself." />}
        {tab === 'me' && <Me email={session.user.email ?? null} pageMode={pageMode} setPageMode={setPageMode} />}
      </main>
      {syncError && (
        <p className="sync-note" role="alert">That didn’t save. Check your signal and try again.</p>
      )}
      {(tab === 'today' || tab === 'week') && (
        <QuickAdd
          onTask={title => tasks.add(title)}
          onEvent={p => cal.add({
            ...BLANK_EVENT,
            title: p.title,
            starts_at: p.start.toISOString(),
            ends_at: p.end?.toISOString() ?? null,
            all_day: p.allDay,
            area: p.area,
            repeat_days: p.repeatDays,
          })}
        />
      )}
      <AnimatePresence>
        {sheet && (
          <EventSheet
            key={sheet.id ?? 'new'}
            initial={sheet.draft}
            isNew={!sheet.id}
            onClose={() => setSheet(null)}
            onDelete={sheet.id ? () => { cal.remove(sheet.id!); setSheet(null); play('pop') } : undefined}
            onSave={draft => {
              if (sheet.id) cal.update(sheet.id, draft)
              else cal.add({ ...draft, area: draft.area === 'other' ? guessArea(draft.title) : draft.area })
              setSheet(null)
              play('stamp')
            }}
          />
        )}
      </AnimatePresence>
      <nav className="tabs" aria-label="Sections">
        {TABS.map(({ id, label, Icon, colour }) => (
          <button
            key={id}
            type="button"
            className="tab"
            style={tab === id ? undefined : { background: colour }}
            aria-current={tab === id ? 'page' : undefined}
            onClick={() => { if (tab !== id) { setTab(id); play('page'); scrollRef.current?.scrollTo({ top: 0 }) } }}
          >
            <Icon weight="bold" aria-hidden="true" />
            {label}
          </button>
        ))}
      </nav>
    </>
  )
}
