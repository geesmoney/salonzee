import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { submitBooking } from "@/lib/bookings.functions";
import {
  generateSlots,
  addMinutesToTime,
  formatTimeLabel,
  formatDateISO,
  nextNDates,
  type OperatingHours,
} from "@/lib/slots";
import { isValidGhanaPhone, formatGhs, whatsappLink } from "@/lib/ghana";

type Service = {
  id: string;
  name: string;
  duration_minutes: number;
  price_ghs: number;
};

type Props = {
  salonId: string;
  salonName: string;
  salonWhatsapp?: string | null;
  services: Service[];
  operatingHours: OperatingHours;
  slotDuration: number;
  variant?: "card" | "plain";
};

export function BookingWidget({ salonId, salonName, salonWhatsapp, services, operatingHours, slotDuration, variant = "card" }: Props) {
  const qc = useQueryClient();
  const dates = nextNDates(14);
  const [serviceId, setServiceId] = useState<string>(services[0]?.id ?? "");
  const [date, setDate] = useState<Date>(dates[0]);
  const [time, setTime] = useState<string>("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [honeypot, setHoneypot] = useState(""); // bots fill hidden field
  const [confirmation, setConfirmation] = useState<null | { service: string; date: string; time: string }>(null);
  const mountedAt = useRef<number>(Date.now());
  const submitBookingFn = useServerFn(submitBooking);

  const selectedService = services.find((s) => s.id === serviceId);

  const dateKey = formatDateISO(date);
  const { data: existing = [] } = useQuery({
    queryKey: ["bookings-day", salonId, dateKey],
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select("start_time")
        .eq("salon_id", salonId)
        .eq("booking_date", dateKey)
        .neq("status", "cancelled");
      return data ?? [];
    },
  });

  const allSlots = selectedService
    ? generateSlots(date, operatingHours, slotDuration, selectedService.duration_minutes)
    : [];
  const taken = new Set(existing.map((b) => b.start_time));
  const slots = allSlots.filter((s) => !taken.has(s));

  const createBooking = useMutation({
    mutationFn: async () => {
      if (!selectedService) throw new Error("Select a service");
      if (!time) throw new Error("Select a time");
      if (!name.trim()) throw new Error("Enter your name");
      if (!isValidGhanaPhone(phone)) throw new Error("Enter a valid Ghana phone (e.g. 024XXXXXXX)");

      const endTime = addMinutesToTime(time, selectedService.duration_minutes);
      await submitBookingFn({
        data: {
          salonId,
          serviceId: selectedService.id,
          customerName: name.trim(),
          customerPhone: phone.replace(/\s+/g, ""),
          bookingDate: dateKey,
          startTime: time,
          endTime,
          honeypot,
          elapsedMs: Date.now() - mountedAt.current,
        },
      });
    },
    onSuccess: () => {
      toast.success("Booking received! The salon will confirm shortly.");
      setConfirmation({
        service: selectedService?.name ?? "",
        date: date.toLocaleDateString("en-GH", { weekday: "long", month: "long", day: "numeric" }),
        time: formatTimeLabel(time),
      });
      setTime("");
      setName("");
      setPhone("");
      setHoneypot("");
      mountedAt.current = Date.now();
      qc.invalidateQueries({ queryKey: ["bookings-day", salonId, dateKey] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const waLink = confirmation
    ? whatsappLink(
        salonWhatsapp,
        `Hi ${salonName}, I just booked ${confirmation.service} on ${confirmation.date} at ${confirmation.time}.`
      )
    : null;

  const wrapperClass =
    variant === "card"
      ? "bg-card p-6 sm:p-8 rounded-3xl shadow-xl ring-1 ring-foreground/5 sticky top-24"
      : "p-1";

  if (confirmation) {
    return (
      <div className={wrapperClass}>
        <div className="text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-green-100 text-green-700 flex items-center justify-center text-2xl mb-4">✓</div>
          <h3 className="font-serif text-2xl mb-2">Booking received!</h3>
          <p className="text-sm text-foreground/60 mb-1">
            {confirmation.service} • {confirmation.date}
          </p>
          <p className="text-sm text-foreground/60 mb-6">at {confirmation.time}</p>
          <p className="text-xs text-foreground/50 mb-6">
            {salonName} will confirm shortly. You'll receive an SMS update.
          </p>
          {waLink && (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 bg-[#25D366] text-white py-4 rounded-xl font-bold uppercase text-xs tracking-[0.2em] hover:opacity-90 transition-opacity mb-3"
            >
              <WhatsAppIcon /> Message {salonName} on WhatsApp
            </a>
          )}
          <button
            onClick={() => setConfirmation(null)}
            className="w-full border border-foreground/10 py-3 rounded-xl text-xs uppercase tracking-[0.2em] font-bold hover:border-primary transition-colors"
          >
            Book another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
      {variant === "card" && <h3 className="font-serif text-2xl mb-6">Secure Your Spot</h3>}

      {services.length === 0 ? (
        <p className="text-sm text-foreground/50">This salon hasn't published services yet.</p>
      ) : (
        <>
          {/* Service select */}
          <div className="mb-6">
            <label className="text-[10px] uppercase tracking-widest font-bold text-foreground/40 mb-2 block">
              Service
            </label>
            <select
              value={serviceId}
              onChange={(e) => { setServiceId(e.target.value); setTime(""); }}
              className="w-full bg-background border border-foreground/10 px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-accent"
            >
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {formatGhs(s.price_ghs)} ({s.duration_minutes}min)
                </option>
              ))}
            </select>
          </div>

          {/* Date strip */}
          <div className="mb-6">
            <label className="text-[10px] uppercase tracking-widest font-bold text-foreground/40 mb-2 block">
              Date
            </label>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
              {dates.map((d) => {
                const sel = formatDateISO(d) === dateKey;
                const day = d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
                return (
                  <button
                    key={d.toISOString()}
                    onClick={() => { setDate(d); setTime(""); }}
                    className={`shrink-0 w-14 py-3 rounded-lg text-center text-[10px] font-bold transition-colors ${
                      sel ? "bg-primary text-primary-foreground" : "border border-foreground/10 hover:border-accent"
                    }`}
                  >
                    {day}
                    <br />
                    <span className="text-lg font-serif">{d.getDate()}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Times */}
          <div className="mb-6">
            <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-2 block">
              Time
            </label>
            {slots.length === 0 ? (
              <p className="text-sm text-muted-foreground italic py-4">No available slots on this date.</p>
            ) : (
              <div role="radiogroup" aria-label="Available time slots" className="grid grid-cols-3 gap-2">
                {slots.map((s) => {
                  const selected = time === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setTime(s)}
                      className={`py-2 rounded-lg text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                        selected
                          ? "bg-primary text-primary-foreground font-bold"
                          : "bg-background border border-border hover:border-primary"
                      }`}
                    >
                      {formatTimeLabel(s)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Contact */}
          <div className="space-y-3 mb-6">
            <label htmlFor="booking-name" className="sr-only">Full name</label>
            <input
              id="booking-name"
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-background px-4 py-3 rounded-xl outline-none text-sm border border-border focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
            />
            <label htmlFor="booking-phone" className="sr-only">Phone number</label>
            <input
              id="booking-phone"
              type="tel"
              placeholder="Phone (e.g. 0241234567)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-background px-4 py-3 rounded-xl outline-none text-sm border border-border focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
            />
          </div>

          {/* Honeypot — hidden from real users, bots fill it */}
          <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", top: "auto", width: "1px", height: "1px", overflow: "hidden" }}>
            <label htmlFor="booking-website">Website (leave blank)</label>
            <input
              id="booking-website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </div>

          <button
            disabled={createBooking.isPending}
            onClick={() => createBooking.mutate()}
            className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-bold uppercase text-xs tracking-[0.2em] hover:opacity-90 transition-opacity disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {createBooking.isPending ? "Booking..." : "Confirm Booking"}
          </button>
          <p className="text-center text-[10px] text-muted-foreground mt-4">
            No payment required until your visit.
          </p>
        </>
      )}
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.198-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
    </svg>
  );
}
