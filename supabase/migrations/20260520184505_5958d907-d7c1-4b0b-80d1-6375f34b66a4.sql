ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS price_ghs_snapshot numeric NOT NULL DEFAULT 0;

UPDATE public.bookings b
SET price_ghs_snapshot = COALESCE(s.price_ghs, 0)
FROM public.services s
WHERE b.service_id = s.id AND b.price_ghs_snapshot = 0;