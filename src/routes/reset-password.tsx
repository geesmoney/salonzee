import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SiteNav } from "@/components/site-nav";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Set a new password — Salonzee" }, { name: "robots", content: "noindex" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (window.location.hash.includes("type=recovery")) setReady(true);
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      return toast.error(/weak|pwned|leaked|guess/i.test(error.message)
        ? "That password is too easy to guess. Try a longer one."
        : "Could not update your password. Request a new reset link.");
    }
    toast.success("Password updated.");
    navigate({ to: "/login", replace: true });
  }

  return (
    <div className="min-h-dvh bg-background">
      <SiteNav />
      <div className="max-w-md mx-auto px-6 py-20">
        <h1 className="font-serif text-4xl mb-2">Set a new password</h1>
        {!ready ? (
          <p className="text-sm text-foreground/60">Open this page from the reset link in your email.</p>
        ) : (
          <form onSubmit={submit} className="space-y-4 mt-8">
            <input
              type="password" required minLength={6} placeholder="New password"
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-card border border-foreground/10 px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-accent"
            />
            <button disabled={loading} className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-bold uppercase text-xs tracking-[0.2em] disabled:opacity-50">
              {loading ? "..." : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
