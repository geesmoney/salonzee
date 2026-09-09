CREATE UNIQUE INDEX IF NOT EXISTS bookings_no_double_booking
ON public.bookings (salon_id, booking_date, start_time)
WHERE status <> 'cancelled';