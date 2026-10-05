-- Solution Loop phase 1: fat support tickets + fingerprint unique bugs

create table if not exists public.support_unique_bugs (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null unique,
  title text not null,
  surface text not null default 'unknown'
    check (surface in ('app', 'extension', 'unknown')),
  status text not null default 'pending'
    check (status in (
      'pending',
      'investigating',
      'fix_ready',
      'awaiting_user',
      'resolved',
      'still_broken'
    )),
  reporter_count int not null default 1,
  -- Extension bugs must pass unpacked best-shot gate before Chrome Web Store upload
  requires_store_upload boolean not null default false,
  notes text,
  fix_note text,
  shipped_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_unique_bugs_status_idx
  on public.support_unique_bugs (status, updated_at desc);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number bigserial,
  user_id uuid references auth.users (id) on delete set null,
  user_email text,
  unique_bug_id uuid references public.support_unique_bugs (id) on delete set null,
  fingerprint text not null,
  subject text not null,
  message text not null,
  surface text not null default 'unknown'
    check (surface in ('app', 'extension', 'unknown')),
  status text not null default 'pending'
    check (status in (
      'pending',
      'investigating',
      'fix_ready',
      'awaiting_user',
      'resolved',
      'still_broken'
    )),
  screenshot_path text,
  debug jsonb not null default '{}'::jsonb,
  fix_note text,
  user_retest_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists support_tickets_user_idx
  on public.support_tickets (user_id, created_at desc);

create index if not exists support_tickets_status_idx
  on public.support_tickets (status, created_at desc);

create index if not exists support_tickets_unique_bug_idx
  on public.support_tickets (unique_bug_id);

create index if not exists support_tickets_fingerprint_idx
  on public.support_tickets (fingerprint);

alter table public.support_unique_bugs enable row level security;
alter table public.support_tickets enable row level security;

-- Users can read their own tickets (writes go through service role API)
drop policy if exists "Users can read own support tickets" on public.support_tickets;
create policy "Users can read own support tickets"
  on public.support_tickets for select
  using (auth.uid() = user_id);

-- Unique bugs: no public policies (admin / service role only)

insert into storage.buckets (id, name, public)
values ('support-screenshots', 'support-screenshots', false)
on conflict (id) do nothing;
