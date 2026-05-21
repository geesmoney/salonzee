
-- 1) Fix broken storage ownership checks (was comparing against the salon's
-- display name instead of the actual storage object path).
DROP POLICY IF EXISTS "Salon owners delete own folder" ON storage.objects;
DROP POLICY IF EXISTS "Salon owners update own folder" ON storage.objects;
DROP POLICY IF EXISTS "Salon owners upload to own folder" ON storage.objects;

CREATE POLICY "Salon owners upload to own folder"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'salon-images'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.salons s
      WHERE s.user_id = auth.uid()
        AND s.id::text = (storage.foldername(objects.name))[1]
    )
  );

CREATE POLICY "Salon owners update own folder"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'salon-images'
    AND EXISTS (
      SELECT 1 FROM public.salons s
      WHERE s.user_id = auth.uid()
        AND s.id::text = (storage.foldername(objects.name))[1]
    )
  );

CREATE POLICY "Salon owners delete own folder"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'salon-images'
    AND EXISTS (
      SELECT 1 FROM public.salons s
      WHERE s.user_id = auth.uid()
        AND s.id::text = (storage.foldername(objects.name))[1]
    )
  );

-- 2) Move owner email + owner_name into a private table.
CREATE TABLE public.salon_contacts (
  salon_id uuid PRIMARY KEY REFERENCES public.salons(id) ON DELETE CASCADE,
  owner_name text NOT NULL,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.salon_contacts (salon_id, owner_name, email)
SELECT id, owner_name, email FROM public.salons;

ALTER TABLE public.salons DROP COLUMN owner_name;
ALTER TABLE public.salons DROP COLUMN email;

ALTER TABLE public.salon_contacts ENABLE ROW LEVEL SECURITY;

-- Anyone can insert a contact row in tandem with a salon they are allowed to
-- register (same WITH CHECK shape as the salons INSERT policy).
CREATE POLICY "Anyone can create salon contact on registration"
  ON public.salon_contacts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.salons s
      WHERE s.id = salon_contacts.salon_id
        AND (s.user_id IS NULL OR s.user_id = auth.uid())
    )
  );

CREATE POLICY "Owner views own salon contact"
  ON public.salon_contacts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.salons s
      WHERE s.id = salon_contacts.salon_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Owner updates own salon contact"
  ON public.salon_contacts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.salons s
      WHERE s.id = salon_contacts.salon_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Platform admin manages all salon contacts"
  ON public.salon_contacts
  FOR ALL
  USING (has_role(auth.uid(), 'platform_admin'))
  WITH CHECK (has_role(auth.uid(), 'platform_admin'));

CREATE TRIGGER salon_contacts_set_updated_at
  BEFORE UPDATE ON public.salon_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Stop anonymous flooding of support_messages. An anon customer may post
-- ONLY the first message on a ticket they just opened anonymously.
DROP POLICY IF EXISTS "Open insert for ticket participants" ON public.support_messages;
CREATE POLICY "Open insert for ticket participants"
  ON public.support_messages
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'platform_admin')
    OR EXISTS (
      SELECT 1
      FROM public.support_tickets t
      LEFT JOIN public.salons s  ON s.id  = t.salon_id
      LEFT JOIN public.bookings b ON b.id  = t.booking_id
      LEFT JOIN public.salons sb ON sb.id = b.salon_id
      WHERE t.id = support_messages.ticket_id
        AND (
          s.user_id = auth.uid()
          OR sb.user_id = auth.uid()
          OR t.opened_by_user_id = auth.uid()
        )
    )
    OR (
      -- Anonymous initial submission: only on a fresh, unclaimed ticket
      -- that has no messages yet.
      sender_type = 'customer'
      AND EXISTS (
        SELECT 1 FROM public.support_tickets t
        WHERE t.id = support_messages.ticket_id
          AND t.opened_by_user_id IS NULL
          AND t.created_at > now() - interval '10 minutes'
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.support_messages m
        WHERE m.ticket_id = support_messages.ticket_id
      )
    )
  );

-- 4) Lock down Realtime broadcast/presence. The app uses postgres_changes
-- (which goes through table RLS); it does not use Broadcast or Presence.
-- Deny all access to the realtime.messages system table so authenticated
-- users cannot subscribe to or publish on arbitrary channels.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny broadcast and presence" ON realtime.messages;
CREATE POLICY "Deny broadcast and presence"
  ON realtime.messages
  FOR ALL
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);
