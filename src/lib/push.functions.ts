import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const subSchema = z.object({
  endpoint: z.string().url().startsWith("https://").max(1000),
  p256dh: z.string().min(10).max(200),
  auth: z.string().min(8).max(100),
});

/** Customer opt-in right after booking. The fresh booking id proves the phone belongs to the subscriber. */
export const subscribeCustomerPush = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => subSchema.extend({ bookingId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: b } = await supabaseAdmin
      .from("bookings").select("customer_phone, created_at").eq("id", data.bookingId).maybeSingle();
    if (!b || Date.now() - new Date(b.created_at).getTime() > 60 * 60 * 1000) {
      throw new Error("Please turn on notifications right after booking.");
    }
    const { error } = await supabaseAdmin.from("push_subscriptions").upsert(
      { endpoint: data.endpoint, p256dh: data.p256dh, auth: data.auth, customer_phone: b.customer_phone, owner_user_id: null },
      { onConflict: "endpoint" },
    );
    if (error) throw new Error("Could not turn on notifications.");
    return { ok: true };
  });

/** Signed-in salon owner opt-in from the dashboard. */
export const subscribeOwnerPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => subSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("push_subscriptions").upsert(
      { endpoint: data.endpoint, p256dh: data.p256dh, auth: data.auth, owner_user_id: context.userId, customer_phone: null },
      { onConflict: "endpoint" },
    );
    if (error) throw new Error("Could not turn on notifications.");
    return { ok: true };
  });
