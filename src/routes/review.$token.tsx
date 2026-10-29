import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { getReviewContext, submitReview } from "@/lib/reviews.functions";

export const Route = createFileRoute("/review/$token")({
  head: () => ({
    meta: [
      { title: "Leave a review — Salonzee" },
      { name: "description", content: "Share your experience after a Salonzee appointment." },
      { property: "og:title", content: "Leave a review — Salonzee" },
      { property: "og:description", content: "Share your experience after a Salonzee appointment." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReviewPage,
});

function ReviewPage() {
  const { token } = Route.useParams();
  const getCtx = useServerFn(getReviewContext);
  const submitFn = useServerFn(submitReview);

  const { data, isLoading, error } = useQuery({
    queryKey: ["review-ctx", token],
    queryFn: () => getCtx({ data: { token } }),
    retry: false,
    staleTime: 60_000,
  });

  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [done, setDone] = useState(false);

  const submit = useMutation({
    mutationFn: async () => {
      if (rating < 1) throw new Error("Please pick a star rating");
      await submitFn({ data: { token, rating, comment: comment.trim() || null } });
    },
    onSuccess: () => {
      setDone(true);
      toast.success("Thanks for your review!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="min-h-dvh bg-background">
      <SiteNav />
      <section className="max-w-xl mx-auto px-5 sm:px-6 py-10 sm:py-16">
        {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}

        {error && (
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <h1 className="font-serif text-3xl mb-2">Link not valid</h1>
            <p className="text-muted-foreground mb-6">
              This review link is invalid or has expired.
            </p>
            <Link to="/salons" className="text-primary font-semibold underline">
              Browse salons
            </Link>
          </div>
        )}

        {data && (done || data.already_reviewed) && (
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <h1 className="font-serif text-3xl mb-2">Thanks!</h1>
            <p className="text-muted-foreground mb-6">
              Your review for <strong>{data.salon_name}</strong> is in. It helps other customers in Ghana find great salons.
            </p>
            {data.salon_slug && (
              <Link
                to="/$slug"
                params={{ slug: data.salon_slug }}
                className="inline-flex items-center bg-primary text-primary-foreground px-5 py-3 rounded-full text-sm font-semibold"
              >
                Visit {data.salon_name}
              </Link>
            )}
          </div>
        )}

        {data && !done && !data.already_reviewed && (
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-8">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
              Review your visit
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl mb-1">{data.salon_name}</h1>
            <p className="text-sm text-muted-foreground mb-6">
              {data.customer_name} • {data.booking_date}
            </p>

            <label className="block text-sm font-semibold mb-2">How was it?</label>
            <div
              role="radiogroup"
              aria-label="Rating"
              className="flex gap-1 mb-6"
              onMouseLeave={() => setHover(0)}
            >
              {[1, 2, 3, 4, 5].map((n) => {
                const active = (hover || rating) >= n;
                return (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={rating === n}
                    aria-label={`${n} star${n === 1 ? "" : "s"}`}
                    onMouseEnter={() => setHover(n)}
                    onClick={() => setRating(n)}
                    className="p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                  >
                    <Star
                      className={`h-10 w-10 transition-colors ${
                        active ? "fill-accent text-accent" : "text-muted-foreground/40"
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            <label htmlFor="comment" className="block text-sm font-semibold mb-2">
              Tell others about your experience (optional)
            </label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={1000}
              rows={4}
              placeholder="What did you love? What could be better?"
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-base focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 mb-2"
            />
            <p className="text-xs text-muted-foreground mb-6">{comment.length}/1000</p>

            <button
              disabled={submit.isPending || rating < 1}
              onClick={() => submit.mutate()}
              className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-bold uppercase text-xs tracking-[0.2em] disabled:opacity-50"
            >
              {submit.isPending ? "Submitting…" : "Submit review"}
            </button>
          </div>
        )}
      </section>
      <div className="hidden md:block">
        <SiteFooter />
      </div>
    </div>
  );
}
