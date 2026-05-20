
-- Salon images table
CREATE TABLE public.salon_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_salon_images_salon ON public.salon_images(salon_id, position);

ALTER TABLE public.salon_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public views images of active salons"
ON public.salon_images FOR SELECT
USING (EXISTS (SELECT 1 FROM public.salons s WHERE s.id = salon_images.salon_id AND s.status = 'active'));

CREATE POLICY "Owner views own salon images"
ON public.salon_images FOR SELECT
USING (EXISTS (SELECT 1 FROM public.salons s WHERE s.id = salon_images.salon_id AND s.user_id = auth.uid()));

CREATE POLICY "Owner manages own salon images"
ON public.salon_images FOR ALL
USING (EXISTS (SELECT 1 FROM public.salons s WHERE s.id = salon_images.salon_id AND s.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.salons s WHERE s.id = salon_images.salon_id AND s.user_id = auth.uid()));

CREATE POLICY "Platform admin manages all salon images"
ON public.salon_images FOR ALL
USING (has_role(auth.uid(), 'platform_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'platform_admin'::app_role));

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('salon-images', 'salon-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view salon images"
ON storage.objects FOR SELECT
USING (bucket_id = 'salon-images');

CREATE POLICY "Salon owners upload to own folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'salon-images'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.salons s
    WHERE s.user_id = auth.uid()
    AND s.id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Salon owners update own folder"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'salon-images'
  AND EXISTS (
    SELECT 1 FROM public.salons s
    WHERE s.user_id = auth.uid()
    AND s.id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Salon owners delete own folder"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'salon-images'
  AND EXISTS (
    SELECT 1 FROM public.salons s
    WHERE s.user_id = auth.uid()
    AND s.id::text = (storage.foldername(name))[1]
  )
);
