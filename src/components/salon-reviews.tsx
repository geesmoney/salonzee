import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RatingBadge } from "@/components/rating-badge";

type Review = {
  id: string;
  customer_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

export function SalonReviews({ salonId }: { salonId: string }) {
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["salon-reviews", salonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, customer_name, rating, comment, created_at")
        .eq("salon_id", salonId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Review[];
    },
    staleTime: 30_000,
  });

  if (isLoading) return null;

  const count = reviews.length;
  const avg = count ? reviews.reduce((a, b) => a + b.rating, 0) / count : null;

  return (
    <div className="mt-10">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-bold text-xs uppercase tracking-[0.2em] text-foreground/40">Reviews</h2>
        <RatingBadge average={avg} count={count} size="md" />
      </div>
      {count === 0 ? (
        <p className="text-sm text-muted-foreground italic">No reviews yet — be one of the first after your visit.</p>
      ) : (
        <ul className="space-y-4">
          {reviews.map((r) => (
            <li key={r.id} className="bg-card border border-foreground/5 rounded-xl p-4 sm:p-5">
              <div className="flex items-center justify-between mb-1">
                <p className="font-semibold text-sm">{firstNameOnly(r.customer_name)}</p>
                <Stars rating={r.rating} />
              </div>
              <p className="text-[11px] text-muted-foreground mb-2">{formatDate(r.created_at)}</p>
              {r.comment && <p className="text-sm leading-relaxed">{r.comment}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`h-3.5 w-3.5 ${n <= rating ? "fill-accent text-accent" : "text-muted-foreground/30"}`} aria-hidden="true" />
      ))}
    </span>
  );
}

function firstNameOnly(name: string) {
  const first = name.trim().split(/\s+/)[0] ?? name;
  return first.length > 1 ? `${first[0]?.toUpperCase()}${first.slice(1)}` : first;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
