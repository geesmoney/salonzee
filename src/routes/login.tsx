import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarCheck2, History, WalletCards } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { claimPendingBooking, homeFor } from "@/lib/customer-account";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { SiteNav } from "@/components/site-nav";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Customer account & sign in — Salonzee" },
      { name: "description", content: "Create a free Salonzee customer account to keep your bookings and spending together, or sign in to manage your business." },
      { property: "og:title", content: "Customer account & sign in — Salonzee" },
      { property: "og:description", content: "A free customer account for your bookings and spending. Business owners can also sign in here." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://salonzee.com/login" },
    ],
    links: [{ rel: "canonical", href: "https://salonzee.com/login" }],
  }),
  validateSearch: (s: Record<string, unknown>): { mode?: "signin" | "signup" } =>
    s["mode"] === "signup" ? { mode: "signup" } : {},
  component: LoginPage,
});

function LoginPage() {
  const { signIn, signUp, user, isPlatformAdmin } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">(search.mode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      await claimPendingBooking();
      const to = await homeFor(user.id, isPlatformAdmin);
      if (alive) navigate({ to, replace: true });
    })();
    return () => { alive = false; };
  }, [user, isPlatformAdmin, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setLoading(false);
      if (error) return toast.error("Could not send the reset email. Please try again.");
      toast.success("If that email has an account, a reset link is on its way.");
      setMode("signin");
      return;
    }
    const { error } = mode === "signin"
      ? await signIn(email, password)
      : await signUp(email, password, fullName);
    setLoading(false);
    if (error) return toast.error(error);
    toast.success(mode === "signup" ? "Customer account created. Opening your bookings…" : "Welcome back.");
    // Redirect happens once the session arrives (see effect above).
  }

  async function signInWithGoogle() {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setLoading(false);
      toast.error(result.error.message ?? "Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    setLoading(false);
  }

  const isSignUp = mode === "signup";

  return (
    <div className="min-h-dvh bg-background">
      <SiteNav />
      <div className={`mx-auto px-4 sm:px-6 py-10 sm:py-16 grid gap-8 lg:gap-14 items-center ${isSignUp ? "max-w-5xl lg:grid-cols-[1fr_1.05fr]" : "max-w-md"}`}>
        <section className="w-full max-w-md mx-auto" aria-labelledby="account-title">
          {mode !== "forgot" && (
            <div className="grid grid-cols-2 rounded-full bg-muted p-1 mb-8" aria-label="Account options">
              <button
                type="button"
                aria-pressed={mode === "signin"}
                onClick={() => setMode("signin")}
                className={`rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${mode === "signin" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                Sign in
              </button>
              <button
                type="button"
                aria-pressed={isSignUp}
                onClick={() => setMode("signup")}
                className={`rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${isSignUp ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                Create account
              </button>
            </div>
          )}

          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-3">
            {mode === "forgot" ? "Account recovery" : "Customer account"}
          </p>
          <h1 id="account-title" className="font-display text-4xl sm:text-5xl font-bold tracking-tight mb-3">
            {mode === "signin" ? "Welcome back" : isSignUp ? "Create your free account" : "Reset your password"}
          </h1>
          <p className="text-muted-foreground mb-8 text-sm sm:text-base leading-relaxed">
            {mode === "signin"
              ? "Sign in to see your bookings and spending. Salon owners use the same sign-in to reach their dashboard."
              : isSignUp
                ? "Keep every appointment and payment record in one place. No salon needed, and booking without an account still works."
                : "Enter your account email and we'll send you a secure reset link."}
          </p>

          <form onSubmit={submit} className="space-y-4 bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-sm">
            {isSignUp && (
              <label className="block text-sm font-medium">
                Your full name
                <input
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="e.g. Ama Mensah"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-2 w-full bg-background border border-foreground/10 px-4 py-3 rounded-xl text-sm font-normal focus:outline-none focus:border-accent"
                />
              </label>
            )}
            <label className="block text-sm font-medium">
              Email address
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full bg-background border border-foreground/10 px-4 py-3 rounded-xl text-sm font-normal focus:outline-none focus:border-accent"
              />
            </label>
            {mode !== "forgot" && (
              <label className="block text-sm font-medium">
                Password
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-2 w-full bg-background border border-foreground/10 px-4 py-3 rounded-xl text-sm font-normal focus:outline-none focus:border-accent"
                />
                {isSignUp && <span className="mt-2 block text-xs font-normal text-muted-foreground">Use at least 6 characters. A longer, unique password is safer.</span>}
              </label>
            )}
            {mode === "signin" && (
              <button type="button" onClick={() => setMode("forgot")} className="text-xs text-muted-foreground underline hover:text-foreground">
                Forgot password?
              </button>
            )}
            <button
              disabled={loading}
              className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-bold uppercase text-xs tracking-[0.2em] hover:bg-clay disabled:opacity-50"
            >
              {loading ? "Please wait…" : mode === "signin" ? "Sign in" : isSignUp ? "Create customer account" : "Send reset link"}
            </button>
          </form>

          {mode !== "forgot" ? (
            <>
              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">or</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <button
                type="button"
                onClick={signInWithGoogle}
                disabled={loading}
                className="w-full border border-border bg-card py-4 rounded-xl font-bold uppercase text-xs tracking-[0.2em] hover:bg-secondary/40 disabled:opacity-50 flex items-center justify-center gap-3"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {isSignUp ? "Sign up with Google" : "Continue with Google"}
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setMode("signin")} className="mt-6 text-sm font-semibold text-primary hover:underline">
              Back to sign in
            </button>
          )}

          <div className="mt-8 rounded-2xl bg-muted/50 border border-border p-4 text-sm">
            <p className="font-semibold mb-1">Own or manage a beauty business?</p>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Customer accounts do not create a salon listing.{" "}
              <Link to="/register-salon" className="text-primary font-semibold underline">Use business registration instead</Link>.
            </p>
          </div>
        </section>

        {isSignUp && (
          <aside className="lg:order-first">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-3">Simple from the start</p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight mb-4">Your appointments, easy to find.</h2>
            <p className="text-muted-foreground leading-relaxed mb-8">Create your account once, then book your hair, barbering, nails and beauty appointments while signed in.</p>
            <ul className="space-y-5">
              <Benefit icon={<CalendarCheck2 className="h-5 w-5" />} title="See upcoming bookings" text="Check the salon, service, date and time whenever you need them." />
              <Benefit icon={<History className="h-5 w-5" />} title="Keep your appointment history" text="Find past visits without searching through old text messages." />
              <Benefit icon={<WalletCards className="h-5 w-5" />} title="Track completed spending" text="See the total for completed bookings made through Salonzee." />
            </ul>
            <p className="mt-8 text-xs text-muted-foreground border-l-2 border-primary pl-4">Already booked as a guest? Start from the account offer on your booking confirmation and we'll attach that booking automatically.</p>
          </aside>
        )}
      </div>
    </div>
  );
}

function Benefit({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <li className="flex gap-4">
      <span className="h-10 w-10 rounded-full bg-secondary text-primary grid place-items-center shrink-0">{icon}</span>
      <div>
        <h3 className="font-semibold mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
      </div>
    </li>
  );
}
