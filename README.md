# Flashcard

A full-stack flashcard website for studying any topic: discrete Q/A cards, optional daily batches, session history, a per-deck journal, and a notebook for cards you save after review.

**Stack:** React 18 · Vite · TypeScript · Tailwind CSS · shadcn-style UI (Radix) · React Router v6 · Supabase (Auth + Postgres + RLS).

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
## 3. Local development

```bash
npm install
npm run dev
```
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
