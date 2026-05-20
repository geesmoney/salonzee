## Plan: Enable auto-confirm email signups

Enable Supabase auto-confirm so you can sign up with `ggabla323@gmail.com` and log in immediately without checking email.

### Steps
1. Call `configure_auth` with `auto_confirm_email: true` (keeping other settings unchanged).
2. You then go to `/login`, switch to **Sign up**, and register `ggabla323@gmail.com` with your password.
3. The `handle_new_user` trigger auto-grants `platform_admin` since you're the first user.
4. You'll be signed in right away.

### Note
Auto-confirm skips email verification entirely. Fine for development; consider disabling before going live.