import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { claimBooking, rememberBookingToClaim } from "@/lib/customer-account";

export function SaveBookingToAccount({ bookingId }: { bookingId: string }) {
  const { user } = useAuth();
  const [state, setState] = useState<"idle" | "saving" | "saved" | "failed">("idle");

  useEffect(() => {
    if (!user) return;
    let alive = true;
    setState("saving");
    claimBooking(bookingId).then((ok) => alive && setState(ok ? "saved" : "failed"));
    return () => { alive = false; };
  }, [user, bookingId]);

  if (user) {
    return (
      <p className="text-xs text-foreground/60 mb-4">
        {state === "saved" ? (
          <>Saved to <Link to="/account" className="text-accent font-bold underline">My bookings</Link>.</>
        ) : state === "failed" ? "We couldn't add this to your account." : "Saving to your account…"}
      </p>
    );
  }

  return (
    <div className="mb-4 rounded-2xl border border-foreground/10 bg-secondary/30 p-4 text-left">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary mb-2">One optional last step</p>
      <p className="text-sm font-semibold mb-1">Save this booking to a customer account</p>
      <p className="text-xs text-foreground/60 mb-3 leading-relaxed">
        Create a free account to see this booking, your history and what you've spent. This booking will be added automatically after you join or sign in.
      </p>
      <Link
        to="/login"
        search={{ mode: "signup" }}
        onClick={() => rememberBookingToClaim(bookingId)}
        className="block text-center bg-primary text-primary-foreground py-3 rounded-xl font-bold uppercase text-[11px] tracking-[0.2em]"
      >
        Create free customer account
      </Link>
      <Link
        to="/login"
        onClick={() => rememberBookingToClaim(bookingId)}
        className="mt-2 block text-center text-xs text-foreground/60 underline"
      >
        I already have an account
      </Link>
    </div>
  );
}
