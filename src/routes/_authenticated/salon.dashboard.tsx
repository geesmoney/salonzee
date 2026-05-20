import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type BookingStatus = Database["public"]["Enums"]["booking_status"];
import { useAuth } from "@/hooks/use-auth";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { formatGhs } from "@/lib/ghana";
import { formatTimeLabel } from "@/lib/slots";

export const Route = createFileRoute("/_authenticated/salon/dashboard")({
  head: () => ({ meta: [{ title: "Salon Dashboard — Salonzee" }] }),
  component: SalonDashboard,
});

function SalonDashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"bookings" | "services">("bookings");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  const { data: salon } = useQuery({
    queryKey: ["my-salon", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("salons").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ["my-bookings", salon?.id],
    enabled: !!salon,
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select("*, services(name)")
        .eq("salon_id", salon!.id)
        .order("booking_date", { ascending: true })
        .order("start_time", { ascending: true });
      return data ?? [];
    },
  });

  const { data: services = [] } = useQuery({
    queryKey: ["my-services", salon?.id],
    enabled: !!salon,
    queryFn: async () => {
      const { data } = await supabase.from("services").select("*").eq("salon_id", salon!.id).order("created_at");
      return data ?? [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: BookingStatus }) => {
      const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["my-bookings", salon?.id] });
    },
  });

  const addService = useMutation({
    mutationFn: async (s: { name: string; duration_minutes: number; price_ghs: number }) => {
      const { error } = await supabase.from("services").insert({ ...s, salon_id: salon!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Service added");
      qc.invalidateQueries({ queryKey: ["my-services", salon?.id] });
    },
  });

  const toggleService = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("services").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-services", salon?.id] }),
  });

  if (loading) return <div className="p-10">Loading...</div>;

  if (!salon) {
    return (
      <div className="min-h-screen bg-background">
        <SiteNav />
        <div className="max-w-2xl mx-auto px-6 py-20 text-center">
          <h1 className="font-serif text-4xl mb-4">No salon yet</h1>
          <p className="text-foreground/60 mb-8">You haven't registered a salon. Submit one for review.</p>
          <a href="/register-salon" className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold uppercase text-xs tracking-[0.2em]">
            Register Salon
          </a>
        </div>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const todayBookings = bookings.filter((b) => b.booking_date === today);
  const pendingCount = bookings.filter((b) => b.status === "pending").length;

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <section className="max-w-7xl mx-auto px-6 md:px-10 py-12">
        <div className="flex items-baseline justify-between mb-8 gap-4 flex-wrap">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-foreground/40">Dashboard</p>
            <h1 className="font-serif text-5xl">{salon.name}</h1>
            <p className="text-sm text-foreground/60 mt-1">
              Status: <span className={`font-bold ${salon.status === "active" ? "text-green-700" : "text-clay"}`}>{salon.status}</span>
            </p>
          </div>
          <a href="/salon/settings" className="text-xs font-bold uppercase tracking-[0.2em] border border-foreground/20 px-4 py-2 rounded-lg hover:bg-secondary">
            Settings
          </a>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <StatCard label="Today" value={todayBookings.length} />
          <StatCard label="Pending" value={pendingCount} />
          <StatCard label="Total bookings" value={bookings.length} />
          <StatCard label="Services" value={services.length} />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-foreground/10 mb-6">
          {(["bookings", "services"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] -mb-px border-b-2 ${
                tab === t ? "border-accent text-foreground" : "border-transparent text-foreground/40 hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "bookings" && (
          <div className="space-y-3">
            {bookings.length === 0 && <p className="text-foreground/50 italic py-12 text-center">No bookings yet.</p>}
            {bookings.map((b) => (
              <div key={b.id} className="bg-card border border-foreground/5 rounded-xl p-5 flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <p className="font-bold">{b.customer_name}</p>
                    <StatusBadge status={b.status} />
                  </div>
                  <p className="text-sm text-foreground/60">
                    {b.booking_date} • {formatTimeLabel(b.start_time)} •{" "}
                    {(b as any).services?.name ?? "Service"} • {b.customer_phone}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {b.status === "pending" && (
                    <ActionBtn onClick={() => updateStatus.mutate({ id: b.id, status: "confirmed" })}>Confirm</ActionBtn>
                  )}
                  {b.status === "confirmed" && (
                    <>
                      <ActionBtn onClick={() => updateStatus.mutate({ id: b.id, status: "completed" })}>Complete</ActionBtn>
                      <ActionBtn onClick={() => updateStatus.mutate({ id: b.id, status: "no_show" })}>No-show</ActionBtn>
                    </>
                  )}
                  {(b.status === "pending" || b.status === "confirmed") && (
                    <ActionBtn variant="ghost" onClick={() => updateStatus.mutate({ id: b.id, status: "cancelled" })}>Cancel</ActionBtn>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "services" && (
          <div>
            <ServiceForm onAdd={(s) => addService.mutate(s)} />
            <div className="space-y-3 mt-6">
              {services.map((s) => (
                <div key={s.id} className="bg-card border border-foreground/5 rounded-xl p-5 flex items-center gap-4">
                  <div className="flex-1">
                    <p className="font-bold">{s.name}</p>
                    <p className="text-sm text-foreground/60">{s.duration_minutes} mins • {formatGhs(s.price_ghs)}</p>
                  </div>
                  <button
                    onClick={() => toggleService.mutate({ id: s.id, active: !s.active })}
                    className={`text-xs font-bold uppercase tracking-[0.2em] px-3 py-2 rounded-lg ${
                      s.active ? "bg-secondary text-foreground" : "border border-foreground/20 text-foreground/40"
                    }`}
                  >
                    {s.active ? "Active" : "Inactive"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-card border border-foreground/5 rounded-2xl p-5">
      <p className="text-[10px] uppercase tracking-widest text-foreground/40 mb-2">{label}</p>
      <p className="font-serif text-4xl">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-900",
    confirmed: "bg-green-100 text-green-900",
    completed: "bg-secondary text-foreground",
    no_show: "bg-red-100 text-red-900",
    cancelled: "bg-foreground/10 text-foreground/60",
  };
  return (
    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded ${colors[status] ?? ""}`}>
      {status.replace("_", " ")}
    </span>
  );
}

function ActionBtn({ children, onClick, variant }: { children: React.ReactNode; onClick: () => void; variant?: "ghost" }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs font-bold uppercase tracking-[0.18em] px-3 py-2 rounded-lg transition-colors ${
        variant === "ghost"
          ? "text-foreground/50 hover:text-destructive"
          : "bg-primary text-primary-foreground hover:bg-clay"
      }`}
    >
      {children}
    </button>
  );
}

function ServiceForm({ onAdd }: { onAdd: (s: { name: string; duration_minutes: number; price_ghs: number }) => void }) {
  const [name, setName] = useState("");
  const [duration, setDuration] = useState(30);
  const [price, setPrice] = useState(0);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onAdd({ name: name.trim(), duration_minutes: duration, price_ghs: price });
        setName(""); setDuration(30); setPrice(0);
      }}
      className="bg-card border border-foreground/5 rounded-xl p-5 grid grid-cols-1 md:grid-cols-4 gap-3"
    >
      <input className="md:col-span-2 bg-background border border-foreground/10 px-3 py-2 rounded-lg text-sm" placeholder="Service name" value={name} onChange={(e) => setName(e.target.value)} />
      <input type="number" min={5} step={5} className="bg-background border border-foreground/10 px-3 py-2 rounded-lg text-sm" placeholder="Mins" value={duration} onChange={(e) => setDuration(+e.target.value)} />
      <input type="number" min={0} step={1} className="bg-background border border-foreground/10 px-3 py-2 rounded-lg text-sm" placeholder="GHS" value={price} onChange={(e) => setPrice(+e.target.value)} />
      <button className="md:col-span-4 bg-accent text-white py-3 rounded-lg font-bold uppercase text-xs tracking-[0.2em]">Add service</button>
    </form>
  );
}
