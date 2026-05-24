
revoke execute on function public.submit_review(uuid, int, text) from anon, authenticated, public;
revoke execute on function public.get_review_context(uuid) from anon, authenticated, public;
