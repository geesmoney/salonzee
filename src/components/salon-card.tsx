import { Link } from "@tanstack/react-router";
import { SALON_TYPE_LABELS } from "@/lib/ghana";
import { RatingBadge } from "@/components/rating-badge";

type Salon = {
  id: string;
  name: string;
  location_city: string;
  location_area: string;
  salon_type: string;
  profile_photo_url: string | null;
  description: string | null;
  slug?: string | null;
  rating_avg?: number | null;
  rating_count?: number;
};

export function SalonCard({ salon }: { salon: Salon }) {
  const linkProps = salon.slug
    ? { to: "/$slug" as const, params: { slug: salon.slug } }
    : { to: "/salons/$salonId" as const, params: { salonId: salon.id } };
  return (
    <Link
      {...linkProps}
      className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-2xl"
    >
      <div className="w-full aspect-[4/5] bg-secondary rounded-2xl mb-4 overflow-hidden ring-1 ring-border group-hover:shadow-lg transition-shadow relative">
        {salon.profile_photo_url ? (
          <img
            src={salon.profile_photo_url}
            alt={salon.name}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
            loading="lazy"
            decoding="async"
            width={800}
            height={1000}
          />
        ) : (
          <div className="w-full h-full grid place-items-center text-sm font-display font-semibold text-primary px-6 text-center">
            {salon.name}
          </div>
        )}
        <span className="absolute top-3 left-3 bg-background/90 backdrop-blur text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full text-foreground">
          {SALON_TYPE_LABELS[salon.salon_type] ?? salon.salon_type}
        </span>
        {(salon.rating_count ?? 0) > 0 && (
          <span className="absolute top-3 right-3 bg-background/90 backdrop-blur px-2.5 py-1 rounded-full">
            <RatingBadge average={salon.rating_avg ?? null} count={salon.rating_count ?? 0} size="sm" showNew={false} />
          </span>
        )}
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-xl font-semibold tracking-tight group-hover:text-primary transition-colors min-w-0 truncate">{salon.name}</h3>
        <RatingBadge average={salon.rating_avg ?? null} count={salon.rating_count ?? 0} size="sm" />
      </div>
      <p className="text-sm text-muted-foreground mt-0.5">
        {salon.location_area}, {salon.location_city}
      </p>
      {salon.description && (
        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{salon.description}</p>
      )}
    </Link>
  );
}

