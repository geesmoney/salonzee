import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { SiteNav } from "@/components/site-nav";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Salonzee" },
      { name: "description", content: "Sign in to manage your Salonzee salon profile, services, and bookings — or create an owner account to join the directory." },
      { property: "og:title", content: "Sign in — Salonzee" },
      { property: "og:description", content: "Salon owner sign-in for Salonzee." },
      { property: "og:url", content: "https://salonzee.lovable.app/login" },
    ],
    links: [{ rel: "canonical", href: "https://salonzee.lovable.app/login" }],
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
