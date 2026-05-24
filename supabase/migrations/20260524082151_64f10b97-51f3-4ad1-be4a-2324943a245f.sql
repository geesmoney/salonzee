
-- 1) Bookings: restrict insert to reasonable future window
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
);

-- 2) Support tickets: tighten booking_id linkage
DROP POLICY IF EXISTS "Authenticated users open tickets" ON public.support_tickets;

CREATE POLICY "Authenticated users open tickets"
ON public.support_tickets
FOR INSERT
TO authenticated
WITH CHECK (
  opened_by_user_id = auth.uid()
  AND (
    salon_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.salons s
      WHERE s.id = support_tickets.salon_id AND s.user_id = auth.uid()
    )
  )
  AND (
    booking_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.salons s ON s.id = b.salon_id
      WHERE b.id = support_tickets.booking_id
        AND (
          s.user_id = auth.uid()
          OR (support_tickets.salon_id IS NOT NULL AND b.salon_id = support_tickets.salon_id)
        )
    )
  )
);
