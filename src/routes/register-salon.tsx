import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { GHANA_CITIES, isValidGhanaPhone, SALON_TYPE_LABELS } from "@/lib/ghana";

export const Route = createFileRoute("/register-salon")({
  head: () => ({
    meta: [
      { title: "Register your salon — Salonzee" },
      { name: "description", content: "List your salon on Salonzee. Manage bookings, services, and your calendar in one place — free until you're earning." },
      { property: "og:title", content: "Register your salon — Salonzee" },
      { property: "og:description", content: "Join Ghana's salon directory. Free onboarding, real-time bookings, SMS reminders." },
      { property: "og:url", content: "https://salonzee.lovable.app/register-salon" },
    ],
    links: [{ rel: "canonical", href: "https://salonzee.lovable.app/register-salon" }],
  }),
  component: RegisterSalonPage,
});

function RegisterSalonPage() {
  const { user, signUp } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // If the signed-in user already owns a salon, send them straight to their dashboard.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("salons")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled && data) navigate({ to: "/salon/dashboard" });
    })();
    return () => {
      cancelled = true;
    };
  }, [user, navigate]);
  const [form, setForm] = useState({
    salonName: "",
    ownerName: "",
    email: "",
    password: "",
    phone: "",
    city: "Accra",
    area: "",
    salonType: "unisex" as "male" | "female" | "unisex",
    description: "",
    referralCode: "",
  });
  const [referrer, setReferrer] = useState<string | null>(null);

  async function checkReferral(raw: string) {
    const code = raw.trim();
    if (!code) return setReferrer(null);
    const { data } = await supabase.rpc("validate_referral_code", { _code: code });
    const res = data as { valid: boolean; label?: string } | null;
    setReferrer(res?.valid ? (res.label ?? "Valid code") : null);
    if (!res?.valid) toast.error("That referral code wasn't found.");
  }

  function up<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidGhanaPhone(form.phone)) return toast.error("Enter a valid Ghana phone (e.g. 024XXXXXXX)");
    setLoading(true);

    try {
      let userId = user?.id;
      if (!userId) {
        const { error } = await signUp(form.email, form.password, form.ownerName);
        if (error) throw new Error(error);
        let { data: sess } = await supabase.auth.getSession();
        if (!sess.session) {
          // Email confirmation may be on — try signing in immediately
          await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
          ({ data: sess } = await supabase.auth.getSession());
        }
        userId = sess.session?.user.id;
        if (!userId) {
          throw new Error("Please confirm your email, then sign in to finish registering your salon.");
        }
      }

      const { data: newSalon, error: insertError } = await supabase
        .from("salons")
        .insert({
          user_id: userId,
          name: form.salonName,
          phone: form.phone.replace(/\s+/g, ""),
          location_city: form.city,
          location_area: form.area,
          salon_type: form.salonType,
          description: form.description || null,
          referred_by_code: form.referralCode.trim() ? form.referralCode.trim().toUpperCase() : null,
          status: "pending",
        })
        .select("id")
        .single();
      if (insertError) throw insertError;


      const { error: contactError } = await supabase.from("salon_contacts").insert({
        salon_id: newSalon.id,
        owner_name: form.ownerName,
        email: form.email,
      });
      if (contactError) throw contactError;

      toast.success("Submitted! Your salon is pending review.");
      navigate({ to: userId ? "/salon/dashboard" : "/login" });
    } catch (err) {
      console.error("[register-salon] submission failed", err);
      const known = err instanceof Error && /password|email|account|confirm|attempts/i.test(err.message);
      toast.error(
        known ? err.message : "Could not submit your business. Please check your details and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-background">
      <SiteNav />
      <section className="max-w-5xl mx-auto px-6 py-16 grid lg:grid-cols-[1fr_1.2fr] gap-12 items-start">
        <aside className="lg:sticky lg:top-24">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-3">For salon owners</p>
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-4 leading-tight">
            List your salon. Fill more chairs.
          </h1>
          <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
            Join Ghana's growing directory of trusted salons. Approval takes one business day. No setup fees, no contracts.
          </p>
          <ul className="space-y-3 text-sm">
            {[
              "Public profile in the Salonzee directory",
              "Real-time online booking with no double-bookings",
              "Automated SMS confirmations and 24h reminders",
              "Simple dashboard for services, hours, and bookings",
              "Free until you're earning",
            ].map((b) => (
              <li key={b} className="flex items-start gap-2.5 text-foreground/80">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </aside>
        <div>
          <h2 className="sr-only">Register your salon</h2>
          <form onSubmit={submit} className="space-y-5 bg-card p-8 rounded-3xl border border-border shadow-sm">
            <Field label="Salon name">
              <input required value={form.salonName} onChange={(e) => up("salonName", e.target.value)} className="input" />
            </Field>
            <Field label="Owner's full name">
              <input required value={form.ownerName} onChange={(e) => up("ownerName", e.target.value)} className="input" />
            </Field>
            {!user && (
              <>
                <Field label="Email (for login)">
                  <input required type="email" value={form.email} onChange={(e) => up("email", e.target.value)} className="input" />
                </Field>
                <Field label="Password (min 6 chars)">
                  <input required type="password" minLength={6} value={form.password} onChange={(e) => up("password", e.target.value)} className="input" />
                </Field>
              </>
            )}
            {user && (
              <Field label="Contact email">
                <input required type="email" value={form.email} onChange={(e) => up("email", e.target.value)} className="input" />
              </Field>
            )}
            <Field label="Phone (Ghana format e.g. 0241234567)">
              <input required type="tel" value={form.phone} onChange={(e) => up("phone", e.target.value)} className="input" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="City">
                <select value={form.city} onChange={(e) => up("city", e.target.value)} className="input">
                  {GHANA_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Area / neighbourhood">
                <input required value={form.area} onChange={(e) => up("area", e.target.value)} className="input" placeholder="e.g. East Legon" />
              </Field>
            </div>
            <Field label="Salon type">
              <select value={form.salonType} onChange={(e) => up("salonType", e.target.value as "male" | "female" | "unisex")} className="input">
                {Object.entries(SALON_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="Short description">
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => up("description", e.target.value)}
                className="input"
                placeholder="What makes your salon special?"
              />
            </Field>
            <Field label="Referral code (optional)">
              <input
                value={form.referralCode}
                onChange={(e) => up("referralCode", e.target.value.toUpperCase())}
                onBlur={(e) => checkReferral(e.target.value)}
                className="input"
                placeholder="Who told you about us?"
              />
              {referrer && (
                <span className="block text-xs text-primary mt-1.5">Referred by {referrer}</span>
              )}
            </Field>

            <button
              disabled={loading}
              className="w-full bg-primary text-primary-foreground py-4 rounded-full font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {loading ? "Submitting…" : "Submit for review"}
            </button>
            <p className="text-xs text-muted-foreground text-center mt-3">
              By submitting you agree to a quick verification call from our team.
            </p>
          </form>
        </div>

      </section>
      <SiteFooter />
      <style>{`
        .input { width: 100%; background: var(--background); border: 1px solid var(--border); padding: 0.625rem 1rem; height: 2.75rem; border-radius: 0.75rem; font-size: 0.875rem; outline: none; transition: border-color .15s, box-shadow .15s; }
        .input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px color-mix(in oklab, var(--primary) 20%, transparent); }
        textarea.input { height: auto; min-height: 5.5rem; padding-top: 0.75rem; }
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
