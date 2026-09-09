alter table public.salons drop column if exists calendar_token;

create table if not exists public.salon_calendar_tokens (
  salon_id uuid primary key references public.salons(id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now()
);

grant select on public.salon_calendar_tokens to authenticated;
grant all on public.salon_calendar_tokens to service_role;

alter table public.salon_calendar_tokens enable row level security;

create policy "Owners can view their salon calendar token"
on public.salon_calendar_tokens for select to authenticated
using (exists (select 1 from public.salons s where s.id = salon_id and s.user_id = auth.uid()));

create policy "Platform admins can view calendar tokens"
on public.salon_calendar_tokens for select to authenticated
using (public.has_role(auth.uid(), 'platform_admin'));

insert into public.salon_calendar_tokens (salon_id)
select id from public.salons
on conflict (salon_id) do nothing;

create or replace function public.create_salon_calendar_token()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.salon_calendar_tokens (salon_id) values (new.id)
  on conflict (salon_id) do nothing;
  return new;
end;
$$;

revoke all on function public.create_salon_calendar_token() from public, anon, authenticated;

drop trigger if exists salons_create_calendar_token on public.salons;
create trigger salons_create_calendar_token
after insert on public.salons
for each row execute function public.create_salon_calendar_token();