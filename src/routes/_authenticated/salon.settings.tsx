import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { SalonImageManager } from "@/components/salon-image-manager";
import { ReferralCard } from "@/components/referral-card";

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

  const { data: salon, isLoading: salonLoading, error: salonError } = useQuery({
    queryKey: ["my-salon-settings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("salons").select("*").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60_000,
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [locationCity, setLocationCity] = useState("");
  const [locationArea, setLocationArea] = useState("");
  const [slotDuration, setSlotDuration] = useState(30);
  const [hours, setHours] = useState<Hours>(DEFAULT_HOURS);

  useEffect(() => {
    if (!salon) return;
    setName(salon.name ?? "");
    setDescription(salon.description ?? "");
    setPhone(salon.phone ?? "");
    setWhatsappPhone(salon.whatsapp_phone ?? "");
    setLocationCity(salon.location_city ?? "");
    setLocationArea(salon.location_area ?? "");
    setSlotDuration(salon.slot_duration_minutes ?? 30);
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
          whatsapp_phone: whatsappPhone.trim() || null,
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
      qc.invalidateQueries({ queryKey: ["my-salon-settings", user?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading || salonLoading) return <SettingsShell><SettingsSkeleton /></SettingsShell>;

  if (salonError) {
    return (
      <SettingsShell>
        <div className="max-w-2xl mx-auto px-6 py-16 text-center">
          <h1 className="font-serif text-4xl mb-3">Settings couldn't load</h1>
          <p className="text-sm text-foreground/60 mb-6">We couldn't load your settings. Please try again.</p>
          <button onClick={() => qc.invalidateQueries({ queryKey: ["my-salon-settings", user?.id] })} className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold uppercase text-xs tracking-[0.2em]">
            Try again
          </button>
        </div>
      </SettingsShell>
    );
  }

  if (!salon) {
    return (
      <SettingsShell>
        <div className="max-w-2xl mx-auto px-6 py-16 text-center">
          <h1 className="font-serif text-4xl mb-3">No salon found</h1>
          <p className="text-sm text-foreground/60 mb-6">Register your salon first, then come back here to manage its photos and details.</p>
          <Link to="/register-salon" className="inline-flex bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold uppercase text-xs tracking-[0.2em]">
            Register Salon
          </Link>
        </div>
      </SettingsShell>
    );
  }

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
            <Field label="WhatsApp number (optional)">
              <input
                className={inputCls}
                value={whatsappPhone}
                onChange={(e) => setWhatsappPhone(e.target.value)}
                placeholder="Defaults to your phone"
              />
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

          <div className="border border-foreground/10 rounded-xl p-4">
            <SalonImageManager salonId={salon.id} />
          </div>

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

        <ReferralCard salonId={salon.id} />

        <CalendarSync salonId={salon.id} />
      </section>
      <SiteFooter />
    </div>
  );
}

function CalendarSync({ salonId }: { salonId: string }) {
  const [copied, setCopied] = useState(false);

  const { data: token } = useQuery({
    queryKey: ["salon-calendar-token", salonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("salon_calendar_tokens")
        .select("token")
        .eq("salon_id", salonId)
        .maybeSingle();
      if (error) throw error;
      return data?.token ?? null;
    },
    staleTime: 60 * 60_000,
  });

  const origin = typeof window !== "undefined" ? window.location.origin : "https://salonzee.com";
  const feedUrl = token ? `${origin}/api/public/calendar/${token}.ics` : "";

  return (
    <div className="mt-12 border border-foreground/10 rounded-xl p-5">
      <p className="text-[10px] uppercase tracking-[0.3em] text-foreground/40 mb-2">Calendar sync</p>
      <h2 className="font-serif text-2xl mb-2">Add your bookings to your own calendar</h2>
      <p className="text-sm text-foreground/60 mb-4">
        Copy this private link and add it to Google Calendar (Other calendars → From URL), Apple Calendar
        (File → New Calendar Subscription) or Outlook (Add calendar → Subscribe from web). Your bookings
        then appear automatically. Keep the link private — anyone with it can see your bookings.
      </p>

      {token ? (
        <div className="flex flex-col sm:flex-row gap-2">
          <input readOnly value={feedUrl} className={inputCls + " font-mono text-xs"} onFocus={(e) => e.currentTarget.select()} />
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(feedUrl);
              setCopied(true);
              toast.success("Calendar link copied");
              setTimeout(() => setCopied(false), 2000);
            }}
            className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-bold uppercase text-xs tracking-[0.2em] whitespace-nowrap"
          >
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      ) : (
        <p className="text-sm text-foreground/40">Preparing your calendar link…</p>
      )}
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

function SettingsShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      <SiteNav />
      {children}
      <SiteFooter />
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <section className="max-w-3xl mx-auto px-6 md:px-10 py-12 space-y-6" aria-label="Loading salon settings">
      <div className="h-3 w-24 rounded-full bg-muted animate-pulse" />
      <div className="h-12 w-64 max-w-full rounded-lg bg-muted animate-pulse" />
      <div className="space-y-4">
        <div className="h-12 rounded-lg bg-muted animate-pulse" />
        <div className="h-28 rounded-lg bg-muted animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-12 rounded-lg bg-muted animate-pulse" />
          <div className="h-12 rounded-lg bg-muted animate-pulse" />
          <div className="h-12 rounded-lg bg-muted animate-pulse" />
          <div className="h-12 rounded-lg bg-muted animate-pulse" />
        </div>
        <div className="h-40 rounded-xl bg-muted animate-pulse" />
      </div>
    </section>
  );
}
