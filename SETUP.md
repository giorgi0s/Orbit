# Setting up Orbit (Phase 0)

Everything here is free. It takes about 30 minutes, once.
You'll make three accounts, in this order: **GitHub → Supabase → Vercel**.
Supabase and Vercel both let you sign in *with* GitHub, so you only invent one password.

---

## 0. Try it on your Mac first (no accounts needed)

```bash
npm run dev
```

Open http://localhost:5173. Without Supabase connected, Orbit runs in **local mode**: no login,
and everything is saved in this browser only.

---

## 1. GitHub: where the code lives

1. Go to https://github.com/signup and make an account (the free plan).
2. Click **+** (top right) → **New repository**.
   - Name: `orbit`
   - Visibility: **Private**
   - Don't tick "Add a README" or anything else, so the repo starts empty.
3. GitHub then shows a page with commands. Ignore them and tell Claude
   "my GitHub repo is https://github.com/YOUR-NAME/orbit". Claude will make the first commit and push it.
   (Or do it yourself from the Orbit folder:)

```bash
git init -b main && git add -A && git commit -m "Orbit: Phase 0"
```

```bash
git remote add origin https://github.com/YOUR-NAME/orbit.git && git push -u origin main
```

---

## 2. Supabase: the database and your login

1. Go to https://supabase.com → **Start your project** → **Continue with GitHub**.
2. **New project**
   - Name: `orbit`
   - Database password: click **Generate**, then save it in your password manager (Passwords app / iCloud Keychain).
     You won't need it day to day.
   - Region: the one closest to you (for the UK, **London**).
   - Plan: **Free**.
3. Wait a minute or two while it sets up.
4. **Make your one user**: left sidebar → **Authentication** → **Users** → **Add user** → **Create new user**.
   Enter your email and a password you'll remember, and tick **Auto Confirm User**.
5. **Lock the door behind you**: **Authentication** → **Sign In / Providers** → under *User Signups*,
   turn **off** "Allow new users to sign up". Now nobody else can make an account in your Orbit.
6. **Copy the two keys**: **Project Settings** (cog icon) → **Data API** for the **Project URL**, then
   **API Keys** for the **publishable** key (older projects call it the **anon public** key).
   Both are safe to put in the app. Never use the **secret** / **service_role** key in Orbit.
7. In the Orbit folder, copy `.env.example` to `.env.local` and paste them in:

```bash
cp .env.example .env.local
```

```
VITE_SUPABASE_URL=https://abcdefgh.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...   (or the long eyJ... anon key)
```

8. Restart `npm run dev`. Orbit now asks you to sign in. Use the email and password from step 4.

> Heads-up: free Supabase projects **pause after 7 days with no activity**. Using Orbit keeps it awake.
> Phase 2 adds a free daily ping so it never pauses while you're on holiday.

---

## 3. Vercel: puts Orbit on the internet

1. Go to https://vercel.com/signup → **Hobby** (free, for personal projects) → **Continue with GitHub**.
2. **Add New… → Project** → find `orbit` → **Import**.
   (If it's not listed, click "Adjust GitHub App Permissions" and give Vercel access to the `orbit` repo.)
3. Vercel spots that it's a Vite app on its own. Open **Environment Variables** and add the same two lines
   from your `.env.local`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Click **Deploy**. About 30 seconds later you get a link like `orbit-yourname.vercel.app`.
5. From now on, every push to GitHub redeploys automatically.

Optional: **Settings → Domains** lets you pick a nicer free name, like `my-orbit.vercel.app`.

---

## 4. Put it on your iPhone

1. Open your Vercel link in **Safari** (it must be Safari).
2. Tap **Share** (the square with an arrow) → **Add to Home Screen** → **Add**.
3. Open Orbit **from the new icon**, not from Safari, and sign in.
   It opens full-screen with no browser bars, like a real app.

## 5. Put it on your Mac

1. Open your Vercel link in **Safari**.
2. Menu bar → **File** → **Add to Dock…** → **Add**.
3. Orbit is now its own app in the Dock and Launchpad, with its own window. Sign in once.

---

## What Phase 0 does (and doesn't do) yet

- ✅ Today page in the Sticker Planner look, with automatic bedtime colours after 9pm
- ✅ Work timer on the sticky note, to-do list with sticker ticks, and the weekly sticker chart
- ✅ Installable on iPhone and Mac, and works offline once opened
- ✅ Private login (just you)
- ⏳ **Data is still saved per device.** Your iPhone and Mac don't share tasks yet.
  Phase 1 moves everything into Supabase so they sync.
- ⏳ The calendar, reminders, timer reports and meals come in Phases 2–4 (see PLAN.md).
