create table public.retention_settings (
  id boolean primary key default true check (id),
  customer_reminders_enabled boolean not null default true,
  owner_nudges_enabled boolean not null default true,
  daily_sms_cap integer not null default 60 check (daily_sms_cap between 0 and 1000),
  updated_at timestamptz not null default now()
);
insert into public.retention_settings (id) values (true);
grant select, update on public.retention_settings to authenticated;
grant all on public.retention_settings to service_role;
alter table public.retention_settings enable row level security;
create policy "Platform admins read retention settings" on public.retention_settings for select to authenticated using (public.has_role(auth.uid(), 'platform_admin'));
create policy "Platform admins update retention settings" on public.retention_settings for update to authenticated using (public.has_role(auth.uid(), 'platform_admin')) with check (public.has_role(auth.uid(), 'platform_admin'));

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  customer_phone text,
  owner_user_id uuid,
  created_at timestamptz not null default now(),
  last_success_at timestamptz
);
create index push_subscriptions_phone_idx on public.push_subscriptions (customer_phone);
create index push_subscriptions_owner_idx on public.push_subscriptions (owner_user_id);
grant all on public.push_subscriptions to service_role;
alter table public.push_subscriptions enable row level security;
-- No client policies: subscriptions are written only by verified server code.

create index if not exists sms_log_template_phone_idx on public.sms_log (template, to_phone, sent_at);

create or replace function internal.rebook_message(_name text, _service text, _category text, _salon text, _slug text)
returns text language sql immutable set search_path = public as $$
  select format(
    case
      when lower(coalesce(_service,'')) ~ '(cut|fade|shave|beard|trim|barb)' or _category = 'barbering'
        then 'Hi %s, it''s been a couple of weeks since your %s. Time for a fresh, clean cut? Book %s here: https://salonzee.com/%s'
      when lower(coalesce(_service,'')) ~ '(braid|loc|twist|cornrow|weave|wig)' or _category = 'braiding_locs'
        then 'Hi %s, how is your %s holding up? When you''re ready for a touch-up or a new style, book %s here: https://salonzee.com/%s'
      when lower(coalesce(_service,'')) ~ '(nail|gel|acrylic|manicure|pedicure)' or _category = 'nail_tech'
        then 'Hi %s, those nails from your %s must be due for some love. Book your infill or fresh set at %s: https://salonzee.com/%s'
      when lower(coalesce(_service,'')) ~ '(lash|brow)' or _category = 'lashes_brows'
        then 'Hi %s, time to refresh your %s? Grab a slot at %s before the weekend: https://salonzee.com/%s'
      when lower(coalesce(_service,'')) ~ '(makeup|glam|face)' or _category = 'makeup'
        then 'Hi %s, got an event coming up? Get glammed again like your last %s. Book %s: https://salonzee.com/%s'
      when lower(coalesce(_service,'')) ~ '(massage|facial|spa|wax)' or _category = 'spa'
        then 'Hi %s, you deserve another %s. Treat yourself again at %s: https://salonzee.com/%s'
      else 'Hi %s, ready for a fresh look? Your last %s was a while ago. Book %s again: https://salonzee.com/%s'
    end,
    split_part(trim(_name), ' ', 1), coalesce(nullif(_service,''), 'appointment'), _salon, coalesce(_slug, '')
  );
$$;

create or replace function internal.queue_rebook_reminders()
returns integer language plpgsql security definer set search_path = public as $$
declare cfg public.retention_settings; used int; n int;
begin
  select * into cfg from public.retention_settings where id;
  if not cfg.customer_reminders_enabled then return 0; end if;
  select count(*) into used from public.sms_log
    where template in ('rebook_reminder','profile_nudge') and sent_at >= date_trunc('day', now());
  if used >= cfg.daily_sms_cap then return 0; end if;

  with last_visit as (
    select distinct on (b.customer_phone)
      b.customer_phone, b.customer_name, b.booking_date, sv.name as service_name,
      s.id as salon_id, s.name as salon_name, s.slug, s.business_category::text as category
    from public.bookings b
    join public.salons s on s.id = b.salon_id and s.status = 'active'
    left join public.services sv on sv.id = b.service_id
    where b.status in ('completed','confirmed') and b.booking_date < current_date
    order by b.customer_phone, b.booking_date desc, b.start_time desc
  ), eligible as (
    select lv.* from last_visit lv
    where lv.booking_date <= current_date - 14
      and lv.booking_date >= current_date - 120
      and not exists (select 1 from public.bookings u where u.customer_phone = lv.customer_phone
                      and u.status in ('pending','confirmed') and u.booking_date >= current_date)
      and not exists (select 1 from public.sms_log l where l.template = 'rebook_reminder'
                      and l.to_phone = lv.customer_phone and l.sent_at > now() - interval '14 days')
    order by lv.booking_date
    limit greatest(cfg.daily_sms_cap - used, 0)
  )
  insert into public.sms_log (to_phone, template, payload, status)
  select customer_phone, 'rebook_reminder',
    jsonb_build_object('message', internal.rebook_message(customer_name, service_name, category, salon_name, slug),
      'push_title', 'Time for a fresh look?', 'push_url', '/' || coalesce(slug, ''),
      'push_target', 'customer', 'salon_id', salon_id, 'service', service_name),
    'stubbed'
  from eligible;
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function internal.queue_profile_nudges()
returns integer language plpgsql security definer set search_path = public as $$
declare cfg public.retention_settings; used int; n int;
begin
  select * into cfg from public.retention_settings where id;
  if not cfg.owner_nudges_enabled then return 0; end if;
  select count(*) into used from public.sms_log
    where template in ('rebook_reminder','profile_nudge') and sent_at >= date_trunc('day', now());
  if used >= cfg.daily_sms_cap then return 0; end if;

  with gaps as (
    select s.id, s.name, s.phone, s.user_id,
      array_remove(array[
        case when not exists (select 1 from public.salon_images i where i.salon_id = s.id) then 'photos of your work' end,
        case when not exists (select 1 from public.services v where v.salon_id = s.id and v.active) then 'your services and prices' end,
        case when coalesce(trim(s.description), '') = '' then 'a short description' end,
        case when coalesce(trim(s.whatsapp_phone), '') = '' then 'your WhatsApp number' end
      ], null) as missing
    from public.salons s
    where s.status in ('pending','active') and s.created_at <= now() - interval '2 days'
  ), eligible as (
    select g.* from gaps g
    where cardinality(g.missing) > 0
      and (select count(*) from public.sms_log l where l.template = 'profile_nudge' and l.payload->>'salon_id' = g.id::text) < 3
      and not exists (select 1 from public.sms_log l where l.template = 'profile_nudge'
                      and l.payload->>'salon_id' = g.id::text and l.sent_at > now() - interval '7 days')
    limit greatest(cfg.daily_sms_cap - used, 0)
  )
  insert into public.sms_log (to_phone, template, payload, status)
  select phone, 'profile_nudge',
    jsonb_build_object('message', format('Hi %s, customers are finding Salonzee every day. Your business page is still missing %s. Add them so clients can trust and book you: https://salonzee.com/salon/dashboard',
        name, array_to_string(missing, ', ')),
      'push_title', 'Complete your business page', 'push_url', '/salon/dashboard',
      'push_target', 'owner', 'owner_user_id', user_id, 'salon_id', id, 'missing', to_jsonb(missing)),
    'stubbed'
  from eligible;
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function internal.queue_rebook_reminders() from public, anon, authenticated;
revoke all on function internal.queue_profile_nudges() from public, anon, authenticated;
revoke all on function internal.rebook_message(text,text,text,text,text) from public, anon, authenticated;

do $$ begin perform cron.unschedule('salonzee-weekly-rebook'); exception when others then null; end $$;
do $$ begin perform cron.unschedule('salonzee-profile-nudges'); exception when others then null; end $$;
-- Saturdays 08:00 Accra for customers; Tuesdays 09:00 for owners.
select cron.schedule('salonzee-weekly-rebook', '0 8 * * 6', $$ select internal.queue_rebook_reminders(); $$);
select cron.schedule('salonzee-profile-nudges', '0 9 * * 2', $$ select internal.queue_profile_nudges(); $$);