-- Enrich SMS payloads with rendered messages personalized per salon/customer,
-- and notify the salon owner when a new booking arrives.

create or replace function public.queue_booking_sms()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  salon_name text;
  salon_phone text;
  formatted_date text;
  formatted_time text;
  customer_msg text;
  owner_msg text;
begin
  select s.name, s.phone into salon_name, salon_phone
  from public.salons s where s.id = new.salon_id;

  formatted_date := to_char(new.booking_date, 'FMDay, FMMonth FMDDth');
  formatted_time := to_char(new.start_time, 'FMHH12:MIAM');

  if tg_op = 'INSERT' then
    -- Message to customer
    customer_msg := format(
      'Hey %s, we received your booking with %s for %s on %s. You''ll get a confirmation shortly. Questions? Call %s on %s.',
      new.customer_name, salon_name, formatted_time, formatted_date, salon_name, salon_phone
    );
    insert into public.sms_log (to_phone, template, payload, status, booking_id)
    values (
      new.customer_phone,
      'booking_received',
      jsonb_build_object(
        'message', customer_msg,
        'customer_name', new.customer_name,
        'salon_name', salon_name,
        'salon_phone', salon_phone,
        'date', new.booking_date,
        'time', new.start_time
      ),
      'stubbed',
      new.id
    );

    -- Message to salon owner
    owner_msg := format(
      'Hey %s, you have a booking from %s for %s on %s. Please check the app and confirm.',
      salon_name, new.customer_name, formatted_time, formatted_date
    );
    insert into public.sms_log (to_phone, template, payload, status, booking_id)
    values (
      salon_phone,
      'owner_booking_received',
      jsonb_build_object(
        'message', owner_msg,
        'salon_name', salon_name,
        'customer_name', new.customer_name,
        'customer_phone', new.customer_phone,
        'date', new.booking_date,
        'time', new.start_time
      ),
      'stubbed',
      new.id
    );

  elsif tg_op = 'UPDATE' and old.status <> new.status then
    if new.status = 'confirmed' then
      customer_msg := format(
        'Hey %s, your booking with %s is confirmed for %s on %s. Please make sure to attend — repeated no-shows may get you blocked or incur penalties. Call %s on %s if anything changes.',
        new.customer_name, salon_name, formatted_time, formatted_date, salon_name, salon_phone
      );
      insert into public.sms_log (to_phone, template, payload, status, booking_id)
      values (
        new.customer_phone,
        'booking_confirmed',
        jsonb_build_object(
          'message', customer_msg,
          'salon_name', salon_name,
          'salon_phone', salon_phone,
          'customer_name', new.customer_name,
          'date', new.booking_date,
          'time', new.start_time
        ),
        'stubbed',
        new.id
      );
    elsif new.status = 'cancelled' then
      customer_msg := format(
        'Hey %s, your booking with %s for %s on %s has been cancelled. For questions, call %s on %s.',
        new.customer_name, salon_name, formatted_time, formatted_date, salon_name, salon_phone
      );
      insert into public.sms_log (to_phone, template, payload, status, booking_id)
      values (
        new.customer_phone,
        'booking_cancelled',
        jsonb_build_object(
          'message', customer_msg,
          'salon_name', salon_name,
          'salon_phone', salon_phone,
          'customer_name', new.customer_name,
          'date', new.booking_date,
          'time', new.start_time
        ),
        'stubbed',
        new.id
      );
    end if;
  end if;
  return new;
end;
$function$;

-- Also enrich the review-request SMS with a fully rendered message.
create or replace function public.handle_booking_completed()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  salon_name text;
  salon_slug text;
  salon_phone text;
  review_msg text;
begin
  if (tg_op = 'UPDATE' and old.status <> 'completed' and new.status = 'completed') then
    if new.review_token is null then
      new.review_token := gen_random_uuid();
    end if;

    select s.name, s.slug, s.phone into salon_name, salon_slug, salon_phone
    from public.salons s where s.id = new.salon_id;

    review_msg := format(
      'Hey %s, thanks for visiting %s! Please take a moment to leave a review: https://salonzee.com/review/%s',
      new.customer_name, salon_name, new.review_token
    );

    insert into public.sms_log (to_phone, template, payload, status, booking_id)
    values (
      new.customer_phone,
      'review_request',
      jsonb_build_object(
        'message', review_msg,
        'customer_name', new.customer_name,
        'salon_name', salon_name,
        'salon_slug', salon_slug,
        'salon_phone', salon_phone,
        'review_token', new.review_token
      ),
      'stubbed',
      new.id
    );
  end if;
  return new;
end;
$function$;