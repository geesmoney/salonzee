import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

type SmsStatus = "all" | "stubbed" | "sent" | "failed" | "queued";

export const Route = createFileRoute("/_authenticated/admin/sms")({
  head: () => ({ meta: [
    { title: "SMS Log — Salonzee Admin" },
    { name: "description", content: "Monitor Salonzee booking notifications and SMS delivery." },
    { property: "og:title", content: "SMS Log — Salonzee Admin" },
    { property: "og:description", content: "Monitor Salonzee booking notifications and SMS delivery." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: SmsLogPage,
});

function SmsLogPage() {
  const { user, loading, isPlatformAdmin } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<SmsStatus>("all");

  useEffect(() => {
    if (!loading) {
      if (!user) navigate({ to: "/login" });
      else if (!isPlatformAdmin) navigate({ to: "/" });
    }
  }, [user, loading, isPlatformAdmin, navigate]);

  const { data: rows = [], refetch, isFetching } = useQuery({
    queryKey: ["admin-sms-log", filter],
    enabled: isPlatformAdmin,
    refetchInterval: 15000,
    queryFn: async () => {
      let q = supabase
        .from("sms_log")
        .select("id, to_phone, template, payload, status, error_message, sent_at, booking_id")
        .order("sent_at", { ascending: false })
        .limit(200);
      if (filter !== "all") q = q.eq("status", filter);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  if (loading || !isPlatformAdmin) return <div className="p-10">Loading...</div>;

  const counts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-dvh bg-background">
      <SiteNav />
      <section className="max-w-6xl mx-auto px-6 md:px-10 py-12">
        <p className="text-[10px] uppercase tracking-[0.3em] text-foreground/40">Platform Admin</p>
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <h1 className="font-serif text-5xl">SMS Log</h1>
          <button
            onClick={() => refetch()}
            className="border border-foreground/20 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-[0.18em] hover:bg-foreground/5"
          >
            {isFetching ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        <p className="text-sm text-foreground/60 mb-6">
          Showing latest 200. Auto-refreshes every 15s. Queue is processed by Mnotify every minute.
        </p>

        <div className="flex flex-wrap gap-2 border-b border-foreground/10 mb-6">
          {(["all", "stubbed", "sent", "failed", "queued"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] -mb-px border-b-2 ${
                filter === t ? "border-accent text-foreground" : "border-transparent text-foreground/40"
              }`}
            >
              {t} {t !== "all" && counts[t] ? `(${counts[t]})` : ""}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {rows.length === 0 && (
            <p className="text-foreground/50 italic py-12 text-center">No messages.</p>
          )}
          {rows.map((r) => {
            const msg = (r.payload as { message?: string })?.message ?? "(no message body)";
            return (
              <div
                key={r.id}
                className="bg-card border border-foreground/5 rounded-xl p-4 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded ${
                        r.status === "sent"
                          ? "bg-green-100 text-green-900"
                          : r.status === "failed"
                          ? "bg-red-100 text-red-900"
                          : r.status === "stubbed"
                          ? "bg-yellow-100 text-yellow-900"
                          : "bg-blue-100 text-blue-900"
                      }`}
                    >
                      {r.status}
                    </span>
                    <span className="text-[10px] uppercase tracking-widest text-foreground/40">
                      {r.template}
                    </span>
                    <span className="text-xs text-foreground/60">→ {r.to_phone}</span>
                  </div>
                  <span className="text-xs text-foreground/40">
                    {new Date(r.sent_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-foreground/80 whitespace-pre-wrap">{msg}</p>
                {r.error_message && (
                  <p className="text-xs text-destructive italic">⚠ {r.error_message}</p>
                )}
              </div>
            );
          })}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
