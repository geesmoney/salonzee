import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { periodStart, summarizeBookings, type ReportRow } from "./booking-reports";

const input = z.object({ period: z.enum(["today", "week", "month", "all"]), basis: z.enum(["appointment", "created"]), grouping: z.enum(["daily", "weekly", "monthly"]) });
export const getPlatformBookingReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(input)
  .handler(async ({ data, context }) => {
    setResponseHeader("Cache-Control", "private, no-store");
    const { data: admin, error: roleError } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "platform_admin" });
    if (roleError || !admin) throw new Error("Only platform admins can view booking reports.");
    const now = new Date();
    const start = periodStart(data.period, now);
    const today = now.toISOString().slice(0, 10);
    const column = data.basis === "appointment" ? "booking_date" : "created_at";
    const rows: ReportRow[] = [];
    for (let offset = 0; ; offset += 1000) {
      let query = context.supabase.from("bookings").select("salon_id, booking_date, created_at, status, salons(name)").order("id").range(offset, offset + 999);
      if (start) {
        query = query.gte(column, data.basis === "appointment" ? start : `${start}T00:00:00Z`);
        if (data.basis === "appointment") query = query.lte(column, today);
        else query = query.lte(column, now.toISOString());
      }
      const { data: page, error } = await query;
      if (error || !page) throw new Error("Booking reports could not be loaded. Please try again.");
      rows.push(...page);
      if (page.length < 1000) break;
    }
    return { ...summarizeBookings(rows, data.basis, data.grouping), updatedAt: now.toISOString() };
  });