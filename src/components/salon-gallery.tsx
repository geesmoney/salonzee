import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  salonId: string;
  salonName: string;
  fallbackUrl?: string | null;
}

export function SalonGallery({ salonId, salonName, fallbackUrl }: Props) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const { data: images = [] } = useQuery({
    queryKey: ["salon-images-public", salonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("salon_images")
        .select("id, image_url")
        .eq("salon_id", salonId)
        .order("position", { ascending: true });
      if (error) throw error;
      return data as { id: string; image_url: string }[];
    },
    staleTime: 60_000,
  });

  const all = images.length > 0
    ? images.map((i) => i.image_url)
    : fallbackUrl
      ? [fallbackUrl]
      : [];

  if (all.length === 0) return null;

  const close = () => setLightboxIdx(null);
  const prev = () => setLightboxIdx((i) => (i === null ? 0 : (i - 1 + all.length) % all.length));
  const next = () => setLightboxIdx((i) => (i === null ? 0 : (i + 1) % all.length));

  return (
    <>
      <div className="mb-10">
        <div className="aspect-[16/10] rounded-3xl overflow-hidden ring-1 ring-foreground/5 cursor-zoom-in" onClick={() => setLightboxIdx(0)}>
          <img
            src={all[0]}
            alt={salonName}
            className="w-full h-full object-cover"
            fetchPriority="high"
            decoding="async"
          />
        </div>
        {all.length > 1 && (
          <div className="grid grid-cols-4 gap-2 mt-2">
            {all.slice(1, 5).map((url, i) => {
              const idx = i + 1;
              const isLastWithMore = idx === 4 && all.length > 5;
              return (
                <button
                  key={url}
                  type="button"
                  onClick={() => setLightboxIdx(idx)}
                  className="relative aspect-square rounded-xl overflow-hidden ring-1 ring-foreground/5 group"
                >
                  <img src={url} alt="" className="w-full h-full object-cover transition group-hover:scale-105" />
                  {isLastWithMore && (
                    <div className="absolute inset-0 bg-foreground/60 text-background flex items-center justify-center text-sm font-bold">
                      +{all.length - 5}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {lightboxIdx !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={close}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); close(); }}
            aria-label="Close"
            className="absolute top-4 right-4 text-white p-2 rounded-full bg-white/10 hover:bg-white/20"
          >
            <X className="w-5 h-5" />
          </button>
          {all.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); prev(); }}
                aria-label="Previous"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white p-3 rounded-full bg-white/10 hover:bg-white/20"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); next(); }}
                aria-label="Next"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white p-3 rounded-full bg-white/10 hover:bg-white/20"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
          <img
            src={all[lightboxIdx]}
            alt=""
            className="max-w-[92vw] max-h-[88vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
