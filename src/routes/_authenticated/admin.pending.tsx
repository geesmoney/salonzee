import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { SALON_TYPE_LABELS } from "@/lib/ghana";

export const Route = createFileRoute("/_authenticated/admin/pending")({
  head: () => ({ meta: [{ title: "Platform Admin — Salonzee" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { user, loading, isPlatformAdmin } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"pending" | "all">("pending");

  useEffect(() => {
    if (!loading) {
      if (!user) navigate({ to: "/login" });
      else if (!isPlatformAdmin) navigate({ to: "/" });
    }
  }, [user, loading, isPlatformAdmin, navigate]);

  const { data: salons = [] } = useQuery({
    queryKey: ["admin-salons", tab],
    enabled: isPlatformAdmin,
    queryFn: async () => {
      let q = supabase
        .from("salons")
        .select("*, salon_contacts(owner_name, email)")
        .order("created_at", { ascending: false });
      if (tab === "pending") q = q.eq("status", "pending");
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "active" | "pending" | "suspended" }) => {
      const { error } = await supabase.from("salons").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["admin-salons"] });
    },
  });

  if (loading || !isPlatformAdmin) return <div className="p-10">Loading...</div>;

  return (
    <div className="min-h-dvh bg-background">
      <SiteNav />
      <section className="max-w-6xl mx-auto px-6 md:px-10 py-12">
        <p className="text-[10px] uppercase tracking-[0.3em] text-foreground/40">Platform Admin</p>
        <h1 className="font-serif text-5xl mb-8">Salon Review</h1>

        <div className="flex gap-2 border-b border-foreground/10 mb-6">
          {(["pending", "all"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] -mb-px border-b-2 ${
                tab === t ? "border-accent text-foreground" : "border-transparent text-foreground/40"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {salons.length === 0 && <p className="text-foreground/50 italic py-12 text-center">Nothing here.</p>}
          {salons.map((s) => (
            <div key={s.id} className="bg-card border border-foreground/5 rounded-xl p-5 flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <p className="font-serif text-xl">{s.name}</p>
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded ${
                    s.status === "active" ? "bg-green-100 text-green-900" :
                    s.status === "pending" ? "bg-yellow-100 text-yellow-900" :
                    "bg-red-100 text-red-900"
                  }`}>
                    {s.status}
                  </span>
                </div>
                <p className="text-sm text-foreground/60">
                  {s.owner_name} • {s.email} • {s.phone}
                </p>
                <p className="text-sm text-foreground/60">
                  {s.location_area}, {s.location_city} • {SALON_TYPE_LABELS[s.salon_type]}
                </p>
                {s.description && <p className="text-xs text-foreground/50 mt-2 italic">"{s.description}"</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                {s.status !== "active" && (
                  <button onClick={() => setStatus.mutate({ id: s.id, status: "active" })}
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-[0.18em] hover:bg-clay">
                    Approve
                  </button>
                )}
                {s.status === "active" && (
                  <button onClick={() => setStatus.mutate({ id: s.id, status: "suspended" })}
                    className="border border-foreground/20 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-[0.18em] hover:text-destructive">
                    Suspend
                  </button>
                )}
                {s.status === "suspended" && (
                  <button onClick={() => setStatus.mutate({ id: s.id, status: "active" })}
                    className="border border-foreground/20 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-[0.18em]">
                    Reactivate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
