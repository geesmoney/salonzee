DO $$
BEGIN
  PERFORM cron.unschedule('process-sms-queue');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'process-sms-queue',
  '* * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://salonzee.lovable.app/api/public/hooks/process-sms-queue',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $cron$
);