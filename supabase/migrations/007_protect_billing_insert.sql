-- Force billing fields on client INSERT (same lockdown as course fields).
-- Previously subscription_status used coalesce(), so a client could insert 'active'.

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
    NEW.subscription_status := 'none';
    NEW.subscription_ends_at := null;
    NEW.course_access := false;
    NEW.course_purchased_at := null;
    return NEW;
  end if;

  NEW.stripe_customer_id := OLD.stripe_customer_id;
  NEW.subscription_status := OLD.subscription_status;
  NEW.subscription_ends_at := OLD.subscription_ends_at;
  NEW.course_access := OLD.course_access;
  NEW.course_purchased_at := OLD.course_purchased_at;
  return NEW;
end;
$$;
