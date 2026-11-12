ALTER POLICY "Anyone can log a visit" ON public.site_visits WITH CHECK (
 session_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
 AND length(path) BETWEEN 1 AND 300 AND path LIKE '/%' AND path NOT LIKE '//%' AND path !~ '[?#\r\n]'
 AND device IN ('mobile','desktop') AND length(source) BETWEEN 1 AND 60
 AND (referrer IS NULL OR length(referrer) <= 500)
 AND (utm_source IS NULL OR length(utm_source) <= 100)
 AND (utm_medium IS NULL OR length(utm_medium) <= 100)
 AND (utm_campaign IS NULL OR length(utm_campaign) <= 150)
 AND (gclid IS NULL OR length(gclid) <= 300)
 AND (country IS NULL OR country ~ '^[A-Z]{2}$')
 AND (region IS NULL OR length(region) <= 60)
 AND created_at BETWEEN now() - interval '5 minutes' AND now() + interval '1 minute'
);
ALTER POLICY "Anyone can log install events" ON public.app_install_events WITH CHECK (
 session_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
 AND event IN ('prompt_shown','prompt_accepted','prompt_dismissed','installed','home_screen_open')
 AND platform IN ('android','ios','desktop','other')
 AND created_at BETWEEN now() - interval '5 minutes' AND now() + interval '1 minute'
);
COMMENT ON POLICY "Anyone can log a visit" ON public.site_visits IS 'Transitional validated legacy writes: revoke after server ingestion is published and verified. Not a bot limiter.';
COMMENT ON POLICY "Anyone can log install events" ON public.app_install_events IS 'Transitional validated legacy writes: revoke after server ingestion is published and verified. Not a bot limiter.';