CREATE TABLE public.salon_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_name text NOT NULL,
  business_name text NOT NULL,
  phone text NOT NULL,
  business_category text NOT NULL,
  city text NOT NULL,
  area text,
  preferred_contact text NOT NULL DEFAULT 'either' CHECK (preferred_contact IN ('phone', 'whatsapp', 'either')),
  help_text text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted', 'archived')),
  admin_notes text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  gclid text,
  referrer text,
  landing_path text NOT NULL DEFAULT '/get-listed',
  admin_alert_sms_id uuid REFERENCES public.sms_log(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.salon_leads TO authenticated;
GRANT UPDATE (status, admin_notes, updated_at) ON public.salon_leads TO authenticated;
GRANT ALL ON public.salon_leads TO service_role;
ALTER TABLE public.salon_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Platform admins read salon leads" ON public.salon_leads FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'platform_admin'));
CREATE POLICY "Platform admins update salon leads" ON public.salon_leads FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'platform_admin')) WITH CHECK (public.has_role(auth.uid(), 'platform_admin'));
CREATE INDEX salon_leads_created_at_idx ON public.salon_leads (created_at DESC);
CREATE INDEX salon_leads_status_created_at_idx ON public.salon_leads (status, created_at DESC);
CREATE INDEX salon_leads_phone_created_at_idx ON public.salon_leads (phone, created_at DESC);