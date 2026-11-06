-- Messages can be written in the same instant, which makes "the previous message"
-- ambiguous. A monotonic sequence gives every message a permanent, unambiguous order.
ALTER TABLE public.support_messages
  ADD COLUMN IF NOT EXISTS seq bigint GENERATED ALWAYS AS IDENTITY;

CREATE OR REPLACE FUNCTION public.handle_support_reply_owner_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  ticket_subject text;
  phone text;
  opener_id uuid;
  prev_sender public.support_sender_type;
BEGIN
  IF new.sender_type <> 'admin' THEN
    RETURN new;
  END IF;

  SELECT t.subject, coalesce(s.phone, t.customer_phone), t.opened_by_user_id
    INTO ticket_subject, phone, opener_id
  FROM public.support_tickets t
  LEFT JOIN public.salons s ON s.id = t.salon_id
  WHERE t.id = new.ticket_id;

  IF phone IS NULL OR phone = '' THEN
    RETURN new;
  END IF;

  -- An admin replying to a ticket they opened themselves is not a new message for anyone.
  IF opener_id IS NOT NULL AND opener_id = new.sender_user_id THEN
    RETURN new;
  END IF;

  -- Only the first admin reply after the owner spoke alerts them, so a burst of
  -- internal replies cannot text the shop repeatedly.
  SELECT sender_type INTO prev_sender
  FROM public.support_messages
  WHERE ticket_id = new.ticket_id AND id <> new.id
  ORDER BY seq DESC
  LIMIT 1;

  IF prev_sender = 'admin' THEN
    RETURN new;
  END IF;

  INSERT INTO public.sms_log (to_phone, template, payload, status)
  VALUES (phone, 'support_reply_owner', jsonb_build_object(
    'message', format('Salonzee Support replied to your ticket "%s". Open the app to read it: https://salonzee.com/salon/support', left(coalesce(ticket_subject, 'your request'), 40)),
    'ticket_id', new.ticket_id
  ), 'stubbed');

  RETURN new;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_support_reply_owner_notify() FROM PUBLIC, anon, authenticated;