import { Link } from "@tanstack/react-router";
import { SALON_TYPE_LABELS } from "@/lib/ghana";

type Salon = {
  id: string;
  name: string;
  location_city: string;
  location_area: string;
  salon_type: string;
  profile_photo_url: string | null;
  description: string | null;
};

export function SalonCard({ salon }: { salon: Salon }) {
  return (
    <Link to="/salons/$salonId" params={{ salonId: salon.id }} className="group cursor-pointer block">
      <div className="w-full aspect-[4/5] bg-secondary rounded-2xl mb-4 overflow-hidden ring-1 ring-foreground/5 group-hover:scale-[1.02] transition-transform">
        {salon.profile_photo_url ? (
          <img src={salon.profile_photo_url} alt={salon.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full grid place-items-center text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/30">
            {salon.name}
          </div>
        )}
      </div>
      <h3 className="font-serif text-2xl text-foreground">{salon.name}</h3>
      <p className="text-sm text-foreground/60">
        {salon.location_area}, {salon.location_city} • {SALON_TYPE_LABELS[salon.salon_type] ?? salon.salon_type}
      </p>
    </Link>
  );
}
