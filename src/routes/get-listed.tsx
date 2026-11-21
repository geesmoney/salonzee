import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, CheckCircle2, MessageCircle, Phone, Store } from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { submitSalonLead } from "@/lib/salon-leads.functions";
import { salonLeadSchema } from "@/lib/salon-leads";
import {
  BUSINESS_CATEGORY_LABELS,
  GHANA_CITIES,
  type BusinessCategory,
} from "@/lib/ghana";

export const Route = createFileRoute("/get-listed")({
  head: () => ({
    meta: [
      { title: "Get help listing your beauty business — Salonzee" },
      { name: "description", content: "Tell Salonzee about your salon, barbering shop, nail business or beauty service and get personal help with your online listing." },
      { property: "og:title", content: "Get help listing your beauty business — Salonzee" },
      { property: "og:description", content: "A short request is enough. Choose phone or WhatsApp and let Salonzee help you get your business online." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://salonzee.com/get-listed" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://salonzee.com/get-listed" }],
  }),
  component: GetListedPage,
});

type ContactPreference = "phone" | "whatsapp" | "either";

type Attribution = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  gclid: string | null;
  referrer: string | null;
  landing_path: string;
};

const emptyAttribution: Attribution = {
  utm_source: null,
  utm_medium: null,
  utm_campaign: null,
  utm_term: null,
  utm_content: null,
  gclid: null,
  referrer: null,
  landing_path: "/get-listed",
};

function GetListedPage() {
  const startedAt = useRef(0);
  const [attribution, setAttribution] = useState<Attribution>(emptyAttribution);
  const [form, setForm] = useState({
    ownerName: "",
    businessName: "",
    phone: "",
    businessCategory: "hair_salon" as BusinessCategory,
    city: "Accra",
    area: "",
    preferredContact: "either" as ContactPreference,
    helpText: "",
    consent: false,
    honeypot: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [duplicate, setDuplicate] = useState(false);

  useEffect(() => {
    startedAt.current = Date.now();
    const params = new URLSearchParams(window.location.search);
    const capture = (key: string, max: number) => {
      const value = params.get(key)?.trim();
      return value ? value.slice(0, max) : null;
    };
    setAttribution({
      utm_source: capture("utm_source", 100),
      utm_medium: capture("utm_medium", 100),
      utm_campaign: capture("utm_campaign", 150),
      utm_term: capture("utm_term", 150),
      utm_content: capture("utm_content", 150),
      gclid: capture("gclid", 300),
      referrer: document.referrer ? document.referrer.slice(0, 500) : null,
      landing_path: window.location.pathname,
    });
  }, []);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const payload = {
      ...form,
      area: form.area.trim() || null,
      helpText: form.helpText.trim() || null,
      elapsedMs: startedAt.current ? Date.now() - startedAt.current : 0,
      ...attribution,
    };
    const parsed = salonLeadSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check your details and try again.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitSalonLead({ data: parsed.data });
      setDuplicate(result.duplicate);
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "";
      setError(message && !message.includes("fetch") ? message : "We could not send your request. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-dvh bg-background">
      <SiteNav />
      <main>
        <section className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 py-10 md:py-16 grid lg:grid-cols-[0.95fr_1.05fr] gap-10 lg:gap-16 items-start">
          <div className="lg:sticky lg:top-28 lg:py-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground mb-6">
              <Store className="h-3.5 w-3.5" /> Personal onboarding for beauty businesses
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-[1.04] tracking-tight max-w-xl mb-6">
              Your next client is already looking for you.
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-lg mb-8">
              Tell us about your business. We’ll contact you your way and help you understand what you need for a strong Salonzee listing.
            </p>

            <ol className="space-y-5 max-w-md">
              {[
                ["Share the basics", "No password, long application or technical setup."],
                ["Choose how we reach you", "Phone call, WhatsApp, or whichever is easier."],
                ["Get ready for customers", "Learn what services, photos and details your public page needs."],
              ].map(([title, detail], index) => (
                <li key={title} className="flex gap-4">
                  <span className="h-8 w-8 shrink-0 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-bold">{index + 1}</span>
                  <div>
                    <h2 className="text-base mb-1">{title}</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">{detail}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-9 pt-6 border-t border-border text-sm text-muted-foreground">
              Ready to do it yourself?{" "}
              <Link to="/register-salon" className="text-foreground font-semibold underline decoration-primary decoration-2 underline-offset-4">
                Register your business <ArrowRight className="inline h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <div className="bg-card border border-border rounded-[2rem] shadow-sm overflow-hidden">
            {submitted ? (
              <div className="p-7 sm:p-10 min-h-[540px] flex flex-col justify-center" role="status">
                <span className="h-14 w-14 rounded-full bg-primary/15 text-primary flex items-center justify-center mb-6">
                  <CheckCircle2 className="h-7 w-7" />
                </span>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-semibold mb-3">Request received</p>
                <h2 className="font-display text-3xl sm:text-4xl mb-4">
                  {duplicate ? "We already have your request." : `Thanks, ${form.ownerName.split(" ")[0]}.`}
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-7">
                  {duplicate
                    ? "There’s no need to submit again. Your details are already with the Salonzee onboarding team."
                    : <>Your details are with the Salonzee onboarding team. We’ll use your preferred contact method: <strong className="text-foreground">{form.preferredContact === "phone" ? "phone call" : form.preferredContact === "whatsapp" ? "WhatsApp" : "phone or WhatsApp"}</strong>.</>}
                </p>
                <div className="rounded-2xl bg-secondary p-5 text-sm leading-relaxed text-secondary-foreground mb-7">
                  Want to move ahead now? You can create your account and submit your full business profile for review.
                </div>
                <Link to="/register-salon" className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-full px-6 py-3.5 font-semibold text-sm hover:opacity-90 transition-opacity">
                  Continue to full registration <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <form onSubmit={submit} className="p-6 sm:p-8 md:p-10 space-y-5">
                <div className="mb-7">
                  <p className="text-xs uppercase tracking-[0.2em] text-primary font-bold mb-2">Help me get listed</p>
                  <h2 className="font-display text-2xl sm:text-3xl mb-2">Tell us about your business</h2>
                  <p className="text-sm text-muted-foreground">This takes about a minute. No account needed.</p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Your name">
                    <input required autoComplete="name" value={form.ownerName} onChange={(e) => update("ownerName", e.target.value)} className="lead-input" placeholder="e.g. Ama Mensah" />
                  </Field>
                  <Field label="Business name">
                    <input required autoComplete="organization" value={form.businessName} onChange={(e) => update("businessName", e.target.value)} className="lead-input" placeholder="e.g. Ama’s Beauty Studio" />
                  </Field>
                </div>

                <Field label="Phone or WhatsApp number">
                  <input required type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} className="lead-input" placeholder="024 123 4567" />
                </Field>

                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Business category">
                    <select value={form.businessCategory} onChange={(e) => update("businessCategory", e.target.value as BusinessCategory)} className="lead-input">
                      {Object.entries(BUSINESS_CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </Field>
                  <Field label="City">
                    <select value={form.city} onChange={(e) => update("city", e.target.value)} className="lead-input">
                      {GHANA_CITIES.map((city) => <option key={city} value={city}>{city}</option>)}
                    </select>
                  </Field>
                </div>

                <Field label="Area or neighbourhood (optional)">
                  <input autoComplete="address-level3" value={form.area} onChange={(e) => update("area", e.target.value)} className="lead-input" placeholder="e.g. East Legon" />
                </Field>

                <fieldset>
                  <legend className="block text-xs font-semibold text-foreground/80 mb-2">How should we contact you?</legend>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      ["phone", "Phone", Phone],
                      ["whatsapp", "WhatsApp", MessageCircle],
                      ["either", "Either", Check],
                    ] as const).map(([value, label, Icon]) => (
                      <label key={value} className={`flex items-center justify-center gap-1.5 rounded-xl border px-2 py-3 text-xs sm:text-sm font-semibold cursor-pointer transition-colors ${form.preferredContact === value ? "border-primary bg-primary/10 text-foreground" : "border-border bg-background text-muted-foreground hover:bg-muted"}`}>
                        <input type="radio" name="preferred-contact" value={value} checked={form.preferredContact === value} onChange={() => update("preferredContact", value)} className="sr-only" />
                        <Icon className="h-4 w-4 shrink-0" /> {label}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <Field label="What would you like help with? (optional)">
                  <textarea rows={3} value={form.helpText} onChange={(e) => update("helpText", e.target.value)} className="lead-input resize-none" placeholder="For example: setting up my services, photos or booking page" />
                </Field>

                <div className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
                  <label>Website<input tabIndex={-1} autoComplete="off" value={form.honeypot} onChange={(e) => update("honeypot", e.target.value)} /></label>
                </div>

                <label className="flex items-start gap-3 text-sm text-muted-foreground leading-relaxed cursor-pointer">
                  <input type="checkbox" checked={form.consent} onChange={(e) => update("consent", e.target.checked)} className="mt-1 h-4 w-4 accent-primary" />
                  <span>Salonzee may contact me about listing this business and helping with onboarding.</span>
                </label>

                {error && <p role="alert" className="rounded-xl bg-destructive/10 text-destructive px-4 py-3 text-sm leading-relaxed">{error}</p>}

                <button disabled={submitting} className="w-full bg-primary text-primary-foreground py-4 rounded-full font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                  {submitting ? "Sending your request…" : "Help me list my business"}
                </button>
                <p className="text-xs text-muted-foreground text-center">Your details are only shared with the Salonzee admin team for this follow-up.</p>
              </form>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
      <style>{`
        .lead-input { width: 100%; background: var(--background); border: 1px solid var(--border); padding: 0.75rem 1rem; min-height: 3rem; border-radius: 0.75rem; font-size: 0.875rem; outline: none; transition: border-color .15s, box-shadow .15s; }
        .lead-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px color-mix(in oklab, var(--primary) 20%, transparent); }
        textarea.lead-input { min-height: 6rem; }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-foreground/80 mb-1.5">{label}</span>
      {children}
    </label>
  );
}
