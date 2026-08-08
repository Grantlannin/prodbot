-- Claim rows while flushing so concurrent cron ticks do not double-send.
alter table public.email_outbox
  drop constraint if exists email_outbox_status_check;

alter table public.email_outbox
  add constraint email_outbox_status_check
  check (status in ('pending', 'sending', 'sent', 'failed'));

create index if not exists email_outbox_sending_idx
  on public.email_outbox (updated_at)
  where status = 'sending';
