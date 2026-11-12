import { buildPushPayload } from "@block65/webcrypto-web-push";
import { VAPID_PUBLIC_KEY } from "./push-config";

type Admin = (typeof import("@/integrations/supabase/client.server"))["supabaseAdmin"];

/** Best-effort web push to every subscription for a customer phone or salon owner. Never throws. */
export async function sendPushForRow(admin: Admin, toPhone: string, payload: any, subscriptionId?: string) {
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!privateKey || !payload?.push_target) return 0;
  let q = admin.from("push_subscriptions").select("id, endpoint, p256dh, auth");
  if (payload.push_target === "owner") {
    if (!payload.owner_user_id) return 0;
    q = q.eq("owner_user_id", payload.owner_user_id);
  } else {
    q = q.eq("customer_phone", toPhone);
  }
  if (subscriptionId) q = q.eq("id", subscriptionId);
  const { data: subs } = await q.limit(10);
  let delivered = 0;
  for (const s of subs ?? []) {
    try {
      const req = await buildPushPayload(
        {
          data: JSON.stringify({ title: payload.push_title ?? "Salonzee", body: payload.push_body ?? payload.message, url: payload.push_url ?? "/", tag: payload.notification_id }),
          options: { ttl: 60 * 60 * 24, urgency: payload.push_title === "New booking" ? "high" : "normal" },
        },
        { endpoint: s.endpoint, expirationTime: null, keys: { p256dh: s.p256dh, auth: s.auth } },
        { subject: "mailto:support@salonzee.com", publicKey: VAPID_PUBLIC_KEY, privateKey },
      );
      const res = await fetch(s.endpoint, { ...req as RequestInit, signal: AbortSignal.timeout(3000) });
      if (res.status === 404 || res.status === 410) {
        await admin.from("push_subscriptions").delete().eq("id", s.id);
      } else if (res.ok) {
        delivered++;
        await admin.from("push_subscriptions").update({ last_success_at: new Date().toISOString() }).eq("id", s.id);
      } else console.warn("[push] provider rejected delivery", { status: res.status });
    } catch (e) {
      console.error("[push] delivery failed");
    }
  }
  return delivered;
}
