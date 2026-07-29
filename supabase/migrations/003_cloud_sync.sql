-- Opt-in cloud backup: projects, notes, sync settings (individual users only)

create table if not exists public.user_sync_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  cloud_enabled boolean not null default false,
  enabled_at timestamptz,
  last_sync_at timestamptz,
  projects_updated_at timestamptz,
  notes_updated_at timestamptz
);

create table if not exists public.user_project_boards (
  user_id uuid primary key references auth.users (id) on delete cascade,
  projects jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_apple_notes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  notes jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_sync_settings enable row level security;
alter table public.user_project_boards enable row level security;
alter table public.user_apple_notes enable row level security;

drop policy if exists "sync_settings_own" on public.user_sync_settings;
create policy "sync_settings_own"
  on public.user_sync_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "project_boards_own" on public.user_project_boards;
create policy "project_boards_own"
  on public.user_project_boards for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "apple_notes_own" on public.user_apple_notes;
create policy "apple_notes_own"
  on public.user_apple_notes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
