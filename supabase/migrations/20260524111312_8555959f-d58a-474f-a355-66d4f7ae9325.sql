
-- Reviews table
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons(id) on delete cascade,
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  customer_name text not null,
  rating int not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 1000),
  created_at timestamptz not null default now()
);

create index reviews_salon_id_idx on public.reviews(salon_id, created_at desc);

alter table public.reviews enable row level security;

create policy "Public views reviews of active salons"
  on public.reviews for select
  using (exists (select 1 from public.salons s where s.id = reviews.salon_id and s.status = 'active'));

create policy "Salon owner views own reviews"
  on public.reviews for select
  using (exists (select 1 from public.salons s where s.id = reviews.salon_id and s.user_id = auth.uid()));

create policy "Platform admin manages all reviews"
  on public.reviews for all
  using (has_role(auth.uid(), 'platform_admin'))
  with check (has_role(auth.uid(), 'platform_admin'));

-- Token columns on bookings
alter table public.bookings
  add column review_token uuid unique,
  add column review_reminder_sent_at timestamptz;

-- Trigger: when booking becomes completed, generate token + queue review_request SMS
create or replace function public.handle_booking_completed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  salon_name text;
  salon_slug text;
begin
  if (tg_op = 'UPDATE' and old.status <> 'completed' and new.status = 'completed') then
    if new.review_token is null then
      new.review_token := gen_random_uuid();
    end if;

    select s.name, s.slug into salon_name, salon_slug
    from public.salons s where s.id = new.salon_id;

    insert into public.sms_log (to_phone, template, payload, status, booking_id)
    values (
      new.customer_phone,
      'review_request',
      jsonb_build_object(
        'customer_name', new.customer_name,
        'salon_name', salon_name,
        'salon_slug', salon_slug,
        'review_token', new.review_token
      ),
      'stubbed',
      new.id
    );
  end if;
  return new;
end;
$$;

create trigger trg_handle_booking_completed
  before update on public.bookings
  for each row execute function public.handle_booking_completed();

-- Public review submission via security-definer RPC (token-gated, no auth)
create or replace function public.submit_review(
  _token uuid,
  _rating int,
  _comment text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  bk record;
begin
  if _rating is null or _rating < 1 or _rating > 5 then
    raise exception 'Rating must be between 1 and 5';
  end if;

  if _comment is not null and char_length(_comment) > 1000 then
    raise exception 'Comment too long';
  end if;

  select id, salon_id, customer_name, status, booking_date
    into bk
  from public.bookings
  where review_token = _token
  limit 1;

  if not found then
    raise exception 'Invalid review link';
  end if;

  if bk.status <> 'completed' then
    raise exception 'This booking is not yet eligible for a review';
  end if;

  if exists (select 1 from public.reviews where booking_id = bk.id) then
    raise exception 'A review has already been submitted for this booking';
  end if;

  insert into public.reviews (salon_id, booking_id, customer_name, rating, comment)
  values (bk.salon_id, bk.id, bk.customer_name, _rating, nullif(trim(_comment), ''));

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.submit_review(uuid, int, text) to anon, authenticated;

-- Public lookup of review context by token (no PII beyond the booking owner already knew)
create or replace function public.get_review_context(_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'booking_id', b.id,
    'customer_name', b.customer_name,
    'booking_date', b.booking_date,
    'salon_id', s.id,
    'salon_name', s.name,
    'salon_slug', s.slug,
    'status', b.status,
    'already_reviewed', exists(select 1 from public.reviews r where r.booking_id = b.id)
  ) into result
  from public.bookings b
  join public.salons s on s.id = b.salon_id
  where b.review_token = _token
  limit 1;

  if result is null then
    raise exception 'Invalid review link';
  end if;

  return result;
end;
$$;

grant execute on function public.get_review_context(uuid) to anon, authenticated;
