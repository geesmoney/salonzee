
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Prevent duplicate reminder rows per booking
create unique index if not exists sms_log_booking_reminder_unique
  on public.sms_log (booking_id, template)
  where template = 'reminder_24h';

create or replace function public.queue_24h_reminders()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.sms_log (to_phone, template, payload, status, booking_id)
  select
    b.customer_phone,
    'reminder_24h',
    jsonb_build_object(
      'customer_name', b.customer_name,
      'salon_name', s.name,
      'date', b.booking_date,
      'time', b.start_time
    ),
    'stubbed',
    b.id
  from public.bookings b
  join public.salons s on s.id = b.salon_id
  where b.status in ('pending', 'confirmed')
    and (b.booking_date + b.start_time) >= (now() at time zone 'UTC') + interval '23 hours'
    and (b.booking_date + b.start_time) <  (now() at time zone 'UTC') + interval '25 hours'
  on conflict (booking_id, template) where template = 'reminder_24h' do nothing;

  update public.bookings
  set reminder_sent_at = now()
  where reminder_sent_at is null
    and id in (
      select booking_id from public.sms_log where template = 'reminder_24h'
    );
end;
$$;

-- Schedule hourly
select cron.unschedule('salonzee-24h-reminders')
where exists (select 1 from cron.job where jobname = 'salonzee-24h-reminders');

select cron.schedule(
  'salonzee-24h-reminders',
  '0 * * * *',
  $$select public.queue_24h_reminders();$$
);
