import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function ReferralCard({ salonId }: { salonId: string }) {
  const [copied, setCopied] = useState(false);

  const { data: code } = useQuery({
    queryKey: ["my-referral-code", salonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referral_codes")
        .select("id, code, label")
        .eq("salon_id", salonId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 60 * 60_000,
  });

  const { data: rewards = [] } = useQuery({
    queryKey: ["my-referral-rewards", code?.id],
    enabled: !!code?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referral_rewards")
        .select("id, months_awarded, awarded_at")
        .eq("referral_code_id", code!.id)
        .order("awarded_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const months = rewards.reduce((sum, r) => sum + (r.months_awarded ?? 0), 0);

  return (
    <div className="mt-12 border border-foreground/10 rounded-xl p-5">
      <p className="text-[10px] uppercase tracking-[0.3em] text-foreground/40 mb-2">Refer &amp; earn</p>
      <h2 className="font-serif text-2xl mb-2">Invite another business, get a free premium month</h2>
      <p className="text-sm text-foreground/60 mb-4">
        Share your code. When a business signs up with it and we approve their listing, you earn one free
        month of premium.
      </p>

      {code ? (
        <>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              readOnly
              value={code.code}
              onFocus={(e) => e.currentTarget.select()}
              className="w-full bg-background border border-foreground/10 px-3 py-2 rounded-lg text-lg font-mono tracking-[0.25em]"
            />
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(code.code);
                setCopied(true);
                toast.success("Referral code copied");
                setTimeout(() => setCopied(false), 2000);
              }}
              className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-bold uppercase text-xs tracking-[0.2em] whitespace-nowrap"
            >
              {copied ? "Copied" : "Copy code"}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <Stat label="Businesses referred" value={rewards.length} />
            <Stat label="Free months earned" value={months} />
          </div>

          {rewards.length > 0 && (
            <p className="text-xs text-foreground/50 mt-3">
              Last credited {new Date(rewards[0]!.awarded_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}.
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-foreground/40">
          Your code appears here once your listing is approved.
        </p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-muted/40 rounded-lg p-4">
      <p className="font-serif text-3xl">{value}</p>
      <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/40 mt-1">{label}</p>
    </div>
  );
}
