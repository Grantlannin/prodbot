-- Cloud backup for open loops, night-prep plan (today/tomorrow task list), and misc tasks

alter table public.user_sync_settings
  add column if not exists open_loops_updated_at timestamptz,
  add column if not exists night_prep_updated_at timestamptz,
  add column if not exists misc_tasks_updated_at timestamptz;

create table if not exists public.user_open_loops (
  user_id uuid primary key references auth.users (id) on delete cascade,
  open_loops jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_night_prep_plans (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_misc_task_lists (
  user_id uuid primary key references auth.users (id) on delete cascade,
  store jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_open_loops enable row level security;
alter table public.user_night_prep_plans enable row level security;
alter table public.user_misc_task_lists enable row level security;

drop policy if exists "open_loops_own" on public.user_open_loops;
create policy "open_loops_own"
  on public.user_open_loops for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "night_prep_plans_own" on public.user_night_prep_plans;
create policy "night_prep_plans_own"
  on public.user_night_prep_plans for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "misc_task_lists_own" on public.user_misc_task_lists;
create policy "misc_task_lists_own"
  on public.user_misc_task_lists for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
