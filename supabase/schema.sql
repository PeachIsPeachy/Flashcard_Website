-- Flashcard app schema for Supabase (PostgreSQL + RLS)
-- Run in Supabase SQL Editor after creating a project.

-- Tables
create table public.decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  daily_goal int not null default 5 check (daily_goal >= 1 and daily_goal <= 200),
  daily_batch_offset int not null default 0 check (daily_batch_offset >= 0)
);

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks (id) on delete cascade,
  front text not null default '',
  back text not null default '',
  created_at timestamptz not null default now()
);

create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  score int not null,
  total int not null,
  studied_at timestamptz not null default now(),
  missed_cards jsonb not null default '[]'::jsonb,
  scope text not null default 'full' check (scope in ('daily', 'full'))
);

-- Indexes
create index decks_user_id_idx on public.decks (user_id);
create index cards_deck_id_idx on public.cards (deck_id);
create index study_sessions_deck_id_idx on public.study_sessions (deck_id);
create index study_sessions_user_id_idx on public.study_sessions (user_id);
create index study_sessions_studied_at_idx on public.study_sessions (studied_at desc);

-- Row Level Security
alter table public.decks enable row level security;
alter table public.cards enable row level security;
alter table public.study_sessions enable row level security;

-- Decks: own rows only
create policy "Users can select own decks"
  on public.decks for select
  using (auth.uid() = user_id);

create policy "Users can insert own decks"
  on public.decks for insert
  with check (auth.uid() = user_id);

create policy "Users can update own decks"
  on public.decks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own decks"
  on public.decks for delete
  using (auth.uid() = user_id);

-- Cards: deck must belong to user
create policy "Users can select cards in own decks"
  on public.cards for select
  using (
    exists (
      select 1 from public.decks d
      where d.id = cards.deck_id and d.user_id = auth.uid()
    )
  );

create policy "Users can insert cards in own decks"
  on public.cards for insert
  with check (
    exists (
      select 1 from public.decks d
      where d.id = cards.deck_id and d.user_id = auth.uid()
    )
  );

create policy "Users can update cards in own decks"
  on public.cards for update
  using (
    exists (
      select 1 from public.decks d
      where d.id = cards.deck_id and d.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.decks d
      where d.id = cards.deck_id and d.user_id = auth.uid()
    )
  );

create policy "Users can delete cards in own decks"
  on public.cards for delete
  using (
    exists (
      select 1 from public.decks d
      where d.id = cards.deck_id and d.user_id = auth.uid()
    )
  );

-- Study sessions: own rows and deck must belong to user
create policy "Users can select own study sessions"
  on public.study_sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert own study sessions"
  on public.study_sessions for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.decks d
      where d.id = study_sessions.deck_id and d.user_id = auth.uid()
    )
  );

create policy "Users can update own study sessions"
  on public.study_sessions for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.decks d
      where d.id = study_sessions.deck_id and d.user_id = auth.uid()
    )
  );

create policy "Users can delete own study sessions"
  on public.study_sessions for delete
  using (auth.uid() = user_id);

-- Learning journal + notebook (see migrations/003_learning_journal_and_notebook.sql)
create table public.learning_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  deck_id uuid not null references public.decks (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table public.notebook_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  deck_id uuid not null references public.decks (id) on delete cascade,
  card_id uuid,
  front text not null default '',
  back text not null default '',
  note text not null default '',
  study_session_id uuid references public.study_sessions (id) on delete set null,
  created_at timestamptz not null default now()
);

create index learning_logs_deck_id_idx on public.learning_logs (deck_id);
create index learning_logs_user_id_idx on public.learning_logs (user_id);
create index notebook_entries_deck_id_idx on public.notebook_entries (deck_id);
create index notebook_entries_user_id_idx on public.notebook_entries (user_id);

alter table public.learning_logs enable row level security;
alter table public.notebook_entries enable row level security;

create policy "Users can select own learning logs"
  on public.learning_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert own learning logs"
  on public.learning_logs for insert
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.decks d where d.id = learning_logs.deck_id and d.user_id = auth.uid())
  );

create policy "Users can delete own learning logs"
  on public.learning_logs for delete
  using (auth.uid() = user_id);

create policy "Users can select own notebook entries"
  on public.notebook_entries for select
  using (auth.uid() = user_id);

create policy "Users can insert own notebook entries"
  on public.notebook_entries for insert
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.decks d where d.id = notebook_entries.deck_id and d.user_id = auth.uid())
  );

create policy "Users can delete own notebook entries"
  on public.notebook_entries for delete
  using (auth.uid() = user_id);
