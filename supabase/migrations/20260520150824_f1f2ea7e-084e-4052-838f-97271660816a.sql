CREATE SCHEMA IF NOT EXISTS internal;
REVOKE ALL ON SCHEMA internal FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION internal.queue_24h_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

REVOKE ALL ON FUNCTION internal.queue_24h_reminders() FROM PUBLIC, anon, authenticated, service_role;

-- Drop the publicly-exposed version
DROP FUNCTION IF EXISTS public.queue_24h_reminders();

-- Reschedule the cron job to call the internal function
DO $$
BEGIN
  PERFORM cron.unschedule('salonzee-24h-reminders');
EXCEPTION WHEN OTHERS THEN NULL;
END$$;

SELECT cron.schedule(
  'salonzee-24h-reminders',
  '0 * * * *',
  $$ SELECT internal.queue_24h_reminders(); $$
);