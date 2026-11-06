-- The resolution alert function used a variable named the same as the shop's phone
-- column, which PostgreSQL refuses to resolve. Rename the variable and qualify the column.
CREATE OR REPLACE FUNCTION public.handle_support_status_owner_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  owner_phone text;
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
    SELECT s.phone INTO owner_phone FROM public.salons s WHERE s.id = new.salon_id;
  END IF;
  IF owner_phone IS NULL OR owner_phone = '' THEN
    owner_phone := new.customer_phone;
  END IF;

  IF owner_phone IS NULL OR owner_phone = '' THEN
    RETURN new;
  END IF;

  INSERT INTO public.sms_log (to_phone, template, payload, status)
  VALUES (owner_phone, 'support_resolved_owner', jsonb_build_object(
    'message', format('Salonzee Support marked your ticket "%s" as %s. Need more help? Reply in the app: https://salonzee.com/salon/support', left(coalesce(new.subject, 'your request'), 40), new.status),
    'ticket_id', new.id
  ), 'stubbed');

  RETURN new;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_support_status_owner_notify() FROM PUBLIC, anon, authenticated;