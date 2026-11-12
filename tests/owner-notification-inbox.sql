-- Privileged rolled-back test: no booking records changed and no SMS can be sent.
BEGIN;
DO $$
DECLARE b uuid; u uuid; shop uuid; slug text; n uuid; before_count bigint;
BEGIN
 SELECT bookings.id, salons.user_id, salons.id, salons.slug INTO b,u,shop,slug
 FROM public.bookings JOIN public.salons ON salons.id=bookings.salon_id WHERE salons.user_id IS NOT NULL LIMIT 1;
 IF b IS NULL THEN RAISE EXCEPTION 'Existing booking fixture required'; END IF;
 SELECT count(*) INTO before_count FROM public.sms_log;
 INSERT INTO public.sms_log(to_phone,template,payload,status,booking_id)
 VALUES('0000000000','owner_booking_received','{"message":"Private customer details"}','stubbed',b) RETURNING id INTO n;
 IF NOT EXISTS(SELECT 1 FROM public.owner_notifications WHERE sms_id=n AND user_id=u AND title='New booking' AND url='/salon/dashboard' AND body NOT LIKE '%Private customer%') THEN
 RAISE EXCEPTION 'Booking must create private owner alert with safe summary'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.sms_log WHERE id=n AND payload->>'owner_user_id'=u::text AND payload->>'push_target'='owner' AND payload->>'message'='Private customer details') THEN
 RAISE EXCEPTION 'Push must route by ownership without changing SMS'; END IF;
 IF (SELECT count(*) FROM public.sms_log) <> before_count+1 THEN RAISE EXCEPTION 'Notification created extra SMS'; END IF;
 INSERT INTO public.sms_log(to_phone,template,payload,status) VALUES('0000000000','salon_approved',jsonb_build_object('salon_slug',slug,'message','Approval'),'stubbed') RETURNING id INTO n;
 IF NOT EXISTS(SELECT 1 FROM public.owner_notifications WHERE sms_id=n AND user_id=u) THEN RAISE EXCEPTION 'Listing alert must reach owner'; END IF;
 INSERT INTO public.sms_log(to_phone,template,payload,status) VALUES('0000000000','profile_nudge',jsonb_build_object('salon_id',shop,'message','Missing details'),'stubbed') RETURNING id INTO n;
 IF NOT EXISTS(SELECT 1 FROM public.owner_notifications WHERE sms_id=n AND user_id=u AND url='/salon/settings') THEN RAISE EXCEPTION 'Profile alert must link to settings'; END IF;
 SET CONSTRAINTS ALL IMMEDIATE;
END $$;
ROLLBACK;