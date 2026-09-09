create or replace function public.handle_salon_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  msg text;
  tmpl text;
begin
  if tg_op = 'UPDATE' and old.status is distinct from new.status then
    if new.status = 'active' and old.status = 'pending' then
      tmpl := 'salon_approved';
      msg := format(
        'Hi %s, great news! Your listing on Salonzee is now live. Customers can find and book you at https://salonzee.com/%s. Log in to manage your bookings.',
        new.name, new.slug
      );
    elsif new.status = 'active' and old.status = 'suspended' then
      tmpl := 'salon_reactivated';
      msg := format(
        'Hi %s, your Salonzee listing has been reactivated and is live again at https://salonzee.com/%s.',
        new.name, new.slug
      );
    elsif new.status = 'suspended' then
      tmpl := 'salon_suspended';
      msg := format(
        'Hi %s, your Salonzee listing has been suspended and is no longer visible to customers. Please contact support from your dashboard for details.',
        new.name
      );
    else
      return new;
    end if;

    insert into public.sms_log (to_phone, template, payload, status)
    values (
      new.phone,
      tmpl,
      jsonb_build_object('message', msg, 'salon_name', new.name, 'salon_slug', new.slug, 'status', new.status),
      'stubbed'
    );
  end if;
  return new;
end;
$$;

revoke all on function public.handle_salon_status_change() from public, anon, authenticated;

drop trigger if exists salons_status_sms on public.salons;
create trigger salons_status_sms
after update on public.salons
for each row execute function public.handle_salon_status_change();