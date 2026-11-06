CREATE OR REPLACE FUNCTION public.handle_new_support_ticket_admin_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE shop_name text;
BEGIN
  IF new.opened_by_user_id IS NULL OR public.has_role(new.opened_by_user_id, 'platform_admin') THEN
    RETURN new;
  END IF;
  SELECT name INTO shop_name FROM public.salons WHERE id = new.salon_id;
  INSERT INTO public.sms_log (to_phone, template, payload, status)
  VALUES ('0248341613', 'admin_new_support_ticket', jsonb_build_object(
    'message', format('New Salonzee support ticket from %s. Open your inbox: https://salonzee.com/admin/support', left(coalesce(shop_name, 'a customer'), 70)),
    'ticket_id', new.id
  ), 'stubbed');
  RETURN new;
END;
$$;
REVOKE ALL ON FUNCTION public.handle_new_support_ticket_admin_notify() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER support_tickets_admin_sms AFTER INSERT ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.handle_new_support_ticket_admin_notify();