-- 1. Revoke has_role from anon and PUBLIC (re-asserts earlier fix that was undone)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- 2. Support tickets: require auth to open
DROP POLICY IF EXISTS "Anyone can open a ticket" ON public.support_tickets;

CREATE POLICY "Authenticated users open tickets"
ON public.support_tickets
FOR INSERT
TO authenticated
WITH CHECK (
  opened_by_user_id = auth.uid()
  AND (salon_id IS NULL OR EXISTS (SELECT 1 FROM public.salons s WHERE s.id = support_tickets.salon_id))
  AND (booking_id IS NULL OR EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = support_tickets.booking_id))
);

-- 3. Support messages: split the open insert policy by sender_type
DROP POLICY IF EXISTS "Open insert for ticket participants" ON public.support_messages;

-- Admin: only platform admins can send as 'admin'
CREATE POLICY "Admin sends admin messages"
ON public.support_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_type = 'admin'
  AND public.has_role(auth.uid(), 'platform_admin'::public.app_role)
);

-- Owner: only the salon owner attached to the ticket can send as 'owner'
CREATE POLICY "Salon owner sends owner messages"
ON public.support_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_type = 'owner'
  AND EXISTS (
    SELECT 1 FROM public.support_tickets t
    LEFT JOIN public.salons s ON s.id = t.salon_id
    LEFT JOIN public.bookings b ON b.id = t.booking_id
    LEFT JOIN public.salons sb ON sb.id = b.salon_id
    WHERE t.id = support_messages.ticket_id
      AND (s.user_id = auth.uid() OR sb.user_id = auth.uid())
  )
);

-- Customer: only the authenticated opener of the ticket can send as 'customer'
CREATE POLICY "Ticket opener sends customer messages"
ON public.support_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_type = 'customer'
  AND EXISTS (
    SELECT 1 FROM public.support_tickets t
    WHERE t.id = support_messages.ticket_id
      AND t.opened_by_user_id = auth.uid()
  )
);

-- 4. Remove support tables from realtime publication to stop cross-tenant CDC leaks
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'support_tickets'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.support_tickets';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'support_messages'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.support_messages';
  END IF;
END $$;