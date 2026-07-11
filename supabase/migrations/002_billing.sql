-- Billing fields on profiles (run in Supabase SQL Editor after 001_profiles.sql)

alter table public.profiles
  add column if not exists stripe_customer_id text unique,
  add column if not exists subscription_status text not null default 'none',
  add column if not exists subscription_ends_at timestamptz;

-- Prevent users from editing billing fields via the client (webhooks use service role).
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
