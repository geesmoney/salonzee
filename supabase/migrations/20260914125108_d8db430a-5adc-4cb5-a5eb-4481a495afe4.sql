create or replace function public.handle_new_salon_admin_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  msg text;
begin
  if tg_op = 'INSERT' and new.status = 'pending' then
    msg := format(
      'New salon registration awaiting approval: %s in %s, %s. Review at https://salonzee.com/admin/pending',
      new.name,
      coalesce(new.location_area, '-'),
      coalesce(new.location_city, '-')
    );

    insert into public.sms_log (to_phone, template, payload, status)
    values (
      '0248341613',
      'admin_new_salon_pending',
      jsonb_build_object('message', msg, 'salon_id', new.id, 'salon_name', new.name, 'salon_slug', new.slug),
      'stubbed'
    );
  end if;
  return new;
end;
$$;

revoke all on function public.handle_new_salon_admin_notify() from public, anon, authenticated;

drop trigger if exists salons_new_admin_notify on public.salons;
create trigger salons_new_admin_notify
after insert on public.salons
for each row execute function public.handle_new_salon_admin_notify();