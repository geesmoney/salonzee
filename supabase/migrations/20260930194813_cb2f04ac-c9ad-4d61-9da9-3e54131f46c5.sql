-- Auto-maintain salon cover photo from gallery
create or replace function public.sync_salon_cover_photo()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  next_url text;
begin
  if tg_op = 'INSERT' then
    update public.salons
      set profile_photo_url = new.image_url
      where id = new.salon_id
        and (profile_photo_url is null or trim(profile_photo_url) = '');
    return new;
  elsif tg_op = 'DELETE' then
    select image_url into next_url
    from public.salon_images
    where salon_id = old.salon_id and id <> old.id
    order by position asc, created_at asc
    limit 1;

    update public.salons
      set profile_photo_url = next_url
      where id = old.salon_id
        and profile_photo_url = old.image_url;
    return old;
  end if;
  return null;
end;
$$;

revoke all on function public.sync_salon_cover_photo() from public, anon, authenticated;

drop trigger if exists salon_images_sync_cover_ins on public.salon_images;
create trigger salon_images_sync_cover_ins
after insert on public.salon_images
for each row execute function public.sync_salon_cover_photo();

drop trigger if exists salon_images_sync_cover_del on public.salon_images;
create trigger salon_images_sync_cover_del
after delete on public.salon_images
for each row execute function public.sync_salon_cover_photo();