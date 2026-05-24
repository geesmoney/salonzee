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
import { isValidGhanaPhone, formatGhs } from "@/lib/ghana";

type Service = {
  id: string;
  name: string;
  duration_minutes: number;
  price_ghs: number;
};

type Props = {
  salonId: string;
  services: Service[];
  operatingHours: OperatingHours;
  slotDuration: number;
  variant?: "card" | "plain";
};

export function BookingWidget({ salonId, services, operatingHours, slotDuration, variant = "card" }: Props) {
  const qc = useQueryClient();
  const dates = nextNDates(14);
  const [serviceId, setServiceId] = useState<string>(services[0]?.id ?? "");
  const [date, setDate] = useState<Date>(dates[0]);
  const [time, setTime] = useState<string>("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [honeypot, setHoneypot] = useState(""); // bots fill hidden field
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
          priceGhsSnapshot: Number(selectedService.price_ghs),
          honeypot,
          elapsedMs: Date.now() - mountedAt.current,
        },
      });
    },
    onSuccess: () => {
      toast.success("Booking received! The salon will confirm shortly.");
      setTime("");
      setName("");
      setPhone("");
      setHoneypot("");
      mountedAt.current = Date.now();
      qc.invalidateQueries({ queryKey: ["bookings-day", salonId, dateKey] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const wrapperClass =
    variant === "card"
      ? "bg-card p-6 sm:p-8 rounded-3xl shadow-xl ring-1 ring-foreground/5 sticky top-24"
      : "p-1";

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
