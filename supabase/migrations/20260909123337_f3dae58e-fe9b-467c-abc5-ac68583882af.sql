alter table public.salons
  add column if not exists calendar_token uuid not null default gen_random_uuid();

create unique index if not exists salons_calendar_token_key on public.salons(calendar_token);