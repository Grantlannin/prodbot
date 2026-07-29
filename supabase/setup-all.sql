-- Produc: run this ONCE in Supabase → SQL Editor → New query → Run
-- Creates profiles + billing columns + protects billing fields from client edits

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Billing columns
alter table public.profiles
  add column if not exists stripe_customer_id text unique,
  add column if not exists subscription_status text not null default 'none',
  add column if not exists subscription_ends_at timestamptz;

create or replace function public.protect_profile_billing()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') = 'service_role' then
    return NEW;
  end if;

  if TG_OP = 'INSERT' then
    NEW.stripe_customer_id := null;
    NEW.subscription_status := coalesce(NEW.subscription_status, 'none');
    NEW.subscription_ends_at := null;
    return NEW;
  end if;

  NEW.stripe_customer_id := OLD.stripe_customer_id;
  NEW.subscription_status := OLD.subscription_status;
  NEW.subscription_ends_at := OLD.subscription_ends_at;
  return NEW;
end;
$$;

drop trigger if exists protect_profile_billing on public.profiles;
create trigger protect_profile_billing
  before insert or update on public.profiles
  for each row execute function public.protect_profile_billing();

-- Cloud backup (see supabase/migrations/003_cloud_sync.sql)

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
