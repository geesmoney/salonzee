CREATE TABLE public.owner_notifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL,
 sms_id uuid NOT NULL UNIQUE REFERENCES public.sms_log(id) ON DELETE CASCADE,
 kind text NOT NULL,
 title text NOT NULL,
 body text NOT NULL,
 url text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 read_at timestamptz
);
GRANT SELECT ON public.owner_notifications TO authenticated;
GRANT UPDATE (read_at) ON public.owner_notifications TO authenticated;
GRANT ALL ON public.owner_notifications TO service_role;
ALTER TABLE public.owner_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read their alerts" ON public.owner_notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Owners mark their alerts read" ON public.owner_notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX owner_notifications_inbox_idx ON public.owner_notifications(user_id, created_at DESC);
CREATE OR REPLACE FUNCTION public.queue_owner_notification() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE recipient uuid; heading text; destination text; summary text;
BEGIN
 IF NEW.template = 'owner_booking_received' THEN
   SELECT s.user_id INTO recipient FROM public.bookings b JOIN public.salons s ON s.id=b.salon_id WHERE b.id=NEW.booking_id;
   heading := 'New booking'; destination := '/salon/dashboard'; summary := 'A customer has requested an appointment. Open your bookings to confirm it.';
 ELSIF NEW.template IN ('support_reply_owner','support_resolved_owner','support_closed_owner') THEN
   SELECT s.user_id INTO recipient FROM public.support_tickets t JOIN public.salons s ON s.id=t.salon_id WHERE t.id::text=NEW.payload->>'ticket_id';
   heading := CASE WHEN NEW.template='support_reply_owner' THEN 'Support replied' ELSE 'Support ticket updated' END;
   destination := '/salon/support'; summary := 'There is an update to your support ticket. Open Support to read it.';
 ELSIF NEW.template IN ('salon_approved','salon_rejected','salon_suspended') THEN
   SELECT s.user_id INTO recipient FROM public.salons s WHERE s.slug=NEW.payload->>'salon_slug';
   heading := 'Business listing updated'; destination := '/salon/dashboard'; summary := 'Your business listing has a status update. Open your dashboard for details.';
 ELSIF NEW.template='profile_nudge' THEN
   SELECT s.user_id INTO recipient FROM public.salons s WHERE s.id::text=NEW.payload->>'salon_id';
   heading := 'Complete your business page'; destination := '/salon/settings'; summary := 'Some details are missing from your business page. Open Settings to update them.';
 END IF;
 IF recipient IS NOT NULL THEN
   NEW.payload := NEW.payload || jsonb_build_object('push_target','owner','owner_user_id',recipient,'push_title',heading,'push_url',destination,'push_body',summary,'notification_id',NEW.id);
   INSERT INTO public.owner_notifications(user_id,sms_id,kind,title,body,url) VALUES(recipient,NEW.id,NEW.template,heading,summary,destination) ON CONFLICT(sms_id) DO NOTHING;
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.queue_owner_notification() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER sms_owner_notification BEFORE INSERT ON public.sms_log FOR EACH ROW EXECUTE FUNCTION public.queue_owner_notification();