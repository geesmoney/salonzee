import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { recordAnalyticsEvent } from "@/lib/analytics-ingestion.functions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
type InstallEvent = "prompt_shown" | "prompt_accepted" | "prompt_dismissed" | "installed" | "home_screen_open";

let deferred: PromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function platform() {
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  return window.matchMedia("(max-width: 768px)").matches ? "other" : "desktop";
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
}

function log(event: InstallEvent) {
  try {
    let sid = sessionStorage.getItem("sz_sid");
    if (!sid) { sid = crypto.randomUUID(); sessionStorage.setItem("sz_sid", sid); }
    void recordAnalyticsEvent({ data: { kind: "install", session_id: sid, event, platform: platform() } }).catch(() => undefined);
  } catch { /* tracking must never break the app */ }
}

/** Mounted once site-wide: records installs and home-screen opens. */
export function InstallTracker() {
  useEffect(() => {
    if (isStandalone() && !sessionStorage.getItem("sz_hs")) {
      sessionStorage.setItem("sz_hs", "1");
      log("home_screen_open");
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      deferred = e as PromptEvent;
      notify();
    };
    const onInstalled = () => { deferred = null; notify(); log("installed"); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  return null;
}

/** Shows only when installing is possible: native prompt on Android/Chrome, instructions on iPhone. */
export function InstallAppButton({ className = "" }: { className?: string }) {
  const [, force] = useState(0);
  const [show, setShow] = useState<"none" | "prompt" | "ios">("none");
  const [iosOpen, setIosOpen] = useState(false);

  useEffect(() => {
    const update = () => {
      if (isStandalone()) return setShow("none");
      if (deferred) return setShow("prompt");
      setShow(platform() === "ios" ? "ios" : "none");
    };
    const l = () => { force((n) => n + 1); update(); };
    listeners.add(l);
    update();
    return () => { listeners.delete(l); };
  }, []);

  if (show === "none") return null;

  const onClick = async () => {
    log("prompt_shown");
    if (show === "ios") { setIosOpen(true); return; }
    const p = deferred;
    if (!p) return;
    await p.prompt();
    const { outcome } = await p.userChoice;
    log(outcome === "accepted" ? "prompt_accepted" : "prompt_dismissed");
    deferred = null;
    notify();
  };

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={onClick} className={className}>
        <Download /> Install Salonzee app
      </Button>
      <Dialog open={iosOpen} onOpenChange={setIosOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Salonzee to your Home Screen</DialogTitle>
            <DialogDescription>
              In Safari, tap the Share button (the square with an arrow), then choose “Add to Home Screen” and tap Add.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}
