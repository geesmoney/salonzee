import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/report-issue")({
  head: () => ({
    meta: [
      { title: "Report a booking issue — Salonzee" },
      { name: "description", content: "Tell the Salonzee team about a problem with a recent booking and we'll follow up with you and the salon." },
      { property: "og:title", content: "Report a booking issue — Salonzee" },
      { property: "og:description", content: "Reach the Salonzee team about a recent booking problem." },
      { property: "og:url", content: "https://salonzee.lovable.app/report-issue" },
    ],
    links: [{ rel: "canonical", href: "https://salonzee.lovable.app/report-issue" }],
  }),
  component: ReportIssuePage,
});

function ReportIssuePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [salonName, setSalonName] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login" });
    }
  }, [user, loading, navigate]);

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Please sign in to report an issue");
      const trimmedSubject = subject.trim();
      const trimmedBody = body.trim();
      const trimmedName = name.trim();
      const trimmedPhone = phone.trim();
      if (trimmedName.length < 2) throw new Error("Please enter your name");
      if (!/^[0-9+\s\-()]{7,20}$/.test(trimmedPhone)) throw new Error("Please enter a valid phone number");
      if (trimmedSubject.length < 3) throw new Error("Subject must be at least 3 characters");
      if (trimmedBody.length < 10) throw new Error("Please describe the issue (at least 10 characters)");

      const fullBody = `${trimmedBody}\n\n—\nSalon: ${salonName || "(not provided)"}\nBooking date: ${bookingDate || "(not provided)"}\nReporter: ${trimmedName} • ${trimmedPhone}`;

      const { data: ticket, error } = await supabase
        .from("support_tickets")
        .insert({
          subject: trimmedSubject,
          category: "booking_issue",
          customer_name: trimmedName,
          customer_phone: trimmedPhone,
          opened_by_user_id: user.id,
        })
        .select("id")
        .single();
      if (error) throw error;

      const { error: msgErr } = await supabase.from("support_messages").insert({
        ticket_id: ticket.id,
        sender_type: "customer",
        sender_user_id: user.id,
        body: fullBody,
      });
      if (msgErr) throw msgErr;
    },
    onSuccess: () => {
      toast.success("Report received — our team will follow up by phone");
      setDone(true);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading || !user) {
    return (
      <div className="min-h-dvh bg-background text-foreground">
        <SiteNav />
        <div className="max-w-2xl mx-auto px-6 md:px-10 py-24 text-center text-foreground/50 text-sm">
          Loading…
        </div>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <SiteNav />
      <section className="max-w-2xl mx-auto px-6 md:px-10 py-16">
        <p className="text-[10px] uppercase tracking-[0.3em] text-foreground/40 mb-2">Customer support</p>
        <h1 className="font-serif text-4xl md:text-5xl mb-3">Report a booking issue</h1>
        <p className="text-foreground/60 mb-10 leading-relaxed">
          No-show, cancellation, or a problem with the service? Tell us what happened and we'll follow up with the salon on your behalf.
        </p>

        {done ? (
          <div className="bg-card border border-foreground/5 rounded-2xl p-8 text-center">
            <h2 className="font-serif text-2xl mb-2">Thanks — we've got it.</h2>
            <p className="text-foreground/60 text-sm mb-6">
              Our team will reach you on the phone number you provided within one business day.
            </p>
            <Link to="/" className="text-accent hover:underline text-sm font-bold uppercase tracking-[0.2em]">
              Back to home
            </Link>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit.mutate();
            }}
            className="bg-card border border-foreground/5 rounded-2xl p-6 md:p-8 space-y-5"
          >
            <Field label="Your name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                required
                className="input"
              />
            </Field>
            <Field label="Phone number">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={20}
                required
                placeholder="e.g. 024 123 4567"
                className="input"
              />
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Salon name (optional)">
                <input
                  value={salonName}
                  onChange={(e) => setSalonName(e.target.value)}
                  maxLength={200}
                  className="input"
                />
              </Field>
              <Field label="Booking date (optional)">
                <input
                  type="date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="input"
                />
              </Field>
            </div>
            <Field label="Subject">
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={200}
                required
                placeholder="e.g. Salon didn't show up for my appointment"
                className="input"
              />
            </Field>
            <Field label="What happened?">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                maxLength={4000}
                required
                className="input resize-none"
              />
            </Field>
            <button
              type="submit"
              disabled={submit.isPending}
              className="bg-primary text-primary-foreground px-6 py-3 rounded-full text-sm font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {submit.isPending ? "Sending…" : "Submit report"}
            </button>
          </form>
        )}
      </section>
      <SiteFooter />
      <style>{`.input{width:100%;background:hsl(var(--background));border:1px solid hsl(var(--foreground)/0.15);border-radius:0.75rem;padding:0.625rem 1rem;font-size:0.875rem;outline:none}.input:focus{border-color:hsl(var(--accent))}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.2em] text-foreground/50 mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}
