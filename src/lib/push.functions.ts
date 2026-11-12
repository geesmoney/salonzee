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

/** A test notification only to the caller's already-registered device; no SMS. */
export const testOwnerPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ endpoint: z.string().url().max(1000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: salon } = await context.supabase.from("salons").select("id").eq("user_id", context.userId).maybeSingle();
    if (!salon) throw new Error("Business account required.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: subscription } = await supabaseAdmin.from("push_subscriptions").select("id,last_success_at")
      .eq("owner_user_id", context.userId).eq("endpoint", data.endpoint).maybeSingle();
    if (!subscription) throw new Error("Enable phone notifications first.");
    if (subscription.last_success_at && Date.now() - Date.parse(subscription.last_success_at) < 60_000) {
      throw new Error("Please wait one minute before another test.");
    }
    const { sendPushForRow } = await import("@/lib/push.server");
    const accepted = await sendPushForRow(supabaseAdmin, "", {
      push_target: "owner", owner_user_id: context.userId, push_title: "Salonzee test notification",
      push_body: "Your phone notifications are connected.", push_url: "/salon/dashboard",
    }, subscription.id);
    return { accepted: accepted > 0 };
  });

/** Signed-in salon owner opt-in from the dashboard. */
export const subscribeOwnerPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => subSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: salon } = await context.supabase.from("salons").select("id").eq("user_id", context.userId).maybeSingle();
    if (!salon) throw new Error("Business account required.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("push_subscriptions").upsert(
      { endpoint: data.endpoint, p256dh: data.p256dh, auth: data.auth, owner_user_id: context.userId, customer_phone: null },
      { onConflict: "endpoint" },
    );
    if (error) throw new Error("Could not turn on notifications.");
    return { ok: true };
  });
