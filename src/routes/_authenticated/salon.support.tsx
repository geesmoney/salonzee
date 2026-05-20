import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/use-auth";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { SupportThread, StatusPill } from "@/components/support-thread";

type Ticket = Database["public"]["Tables"]["support_tickets"]["Row"];
type Category = Database["public"]["Enums"]["support_ticket_category"];

export const Route = createFileRoute("/_authenticated/salon/support")({
  head: () => ({ meta: [{ title: "Support — Salonzee" }] }),
  component: SalonSupportPage,
});

function SalonSupportPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  const { data: salon } = useQuery({
    queryKey: ["my-salon", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("salons").select("id, name").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: tickets = [] } = useQuery({
    queryKey: ["support-tickets", "owner", user?.id, salon?.id],
    enabled: !!user,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      return data as Ticket[];
    },
  });

  const active = tickets.find((t) => t.id === activeId) ?? null;

  if (loading || !user) return null;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <SiteNav />
      <section className="max-w-7xl mx-auto px-6 md:px-10 py-12">
        <div className="flex items-baseline justify-between gap-4 flex-wrap mb-8">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-foreground/40">Support</p>
            <h1 className="font-serif text-5xl">Talk to Salonzee</h1>
            <p className="text-sm text-foreground/60 mt-1">We usually reply within one business day.</p>
          </div>
          <button
            onClick={() => {
              setComposing(true);
              setActiveId(null);
            }}
            className="bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-sm font-semibold hover:opacity-90"
          >
            New ticket
          </button>
        </div>

        <div className="grid md:grid-cols-[320px_1fr] gap-6 min-h-[60vh]">
          {/* List */}
          <div className="bg-card border border-foreground/5 rounded-2xl overflow-hidden">
            {tickets.length === 0 ? (
              <p className="text-foreground/40 italic text-sm p-6">No tickets yet.</p>
            ) : (
              <ul className="divide-y divide-foreground/5">
                {tickets.map((t) => (
                  <li key={t.id}>
                    <button
                      onClick={() => {
                        setActiveId(t.id);
                        setComposing(false);
                      }}
                      className={`w-full text-left p-4 hover:bg-secondary/40 transition-colors ${
                        activeId === t.id ? "bg-secondary/60" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="font-medium text-sm line-clamp-1 flex-1">{t.subject}</p>
                        <StatusPill status={t.status} />
                      </div>
                      <p className="text-[11px] text-foreground/50 capitalize">
                        {t.category.replace("_", " ")} • {new Date(t.last_message_at).toLocaleDateString()}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Detail */}
          <div className="bg-card border border-foreground/5 rounded-2xl p-6">
            {composing ? (
              <NewTicketForm
                salonId={salon?.id ?? null}
                userId={user.id}
                onCreated={(id) => {
                  setComposing(false);
                  setActiveId(id);
                  qc.invalidateQueries({ queryKey: ["support-tickets"] });
                }}
                onCancel={() => setComposing(false)}
              />
            ) : active ? (
              <SupportThread ticket={active} viewerRole="owner" viewerUserId={user.id} />
            ) : (
              <div className="text-center py-20 text-foreground/40">
                <p className="text-sm">Select a ticket or start a new one.</p>
              </div>
            )}
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

function NewTicketForm({
  salonId,
  userId,
  onCreated,
  onCancel,
}: {
  salonId: string | null;
  userId: string;
  onCreated: (id: string) => void;
  onCancel: () => void;
}) {
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<Category>("general");
  const [body, setBody] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      const s = subject.trim();
      const b = body.trim();
      if (s.length < 3) throw new Error("Subject must be at least 3 characters");
      if (b.length < 5) throw new Error("Message must be at least 5 characters");

      const { data: ticket, error } = await supabase
        .from("support_tickets")
        .insert({
          subject: s,
          category,
          salon_id: salonId,
          opened_by_user_id: userId,
        })
        .select("id")
        .single();
      if (error) throw error;

      const { error: msgErr } = await supabase.from("support_messages").insert({
        ticket_id: ticket.id,
        sender_type: "owner",
        sender_user_id: userId,
        body: b,
      });
      if (msgErr) throw msgErr;
      return ticket.id;
    },
    onSuccess: (id) => {
      toast.success("Ticket sent — we'll reply soon");
      onCreated(id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        create.mutate();
      }}
      className="space-y-4"
    >
      <h2 className="font-serif text-2xl">New support ticket</h2>
      <div>
        <label className="text-[10px] uppercase tracking-[0.2em] text-foreground/50 mb-1.5 block">Subject</label>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={200}
          required
          className="w-full bg-background border border-foreground/15 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
        />
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-[0.2em] text-foreground/50 mb-1.5 block">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as Category)}
          className="w-full bg-background border border-foreground/15 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
        >
          <option value="general">General question</option>
          <option value="billing">Billing</option>
          <option value="booking_issue">Booking issue</option>
          <option value="technical">Technical problem</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-[0.2em] text-foreground/50 mb-1.5 block">Message</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          maxLength={4000}
          required
          className="w-full bg-background border border-foreground/15 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent resize-none"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={create.isPending}
          className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full text-sm font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {create.isPending ? "Sending…" : "Send ticket"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-foreground/60 hover:text-foreground px-4 py-2.5"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
