import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, ExternalLink, MessageCircle, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { BUSINESS_CATEGORY_LABELS, type BusinessCategory, whatsappLink } from "@/lib/ghana";
import { CONTACT_PREFERENCE_LABELS, type SalonLeadStatus } from "@/lib/salon-leads";

export const Route = createFileRoute("/_authenticated/admin/leads")({
  head: () => ({
    meta: [
      { title: "Onboarding Leads — Salonzee Admin" },
      { name: "description", content: "Follow up with beauty businesses that requested help joining Salonzee." },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:title", content: "Onboarding Leads — Salonzee Admin" },
      { property: "og:description", content: "Private salon onboarding lead management." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminLeadsPage,
});

type LeadRow = {
  id: string;
  owner_name: string;
  business_name: string;
  phone: string;
  business_category: BusinessCategory;
  city: string;
  area: string | null;
  preferred_contact: "phone" | "whatsapp" | "either";
  help_text: string | null;
  status: SalonLeadStatus;
  admin_notes: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  gclid: string | null;
  referrer: string | null;
  landing_path: string;
  admin_alert_sms_id: string | null;
  created_at: string;
};

function AdminLeadsPage() {
  const { loading, isPlatformAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | SalonLeadStatus>("new");

  const { data: leads = [], isError, refetch, isFetching } = useQuery({
    queryKey: ["admin-salon-leads"],
    enabled: isPlatformAdmin,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("salon_leads")
        .select("id, owner_name, business_name, phone, business_category, city, area, preferred_contact, help_text, status, admin_notes, utm_source, utm_medium, utm_campaign, utm_term, utm_content, gclid, referrer, landing_path, admin_alert_sms_id, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as LeadRow[];
    },
  });

  const updateLead = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: SalonLeadStatus; notes: string }) => {
      const { error } = await supabase
        .from("salon_leads")
        .update({ status, admin_notes: notes.trim() || null, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Follow-up updated");
      queryClient.invalidateQueries({ queryKey: ["admin-salon-leads"] });
    },
    onError: () => toast.error("Could not update this lead. Please try again."),
  });

  if (loading) return <div className="p-10">Loading…</div>;
  if (!isPlatformAdmin) {
    return (
      <div className="min-h-dvh bg-background">
        <SiteNav />
        <main className="max-w-2xl mx-auto px-6 py-20 text-center">
          <h1 className="font-serif text-3xl mb-3">Admin access required</h1>
          <p className="text-muted-foreground">Onboarding lead contact details are only available to platform admins.</p>
        </main>
      </div>
    );
  }
  const visible = filter === "all" ? leads : leads.filter((lead) => lead.status === filter);

  return (
    <div className="min-h-dvh bg-background">
      <SiteNav />
      <main className="max-w-6xl mx-auto px-5 sm:px-6 md:px-10 py-10 md:py-12">
        <p className="text-[10px] uppercase tracking-[0.3em] text-foreground/40">Platform Admin</p>
        <div className="flex items-end justify-between flex-wrap gap-4 mb-3">
          <div>
            <h1 className="font-serif text-4xl sm:text-5xl">Onboarding leads</h1>
            <p className="text-sm text-foreground/60 mt-2">Personal follow-up for businesses that asked for help joining Salonzee.</p>
          </div>
          <button onClick={() => refetch()} className="border border-foreground/20 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-[0.18em] hover:bg-muted">
            {isFetching ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-8">
          <Tile label="New" value={leads.filter((lead) => lead.status === "new").length} />
          <Tile label="Contacted" value={leads.filter((lead) => lead.status === "contacted").length} />
          <Tile label="Converted" value={leads.filter((lead) => lead.status === "converted").length} />
          <Tile label="Latest 200" value={leads.length} />
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-foreground/10 mb-6 scrollbar-none">
          {(["new", "contacted", "converted", "archived", "all"] as const).map((status) => (
            <button key={status} onClick={() => setFilter(status)} className={`whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] -mb-px border-b-2 ${filter === status ? "border-primary text-foreground" : "border-transparent text-foreground/40"}`}>
              {status} ({status === "all" ? leads.length : leads.filter((lead) => lead.status === status).length})
            </button>
          ))}
        </div>

        {isError && <p role="alert" className="rounded-xl bg-destructive/10 text-destructive p-4 text-sm">Leads could not be loaded. Please refresh and try again.</p>}
        {!isError && leads.length === 0 && (
          <div className="rounded-3xl border border-border bg-card px-6 py-12 text-center">
            <h2 className="font-display text-2xl font-bold mb-3">No assisted-onboarding leads yet</h2>
            <p className="max-w-2xl mx-auto text-sm text-muted-foreground leading-relaxed mb-7">
              Requests submitted through the <strong className="text-foreground">Get Listed</strong> form will appear here. Businesses that registered themselves are not leads; find them under Pending salon registrations.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Link to="/admin/pending" className="inline-flex justify-center bg-primary text-primary-foreground px-6 py-3 rounded-full text-sm font-semibold">
                View pending salons
              </Link>
              <Link to="/get-listed" className="inline-flex justify-center border border-border px-6 py-3 rounded-full text-sm font-semibold hover:bg-muted">
                Open the Get Listed form
              </Link>
            </div>
          </div>
        )}
        {!isError && leads.length > 0 && visible.length === 0 && <p className="text-muted-foreground italic py-12 text-center">No {filter} leads. Choose “all” to see every saved lead.</p>}

        <div className="space-y-4">
          {visible.map((lead) => (
            <LeadCard key={lead.id} lead={lead} saving={updateLead.isPending} onSave={(status, notes) => updateLead.mutate({ id: lead.id, status, notes })} />
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function LeadCard({ lead, saving, onSave }: { lead: LeadRow; saving: boolean; onSave: (status: SalonLeadStatus, notes: string) => void }) {
  const [status, setStatus] = useState<SalonLeadStatus>(lead.status);
  const [notes, setNotes] = useState(lead.admin_notes ?? "");
  const whatsapp = whatsappLink(lead.phone, `Hello ${lead.owner_name}, this is Salonzee. You asked for help listing ${lead.business_name}. We’re ready to help with your onboarding.`);
  const attribution = [lead.utm_source, lead.utm_medium, lead.utm_campaign, lead.utm_term, lead.utm_content].filter(Boolean).join(" / ");

  return (
    <article className="bg-card border border-border rounded-2xl p-5 sm:p-6">
      <div className="grid lg:grid-cols-[1fr_270px] gap-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <h2 className="font-serif text-2xl">{lead.business_name}</h2>
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded bg-secondary text-secondary-foreground">{lead.status}</span>
            {lead.admin_alert_sms_id ? (
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"><CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Admin SMS queued</span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] text-destructive"><AlertTriangle className="h-3.5 w-3.5" /> Lead saved; SMS alert not queued</span>
            )}
          </div>
          <p className="text-sm text-foreground/70">{lead.owner_name} • {lead.phone}</p>
          <p className="text-sm text-foreground/60 mt-1">{BUSINESS_CATEGORY_LABELS[lead.business_category]} • {[lead.area, lead.city].filter(Boolean).join(", ")}</p>
          <p className="text-xs text-foreground/50 mt-2">Prefers <strong className="text-foreground/80">{CONTACT_PREFERENCE_LABELS[lead.preferred_contact]}</strong> • {new Date(lead.created_at).toLocaleString("en-GH")}</p>

          {lead.help_text && <blockquote className="mt-4 rounded-xl bg-muted px-4 py-3 text-sm text-foreground/75 leading-relaxed">“{lead.help_text}”</blockquote>}

          <div className="mt-4 rounded-xl border border-border p-3 text-xs space-y-1.5">
            <p><span className="text-foreground/45">Campaign: </span><span className="font-medium break-words">{attribution || "Direct or not captured"}</span></p>
            {lead.gclid && <p className="text-foreground/55">Google Ads click ID captured</p>}
            {lead.referrer && <p className="break-words"><span className="text-foreground/45">Referrer: </span>{lead.referrer}</p>}
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <a href={`tel:${lead.phone}`} className="inline-flex items-center gap-2 border border-foreground/20 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] hover:bg-muted"><Phone className="h-3.5 w-3.5" /> Call</a>
            {whatsapp && <a href={whatsapp} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 border border-foreground/20 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] hover:bg-muted"><MessageCircle className="h-3.5 w-3.5" /> WhatsApp <ExternalLink className="h-3 w-3" /></a>}
          </div>
        </div>

        <div className="space-y-3 lg:border-l lg:border-border lg:pl-6">
          <label className="block text-xs font-semibold text-foreground/70">Follow-up status
            <select value={status} onChange={(event) => setStatus(event.target.value as SalonLeadStatus)} className="mt-1.5 w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm font-normal">
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="converted">Converted</option>
              <option value="archived">Archived</option>
            </select>
          </label>
          <label className="block text-xs font-semibold text-foreground/70">Private admin notes
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} maxLength={1000} placeholder="What happened on the call? What is the next step?" className="mt-1.5 w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm font-normal resize-none" />
          </label>
          <button disabled={saving} onClick={() => onSave(status, notes)} className="w-full bg-primary text-primary-foreground rounded-lg px-4 py-2.5 text-xs font-bold uppercase tracking-[0.15em] disabled:opacity-50">
            {saving ? "Saving…" : "Save follow-up"}
          </button>
        </div>
      </div>
    </article>
  );
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="font-serif text-3xl">{value}</p>
      <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/40 mt-1">{label}</p>
    </div>
  );
}
