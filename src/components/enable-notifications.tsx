import { useEffect, useState } from "react";
import { Bell, BellRing } from "lucide-react";
import { toast } from "sonner";
import { VAPID_PUBLIC_KEY } from "@/lib/push-config";
import { subscribeCustomerPush, subscribeOwnerPush, testOwnerPush } from "@/lib/push.functions";
import { Button } from "@/components/ui/button";

function toUint8(base64url: string) {
  const pad = "=".repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

type Props = { mode: "customer"; bookingId: string } | { mode: "owner" };

export function EnableNotifications(props: Props) {
  const [supported, setSupported] = useState(false);
  const [state, setState] = useState<"idle" | "busy" | "on">("idle");

  useEffect(() => {
    const ok = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setSupported(ok);
    if (ok && Notification.permission === "granted" && props.mode === "owner") {
      navigator.serviceWorker.getRegistration("/push-scope/").then(async (r) => {
        const sub = await r?.pushManager.getSubscription();
        const json = sub?.toJSON();
        if (json?.endpoint && json.keys?.p256dh && json.keys?.auth) {
          await subscribeOwnerPush({ data: { endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth } });
          setState("on");
        }
      }).catch(() => setState("idle"));
    }
  }, [props.mode]);

  if (!supported) return null;

  async function enable() {
    setState("busy");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Notifications are blocked. You'll still get text messages.");
        setState("idle");
        return;
      }
      const reg = await navigator.serviceWorker.register("/push-sw.js", { scope: "/push-scope/" });
      if (!reg.active) {
        const w = reg.installing ?? reg.waiting;
        await new Promise<void>((resolve) => {
          if (!w) return resolve();
          w.addEventListener("statechange", () => w.state === "activated" && resolve());
          setTimeout(resolve, 5000);
        });
      }
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toUint8(VAPID_PUBLIC_KEY) }));
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      const payload = { endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth };
      if (props.mode === "customer") await subscribeCustomerPush({ data: { ...payload, bookingId: props.bookingId } });
      else await subscribeOwnerPush({ data: payload });
      setState("on");
      toast.success("Notifications turned on");
    } catch (e) {
      console.error(e);
      toast.error("Couldn't turn on notifications on this device.");
      setState("idle");
    }
  }

  if (state === "on") {
    return (
      <div className="flex flex-wrap items-center gap-3 text-xs text-foreground/60">
        <BellRing className="h-4 w-4 text-primary" /> Notifications are on for this device
        {props.mode === "owner" && <Button size="sm" variant="outline" onClick={async () => {
          try {
            const reg = await navigator.serviceWorker.getRegistration("/push-scope/");
            const sub = await reg?.pushManager.getSubscription();
            if (!sub) throw new Error("No subscription");
            const result = await testOwnerPush({ data: { endpoint: sub.endpoint } });
            if (result.accepted) toast.success("Test accepted by your phone's notification service. Check your phone.");
            else toast.error("Test wasn't accepted. Turn notifications on again.");
          } catch { toast.error("Couldn't send a test. Wait a minute, or enable notifications again."); }
        }}>Send test notification</Button>}
      </div>
    );
  }
  return (
    <Button
      type="button"
      onClick={enable}
      disabled={state === "busy"}
      className="inline-flex items-center gap-2 rounded-xl border border-foreground/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] hover:border-primary disabled:opacity-50"
    >
      <Bell className="h-4 w-4" />
      {props.mode === "customer" ? "Get reminders on this phone" : "Turn on phone notifications"}
    </Button>
  );
}
