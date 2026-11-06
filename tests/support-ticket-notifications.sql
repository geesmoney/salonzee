-- Run using a privileged database test session (not the sandbox_exec role).
-- Rollback keeps fixtures and queued SMS invisible to the live processor.
BEGIN;
DO $$
DECLARE owner_id uuid; admin_id uuid; shop_id uuid; ticket_id uuid; admin_ticket_id uuid; queued_count integer;
BEGIN
  SELECT s.id, s.user_id INTO shop_id, owner_id FROM public.salons s
  WHERE s.user_id IS NOT NULL AND NOT public.has_role(s.user_id, 'platform_admin') LIMIT 1;
  SELECT user_id INTO admin_id FROM public.user_roles WHERE role = 'platform_admin' LIMIT 1;
  IF owner_id IS NULL OR admin_id IS NULL THEN RAISE EXCEPTION 'Owner and admin fixtures required'; END IF;
  INSERT INTO public.support_tickets (subject, salon_id, opened_by_user_id, category)
  VALUES ('Notification rollback test', shop_id, owner_id, 'technical') RETURNING id INTO ticket_id;
  SELECT count(*) INTO queued_count FROM public.sms_log
  WHERE template = 'admin_new_support_ticket' AND payload->>'ticket_id' = ticket_id::text
    AND to_phone = '0248341613' AND status = 'stubbed'
    AND payload->>'message' LIKE '%https://salonzee.com/admin/support%';
  IF queued_count <> 1 THEN RAISE EXCEPTION 'A new owner ticket must queue exactly one SMS to the existing admin number'; END IF;
  UPDATE public.support_tickets SET status = 'pending' WHERE id = ticket_id;
  INSERT INTO public.support_messages (ticket_id, sender_type, sender_user_id, body)
  VALUES (ticket_id, 'owner', owner_id, 'Private test message must not appear in the notification.');
  SELECT count(*) INTO queued_count FROM public.sms_log WHERE template = 'admin_new_support_ticket' AND payload->>'ticket_id' = ticket_id::text;
  IF queued_count <> 1 THEN RAISE EXCEPTION 'Updates and replies must not duplicate new-ticket alerts'; END IF;
  IF EXISTS (SELECT 1 FROM public.sms_log WHERE payload->>'ticket_id' = ticket_id::text AND payload::text LIKE '%Private test message%') THEN RAISE EXCEPTION 'SMS must exclude message bodies'; END IF;
  INSERT INTO public.support_tickets (subject, opened_by_user_id, category)
  VALUES ('Admin rollback test', admin_id, 'technical') RETURNING id INTO admin_ticket_id;
  IF EXISTS (SELECT 1 FROM public.sms_log WHERE template = 'admin_new_support_ticket' AND payload->>'ticket_id' = admin_ticket_id::text) THEN RAISE EXCEPTION 'Admin-created tickets must not send alerts'; END IF;
END $$;
ROLLBACK;