-- Notify the shop owner by SMS when Salonzee Support replies, and when their ticket is resolved or closed.
-- Queues into the existing sms_log queue (same path booking and approval texts use); nothing is sent from the trigger itself.

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
  ORDER BY created_at DESC, id DESC
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

CREATE OR REPLACE FUNCTION public.handle_support_status_owner_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  phone text;
BEGIN
  IF new.status IS NOT DISTINCT FROM old.status THEN
    RETURN new;
  END IF;
  IF new.status NOT IN ('resolved', 'closed') THEN
    RETURN new;
  END IF;
  IF old.status IN ('resolved', 'closed') THEN
    RETURN new;
  END IF;

  IF new.salon_id IS NOT NULL THEN
    SELECT phone INTO phone FROM public.salons WHERE id = new.salon_id;
  END IF;
  IF phone IS NULL OR phone = '' THEN
    phone := new.customer_phone;
  END IF;

  IF phone IS NULL OR phone = '' THEN
    RETURN new;
  END IF;

  INSERT INTO public.sms_log (to_phone, template, payload, status)
  VALUES (phone, 'support_resolved_owner', jsonb_build_object(
    'message', format('Salonzee Support marked your ticket "%s" as %s. Need more help? Reply in the app: https://salonzee.com/salon/support', left(coalesce(new.subject, 'your request'), 40), new.status),
    'ticket_id', new.id
  ), 'stubbed');

  RETURN new;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_support_reply_owner_notify() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_support_status_owner_notify() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER support_messages_owner_reply_sms AFTER INSERT ON public.support_messages
FOR EACH ROW EXECUTE FUNCTION public.handle_support_reply_owner_notify();

CREATE TRIGGER support_tickets_status_owner_sms AFTER UPDATE OF status ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.handle_support_status_owner_notify();