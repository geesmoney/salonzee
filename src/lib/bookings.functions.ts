import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const bookingSchema = z.object({
  salonId: z.string().uuid(),
  serviceId: z.string().uuid(),
  customerName: z.string().trim().min(1).max(120),
  customerPhone: z
    .string()
    .trim()
    .min(7)
    .max(20)
    .regex(/^[0-9+\-\s()]+$/, "Invalid phone"),
  bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  endTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  // Anti-bot signals
  honeypot: z.string().max(0, "Bot detected"),
  elapsedMs: z.number().int().min(0),
});

const MIN_FORM_TIME_MS = 2500;
const MAX_PER_PHONE_24H = 5;
const MAX_PER_PHONE_PER_SALON_24H = 3;

const GENERIC_ERR = "Could not complete your booking. Please try again.";

export const submitBooking = createServerFn({ method: "POST" })
  .inputValidator((input) => bookingSchema.parse(input))
  .handler(async ({ data }) => {
    if (data.honeypot && data.honeypot.length > 0) {
      throw new Error("Booking rejected.");
    }
    if (data.elapsedMs < MIN_FORM_TIME_MS) {
      throw new Error("Please take a moment to review your booking before confirming.");
    }

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const maxDate = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
    const bookingDay = new Date(data.bookingDate + "T00:00:00");
    if (isNaN(bookingDay.getTime()) || bookingDay < today || bookingDay > maxDate) {
      throw new Error("Pick a date within the next 90 days.");
    }

    const phone = data.customerPhone.replace(/\s+/g, "");
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: recent, error: recentErr } = await supabaseAdmin
      .from("bookings")
      .select("id, salon_id")
      .eq("customer_phone", phone)
      .gte("created_at", since);
    if (recentErr) {
      console.error("[submitBooking] recent lookup failed", recentErr);
      throw new Error(GENERIC_ERR);
    }

    if ((recent?.length ?? 0) >= MAX_PER_PHONE_24H) {
      throw new Error("Too many bookings from this number recently. Try again later.");
    }
    const perSalon = (recent ?? []).filter((r) => r.salon_id === data.salonId).length;
    if (perSalon >= MAX_PER_PHONE_PER_SALON_24H) {
      throw new Error("You already have several bookings at this salon. Please contact them directly.");
    }

    const { data: salon, error: salonErr } = await supabaseAdmin
      .from("salons")
      .select("id, status")
      .eq("id", data.salonId)
      .maybeSingle();
    if (salonErr) {
      console.error("[submitBooking] salon lookup failed", salonErr);
      throw new Error(GENERIC_ERR);
    }
    if (!salon || salon.status !== "active") {
      throw new Error("This salon isn't accepting bookings.");
    }

    // Server-side authoritative service lookup — never trust client price
    const { data: svc, error: svcErr } = await supabaseAdmin
      .from("services")
      .select("id, salon_id, active, price_ghs, duration_minutes")
      .eq("id", data.serviceId)
      .maybeSingle();
    if (svcErr) {
      console.error("[submitBooking] service lookup failed", svcErr);
      throw new Error(GENERIC_ERR);
    }
    if (!svc || !svc.active || svc.salon_id !== data.salonId) {
      throw new Error("Selected service is no longer available.");
    }

    const { data: clash, error: clashErr } = await supabaseAdmin
      .from("bookings")
      .select("id")
      .eq("salon_id", data.salonId)
      .eq("booking_date", data.bookingDate)
      .eq("start_time", data.startTime)
      .neq("status", "cancelled")
      .limit(1);
    if (clashErr) {
      console.error("[submitBooking] clash lookup failed", clashErr);
      throw new Error(GENERIC_ERR);
    }
    if (clash && clash.length > 0) {
      throw new Error("That time slot was just taken. Please pick another.");
    }

    const { error: insertErr } = await supabaseAdmin.from("bookings").insert({
      salon_id: data.salonId,
      service_id: data.serviceId,
      customer_name: data.customerName,
      customer_phone: phone,
      booking_date: data.bookingDate,
      start_time: data.startTime,
      end_time: data.endTime,
      price_ghs_snapshot: Number(svc.price_ghs),
    });
    if (insertErr) {
      console.error("[submitBooking] insert failed", insertErr);
      throw new Error(GENERIC_ERR);
    }

    return { ok: true };
  });
