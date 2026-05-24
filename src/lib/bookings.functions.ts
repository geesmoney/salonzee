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
  priceGhsSnapshot: z.number().nonnegative(),
  // Anti-bot signals
  honeypot: z.string().max(0, "Bot detected"),
  elapsedMs: z.number().int().min(0),
});

const MIN_FORM_TIME_MS = 2500; // bots fill instantly
const MAX_PER_PHONE_24H = 5;
const MAX_PER_PHONE_PER_SALON_24H = 3;

export const submitBooking = createServerFn({ method: "POST" })
  .inputValidator((input) => bookingSchema.parse(input))
  .handler(async ({ data }) => {
    // 1) Honeypot
    if (data.honeypot && data.honeypot.length > 0) {
      throw new Error("Booking rejected.");
    }
    // 2) Form filled suspiciously fast → likely bot
    if (data.elapsedMs < MIN_FORM_TIME_MS) {
      throw new Error("Please take a moment to review your booking before confirming.");
    }

    const phone = data.customerPhone.replace(/\s+/g, "");
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // 3) Per-phone abuse caps (last 24h)
    const { data: recent, error: recentErr } = await supabaseAdmin
      .from("bookings")
      .select("id, salon_id")
      .eq("customer_phone", phone)
      .gte("created_at", since);
    if (recentErr) throw new Error("Could not verify booking. Please try again.");

    if ((recent?.length ?? 0) >= MAX_PER_PHONE_24H) {
      throw new Error("Too many bookings from this number recently. Try again later.");
    }
    const perSalon = (recent ?? []).filter((r) => r.salon_id === data.salonId).length;
    if (perSalon >= MAX_PER_PHONE_PER_SALON_24H) {
      throw new Error("You already have several bookings at this salon. Please contact them directly.");
    }

    // 4) Verify salon is active (RLS would normally do this, but we're admin)
    const { data: salon } = await supabaseAdmin
      .from("salons")
      .select("id, status")
      .eq("id", data.salonId)
      .maybeSingle();
    if (!salon || salon.status !== "active") {
      throw new Error("This salon isn't accepting bookings.");
    }

    // 5) Slot not already taken
    const { data: clash } = await supabaseAdmin
      .from("bookings")
      .select("id")
      .eq("salon_id", data.salonId)
      .eq("booking_date", data.bookingDate)
      .eq("start_time", data.startTime)
      .neq("status", "cancelled")
      .limit(1);
    if (clash && clash.length > 0) {
      throw new Error("That time slot was just taken. Please pick another.");
    }

    // 6) Insert
    const { error: insertErr } = await supabaseAdmin.from("bookings").insert({
      salon_id: data.salonId,
      service_id: data.serviceId,
      customer_name: data.customerName,
      customer_phone: phone,
      booking_date: data.bookingDate,
      start_time: data.startTime,
      end_time: data.endTime,
      price_ghs_snapshot: data.priceGhsSnapshot,
    });
    if (insertErr) throw new Error(insertErr.message);

    return { ok: true };
  });
