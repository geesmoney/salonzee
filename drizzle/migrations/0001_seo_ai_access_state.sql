CREATE TABLE public.seo_ai_access_state (model text PRIMARY KEY, message text NOT NULL, blocked_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE ON public.seo_ai_access_state TO authenticated;
GRANT ALL ON public.seo_ai_access_state TO service_role;
ALTER TABLE public.seo_ai_access_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Platform admins read AI access state" ON public.seo_ai_access_state FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'platform_admin'));
CREATE POLICY "Platform admins persist AI denials" ON public.seo_ai_access_state FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'platform_admin'));
CREATE POLICY "Platform admins update AI denials" ON public.seo_ai_access_state FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'platform_admin')) WITH CHECK (public.has_role(auth.uid(), 'platform_admin'));