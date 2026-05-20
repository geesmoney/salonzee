import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Upload, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  salonId: string;
}

interface SalonImage {
  id: string;
  image_url: string;
  position: number;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_IMAGES = 10;

export function SalonImageManager({ salonId }: Props) {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: images = [] } = useQuery({
    queryKey: ["salon-images", salonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("salon_images")
        .select("id, image_url, position")
        .eq("salon_id", salonId)
        .order("position", { ascending: true });
      if (error) throw error;
      return data as SalonImage[];
    },
  });

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (images.length + files.length > MAX_IMAGES) {
      toast.error(`You can upload up to ${MAX_IMAGES} images per salon.`);
      return;
    }

    setUploading(true);
    let nextPosition = (images[images.length - 1]?.position ?? -1) + 1;

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} is not an image.`);
          continue;
        }
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`${file.name} is larger than 5MB.`);
          continue;
        }

        const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const path = `${salonId}/${crypto.randomUUID()}.${ext}`;

        const { error: upErr } = await supabase.storage
          .from("salon-images")
          .upload(path, file, { cacheControl: "3600", upsert: false });
        if (upErr) {
          toast.error(`Upload failed: ${upErr.message}`);
          continue;
        }

        const { data: pub } = supabase.storage.from("salon-images").getPublicUrl(path);

        const { error: insErr } = await supabase
          .from("salon_images")
          .insert({ salon_id: salonId, image_url: pub.publicUrl, position: nextPosition++ });
        if (insErr) {
          toast.error(`Could not save image: ${insErr.message}`);
        }
      }
      await qc.invalidateQueries({ queryKey: ["salon-images", salonId] });
      toast.success("Images uploaded");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const remove = useMutation({
    mutationFn: async (img: SalonImage) => {
      // best-effort delete from storage; path lives after the bucket name in public URL
      const marker = "/salon-images/";
      const idx = img.image_url.indexOf(marker);
      if (idx !== -1) {
        const path = img.image_url.slice(idx + marker.length);
        await supabase.storage.from("salon-images").remove([path]);
      }
      const { error } = await supabase.from("salon_images").delete().eq("id", img.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["salon-images", salonId] });
      toast.success("Image removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.3em] text-foreground/40">
          Gallery ({images.length}/{MAX_IMAGES})
        </p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || images.length >= MAX_IMAGES}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-[0.15em] disabled:opacity-50"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? "Uploading" : "Add photos"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {images.length === 0 ? (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full border border-dashed border-foreground/15 rounded-xl py-10 text-sm text-foreground/50 hover:text-foreground hover:border-foreground/30 transition"
        >
          Tap to upload photos of your salon (up to {MAX_IMAGES}, 5MB each)
        </button>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((img) => (
            <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden bg-muted group">
              <img src={img.image_url} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => remove.mutate(img)}
                aria-label="Remove image"
                className="absolute top-1.5 right-1.5 bg-background/90 text-foreground rounded-full p-1.5 opacity-0 group-hover:opacity-100 focus:opacity-100 transition shadow"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
