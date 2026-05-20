# Salonzee — Build Plan

A salon booking platform for Ghana with three roles: Customer (no login), Salon Admin (login), Platform Admin (login). SMS is **stubbed for v1** — wired into a service layer, so dropping in mNotify later is a single-file change.

## 1. Design

Generate 3 visual design directions tuned for a modern African beauty-tech brand (warm, premium, mobile-first). You'll pick one, then I'll build the full app on the chosen tokens.

## 2. Backend (Lovable Cloud)

### Tables

- **profiles** — `id (=auth.uid)`, `full_name`, `phone`, `created_at`. Auto-created via trigger on signup.
- **user_roles** — `id`, `user_id`, `role` enum (`platform_admin`, `salon_admin`). Separate table (security best practice).
- **salons** — full schema from PRD: `name, owner_name, phone, email, location_city, location_area, salon_type, description, profile_photo_url, status (pending|active|suspended), operating_hours (jsonb), slot_duration_minutes, user_id, created_at`.
- **services** — `id, salon_id, name, duration_minutes, price_ghs, active`.
- **bookings** — `id, salon_id, service_id, customer_name, customer_phone, booking_date, start_time, end_time, status (pending|confirmed|completed|no_show|cancelled), notes, created_at`.
- **sms_log** — `id, to_phone, template, payload (jsonb), status (queued|sent|failed|stubbed), sent_at`. Records every send attempt; in v1 every row will be `stubbed`.

### Enums

`salon_type`, `salon_status`, `booking_status`, `app_role`, `sms_status`.

### Security (RLS)

- `has_role(uid, role)` SECURITY DEFINER function (prevents recursion).
- `salons`: public can SELECT only where `status='active'`; salon_admin can update own; platform_admin full access.
- `services`: public SELECT for active salons; salon owner CRUD.
- `bookings`: public can INSERT; salon owner SELECT/UPDATE own; platform_admin all. Customer phone hidden from public reads.
- `user_roles`: only platform_admin can write; users can read own.
- `profiles`: user reads/writes own.

### Server functions (TanStack `createServerFn`)

- `getActiveSalons`, `getSalonBySlug` (public)
- `getAvailableSlots({ salonId, date })` — computes free slots from `operating_hours` + `slot_duration_minutes` minus existing non-cancelled bookings.
- `createBooking` (public, validated phone) → inserts booking, queues SMS log entry.
- `registerSalon` (public) → creates pending salon + invites/links user.
- `approveSalon`, `suspendSalon` (platform_admin)
- `confirmBooking`, `completeBooking`, `markNoShow`, `cancelBooking` (salon_admin)
- `salonDashboardStats`, `platformStats`
- `sendSms(to, template, vars)` — service-layer helper. v1: writes `stubbed` row to `sms_log` and console.logs. Swappable to mNotify by editing one function body + adding `MNOTIFY_API_KEY` secret.

### Scheduled job (pg_cron)

- Every 5 min: find confirmed bookings ~24h out with no reminder sent, call public `/api/public/cron/reminders` endpoint (HMAC-signed), which enqueues SMS via `sendSms`.

### Platform admin seeding

You give me your email. I add a one-time migration that inserts `platform_admin` role for that auth user once they sign up (idempotent trigger or seed function).

## 3. Frontend Routes

Public:

- `/` — landing: hero, search bar, featured salons, "Register your salon" CTA.
- `/salons` — browse/filter by city/area/type.
- `/salons/$salonId` — profile, services list, booking widget (date picker → slots → name/phone → confirm).
- `/register-salon` — multi-step form, submits as `pending`.
- `/login` — email/password (Salon + Platform admins).

Salon Admin (`/_authenticated/salon/...`):

- `dashboard` — today's bookings, pending count, quick stats.
- `bookings` — calendar + list, status actions.
- `services` — CRUD.
- `settings` — profile, hours, slot duration.

Platform Admin (`/_authenticated/admin/...`):

- `pending-salons` — review/approve/reject.
- `salons` — all salons, suspend.
- `overview` — platform stats.

## 4. Tech notes (technical section)

- TanStack Start file-based routes; `_authenticated` layout gates with `beforeLoad` redirect; role checks in server fns via `has_role`.
- Auth: Supabase email/password only (no OAuth). `attachSupabaseAuth` middleware wired in `src/start.ts`.
- Ghana phone validation: regex `^0[2-5][0-9]{8}$`, normalize to `+233...` before SMS.
- Slot generation runs server-side to avoid timezone drift; Africa/Accra is UTC+0 so this is simple.
- All booking writes go through server fns (never direct from client) so SMS logging and slot conflict checks stay atomic.

## 5. Out of scope for v1

Real SMS sending (stubbed), payments, customer accounts/reviews, multi-staff scheduling, photo galleries beyond profile photo.

## 6. Build order

1. Design directions → you pick
2. Enable Lovable Cloud, schema + RLS, seed admin
3. Auth (email/password) + role-gated layouts
4. Public landing + salon browse + profile + booking flow
5. Salon admin dashboard
6. Platform admin approval flow
7. pg_cron + reminder endpoint (stubbed SMS)
8. Polish + SEO meta on each route

Friction check: **none blocking**. Everything lives inside Lovable Cloud. Only real-SMS go-live later needs your mNotify key.