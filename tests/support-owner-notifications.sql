-- Run using a privileged database test session (not the sandbox_exec role).
-- Rollback keeps fixtures and queued SMS invisible to the live processor.
BEGIN;
DO $$
DECLARE
  owner_id uuid; admin_id uuid; shop_id uuid; shop_phone text;
  ticket_id uuid; admin_ticket_id uuid;
  queued integer;
BEGIN
  SELECT s.id, s.user_id, s.phone INTO shop_id, owner_id, shop_phone
  FROM public.salons s
  WHERE s.user_id IS NOT NULL AND NOT public.has_role(s.user_id, 'platform_admin')
  LIMIT 1;
  SELECT user_id INTO admin_id FROM public.user_roles WHERE role = 'platform_admin' LIMIT 1;
  IF owner_id IS NULL OR admin_id IS NULL THEN RAISE EXCEPTION 'Owner and admin fixtures required'; END IF;

  INSERT INTO public.support_tickets (subject, salon_id, opened_by_user_id, category)
  VALUES ('Owner alert rollback test', shop_id, owner_id, 'technical') RETURNING id INTO ticket_id;
  INSERT INTO public.support_messages (ticket_id, sender_type, sender_user_id, body)
  VALUES (ticket_id, 'owner', owner_id, 'Owner message body must never be texted out.');

  -- An admin reply alerts the shop owner exactly once, to the shop's own number.
  INSERT INTO public.support_messages (ticket_id, sender_type, sender_user_id, body)
  VALUES (ticket_id, 'admin', admin_id, 'Hidden reply body must never be texted out.');
  SELECT count(*) INTO queued FROM public.sms_log
  WHERE template = 'support_reply_owner' AND payload->>'ticket_id' = ticket_id::text;
  IF queued <> 1 THEN RAISE EXCEPTION 'Exactly one reply alert must queue per admin reply, found %', queued; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sms_log WHERE template = 'support_reply_owner'
      AND payload->>'ticket_id' = ticket_id::text AND to_phone = shop_phone
      AND payload->>'message' LIKE '%https://salonzee.com/salon/support%') THEN
    RAISE EXCEPTION 'Reply alert must go to the shop number and link to the owner support page';
  END IF;

  -- A second admin reply in a row must not text the shop again.
  INSERT INTO public.support_messages (ticket_id, sender_type, sender_user_id, body)
  VALUES (ticket_id, 'admin', admin_id, 'Second admin reply in a row.');
  SELECT count(*) INTO queued FROM public.sms_log
  WHERE template = 'support_reply_owner' AND payload->>'ticket_id' = ticket_id::text;
  IF queued <> 1 THEN RAISE EXCEPTION 'Consecutive admin replies must not duplicate the alert, found %', queued; END IF;

  -- The owner's own messages never alert them.
  INSERT INTO public.support_messages (ticket_id, sender_type, sender_user_id, body)
  VALUES (ticket_id, 'owner', owner_id, 'Owner follow-up.');
  SELECT count(*) INTO queued FROM public.sms_log
  WHERE template = 'support_reply_owner' AND payload->>'ticket_id' = ticket_id::text;
  IF queued <> 1 THEN RAISE EXCEPTION 'Owner messages must not queue alerts, found %', queued; END IF;

  -- After the owner speaks again, the next admin reply does alert them.
  INSERT INTO public.support_messages (ticket_id, sender_type, sender_user_id, body)
  VALUES (ticket_id, 'admin', admin_id, 'Admin replies again.');
  SELECT count(*) INTO queued FROM public.sms_log
  WHERE template = 'support_reply_owner' AND payload->>'ticket_id' = ticket_id::text;
  IF queued <> 2 THEN RAISE EXCEPTION 'An admin reply after an owner message must alert again, found %', queued; END IF;

  -- Message bodies stay out of every queued SMS for this ticket.
  IF EXISTS (SELECT 1 FROM public.sms_log WHERE payload->>'ticket_id' = ticket_id::text
      AND (payload::text LIKE '%Owner message body%' OR payload::text LIKE '%Hidden reply body%')) THEN
    RAISE EXCEPTION 'SMS must exclude message bodies';
  END IF;

  -- Resolving notifies once; reopening and re-resolving must not spam.
  UPDATE public.support_tickets SET status = 'resolved' WHERE id = ticket_id;
  SELECT count(*) INTO queued FROM public.sms_log
  WHERE template = 'support_resolved_owner' AND payload->>'ticket_id' = ticket_id::text;
  IF queued <> 1 THEN RAISE EXCEPTION 'Resolving must queue exactly one alert, found %', queued; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sms_log WHERE template = 'support_resolved_owner'
      AND payload->>'ticket_id' = ticket_id::text AND to_phone = shop_phone) THEN
    RAISE EXCEPTION 'Resolution alert must go to the shop number';
  END IF;

  UPDATE public.support_tickets SET status = 'open' WHERE id = ticket_id;
  SELECT count(*) INTO queued FROM public.sms_log
  WHERE template = 'support_resolved_owner' AND payload->>'ticket_id' = ticket_id::text;
  IF queued <> 1 THEN RAISE EXCEPTION 'Reopening must not queue an alert, found %', queued; END IF;

  UPDATE public.support_tickets SET status = 'resolved' WHERE id = ticket_id;
  SELECT count(*) INTO queued FROM public.sms_log
  WHERE template = 'support_resolved_owner' AND payload->>'ticket_id' = ticket_id::text;
  IF queued <> 2 THEN RAISE EXCEPTION 'Re-resolving after a reopen must alert once more, found %', queued; END IF;

  UPDATE public.support_tickets SET status = 'closed' WHERE id = ticket_id;
  SELECT count(*) INTO queued FROM public.sms_log
  WHERE template = 'support_resolved_owner' AND payload->>'ticket_id' = ticket_id::text;
  IF queued <> 2 THEN RAISE EXCEPTION 'Closing an already-resolved ticket must not alert again, found %', queued; END IF;

  -- A ticket an admin opened for themselves never texts the admin as if they were a shop.
  INSERT INTO public.support_tickets (subject, opened_by_user_id, category)
  VALUES ('Admin opened rollback test', admin_id, 'technical') RETURNING id INTO admin_ticket_id;
  INSERT INTO public.support_messages (ticket_id, sender_type, sender_user_id, body)
  VALUES (admin_ticket_id, 'admin', admin_id, 'Admin note to self.');
  IF EXISTS (SELECT 1 FROM public.sms_log WHERE template = 'support_reply_owner'
      AND payload->>'ticket_id' = admin_ticket_id::text) THEN
    RAISE EXCEPTION 'Admin-opened tickets must not queue owner alerts';
  END IF;
END $$;
ROLLBACK;
