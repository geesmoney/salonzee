ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS customer_user_id uuid;
CREATE INDEX IF NOT EXISTS bookings_customer_user_id_idx ON public.bookings(customer_user_id);
CREATE POLICY "Customer views own bookings" ON public.bookings FOR SELECT TO authenticated USING (customer_user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.claim_my_booking(_booking_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  UPDATE public.bookings SET customer_user_id = auth.uid()
   WHERE id = _booking_id AND customer_user_id IS NULL
     AND created_at > now() - interval '24 hours';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n > 0;
END $$;
REVOKE ALL ON FUNCTION public.claim_my_booking(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.claim_my_booking(uuid) TO authenticated;