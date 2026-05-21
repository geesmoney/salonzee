import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/use-auth";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { SupportThread, StatusPill } from "@/components/support-thread";

type Ticket = Database["public"]["Tables"]["support_tickets"]["Row"];
type Status = Database["public"]["Enums"]["support_ticket_status"];

export const Route = createFileRoute("/_authenticated/admin/support")({
  head: () => ({ meta: [{ title: "Admin Support — Salonzee" }] }),
  component: AdminSupportPage,
});

function AdminSupportPage() {
  const { user, loading, isPlatformAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | Status>("open");
  const qc = useQueryClient();

  useEffect(() => {
    if (!loading && (!user || !isPlatformAdmin)) navigate({ to: "/" });
  }, [user, isPlatformAdmin, loading, navigate]);

  // Realtime CDC was removed for support tables to prevent cross-tenant data leaks.
  // We rely on react-query polling (refetchInterval below) instead.

  const { data: tickets = [] } = useQuery({
    queryKey: ["support-tickets", "admin"],
    enabled: !!user && isPlatformAdmin,
    refetchInterval: 20_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      return data as Ticket[];
    },
  });

  const filtered = useMemo(
    () => (filter === "all" ? tickets : tickets.filter((t) => t.status === filter)),
    [tickets, filter],
  );

  const counts = useMemo(
    () => ({
      open: tickets.filter((t) => t.status === "open").length,
      pending: tickets.filter((t) => t.status === "pending").length,
      resolved: tickets.filter((t) => t.status === "resolved").length,
      closed: tickets.filter((t) => t.status === "closed").length,
    }),
    [tickets],
  );

  const active = tickets.find((t) => t.id === activeId) ?? null;

  if (loading || !user || !isPlatformAdmin) return null;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <SiteNav />
      <section className="max-w-7xl mx-auto px-6 md:px-10 py-12">
        <div className="mb-8">
          <p className="text-[10px] uppercase tracking-[0.3em] text-foreground/40">Platform admin</p>
          <h1 className="font-serif text-5xl">Support inbox</h1>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {(["all", "open", "pending", "resolved", "closed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs font-bold uppercase tracking-[0.15em] px-3 py-1.5 rounded-full ${
                filter === f ? "bg-foreground text-background" : "border border-foreground/15 text-foreground/60 hover:text-foreground"
              }`}
            >
              {f}
              {f !== "all" && counts[f] > 0 && (
                <span className="ml-1.5 opacity-70">({counts[f]})</span>
              )}
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-[340px_1fr] gap-6 min-h-[60vh]">
          <div className="bg-card border border-foreground/5 rounded-2xl overflow-hidden">
            {filtered.length === 0 ? (
              <p className="text-foreground/40 italic text-sm p-6">No tickets in this view.</p>
            ) : (
              <ul className="divide-y divide-foreground/5">
                {filtered.map((t) => (
                  <li key={t.id}>
                    <button
                      onClick={() => setActiveId(t.id)}
                      className={`w-full text-left p-4 hover:bg-secondary/40 transition-colors ${
                        activeId === t.id ? "bg-secondary/60" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="font-medium text-sm line-clamp-1 flex-1">{t.subject}</p>
                        <StatusPill status={t.status} />
                      </div>
                      <p className="text-[11px] text-foreground/50 capitalize">
                        {t.category.replace("_", " ")}
                        {t.customer_name && ` • ${t.customer_name}`}
                        {" • "}
                        {new Date(t.last_message_at).toLocaleDateString()}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-card border border-foreground/5 rounded-2xl p-6">
            {active ? (
              <SupportThread ticket={active} viewerRole="admin" viewerUserId={user.id} />
            ) : (
              <div className="text-center py-20 text-foreground/40">
                <p className="text-sm">Select a ticket to view the conversation.</p>
              </div>
            )}
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
