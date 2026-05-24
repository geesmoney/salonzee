-- Tighten booking insert policy: price_ghs_snapshot must equal the current service price
DROP POLICY IF EXISTS "Anyone can create a booking" ON public.bookings;

CREATE POLICY "Anyone can create a booking"
ON public.bookings
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.salons s
    WHERE s.id = bookings.salon_id AND s.status = 'active'
  )
  AND booking_date >= CURRENT_DATE
  AND booking_date <= (CURRENT_DATE + INTERVAL '90 days')
  AND service_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.services sv
    WHERE sv.id = bookings.service_id
      AND sv.salon_id = bookings.salon_id
      AND sv.active = true
      AND sv.price_ghs = bookings.price_ghs_snapshot
  )
);