import { Star } from "lucide-react";

type Props = {
  average: number | null;
  count: number;
  size?: "sm" | "md";
  showNew?: boolean;
};

export function RatingBadge({ average, count, size = "sm", showNew = true }: Props) {
  const cls = size === "sm" ? "text-xs" : "text-sm";
  const star = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  if (!count || average == null) {
    if (!showNew) return null;
    return (
      <span className={`inline-flex items-center gap-1 font-semibold text-muted-foreground ${cls}`}>
        <Star className={`${star} text-muted-foreground/60`} aria-hidden="true" />
        New
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 font-semibold ${cls}`} aria-label={`Rated ${average.toFixed(1)} out of 5 from ${count} reviews`}>
      <Star className={`${star} fill-accent text-accent`} aria-hidden="true" />
      <span className="tabular-nums">{average.toFixed(1)}</span>
      <span className="text-muted-foreground font-normal">({count})</span>
    </span>
  );
}

export function aggregateRatings(rows: Array<{ rating: number | null }> | null | undefined) {
  const ratings = (rows ?? []).map((r) => r.rating).filter((r): r is number => typeof r === "number");
  if (!ratings.length) return { average: null as number | null, count: 0 };
  const sum = ratings.reduce((a, b) => a + b, 0);
  return { average: sum / ratings.length, count: ratings.length };
}
