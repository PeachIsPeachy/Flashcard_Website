alter table public.notebook_entries
  add column if not exists note text not null default '';
