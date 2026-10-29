import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { SiteNav } from "@/components/site-nav";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Salonzee" },
      { name: "description", content: "Sign in to manage your Salonzee salon profile, services, and bookings — or create an owner account to join the directory." },
      { property: "og:title", content: "Sign in — Salonzee" },
      { property: "og:description", content: "Salon owner sign-in for Salonzee." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
        { property: "og:url", content: "https://salonzee.com/login" },
    ],
    links: [{ rel: "canonical", href: "https://salonzee.com/login" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { signIn, signUp, user, isPlatformAdmin } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) {
    // Already logged in
    setTimeout(() => navigate({ to: isPlatformAdmin ? "/admin/pending" : "/salon/dashboard" }), 0);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } =
      mode === "signin"
        ? await signIn(email, password)
        : await signUp(email, password, fullName);
    setLoading(false);
    if (error) return toast.error(error);
    if (mode === "signup") {
      toast.success("Check your email to confirm your account.");
    } else {
      toast.success("Welcome back.");
      navigate({ to: "/salon/dashboard" });
    }
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
    // Session set
    navigate({ to: isPlatformAdmin ? "/admin/pending" : "/salon/dashboard" });
  }

  return (
    <div className="min-h-dvh bg-background">
      <SiteNav />
      <div className="max-w-md mx-auto px-6 py-20">
        <h1 className="font-serif text-5xl mb-2">{mode === "signin" ? "Welcome back" : "Create account"}</h1>
        <p className="text-foreground/60 mb-10 text-sm">
          {mode === "signin" ? "For salon owners and platform admins." : "Register a new salon owner account."}
        </p>
        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" && (
            <input
              type="text"
              required
              placeholder="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-card border border-foreground/10 px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-accent"
            />
          )}
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-card border border-foreground/10 px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-accent"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-card border border-foreground/10 px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-accent"
          />
          <button
            disabled={loading}
            className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-bold uppercase text-xs tracking-[0.2em] hover:bg-clay disabled:opacity-50"
          >
            {loading ? "..." : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>
        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-foreground/10" />
          <span className="text-[10px] uppercase tracking-[0.3em] text-foreground/40">or</span>
          <div className="h-px flex-1 bg-foreground/10" />
        </div>
        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={loading}
          className="w-full border border-foreground/15 bg-card py-4 rounded-xl font-bold uppercase text-xs tracking-[0.2em] hover:bg-secondary/40 disabled:opacity-50 flex items-center justify-center gap-3"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>
        <button
          type="button"
          onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
          className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-foreground/60 hover:text-accent"
        >
          {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
        </button>
        <p className="mt-10 text-xs text-foreground/40">
          Looking to list your salon?{" "}
          <Link to="/register-salon" className="text-accent font-bold underline">Register here</Link>
        </p>
      </div>
    </div>
  );
}
