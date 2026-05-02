-- Run once in Supabase SQL Editor if you already created tables without missed_cards.
alter table public.study_sessions
  add column if not exists missed_cards jsonb not null default '[]'::jsonb;
