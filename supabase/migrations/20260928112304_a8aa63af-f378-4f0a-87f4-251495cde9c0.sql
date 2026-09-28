CREATE TYPE public.business_category AS ENUM ('hair_salon','barbershop','braiding','nail_tech','makeup','lashes_brows','spa','other');
ALTER TABLE public.salons ADD COLUMN business_category public.business_category NOT NULL DEFAULT 'hair_salon';
CREATE INDEX IF NOT EXISTS salons_business_category_idx ON public.salons(business_category);