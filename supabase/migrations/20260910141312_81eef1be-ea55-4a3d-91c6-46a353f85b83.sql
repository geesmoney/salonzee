-- 1. Referral codes
CREATE TABLE public.referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label text NOT NULL,
  salon_id uuid REFERENCES public.salons(id) ON DELETE CASCADE,
  agent_phone text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX referral_codes_salon_unique ON public.referral_codes(salon_id) WHERE salon_id IS NOT NULL;

GRANT SELECT ON public.referral_codes TO authenticated;
GRANT ALL ON public.referral_codes TO service_role;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admin manages referral codes"
  ON public.referral_codes FOR ALL
  USING (public.has_role(auth.uid(), 'platform_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Owner views own referral code"
  ON public.referral_codes FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.salons s WHERE s.id = referral_codes.salon_id AND s.user_id = auth.uid()));

CREATE TRIGGER referral_codes_updated_at
  BEFORE UPDATE ON public.referral_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Which code brought a salon in
ALTER TABLE public.salons ADD COLUMN referred_by_code text;

-- 3. Rewards ledger
CREATE TABLE public.referral_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id uuid NOT NULL REFERENCES public.referral_codes(id) ON DELETE CASCADE,
  code text NOT NULL,
  referred_salon_id uuid NOT NULL UNIQUE REFERENCES public.salons(id) ON DELETE CASCADE,
  months_awarded integer NOT NULL DEFAULT 1,
  awarded_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.referral_rewards TO authenticated;
GRANT ALL ON public.referral_rewards TO service_role;
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admin manages referral rewards"
  ON public.referral_rewards FOR ALL
  USING (public.has_role(auth.uid(), 'platform_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Owner views rewards on own code"
  ON public.referral_rewards FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.referral_codes rc
    JOIN public.salons s ON s.id = rc.salon_id
    WHERE rc.id = referral_rewards.referral_code_id AND s.user_id = auth.uid()
  ));

-- 4. Validate a code without exposing the whole table
CREATE OR REPLACE FUNCTION public.validate_referral_code(_code text)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT jsonb_build_object('valid', true, 'label', rc.label)
     FROM public.referral_codes rc
     WHERE upper(rc.code) = upper(trim(_code)) AND rc.active
     LIMIT 1),
    jsonb_build_object('valid', false)
  );
$$;
REVOKE ALL ON FUNCTION public.validate_referral_code(text) FROM public;
GRANT EXECUTE ON FUNCTION public.validate_referral_code(text) TO anon, authenticated;

-- 5. Give every salon its own code on approval, and credit the referrer
CREATE OR REPLACE FUNCTION public.handle_referral_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base text;
  candidate text;
  n int := 0;
  ref_id uuid;
BEGIN
  IF TG_OP = 'UPDATE' AND old.status <> 'active' AND new.status = 'active' THEN
    -- own code
    IF NOT EXISTS (SELECT 1 FROM public.referral_codes WHERE salon_id = new.id) THEN
      base := upper(regexp_replace(new.name, '[^a-zA-Z0-9]', '', 'g'));
      base := left(coalesce(nullif(base, ''), 'SALON'), 8);
      candidate := base;
      WHILE EXISTS (SELECT 1 FROM public.referral_codes WHERE upper(code) = candidate) LOOP
        n := n + 1;
        candidate := base || n::text;
      END LOOP;
      INSERT INTO public.referral_codes (code, label, salon_id) VALUES (candidate, new.name, new.id);
    END IF;

    -- credit the referrer
    IF new.referred_by_code IS NOT NULL THEN
      SELECT id INTO ref_id FROM public.referral_codes
      WHERE upper(code) = upper(trim(new.referred_by_code)) AND active LIMIT 1;
      IF ref_id IS NOT NULL AND (ref_id IS DISTINCT FROM (SELECT id FROM public.referral_codes WHERE salon_id = new.id)) THEN
        INSERT INTO public.referral_rewards (referral_code_id, code, referred_salon_id)
        VALUES (ref_id, upper(trim(new.referred_by_code)), new.id)
        ON CONFLICT (referred_salon_id) DO NOTHING;
      END IF;
    END IF;
  END IF;
  RETURN new;
END;
$$;
REVOKE ALL ON FUNCTION public.handle_referral_on_approval() FROM public, anon, authenticated;

CREATE TRIGGER salons_referral_on_approval
  AFTER UPDATE ON public.salons
  FOR EACH ROW EXECUTE FUNCTION public.handle_referral_on_approval();

-- 6. Backfill codes for already-active salons
INSERT INTO public.referral_codes (code, label, salon_id)
SELECT left(upper(regexp_replace(s.name, '[^a-zA-Z0-9]', '', 'g')), 8) || substr(s.id::text, 1, 3),
       s.name, s.id
FROM public.salons s
WHERE s.status = 'active'
  AND NOT EXISTS (SELECT 1 FROM public.referral_codes rc WHERE rc.salon_id = s.id);