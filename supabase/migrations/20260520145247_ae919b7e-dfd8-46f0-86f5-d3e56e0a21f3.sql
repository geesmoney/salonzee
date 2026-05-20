
-- =========================
-- ENUMS
-- =========================
create type public.salon_type as enum ('male', 'female', 'unisex');
create type public.salon_status as enum ('pending', 'active', 'suspended');
create type public.booking_status as enum ('pending', 'confirmed', 'completed', 'no_show', 'cancelled');
create type public.app_role as enum ('platform_admin', 'salon_admin');
create type public.sms_status as enum ('queued', 'sent', 'failed', 'stubbed');

-- =========================
-- UTIL: updated_at trigger
-- =========================
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================
-- PROFILES
-- =========================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "Users view own profile"
  on public.profiles for select
  using (auth.uid() = id);
create policy "Users update own profile"
  on public.profiles for update
  using (auth.uid() = id);
create policy "Users insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at_column();

-- =========================
-- USER ROLES
-- =========================
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

create policy "Users view own roles"
  on public.user_roles for select
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'platform_admin'));
create policy "Platform admin manages roles"
  on public.user_roles for all
  using (public.has_role(auth.uid(), 'platform_admin'))
  with check (public.has_role(auth.uid(), 'platform_admin'));

-- =========================
-- NEW USER TRIGGER: profile + first-admin
-- =========================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_count int;
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;

  -- First user ever to sign up becomes platform admin
  select count(*) into user_count from auth.users;
  if user_count = 1 then
    insert into public.user_roles (user_id, role)
    values (new.id, 'platform_admin')
    on conflict do nothing;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================
-- SALONS
-- =========================
create table public.salons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  slug text unique,
  owner_name text not null,
  phone text not null,
  email text not null,
  location_city text not null,
  location_area text not null,
  salon_type public.salon_type not null default 'unisex',
  description text,
  profile_photo_url text,
  status public.salon_status not null default 'pending',
  operating_hours jsonb not null default '{
    "monday":{"open":"09:00","close":"18:00","closed":false},
    "tuesday":{"open":"09:00","close":"18:00","closed":false},
    "wednesday":{"open":"09:00","close":"18:00","closed":false},
    "thursday":{"open":"09:00","close":"18:00","closed":false},
    "friday":{"open":"09:00","close":"18:00","closed":false},
    "saturday":{"open":"09:00","close":"18:00","closed":false},
    "sunday":{"open":"10:00","close":"16:00","closed":true}
  }'::jsonb,
  slot_duration_minutes int not null default 30,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.salons enable row level security;
create index salons_status_idx on public.salons(status);
create index salons_user_id_idx on public.salons(user_id);

create policy "Public can view active salons"
  on public.salons for select
  using (status = 'active');
create policy "Owner can view own salon"
  on public.salons for select
  using (auth.uid() = user_id);
create policy "Platform admin views all salons"
  on public.salons for select
  using (public.has_role(auth.uid(), 'platform_admin'));
create policy "Anyone can register a salon"
  on public.salons for insert
  with check (true);
create policy "Owner updates own salon"
  on public.salons for update
  using (auth.uid() = user_id);
create policy "Platform admin manages all salons"
  on public.salons for all
  using (public.has_role(auth.uid(), 'platform_admin'))
  with check (public.has_role(auth.uid(), 'platform_admin'));

create trigger salons_updated_at
  before update on public.salons
  for each row execute function public.update_updated_at_column();

-- =========================
-- SERVICES
-- =========================
create table public.services (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons(id) on delete cascade,
  name text not null,
  duration_minutes int not null default 30,
  price_ghs numeric(10,2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.services enable row level security;
create index services_salon_id_idx on public.services(salon_id);

create policy "Public views active services of active salons"
  on public.services for select
  using (
    active = true
    and exists (
      select 1 from public.salons s
      where s.id = services.salon_id and s.status = 'active'
    )
  );
create policy "Owner manages own services"
  on public.services for all
  using (
    exists (
      select 1 from public.salons s
      where s.id = services.salon_id and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.salons s
      where s.id = services.salon_id and s.user_id = auth.uid()
    )
  );
create policy "Platform admin manages all services"
  on public.services for all
  using (public.has_role(auth.uid(), 'platform_admin'))
  with check (public.has_role(auth.uid(), 'platform_admin'));

create trigger services_updated_at
  before update on public.services
  for each row execute function public.update_updated_at_column();

-- =========================
-- BOOKINGS
-- =========================
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  booking_date date not null,
  start_time time not null,
  end_time time not null,
  status public.booking_status not null default 'pending',
  notes text,
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.bookings enable row level security;
create index bookings_salon_date_idx on public.bookings(salon_id, booking_date);
create index bookings_status_idx on public.bookings(status);

create policy "Anyone can create a booking"
  on public.bookings for insert
  with check (true);
create policy "Salon owner views own bookings"
  on public.bookings for select
  using (
    exists (
      select 1 from public.salons s
      where s.id = bookings.salon_id and s.user_id = auth.uid()
    )
  );
create policy "Salon owner updates own bookings"
  on public.bookings for update
  using (
    exists (
      select 1 from public.salons s
      where s.id = bookings.salon_id and s.user_id = auth.uid()
    )
  );
create policy "Platform admin manages all bookings"
  on public.bookings for all
  using (public.has_role(auth.uid(), 'platform_admin'))
  with check (public.has_role(auth.uid(), 'platform_admin'));

create trigger bookings_updated_at
  before update on public.bookings
  for each row execute function public.update_updated_at_column();

-- =========================
-- SMS LOG
-- =========================
create table public.sms_log (
  id uuid primary key default gen_random_uuid(),
  to_phone text not null,
  template text not null,
  payload jsonb not null default '{}'::jsonb,
  status public.sms_status not null default 'stubbed',
  booking_id uuid references public.bookings(id) on delete set null,
  error_message text,
  sent_at timestamptz not null default now()
);
alter table public.sms_log enable row level security;
create index sms_log_booking_idx on public.sms_log(booking_id);

create policy "Platform admin views sms log"
  on public.sms_log for select
  using (public.has_role(auth.uid(), 'platform_admin'));
create policy "Salon owner views own sms log"
  on public.sms_log for select
  using (
    exists (
      select 1 from public.bookings b
      join public.salons s on s.id = b.salon_id
      where b.id = sms_log.booking_id and s.user_id = auth.uid()
    )
  );
