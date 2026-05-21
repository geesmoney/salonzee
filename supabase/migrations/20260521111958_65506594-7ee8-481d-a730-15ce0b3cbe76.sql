-- Salons: require authenticated user_id on INSERT
DROP POLICY IF EXISTS "Anyone can register a salon" ON public.salons;

CREATE POLICY "Authenticated users register own salon"
ON public.salons
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- salon_contacts: require authenticated owner
DROP POLICY IF EXISTS "Anyone can create salon contact on registration" ON public.salon_contacts;

CREATE POLICY "Owner inserts own salon contact"
ON public.salon_contacts
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.salons s
    WHERE s.id = salon_contacts.salon_id
      AND s.user_id = auth.uid()
  )
);