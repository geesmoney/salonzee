-- Add optional WhatsApp number override on salons
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS whatsapp_phone text;

-- Helper: convert a Ghana phone (024..., +233..., 233...) to E.164 digits for wa.me
CREATE OR REPLACE FUNCTION public.wa_digits(_phone text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
declare
  digits text;
begin
  if _phone is null then return null; end if;
  digits := regexp_replace(_phone, '[^0-9]', '', 'g');
  if digits like '233%' then
    return digits;
  elsif digits like '0%' and char_length(digits) >= 10 then
    return '233' || substring(digits from 2);
  end if;
  return digits;
end;
$$;

-- Replace booking SMS trigger to append wa.me link for the customer (to salon's WhatsApp)
CREATE OR REPLACE FUNCTION public.queue_booking_sms()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  salon_name text;
  salon_phone text;
  salon_wa text;
  customer_wa text;
  formatted_date text;
  formatted_time text;
  customer_msg text;
  owner_msg text;
  wa_salon_link text;
  wa_customer_link text;
begin
  select s.name, s.phone, public.wa_digits(coalesce(s.whatsapp_phone, s.phone))
    into salon_name, salon_phone, salon_wa
  from public.salons s where s.id = new.salon_id;

  customer_wa := public.wa_digits(new.customer_phone);

  formatted_date := to_char(new.booking_date, 'FMDay, FMMonth FMDDth');
  formatted_time := to_char(new.start_time, 'FMHH12:MIAM');

  wa_salon_link := case when salon_wa is not null then ' WhatsApp: https://wa.me/' || salon_wa else '' end;
  wa_customer_link := case when customer_wa is not null then ' WhatsApp customer: https://wa.me/' || customer_wa else '' end;

  if tg_op = 'INSERT' then
    customer_msg := format(
      'Hey %s, we received your booking with %s for %s on %s. You''ll get a confirmation shortly. Questions? Call %s or message on WhatsApp: https://wa.me/%s',
      new.customer_name, salon_name, formatted_time, formatted_date, salon_phone, coalesce(salon_wa, '')
    );
    insert into public.sms_log (to_phone, template, payload, status, booking_id)
    values (new.customer_phone, 'booking_received',
      jsonb_build_object('message', customer_msg, 'customer_name', new.customer_name, 'salon_name', salon_name, 'salon_phone', salon_phone, 'date', new.booking_date, 'time', new.start_time),
      'stubbed', new.id);

    owner_msg := format(
      'Hey %s, you have a booking from %s for %s on %s. Please check the app and confirm.%s',
      salon_name, new.customer_name, formatted_time, formatted_date, wa_customer_link
    );
    insert into public.sms_log (to_phone, template, payload, status, booking_id)
    values (salon_phone, 'owner_booking_received',
      jsonb_build_object('message', owner_msg, 'salon_name', salon_name, 'customer_name', new.customer_name, 'customer_phone', new.customer_phone, 'date', new.booking_date, 'time', new.start_time),
      'stubbed', new.id);

  elsif tg_op = 'UPDATE' and old.status <> new.status then
    if new.status = 'confirmed' then
      customer_msg := format(
        'Hey %s, your booking with %s is confirmed for %s on %s. Please make sure to attend. Call %s on %s or WhatsApp: https://wa.me/%s',
        new.customer_name, salon_name, formatted_time, formatted_date, salon_name, salon_phone, coalesce(salon_wa, '')
      );
      insert into public.sms_log (to_phone, template, payload, status, booking_id)
      values (new.customer_phone, 'booking_confirmed',
        jsonb_build_object('message', customer_msg, 'salon_name', salon_name, 'salon_phone', salon_phone, 'customer_name', new.customer_name, 'date', new.booking_date, 'time', new.start_time),
        'stubbed', new.id);
    elsif new.status = 'cancelled' then
      customer_msg := format(
        'Hey %s, your booking with %s for %s on %s has been cancelled. For questions, call %s on %s or WhatsApp: https://wa.me/%s',
        new.customer_name, salon_name, formatted_time, formatted_date, salon_name, salon_phone, coalesce(salon_wa, '')
      );
      insert into public.sms_log (to_phone, template, payload, status, booking_id)
      values (new.customer_phone, 'booking_cancelled',
        jsonb_build_object('message', customer_msg, 'salon_name', salon_name, 'salon_phone', salon_phone, 'customer_name', new.customer_name, 'date', new.booking_date, 'time', new.start_time),
        'stubbed', new.id);
    end if;
  end if;
  return new;
end;
$$;