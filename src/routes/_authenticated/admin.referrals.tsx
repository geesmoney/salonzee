import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/_authenticated/admin/referrals")({
  head: () => ({ meta: [
    { title: "Referrals — Salonzee Admin" },
    { name: "description", content: "Manage Salonzee referral codes and view referral performance." },
    { property: "og:title", content: "Referrals — Salonzee Admin" },
    { property: "og:description", content: "Manage Salonzee referral codes and view referral performance." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: AdminReferrals,
});

type CodeRow = {
  id: string;
  code: string;
  label: string;
  salon_id: string | null;
  agent_phone: string | null;
  active: boolean;
};

function AdminReferrals() {
  const { user, loading, isPlatformAdmin } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [agentName, setAgentName] = useState("");
  const [agentPhone, setAgentPhone] = useState("");
  const [agentCode, setAgentCode] = useState("");

  useEffect(() => {
    if (!loading) {
      if (!user) navigate({ to: "/login" });
      else if (!isPlatformAdmin) navigate({ to: "/" });
    }
  }, [user, loading, isPlatformAdmin, navigate]);

  const { data: codes = [] } = useQuery({
    queryKey: ["referral-codes"],
    enabled: isPlatformAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referral_codes")
        .select("id, code, label, salon_id, agent_phone, active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CodeRow[];
    },
  });

  const { data: signups = [] } = useQuery({
    queryKey: ["referral-signups"],
    enabled: isPlatformAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("salons")
        .select("id, name, status, referred_by_code, created_at")
        .not("referred_by_code", "is", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 60_000,
  });

  const { data: rewards = [] } = useQuery({
    queryKey: ["referral-rewards-all"],
    enabled: isPlatformAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referral_rewards")
        .select("id, code, months_awarded, referral_code_id, awarded_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const createCode = useMutation({
    mutationFn: async () => {
      const code = agentCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (!agentName.trim() || code.length < 3) throw new Error("Enter a name and a code of at least 3 characters.");
      const { error } = await supabase.from("referral_codes").insert({
        code,
        label: agentName.trim(),
        agent_phone: agentPhone.trim() || null,
      });
      if (error) throw new Error(/duplicate|unique/i.test(error.message) ? "That code is already taken." : "Could not create the code.");
    },
    onSuccess: () => {
      toast.success("Code created");
      setAgentName("");
      setAgentPhone("");
      setAgentCode("");
      qc.invalidateQueries({ queryKey: ["referral-codes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("referral_codes").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["referral-codes"] }),
  });

  if (loading || !isPlatformAdmin) return <div className="p-10">Loading…</div>;

  const stats = codes.map((c) => {
    const mine = signups.filter((s) => (s.referred_by_code ?? "").toUpperCase() === c.code.toUpperCase());
    const earned = rewards.filter((r) => r.referral_code_id === c.id).reduce((n, r) => n + (r.months_awarded ?? 0), 0);
    return {
      ...c,
      total: mine.length,
      approved: mine.filter((s) => s.status === "active").length,
      pending: mine.filter((s) => s.status === "pending").length,
      earned,
    };
  }).sort((a, b) => b.approved - a.approved || b.total - a.total);

  const agents = stats.filter((s) => !s.salon_id);
  const salonCodes = stats.filter((s) => s.salon_id);

  return (
    <div className="min-h-dvh bg-background">
      <SiteNav />
      <section className="max-w-6xl mx-auto px-6 md:px-10 py-12">
        <p className="text-[10px] uppercase tracking-[0.3em] text-foreground/40">Platform Admin</p>
        <h1 className="font-serif text-5xl mb-2">Referrals</h1>
        <p className="text-sm text-foreground/60 mb-8">
          One free premium month is credited automatically when you approve a business that signed up with a code.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          <Tile label="Codes" value={codes.length} />
          <Tile label="Referred sign-ups" value={signups.length} />
          <Tile label="Approved" value={signups.filter((s) => s.status === "active").length} />
          <Tile label="Free months owed" value={rewards.reduce((n, r) => n + (r.months_awarded ?? 0), 0)} />
        </div>

        <div className="border border-foreground/10 rounded-xl p-5 mb-10">
          <h2 className="font-serif text-2xl mb-4">Add a field agent code</h2>
          <div className="grid md:grid-cols-4 gap-3">
            <input value={agentName} onChange={(e) => setAgentName(e.target.value)} placeholder="Agent name" className={inputCls} />
            <input value={agentPhone} onChange={(e) => setAgentPhone(e.target.value)} placeholder="Phone (optional)" className={inputCls} />
            <input value={agentCode} onChange={(e) => setAgentCode(e.target.value.toUpperCase())} placeholder="CODE e.g. KWAME01" className={inputCls + " font-mono"} />
            <button
              onClick={() => createCode.mutate()}
              disabled={createCode.isPending}
              className="bg-primary text-primary-foreground rounded-lg font-bold uppercase text-xs tracking-[0.2em] px-4 py-2 disabled:opacity-50"
            >
              Create code
            </button>
          </div>
        </div>

        <Table title="Field agents" rows={agents} onToggle={(id, active) => toggleActive.mutate({ id, active })} empty="No agent codes yet." />
        <div className="h-10" />
        <Table title="Business codes" rows={salonCodes} onToggle={(id, active) => toggleActive.mutate({ id, active })} empty="No approved businesses yet." />
      </section>
      <SiteFooter />
    </div>
  );
}

type StatRow = CodeRow & { total: number; approved: number; pending: number; earned: number };

function Table({ title, rows, onToggle, empty }: { title: string; rows: StatRow[]; onToggle: (id: string, active: boolean) => void; empty: string }) {
  return (
    <div>
      <h2 className="font-serif text-2xl mb-3">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-foreground/50 italic py-6">{empty}</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="bg-card border border-foreground/5 rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-serif text-lg truncate">{r.label}</p>
                <p className="font-mono text-xs tracking-[0.2em] text-foreground/60">
                  {r.code}
                  {r.agent_phone ? ` • ${r.agent_phone}` : ""}
                  {!r.active ? " • disabled" : ""}
                </p>
              </div>
              <div className="flex gap-5 text-center">
                <Mini label="Signed up" value={r.total} />
                <Mini label="Approved" value={r.approved} />
                <Mini label="Pending" value={r.pending} />
                <Mini label="Months" value={r.earned} />
              </div>
              <button
                onClick={() => onToggle(r.id, !r.active)}
                className="border border-foreground/20 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-[0.18em]"
              >
                {r.active ? "Disable" : "Enable"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-card border border-foreground/5 rounded-xl p-4">
      <p className="font-serif text-3xl">{value}</p>
      <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/40 mt-1">{label}</p>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="font-serif text-xl">{value}</p>
      <p className="text-[9px] uppercase tracking-[0.15em] text-foreground/40">{label}</p>
    </div>
  );
}

const inputCls = "w-full bg-background border border-foreground/10 px-3 py-2 rounded-lg text-sm";
