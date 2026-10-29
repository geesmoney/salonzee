import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

const SKIP = ["/admin", "/salon/"];

function classify(ref: string, utm: string | null, medium: string | null, gclid: string | null) {
  if (gclid || (utm === "google" && /cpc|paid|display|ads/i.test(medium ?? ""))) return "google_ads";
  if (utm) return utm.toLowerCase().slice(0, 60);
  if (!ref) return "direct";
  try {
    const h = new URL(ref).hostname.replace(/^www\./, "");
    if (h === window.location.hostname.replace(/^www\./, "")) return "internal";
    if (/google\./.test(h)) return "google_search";
    if (/bing\.|yahoo\.|duckduckgo/.test(h)) return "other_search";
    if (/facebook|fb\.|instagram|tiktok|twitter|x\.com|t\.co|linkedin|snapchat/.test(h)) return "social";
    if (/whatsapp|wa\.me/.test(h)) return "whatsapp";
    return h.slice(0, 60);
  } catch {
    return "direct";
  }
}

export function VisitTracker() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (last.current === path || SKIP.some((p) => path.startsWith(p))) return;
    last.current = path;
    try {
      let sid = sessionStorage.getItem("sz_sid");
      const first = !sid;
      if (!sid) {
        sid = crypto.randomUUID();
        sessionStorage.setItem("sz_sid", sid);
      }
      const q = new URLSearchParams(window.location.search);
      // Attribution is decided on the session's first page and reused after.
      let attr = sessionStorage.getItem("sz_attr");
      if (first || !attr) {
        const a = {
          referrer: document.referrer.slice(0, 500) || null,
          utm_source: q.get("utm_source")?.slice(0, 100) || null,
          utm_medium: q.get("utm_medium")?.slice(0, 100) || null,
          utm_campaign: q.get("utm_campaign")?.slice(0, 150) || null,
          gclid: q.get("gclid")?.slice(0, 300) || null,
        };
        const source = classify(document.referrer, a.utm_source, a.utm_medium, a.gclid);
        attr = JSON.stringify({ ...a, source: source === "internal" ? "direct" : source });
        sessionStorage.setItem("sz_attr", attr);
      }
      const device = window.matchMedia("(max-width: 768px)").matches ? "mobile" : "desktop";
      void (supabase as unknown as import("@supabase/supabase-js").SupabaseClient).from("site_visits").insert({ session_id: sid, path: path.slice(0, 300), device, ...JSON.parse(attr) }).then(() => undefined);
    } catch {
      /* tracking must never break the app */
    }
  }, [path]);

  return null;
}
