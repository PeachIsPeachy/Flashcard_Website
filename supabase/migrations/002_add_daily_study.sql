-- Run this in Supabase → SQL → New query if you see errors about missing daily_goal / scope columns.
-- Per-deck daily batch size and progress through ordered cards (by created_at).
alter table public.decks
  add column if not exists daily_goal int not null default 5
    check (daily_goal >= 1 and daily_goal <= 200);

alter table public.decks
  add column if not exists daily_batch_offset int not null default 0
    check (daily_batch_offset >= 0);

-- Session type for history / analytics.
alter table public.study_sessions
  add column if not exists scope text not null default 'full'
    check (scope in ('daily', 'full'));
