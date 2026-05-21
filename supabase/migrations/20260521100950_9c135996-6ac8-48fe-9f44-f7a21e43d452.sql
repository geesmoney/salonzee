
-- 1) Lock down SECURITY DEFINER trigger functions: they should only ever
-- run from triggers, never be RPC-callable by users.
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.touch_ticket_last_message() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.queue_booking_sms() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_salon_slug() FROM anon, authenticated, PUBLIC;

-- has_role must remain executable by authenticated (RLS policies depend on it),
-- but anon never needs it (auth.uid() is null for anon).
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

-- 2) Tighten always-true INSERT policies.

-- Salons: anyone may register, but if user_id is supplied it must match the caller.
DROP POLICY IF EXISTS "Anyone can register a salon" ON public.salons;
CREATE POLICY "Anyone can register a salon"
  ON public.salons
  FOR INSERT
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Bookings: anyone may book, but only against a salon that is active.
DROP POLICY IF EXISTS "Anyone can create a booking" ON public.bookings;
CREATE POLICY "Anyone can create a booking"
  ON public.bookings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.salons s
      WHERE s.id = bookings.salon_id AND s.status = 'active'
    )
  );

-- Support tickets: anyone may open, but opened_by_user_id must either be null
-- (anonymous customer) or match the caller, and any linked salon/booking must
-- actually exist.
DROP POLICY IF EXISTS "Anyone can open a ticket" ON public.support_tickets;
CREATE POLICY "Anyone can open a ticket"
  ON public.support_tickets
  FOR INSERT
  WITH CHECK (
    (opened_by_user_id IS NULL OR opened_by_user_id = auth.uid())
    AND (salon_id IS NULL OR EXISTS (SELECT 1 FROM public.salons s WHERE s.id = salon_id))
    AND (booking_id IS NULL OR EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id))
  );

-- 3) Storage: remove broad listing on the public salon-images bucket.
-- Files remain reachable via public object URLs (those bypass RLS for public
-- buckets) but anonymous users can no longer enumerate the bucket contents.
DROP POLICY IF EXISTS "Public can view salon images" ON storage.objects;
