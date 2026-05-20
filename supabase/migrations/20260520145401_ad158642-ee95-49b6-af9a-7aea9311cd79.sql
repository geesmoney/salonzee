
-- Prevent double-booking at same salon/date/time (cancelled bookings don't count)
create unique index bookings_no_overlap_idx
  on public.bookings (salon_id, booking_date, start_time)
  where status <> 'cancelled';

-- SMS auto-log trigger: queue a stub SMS on new booking and on confirmation
create or replace function public.queue_booking_sms()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  salon_name text;
begin
  select s.name into salon_name from public.salons s where s.id = new.salon_id;

  if tg_op = 'INSERT' then
    insert into public.sms_log (to_phone, template, payload, status, booking_id)
    values (
      new.customer_phone,
      'booking_received',
      jsonb_build_object(
        'customer_name', new.customer_name,
        'salon_name', salon_name,
        'date', new.booking_date,
        'time', new.start_time
      ),
      'stubbed',
      new.id
    );
  elsif tg_op = 'UPDATE' and old.status <> new.status then
    if new.status = 'confirmed' then
      insert into public.sms_log (to_phone, template, payload, status, booking_id)
      values (
        new.customer_phone,
        'booking_confirmed',
        jsonb_build_object('salon_name', salon_name, 'date', new.booking_date, 'time', new.start_time),
        'stubbed',
        new.id
      );
    elsif new.status = 'cancelled' then
      insert into public.sms_log (to_phone, template, payload, status, booking_id)
      values (
        new.customer_phone,
        'booking_cancelled',
        jsonb_build_object('salon_name', salon_name, 'date', new.booking_date, 'time', new.start_time),
        'stubbed',
        new.id
      );
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function public.queue_booking_sms() from public, anon, authenticated;

create trigger bookings_sms_insert
  after insert on public.bookings
  for each row execute function public.queue_booking_sms();

create trigger bookings_sms_status
  after update on public.bookings
  for each row execute function public.queue_booking_sms();

-- Slug auto-generation for salons
create or replace function public.set_salon_slug()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  base_slug text;
  candidate text;
  counter int := 0;
begin
  if new.slug is not null and new.slug <> '' then
    return new;
  end if;
  base_slug := regexp_replace(lower(new.name), '[^a-z0-9]+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  candidate := base_slug;
  while exists (select 1 from public.salons where slug = candidate and id <> new.id) loop
    counter := counter + 1;
    candidate := base_slug || '-' || counter;
  end loop;
  new.slug := candidate;
  return new;
end;
$$;

create trigger salons_set_slug
  before insert on public.salons
  for each row execute function public.set_salon_slug();
