import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/_authenticated/admin/reminders")({
  head: () => ({ meta: [
    { title: "Reminders — Salonzee Admin" },
    { name: "description", content: "Control weekly rebooking reminders and business page nudges." },
    { property: "og:title", content: "Reminders — Salonzee Admin" },
    { property: "og:description", content: "Control weekly rebooking reminders and business page nudges." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: RemindersPage,
});

function RemindersPage() {
  const { user, loading, isPlatformAdmin } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [cap, setCap] = useState<number | null>(null);

  useEffect(() => {
    if (!loading) {
      if (!user) navigate({ to: "/login" });
      else if (!isPlatformAdmin) navigate({ to: "/" });
    }
  }, [user, loading, isPlatformAdmin, navigate]);

  const settings = useQuery({
    queryKey: ["retention-settings"],
    enabled: isPlatformAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("retention_settings").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const log = useQuery({
    queryKey: ["retention-log"],
    enabled: isPlatformAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sms_log")
        .select("id, to_phone, template, status, sent_at, payload, error_message")
        .in("template", ["rebook_reminder", "profile_nudge"])
        .order("sent_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async (patch: { customer_reminders_enabled?: boolean; owner_nudges_enabled?: boolean; daily_sms_cap?: number }) => {
      const { error } = await supabase.from("retention_settings").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", true);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["retention-settings"] }); },
    onError: () => toast.error("Could not save"),
  });

  const s = settings.data;
  const rows = log.data ?? [];
  const sent = rows.filter((r) => r.status === "sent").length;

  return (
    <div className="min-h-dvh bg-background">
      <SiteNav />
      <section className="mx-auto max-w-5xl px-5 py-10">
        <h1 className="font-serif text-4xl">Reminders</h1>
        <p className="mt-2 max-w-2xl text-sm text-foreground/60">
          Customers get a text (and a phone notification if they turned it on) about two weeks after their last visit,
          worded for the service they had. Salon owners with an incomplete business page get up to three nudges, a week apart.
          Booking texts always go out first.
        </p>

        {s && (
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <Toggle label="Customer rebooking reminders" hint="Saturdays, 8am" on={s.customer_reminders_enabled}
              onChange={(v) => save.mutate({ customer_reminders_enabled: v })} />
            <Toggle label="Business page nudges" hint="Tuesdays, 9am" on={s.owner_nudges_enabled}
              onChange={(v) => save.mutate({ owner_nudges_enabled: v })} />
            <div className="rounded-2xl border border-foreground/10 p-5">
              <p className="text-sm font-bold">Daily text limit</p>
              <p className="text-xs text-foreground/50">Caps reminder texts per day to protect SMS credit</p>
              <div className="mt-3 flex gap-2">
                <input type="number" min={0} max={1000} value={cap ?? s.daily_sms_cap}
                  onChange={(e) => setCap(Number(e.target.value))}
                  className="w-24 rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm" />
                <button onClick={() => cap != null && save.mutate({ daily_sms_cap: Math.max(0, Math.min(1000, cap)) })}
                  className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground">Save</button>
              </div>
            </div>
          </div>
        )}

        <h2 className="mt-12 text-xl font-bold">Recent reminders <span className="text-sm font-normal text-foreground/50">({sent} of {rows.length} sent)</span></h2>
        <div className="mt-4 space-y-3">
          {rows.length === 0 && <p className="text-sm text-foreground/50">No reminders yet. The first ones go out on the next scheduled day.</p>}
          {rows.map((r) => (
            <div key={r.id} className="rounded-xl border border-foreground/10 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-foreground/50">
                <span>{r.template === "rebook_reminder" ? "Customer reminder" : "Business page nudge"} · {r.to_phone}</span>
                <span>{r.status} · {new Date(r.sent_at).toLocaleString("en-GH")}</span>
              </div>
              <p className="mt-2 text-sm">{(r.payload as { message?: string })?.message}</p>
              {r.error_message && <p className="mt-1 text-xs text-destructive">{r.error_message}</p>}
            </div>
          ))}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

function Toggle({ label, hint, on, onChange }: { label: string; hint: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!on)} aria-pressed={on}
      className={`rounded-2xl border p-5 text-left transition-colors ${on ? "border-primary bg-primary/5" : "border-foreground/10"}`}>
      <p className="text-sm font-bold">{label}</p>
      <p className="text-xs text-foreground/50">{hint}</p>
      <p className={`mt-3 text-xs font-bold uppercase tracking-widest ${on ? "text-primary" : "text-foreground/40"}`}>{on ? "On" : "Off"}</p>
    </button>
  );
}
