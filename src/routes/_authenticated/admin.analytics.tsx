import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  head: () => ({ meta: [
    { title: "Traffic Analytics — Salonzee Admin" },
    { name: "description", content: "Salonzee visits, traffic sources, Google Ads clicks and top pages." },
    { property: "og:title", content: "Traffic Analytics — Salonzee Admin" },
    { property: "og:description", content: "Salonzee visits, traffic sources, Google Ads clicks and top pages." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: AnalyticsPage,
});

const RANGES = { "1": "Today", "7": "7 days", "30": "30 days" } as const;
type Range = keyof typeof RANGES;
const LABELS: Record<string, string> = {
  google_ads: "Google Ads", google_search: "Google Search", direct: "Direct",
  social: "Social media", whatsapp: "WhatsApp", other_search: "Other search",
};

type Visit = { session_id: string; path: string; source: string; utm_campaign: string | null; gclid: string | null; device: string | null; created_at: string };

function AnalyticsPage() {
  const { user, loading, isPlatformAdmin } = useAuth();
  const navigate = useNavigate();
  const [range, setRange] = useState<Range>("7");

  useEffect(() => {
    if (!loading) {
      if (!user) navigate({ to: "/login" });
      else if (!isPlatformAdmin) navigate({ to: "/" });
    }
  }, [user, loading, isPlatformAdmin, navigate]);

  const { data: rows = [], isFetching } = useQuery({
    queryKey: ["admin-analytics", range],
    enabled: isPlatformAdmin,
    refetchInterval: 60000,
    queryFn: async () => {
      const since = new Date();
      if (range === "1") since.setHours(0, 0, 0, 0);
      else since.setDate(since.getDate() - Number(range));
      const all: Visit[] = [];
      for (let from = 0; from < 20000; from += 1000) {
        const { data, error } = await (supabase as unknown as import("@supabase/supabase-js").SupabaseClient).from("site_visits")
          .select("session_id, path, source, utm_campaign, gclid, device, created_at")
          .gte("created_at", since.toISOString()).order("created_at", { ascending: false })
          .range(from, from + 999);
        if (error) throw error;
        all.push(...(data as Visit[]));
        if (data.length < 1000) break;
      }
      return all;
    },
  });

  const s = useMemo(() => {
    const sessions = new Map<string, Visit[]>();
    rows.forEach((r) => sessions.set(r.session_id, [...(sessions.get(r.session_id) ?? []), r]));
    const count = (fn: (v: Visit) => string | null, uniqueSessions = true) => {
      const m = new Map<string, Set<string> | number>();
      rows.forEach((r) => {
        const k = fn(r); if (!k) return;
        if (uniqueSessions) { const set = (m.get(k) as Set<string>) ?? new Set(); set.add(r.session_id); m.set(k, set); }
        else m.set(k, ((m.get(k) as number) ?? 0) + 1);
      });
      return [...m.entries()].map(([k, v]) => [k, typeof v === "number" ? v : v.size] as const).sort((a, b) => b[1] - a[1]);
    };
    const days = new Map<string, Set<string>>();
    rows.forEach((r) => { const d = r.created_at.slice(0, 10); const set = days.get(d) ?? new Set(); set.add(r.session_id); days.set(d, set); });
    const bounced = [...sessions.values()].filter((v) => v.length === 1).length;
    return {
      visits: sessions.size, views: rows.length,
      ads: new Set(rows.filter((r) => r.source === "google_ads").map((r) => r.session_id)).size,
      bounce: sessions.size ? Math.round((bounced / sessions.size) * 100) : 0,
      sources: count((r) => r.source), pages: count((r) => r.path, false), devices: count((r) => r.device),
      campaigns: count((r) => r.utm_campaign),
      adPages: count((r) => (r.source === "google_ads" ? r.path : null), false),
      daily: [...days.entries()].map(([d, v]) => [d, v.size] as const).sort((a, b) => a[0].localeCompare(b[0])),
    };
  }, [rows]);

  if (loading || !isPlatformAdmin) return <div className="p-10">Loading...</div>;
  const maxDay = Math.max(1, ...s.daily.map((d) => d[1]));

  return (
    <div className="min-h-dvh bg-background">
      <SiteNav />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl text-foreground">Traffic analytics</h1>
            <p className="text-sm text-muted-foreground">Visits, where they come from, and Google Ads clicks. {isFetching && "Refreshing…"}</p>
          </div>
          <div className="flex gap-1 rounded-full border border-border p-1">
            {(Object.keys(RANGES) as Range[]).map((r) => (
              <button key={r} onClick={() => setRange(r)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold ${range === r ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                {RANGES[r]}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Visits" value={s.visits} />
          <Stat label="Page views" value={s.views} />
          <Stat label="Google Ads visits" value={s.ads} accent />
          <Stat label="Left after 1 page" value={`${s.bounce}%`} />
        </div>

        <Card title="Visits per day" className="mt-4">
          {s.daily.length === 0 ? <Empty /> : (
            <div className="flex h-40 items-end gap-1">
              {s.daily.map(([d, v]) => (
                <div key={d} className="flex flex-1 flex-col items-center gap-1" title={`${d}: ${v}`}>
                  <span className="text-[10px] text-muted-foreground">{v}</span>
                  <div className="w-full rounded-t bg-primary" style={{ height: `${(v / maxDay) * 100}%`, minHeight: 4 }} />
                  <span className="text-[10px] text-muted-foreground">{d.slice(5)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Card title="Traffic sources"><Bars rows={s.sources} label={(k) => LABELS[k] ?? k} /></Card>
          <Card title="Top pages"><Bars rows={s.pages.slice(0, 10)} /></Card>
          <Card title="Google Ads — landing pages"><Bars rows={s.adPages.slice(0, 10)} /></Card>
          <Card title="Campaigns (utm_campaign)"><Bars rows={s.campaigns.slice(0, 10)} /></Card>
          <Card title="Devices"><Bars rows={s.devices} /></Card>
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          Tracking started today, so earlier visits aren't here. Admin and salon-dashboard pages are not counted.
          Google Ads clicks are detected automatically when auto-tagging is on in your Ads account.
        </p>
      </div>
      <SiteFooter />
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border border-border p-4 ${accent ? "bg-primary text-primary-foreground" : "bg-card"}`}>
      <div className={`text-xs ${accent ? "opacity-80" : "text-muted-foreground"}`}>{label}</div>
      <div className="mt-1 text-3xl font-bold">{value}</div>
    </div>
  );
}

function Card({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-5 ${className}`}>
      <h2 className="mb-3 text-sm font-semibold text-foreground">{title}</h2>
      {children}
    </div>
  );
}

function Empty() {
  return <p className="text-sm text-muted-foreground">No data yet.</p>;
}

function Bars({ rows, label = (k) => k }: { rows: readonly (readonly [string, number])[]; label?: (k: string) => string }) {
  if (!rows.length) return <Empty />;
  const max = rows[0][1];
  return (
    <ul className="space-y-2">
      {rows.map(([k, v]) => (
        <li key={k} className="text-sm">
          <div className="flex justify-between gap-2"><span className="truncate text-foreground">{label(k)}</span><span className="font-semibold">{v}</span></div>
          <div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${(v / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}
