-- Short learning log per deck (reflection after study, etc.)
create table if not exists public.learning_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  deck_id uuid not null references public.decks (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists learning_logs_deck_id_idx on public.learning_logs (deck_id);
create index if not exists learning_logs_user_id_idx on public.learning_logs (user_id);
create index if not exists learning_logs_created_at_idx on public.learning_logs (created_at desc);

-- Items saved from study results (missed questions user chose to keep)
create table if not exists public.notebook_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  deck_id uuid not null references public.decks (id) on delete cascade,
  card_id uuid,
  front text not null default '',
  back text not null default '',
  study_session_id uuid references public.study_sessions (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists notebook_entries_deck_id_idx on public.notebook_entries (deck_id);
create index if not exists notebook_entries_user_id_idx on public.notebook_entries (user_id);

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
