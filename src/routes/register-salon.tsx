import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
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
      { name: "description", content: "List your salon on Salonzee. Manage bookings, services, and your calendar in one place." },
    ],
  }),
  component: RegisterSalonPage,
});

function RegisterSalonPage() {
  const { user, signUp } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
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
  });

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
        // Try to grab the session if email-confirmation is off
        const { data: sess } = await supabase.auth.getSession();
        userId = sess.session?.user.id;
      }

      const { error: insertError } = await supabase.from("salons").insert({
        user_id: userId ?? null,
        name: form.salonName,
        owner_name: form.ownerName,
        email: form.email,
        phone: form.phone.replace(/\s+/g, ""),
        location_city: form.city,
        location_area: form.area,
        salon_type: form.salonType,
        description: form.description || null,
        status: "pending",
      });
      if (insertError) throw insertError;

      toast.success("Submitted! Your salon is pending review.");
      navigate({ to: userId ? "/salon/dashboard" : "/login" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-background">
      <SiteNav />
      <section className="max-w-2xl mx-auto px-6 py-16">
        <h1 className="font-serif text-5xl md:text-6xl mb-3">Register Your Salon</h1>
        <p className="text-foreground/60 mb-10">
          Submit your salon for review. Once approved, you'll appear in our directory.
        </p>

        <form onSubmit={submit} className="space-y-5 bg-card p-8 rounded-3xl ring-1 ring-foreground/5">
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

          <button
            disabled={loading}
            className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-bold uppercase text-xs tracking-[0.2em] hover:bg-clay disabled:opacity-50"
          >
            {loading ? "Submitting..." : "Submit for Review"}
          </button>
        </form>
      </section>
      <SiteFooter />
      <style>{`
        .input { width: 100%; background: var(--background); border: 1px solid color-mix(in oklab, var(--foreground) 10%, transparent); padding: 0.75rem 1rem; border-radius: 0.75rem; font-size: 0.875rem; outline: none; }
        .input:focus { border-color: var(--accent); }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/50 mb-2">{label}</span>
      {children}
    </label>
  );
}
