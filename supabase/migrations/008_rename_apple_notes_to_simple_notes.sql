-- Rename apple notes cloud table to simple notes
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'user_apple_notes'
  ) and not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'user_simple_notes'
  ) then
    alter table public.user_apple_notes rename to user_simple_notes;
  end if;
end $$;

create table if not exists public.user_simple_notes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  notes jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_simple_notes enable row level security;

drop policy if exists "apple_notes_own" on public.user_simple_notes;
drop policy if exists "simple_notes_own" on public.user_simple_notes;
create policy "simple_notes_own"
  on public.user_simple_notes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
