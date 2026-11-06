import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Upload, Trash2, Loader2, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";

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
  const [deleteTarget, setDeleteTarget] = useState<SalonImage | null>(null);

  const { data: images = [], isLoading, isError, refetch } = useQuery({
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

  const { data: coverUrl } = useQuery({
    queryKey: ["salon-cover", salonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("salons")
        .select("profile_photo_url")
        .eq("id", salonId)
        .maybeSingle();
      if (error) throw error;
      return data?.profile_photo_url ?? null;
    },
  });

  const setCover = useMutation({
    mutationFn: async (img: SalonImage) => {
      const { error } = await supabase
        .from("salons")
        .update({ profile_photo_url: img.image_url })
        .eq("id", salonId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["salon-cover", salonId] });
      qc.invalidateQueries({ queryKey: ["my-salon-settings"] });
      toast.success("Cover photo updated");
    },
    onError: () => toast.error("Could not update the cover photo. Please try again."),
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
      await qc.invalidateQueries({ queryKey: ["salon-cover", salonId] });
      toast.success("Images uploaded");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const remove = useMutation({
    mutationFn: async (img: SalonImage) => {
      // Remove the listing first. A denied delete must never erase the stored photo.
      const { data, error } = await supabase.from("salon_images").delete().eq("id", img.id).eq("salon_id", salonId).select("id");
      if (error || data?.length !== 1) throw new Error("Could not remove this photo. Please try again.");
      // best-effort delete from storage; path lives after the bucket name in public URL
      const marker = "/salon-images/";
      const idx = img.image_url.indexOf(marker);
      if (idx !== -1) {
        const path = img.image_url.slice(idx + marker.length);
        await supabase.storage.from("salon-images").remove([path]);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["salon-images", salonId] });
      qc.invalidateQueries({ queryKey: ["salon-cover", salonId] });
      qc.invalidateQueries({ queryKey: ["my-salon-settings"] });
      qc.invalidateQueries({ queryKey: ["salon-dashboard"] });
      setDeleteTarget(null);
      toast.success("Image removed");
    },
    onError: () => toast.error("Could not remove this photo. Please try again."),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.3em] text-foreground/40">
          Gallery ({images.length}/{MAX_IMAGES})
        </p>
        <Button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || images.length >= MAX_IMAGES}
          size="sm"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? "Uploading" : "Add photos"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground py-6">Loading photos…</p> : isError ? <div className="py-4"><p className="text-sm text-muted-foreground mb-3">Photos couldn't load.</p><Button type="button" variant="outline" onClick={() => refetch()}>Try again</Button></div> : images.length === 0 ? (
        <Button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
          className="w-full h-auto whitespace-normal border-dashed rounded-lg py-10 text-sm"
        >
          Tap to upload photos of your salon (up to {MAX_IMAGES}, 5MB each)
        </Button>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((img) => {
            const isCover = coverUrl === img.image_url;
            return (
              <div key={img.id} className="rounded-lg overflow-hidden border border-border bg-card">
                <div className="relative aspect-square"><img src={img.image_url} alt={`Gallery photo ${images.indexOf(img) + 1}`} className="w-full h-full object-cover" />
                {isCover ? (
                  <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 bg-primary text-primary-foreground rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] shadow">
                    <Star className="w-3 h-3 fill-current" /> Cover
                  </span>
                ) : (
                  <Button
                    type="button"
                    onClick={() => setCover.mutate(img)}
                    disabled={setCover.isPending}
                    variant="outline"
                    size="sm"
                    className="absolute bottom-1.5 left-1.5 h-8 px-2 text-[10px]"
                  >
                    <Star className="w-3 h-3" /> Set as cover
                  </Button>
                )}
                </div>
                <Button type="button" variant="ghost" className="w-full rounded-none text-destructive" disabled={remove.isPending || uploading} onClick={() => setDeleteTarget(img)}><Trash2 /> Delete photo</Button>
              </div>
            );
          })}
        </div>
      )}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open && !remove.isPending) setDeleteTarget(null); }}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg">
          <AlertDialogHeader><AlertDialogTitle>Delete this photo?</AlertDialogTitle><AlertDialogDescription>This permanently removes it from your public gallery. If it is your cover, the next gallery photo becomes the cover. To replace it, add your new photo first.</AlertDialogDescription></AlertDialogHeader>
          {deleteTarget && <img src={deleteTarget.image_url} alt="Photo selected for deletion" className="h-40 w-full rounded-lg object-contain bg-muted" />}
          <AlertDialogFooter><AlertDialogCancel disabled={remove.isPending}>Keep photo</AlertDialogCancel><Button type="button" variant="destructive" disabled={remove.isPending} onClick={() => { if (deleteTarget) remove.mutate(deleteTarget); }}>{remove.isPending ? <Loader2 className="animate-spin" /> : <Trash2 />} {remove.isPending ? "Deleting…" : "Delete photo"}</Button></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
