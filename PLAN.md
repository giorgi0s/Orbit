# 🪐 Orbit — the plan

A personal life planner for one person (me), on my MacBook and iPhone.
Cosy, playful, a bit silly. Costs nothing to run.

> Everything orbits around you. Each part of life (work, gym, food, home, going out)
> is a little planet. Weekly goals are its moons. Ticking things off makes stars.

---

## 1. How it's built (and why)

### The big decision: a web app you install (PWA), not an App Store app

| Option | Cost | Verdict |
|---|---|---|
| **PWA** (web app added to the iPhone home screen + Mac Dock) | **Free** | ✅ **Chosen.** One codebase for Mac and iPhone, real push notifications, opens full-screen with its own icon. |
| Native SwiftUI app | Apple Developer account, ~$99/yr | Best feel (widgets, Live Activities, haptics), but not free. |
| Native app with a free Apple ID | Free | App stops working every 7 days until you re-install it from Xcode. Not worth it. |

**Upgrade path:** if I ever pay for the Apple account, the same code can be wrapped with
**Capacitor** to become a real iOS app (native notifications, haptics). Nothing is wasted.

### The stack

| Layer | Tool | Free tier | Why |
|---|---|---|---|
| App framework | **React + TypeScript + Vite** | free | Biggest ecosystem, Claude Code writes it well |
| Styling | **Tailwind CSS** | free | Fast to make things look cosy |
| Animation | **Motion** (formerly Framer Motion) | free | Springy, satisfying layout and gesture animations |
| Installable app | **vite-plugin-pwa** | free | Manifest, icons, offline app shell, service worker for push |
| Database + login | **Supabase** | 500 MB Postgres, auth, Edge Functions, cron | Real Postgres, easy to export/query my own data |
| Scheduled reminders | **Supabase `pg_cron` + Edge Function + Web Push** | free | Sends the "day before" / "day of" notifications |
| Hosting | **Vercel** (Hobby plan) | free for personal use | Push to GitHub → it's live in 30 s |
| Quick-add parsing | **chrono-node** | free | Type "gym tomorrow 6pm" and it understands the date |
| Celebrations | **canvas-confetti** | free | Stars and confetti on wins |

### Database: Supabase vs the alternatives

- **Supabase** ✅ — Postgres, built-in login, cron jobs, serverless functions. One gotcha:
  **free projects pause after 7 days with no activity.** Using Orbit daily keeps it awake,
  and a free GitHub Actions job pings it once a day as a safety net (so reminders still
  fire if I'm on holiday and not opening the app).
- **Convex** — strong alternative: pure TypeScript, live sync between devices is automatic,
  and "run this function at 7pm tomorrow" is built in. Pick this instead if SQL feels like a chore.
- **Firebase** ✗ — scheduled functions need the pay-as-you-go plan with a card attached.

### How it gets onto my devices

1. Code lives on GitHub → Vercel deploys it to `orbit-<something>.vercel.app`.
2. **iPhone:** open the URL in Safari → Share → **Add to Home Screen** → open from the icon →
   tap "Turn on notifications" inside the app (iOS only allows push for home-screen web apps).
3. **Mac:** open in Safari → File → **Add to Dock**. It becomes its own app window with notifications.
4. Both devices log into the same account → same data everywhere.

---

## 2. What's in it

### 🏠 Today (the home screen)
- Greeting that changes with time of day (sky colour shifts morning → sunset → night).
- Today's events, today's tasks, tonight's meal, the running timer if there is one.
- Progress ring for "this week's goals".
- A big friendly **+** button that's always there.

### ⚡ Quick add (the "EASILY" bit)
- One text box. Type like a human:
  - `dentist friday 3pm` → calendar event with reminders
  - `gym mon wed fri 6pm` → three recurring events
  - `buy oat milk` → task
  - `goal: cook 4 times this week` → weekly goal
- It shows a preview chip ("📅 Fri 24 Oct, 15:00") before saving so mistakes are obvious.
- Later: a Siri Shortcut ("Hey Siri, add to Orbit") that opens the app with the dictated text.

### 📅 Calendar
- Week view (main) + month view. Custom-built so it matches the cosy style.
- Events are coloured by life area (planet).
- Default reminders, changeable per event:
  - **Day before** at 19:00 — "Tomorrow: dentist at 3pm 🦷"
  - **Day of** at 08:00 — morning heads-up
  - **1 hour before** for timed things
- Repeating events (gym days, weekly bins, etc.).
- Later: an iCal feed so Orbit events also show in Apple Calendar.

### ⏱️ Work timer
- Projects with a colour and emoji.
- Tap a project → timer starts. Only one runs at a time; switching projects stops the last one.
- The running timer is saved on the server, so I can **start it on the Mac and stop it on the iPhone**.
- Add/edit entries afterwards ("forgot to start it at 9").
- "Still going?" nudge if a timer runs longer than ~4 hours.
- Reports: today / this week / custom range, hours per project.
- **Export:** CSV download + "copy this week as text", ready to paste into my work productivity tool.

### ✅ Tasks & weekly goals
- **Weekly goals** — 3–5 per week, each tied to a life area. Some are countable
  ("gym ×3", "cook ×4") with little pips that fill up.
- **Tasks** sorted into buckets: **This week (weekdays)**, **This weekend**, **Someday**.
- Unfinished tasks politely roll over (with a counter so I can see what keeps getting dodged 👀).

### 🍳 Meal prep
- **Recipe box** — name, ingredients, steps, servings, prep time, tags (high-protein, cheap, quick).
- **Weekly meal plan** — Mon–Sun grid, lunch + dinner. Drag recipes in.
- **Shopping list** — generated from the meal plan, ingredients merged ("chicken 1.2 kg"),
  tick off in the shop.
- **Prep day checklist** — Sunday batch-cook steps.
- **Fridge tracker** — "4 portions of chicken rice, made Sunday" with a nudge before it goes off.

### 🏋️ Gym & 🌳 getting out of my room
- Gym sessions are events in the "Body" area; a streak counter for gym weeks hit.
- **Touch Grass meter** 🌱 — log "went out" (walk, café, friends, anything outside my room).
  A little plant on the Today screen grows with sunlight when I go out and droops if I don't.
- **Bored? button** — a spinning wheel that picks from my "things to do / places to try" list.

### 🔄 Sunday Weekly Reset (the habit that ties it all together)
A guided 5–10 minute ritual, with a Sunday 18:00 notification to start it:
1. **Look back** — goals hit, hours worked, gym count, times out. A little "constellation" of the week.
2. **Pick goals** — choose 3–5 goals for next week.
3. **Block time** — pick gym days/times and one "going out" plan → added to the calendar.
4. **Plan meals** — fill the meal grid → shopping list is ready.
5. **Brain dump** — anything else → weekday or weekend tasks.

### 🌅 Daily notifications
- 08:00 morning brief: "3 things today, gym at 6, dinner is chicken rice."
- Evening check-in (optional): "Anything to tick off before bed?"

---

## 3. The cosy / fun stuff

- **Look: Sticker Planner** (chosen 19 Oct 2026, mockup in `mockups/today-vibes.html`).
  Orbit looks like a well-loved paper planner: dot-grid page, navy gel-pen ink, a pink margin
  line, highlighter swipes, washi tape, a yellow sticky note, a green elastic strap, and coloured
  index tabs at the bottom. At bedtime the page turns navy. Handwritten-style font (Shantell Sans).
  The design brief lives in `.impeccable/surfaces/`.
- **A mascot**: Bean, a small moon doodled in gel pen (name still up for grabs). Sleepy at night,
  cheers when I tick things off, side-eyes me when the Touch Grass plant is wilting.
- **Satisfying ticks**: a puffy sticker stamps onto the pen-drawn box with a soft thunk, then a
  highlighter sweeps through the text.
- **Weekly goals as a sticker chart**: tap a circle to stamp a star, heart or sun.
- **Finishing every task today**: a big gold star sticker slaps onto the corner of the page.
- **Hitting all weekly goals**: the week's page gets a shiny foil sticker and a burst of mini stickers.
- **Running timer** lives on the sticky note; stopping it writes "Logged 2h 14m on Project X" in pen.
- **Sticker collection**: earn new sticker designs for ticking things off. Pure silliness.
- **Funny notification copy**, e.g. "Gym in 1 hour. Your muscles have been notified."
- **Haptics on iPhone** — iOS Safari doesn't support the normal vibration API, but there's a known
  trick (toggling a hidden iOS switch input) that triggers a light tap. Worth testing.
- Empty states with jokes instead of "No items".

---

## 4. Data model (Supabase tables)

Every table has `user_id` and Row Level Security (only I can read my rows). ✅ = live in Supabase; SQL lives in `supabase/migrations/`, run by pasting into the SQL Editor. Changes sync between devices instantly via Supabase Realtime.

| Table | Key fields |
|---|---|
| `settings` ✅ | timezone (more later: mascot name, theme) |
| `areas` | name, emoji, colour (Work, Body, Food, Home, Out, Mind…) |
| `events` ✅ | title, starts_at, ends_at, all_day, area, location, notes, repeat_days + repeat_until (weekly repeats), remind_day_before, remind_hour_before |
| `sent_notifications` ✅ | what the reminder sender already sent (no duplicates) |
| `push_subscriptions` ✅ | endpoint, keys, device |
| `tasks` ✅ | title, done, done_at (later: area_id, bucket weekday/weekend/someday, due_date, rolled_over_count) |
| `goals` ✅ | slug, title, target, sticker, sort, archived |
| `goal_stamps` ✅ | goal_id, week_start, count (stickers per goal per week) |
| `timer` ✅ | one row per person: project, started_at (null = stopped) |
| `projects` | name, emoji, colour, archived |
| `time_entries` ✅ | project (text for now; project_id in Phase 3), started_at, ended_at |
| `recipes` | name, servings, prep_minutes, steps, tags |
| `recipe_ingredients` | recipe_id, name, quantity, unit |
| `meal_plan` | date, slot (lunch/dinner), recipe_id |
| `shopping_items` | name, quantity, unit, checked, week_start |
| `fridge_portions` | recipe_id, portions_left, made_on, use_by |
| `outings` | date, what, note (Touch Grass log) |
| `ideas` | things to do / places to try (for the Bored? wheel) |

### How notifications work
1. Saving an event creates rows in `reminders` (day before, day of, 1 h before).
2. `pg_cron` checks every minute for reminders that are due and unsent (cheap SQL, no function call).
3. Only when something is due, it calls a `send-push` Edge Function.
4. That function sends a Web Push to every device in `push_subscriptions` and marks the reminder sent.
5. Editing or deleting an event rewrites its reminders.
6. A daily GitHub Actions ping keeps the free Supabase project from pausing.

---

## 5. Build order

Each phase ends with something usable on the phone.

| Phase | What | Done when |
|---|---|---|
| **0. Skeleton** ✅ | Vite + React + Tailwind + PWA, Supabase project + login, deploy to Vercel | "Hello Orbit" opens from the iPhone home screen and the Mac Dock |
| **1. Core loop** 🟡 sync done | Today screen, tasks (weekday/weekend/someday), weekly goals, the satisfying tick | I can plan a week and tick things off |
| **2. Calendar + reminders** ✅ | Week/month view, quick add, repeating events, the full push pipeline | I get a "tomorrow" notification on my phone |
| **3. Work timer** | Projects, start/stop across devices, edit entries, reports, CSV/copy export | I log a real work day and export it |
| **4. Meal prep** | Recipes, meal grid, shopping list, fridge tracker | I plan a week of meals and shop from the list |
| **5. Weekly Reset + life stuff** | Sunday ritual, gym streak, Touch Grass plant, Bored? wheel, daily briefs | I do a full Sunday reset in Orbit |
| **6. Delight pass** | Mascot, sounds, shooting stars, constellations, stardust, themes | It makes me smile |
| **Later** | iCal feed into Apple Calendar, Siri Shortcut quick add, Capacitor native wrap | — |

---

## 6. Honest limits of the free/PWA route

- No home-screen widgets or lock-screen Live Activities (those need a native app).
- Notifications only work after installing to the home screen and allowing them from inside the app.
- iOS web push has been reported to occasionally stop until the app is reopened; the morning brief
  doubles as a check that it's still working.
- Supabase free projects pause after 7 days of no activity (handled by the daily ping).
- Total running cost: **zero**. Optional extra: a custom domain (~$10/yr) — not needed.
