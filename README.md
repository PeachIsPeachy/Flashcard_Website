# Flashcard

A full-stack flashcard website for studying any topic: discrete Q/A cards, optional daily batches, session history, a per-deck journal, and a notebook for cards you save after review—plus lightweight feedback from the account menu.

**Stack:** React 18 · Vite · TypeScript · Tailwind CSS · shadcn-style UI (Radix) · React Router v6 · Supabase (Auth + Postgres + RLS).

Deploy the static frontend anywhere that serves SPAs (e.g. **Vercel**); data lives in **Supabase**.

---

## Features

| Area | What you get |
|------|----------------|
| **Auth** | Email sign-up / sign-in; protected routes; session via Supabase Auth. |
| **Dashboard** | Deck grid, create deck, empty state, loading skeletons. |
| **Deck → Cards** | Inline CRUD on cards (front/back), ordered for daily batches. |
| **Deck → Study** | 3D flip cards; **Daily batch** (next *N* cards in list order) or **All cards** (full deck, shuffled); optional **read-aloud** on the question (Web Speech API). |
| **Deck → Study settings** | Words per daily batch (1–200); reset daily progress (starts again from first card). |
| **Deck → History** | Sessions table with trends; expandable **missed cards** when present; **Daily** vs **Full** session mode. |
| **Deck → Journal** | Short dated entries per deck (reflection, reminders—not tied to a single card). |
| **Deck → Notebook** | Entries saved from study results: question/answer snapshot + optional **note** (see below). |
| **Results after study** | Correct vs incorrect counts and lists; per missed row, a **note icon** opens a dialog to type and **save to notebook**. |
| **Account menu** | Email + **Feedback** modal (topic, message, sentiment); sign out. Desktop dropdown + mobile sheet. |

**Theme:** Dark UI (`index.html` uses `class="dark"`); tokens in `src/index.css`.

---

## Prerequisites

- [Node.js](https://nodejs.org/) 18+ and npm  
- A [Supabase](https://supabase.com/) project  
- (Optional) [Vercel](https://vercel.com/) for hosting  

---

## 1. Supabase setup

### New database (recommended)

1. Create a project in the [Supabase dashboard](https://supabase.com/dashboard) and wait until the DB is ready.  
2. **SQL Editor → New query**, paste all of [`supabase/schema.sql`](supabase/schema.sql), run it once.  
   This creates tables, indexes, and RLS so users only access their own rows.

### Existing project (already ran an older `schema.sql`)

Apply incremental migrations in order (skip any you already applied manually):

| File | Purpose |
|------|---------|
| [`001_add_missed_cards_to_study_sessions.sql`](supabase/migrations/001_add_missed_cards_to_study_sessions.sql) | `missed_cards` JSON on `study_sessions` |
| [`002_add_daily_study.sql`](supabase/migrations/002_add_daily_study.sql) | `daily_goal`, `daily_batch_offset` on `decks`; `scope` on `study_sessions` |
| [`003_learning_journal_and_notebook.sql`](supabase/migrations/003_learning_journal_and_notebook.sql) | `learning_logs`, `notebook_entries` |
| [`004_notebook_entry_note.sql`](supabase/migrations/004_notebook_entry_note.sql) | `note` column on `notebook_entries` |

If queries fail on missing columns, run the matching migration in **SQL Editor**.

### API keys & auth URLs

1. **Project Settings → API**: copy **Project URL** and **anon public** key (browser-safe with RLS).  
2. **Authentication → URL configuration**: add local dev (e.g. `http://localhost:5173`) and production URL to **Site URL** / **Redirect URLs** as needed.  
3. Optional: **Authentication → Providers → Email** → disable email confirmation for quicker local testing.

---

## 2. Environment variables

Copy the example file and fill in real values:

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon (publishable) key |

Never commit `.env` or use the **service role** key in the frontend.

---

## 3. Local development

```bash
npm install
npm run dev
```
---

## 4. Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | `tsc -b` + production bundle to `dist/` |
| `npm run preview` | Serve `dist/` locally |

---

## 5. Deploy (e.g. Vercel)

1. Connect the repo and use **Framework preset: Vite** (build: `npm run build`, output: `dist`).  
2. Set **`VITE_SUPABASE_URL`** and **`VITE_SUPABASE_ANON_KEY`** in the host’s environment variables (same as `.env`).  
3. Add the production URL to Supabase Auth redirect / site URL settings.  

[`vercel.json`](vercel.json) rewrites unknown paths to `index.html` so React Router works on refresh.

---

## Project layout

```
src/
  components/
    auth/          Login & signup
    dashboard/     Deck grid, tile, create modal, empty state
    deck/          Card list, study mode, history, journal, notebook tabs
    feedback/      Feedback dialog
    layout/        App shell, protected route
    ui/            Buttons, dialog, tabs, inputs, etc.
  hooks/           useAuth, useDecks, useStudySession
  lib/             Supabase client, utils
  pages/           Dashboard, deck page, login/signup
supabase/
  schema.sql       Full schema + RLS (greenfield)
  migrations/      Ordered ALTERs for upgrades
```

---

## Security

- Only the **anon** key ships to the browser; **RLS** enforces per-user access to `decks`, `cards`, `study_sessions`, `learning_logs`, and `notebook_entries`.  
- To validate isolation, create two accounts and confirm neither reads the other’s data.  


