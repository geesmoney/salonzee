import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/_authenticated/salon/settings")({
  head: () => ({ meta: [{ title: "Salon Settings — Salonzee" }] }),
  component: SalonSettings,
});

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
type Day = (typeof DAYS)[number];
type Hours = Record<Day, { open: string; close: string; closed: boolean }>;

const DEFAULT_HOURS: Hours = {
  monday: { open: "09:00", close: "18:00", closed: false },
  tuesday: { open: "09:00", close: "18:00", closed: false },
  wednesday: { open: "09:00", close: "18:00", closed: false },
  thursday: { open: "09:00", close: "18:00", closed: false },
  friday: { open: "09:00", close: "18:00", closed: false },
  saturday: { open: "09:00", close: "18:00", closed: false },
  sunday: { open: "10:00", close: "16:00", closed: true },
};

function SalonSettings() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  const { data: salon } = useQuery({
    queryKey: ["my-salon", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("salons").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [locationCity, setLocationCity] = useState("");
  const [locationArea, setLocationArea] = useState("");
  const [slotDuration, setSlotDuration] = useState(30);
  const [profilePhoto, setProfilePhoto] = useState("");
  const [hours, setHours] = useState<Hours>(DEFAULT_HOURS);

  useEffect(() => {
    if (!salon) return;
    setName(salon.name ?? "");
    setDescription(salon.description ?? "");
    setPhone(salon.phone ?? "");
    setLocationCity(salon.location_city ?? "");
    setLocationArea(salon.location_area ?? "");
    setSlotDuration(salon.slot_duration_minutes ?? 30);
    setProfilePhoto(salon.profile_photo_url ?? "");
    setHours({ ...DEFAULT_HOURS, ...(salon.operating_hours as Hours) });
  }, [salon]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("salons")
        .update({
          name,
          description,
          phone,
          location_city: locationCity,
          location_area: locationArea,
          slot_duration_minutes: slotDuration,
          profile_photo_url: profilePhoto || null,
          operating_hours: hours,
        })
        .eq("id", salon!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Settings saved");
      qc.invalidateQueries({ queryKey: ["my-salon", user?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading || !salon) return <div className="p-10">Loading...</div>;

  return (
    <div className="min-h-dvh bg-background">
      <SiteNav />
      <section className="max-w-3xl mx-auto px-6 md:px-10 py-12">
        <p className="text-[10px] uppercase tracking-[0.3em] text-foreground/40">Settings</p>
        <h1 className="font-serif text-5xl mb-8">Salon details</h1>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="space-y-6"
        >
          <Field label="Salon name">
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>

          <Field label="Description">
            <textarea className={inputCls} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Phone">
              <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <Field label="Slot duration (minutes)">
              <input type="number" min={15} step={5} className={inputCls} value={slotDuration} onChange={(e) => setSlotDuration(+e.target.value)} />
            </Field>
            <Field label="City">
              <input className={inputCls} value={locationCity} onChange={(e) => setLocationCity(e.target.value)} />
            </Field>
            <Field label="Area">
              <input className={inputCls} value={locationArea} onChange={(e) => setLocationArea(e.target.value)} />
            </Field>
          </div>

          <Field label="Profile photo URL">
            <input className={inputCls} value={profilePhoto} onChange={(e) => setProfilePhoto(e.target.value)} placeholder="https://..." />
          </Field>

          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-foreground/40 mb-3">Operating hours</p>
            <div className="space-y-2">
              {DAYS.map((d) => (
                <div key={d} className="flex items-center gap-3 bg-card border border-foreground/5 rounded-lg p-3">
                  <p className="w-24 capitalize text-sm font-bold">{d}</p>
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={!hours[d].closed}
                      onChange={(e) => setHours({ ...hours, [d]: { ...hours[d], closed: !e.target.checked } })}
                    />
                    Open
                  </label>
                  <input
                    type="time"
                    disabled={hours[d].closed}
                    value={hours[d].open}
                    onChange={(e) => setHours({ ...hours, [d]: { ...hours[d], open: e.target.value } })}
                    className={inputCls + " flex-1"}
                  />
                  <span className="text-foreground/40">–</span>
                  <input
                    type="time"
                    disabled={hours[d].closed}
                    value={hours[d].close}
                    onChange={(e) => setHours({ ...hours, [d]: { ...hours[d], close: e.target.value } })}
                    className={inputCls + " flex-1"}
                  />
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={save.isPending}
            className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-bold uppercase text-xs tracking-[0.2em] disabled:opacity-50"
          >
            {save.isPending ? "Saving..." : "Save changes"}
          </button>
        </form>
      </section>
      <SiteFooter />
    </div>
  );
}

const inputCls = "w-full bg-background border border-foreground/10 px-3 py-2 rounded-lg text-sm";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-[0.3em] text-foreground/40 mb-2 block">{label}</label>
      {children}
    </div>
  );
}
