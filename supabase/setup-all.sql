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
