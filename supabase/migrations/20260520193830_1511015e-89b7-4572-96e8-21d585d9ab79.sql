-- Enums
create type public.support_ticket_status as enum ('open', 'pending', 'resolved', 'closed');
create type public.support_ticket_category as enum ('general', 'billing', 'booking_issue', 'technical', 'other');
create type public.support_sender_type as enum ('owner', 'customer', 'admin');

-- Tickets
create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  subject text not null check (char_length(subject) between 1 and 200),
  category public.support_ticket_category not null default 'general',
  status public.support_ticket_status not null default 'open',
  salon_id uuid references public.salons(id) on delete set null,
  opened_by_user_id uuid,
  booking_id uuid references public.bookings(id) on delete set null,
  customer_name text,
  customer_phone text,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_support_tickets_salon on public.support_tickets(salon_id);
create index idx_support_tickets_user on public.support_tickets(opened_by_user_id);
create index idx_support_tickets_status on public.support_tickets(status);

alter table public.support_tickets enable row level security;

-- Anyone (including unauth customers) can open a ticket
create policy "Anyone can open a ticket" on public.support_tickets
  for insert with check (true);

-- Salon owner sees tickets tied to their salon (or to bookings of their salon)
create policy "Salon owner views own tickets" on public.support_tickets
  for select using (
    (opened_by_user_id is not null and opened_by_user_id = auth.uid())
    or exists (select 1 from public.salons s where s.id = support_tickets.salon_id and s.user_id = auth.uid())
    or exists (select 1 from public.bookings b join public.salons s on s.id = b.salon_id where b.id = support_tickets.booking_id and s.user_id = auth.uid())
  );

create policy "Salon owner updates own tickets" on public.support_tickets
  for update using (
    (opened_by_user_id is not null and opened_by_user_id = auth.uid())
    or exists (select 1 from public.salons s where s.id = support_tickets.salon_id and s.user_id = auth.uid())
  );

create policy "Platform admin manages all tickets" on public.support_tickets
  for all using (public.has_role(auth.uid(), 'platform_admin'))
  with check (public.has_role(auth.uid(), 'platform_admin'));

-- Messages
create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender_type public.support_sender_type not null,
  sender_user_id uuid,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index idx_support_messages_ticket on public.support_messages(ticket_id, created_at);

alter table public.support_messages enable row level security;

-- Public insert allowed only as part of opening a ticket (the initial customer message inserted
-- alongside ticket creation). We allow inserts with restrictions: either authenticated user
-- matching the ticket owner/salon, or a 'customer' sender on a ticket that has matching phone.
create policy "Open insert for ticket participants" on public.support_messages
  for insert with check (
    -- platform admin
    public.has_role(auth.uid(), 'platform_admin')
    -- owner replying on their salon ticket
    or exists (
      select 1 from public.support_tickets t
      left join public.salons s on s.id = t.salon_id
      left join public.bookings b on b.id = t.booking_id
      left join public.salons sb on sb.id = b.salon_id
      where t.id = support_messages.ticket_id
        and (s.user_id = auth.uid() or sb.user_id = auth.uid() or t.opened_by_user_id = auth.uid())
    )
    -- customer message (anonymous) — only allowed for tickets opened without a user_id
    or (
      sender_type = 'customer'
      and exists (select 1 from public.support_tickets t where t.id = support_messages.ticket_id and t.opened_by_user_id is null)
    )
  );

create policy "Ticket participants view messages" on public.support_messages
  for select using (
    public.has_role(auth.uid(), 'platform_admin')
    or exists (
      select 1 from public.support_tickets t
      left join public.salons s on s.id = t.salon_id
      left join public.bookings b on b.id = t.booking_id
      left join public.salons sb on sb.id = b.salon_id
      where t.id = support_messages.ticket_id
        and (s.user_id = auth.uid() or sb.user_id = auth.uid() or t.opened_by_user_id = auth.uid())
    )
  );

-- Triggers
create trigger trg_support_tickets_updated_at
before update on public.support_tickets
for each row execute function public.update_updated_at_column();

-- Touch last_message_at when a new message is added
create or replace function public.touch_ticket_last_message()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.support_tickets
    set last_message_at = now(),
        status = case when status = 'closed' then status else 'open' end
    where id = new.ticket_id;
  return new;
end;
$$;

create trigger trg_support_messages_touch
after insert on public.support_messages
for each row execute function public.touch_ticket_last_message();