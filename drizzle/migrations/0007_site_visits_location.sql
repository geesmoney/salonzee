ALTER TABLE public.site_visits
  ADD COLUMN IF NOT EXISTS country text CHECK (country IS NULL OR (length(country) = 2 AND country = upper(country))),
  ADD COLUMN IF NOT EXISTS region text CHECK (region IS NULL OR length(region) <= 60);

CREATE INDEX IF NOT EXISTS site_visits_country_idx ON public.site_visits (country, created_at DESC);