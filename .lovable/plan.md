## Fix build + finish Salonzee v1

### 1. Fix TS build error
File: `src/routes/_authenticated/salon.dashboard.tsx`
- The `updateStatus` mutation passes `status: string` but the `bookings.status` column is the `booking_status` enum. Narrow the param type to the enum union (`"pending" | "confirmed" | "completed" | "cancelled" | "no_show"`) and type the update payload accordingly so Supabase types accept it.
- Sweep the file for any other implicit `any` / enum-cast issues exposed by strict TS.

### 2. Salon settings page
New route: `src/routes/_authenticated/salon.settings.tsx`
- Form to edit: salon `name`, `description`, `location`, `phone`, `opening_hours` (per-day open/close), `slot_duration_minutes`, `cover_image_url`.
- Uses `supabase.from("salons").update(...)` scoped to the owner via RLS.
- Add a link to it from the dashboard header.

### 3. 24h reminder pg_cron job
New migration:
- Enable `pg_cron` + `pg_net` extensions (if not already).
- Create SQL function `public.queue_24h_reminders()` that scans `bookings` where `booking_date + start_time` falls in the next 24–25h window, status in (`pending`,`confirmed`), and inserts a `reminder_24h` row into `sms_log` (idempotent via unique `(booking_id, template)` partial index).
- Schedule it hourly via `cron.schedule('salonzee-24h-reminders', '0 * * * *', $$select public.queue_24h_reminders()$$)`.

### 4. Verify
- Confirm `build:dev` passes.
- Smoke-test dashboard renders and status update mutation typechecks.

No design changes; backend + one new settings page only.