CREATE TABLE public.app_install_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL CHECK (length(session_id) <= 64),
  event text NOT NULL CHECK (event IN ('prompt_shown','prompt_accepted','prompt_dismissed','installed','home_screen_open')),
  platform text NOT NULL DEFAULT 'other' CHECK (platform IN ('android','ios','desktop','other')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.app_install_events TO anon, authenticated;
GRANT SELECT ON public.app_install_events TO authenticated;
GRANT ALL ON public.app_install_events TO service_role;
ALTER TABLE public.app_install_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can log install events" ON public.app_install_events FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins read install events" ON public.app_install_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'platform_admin'));
CREATE INDEX app_install_events_created_idx ON public.app_install_events (created_at DESC);