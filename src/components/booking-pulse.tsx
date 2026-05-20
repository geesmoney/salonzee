import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";

const NAMES = [
  "Kofi", "Ama", "Yaw", "Akosua", "Kwame", "Adwoa", "Kojo", "Esi",
  "Nana", "Abena", "Kwesi", "Akua", "Fiifi", "Efua", "Yaa", "Kobby",
  "Selasi", "Adjoa", "Sena", "Naa", "Maame", "Papa", "Kwabena",
];

const CITIES = [
  "Accra", "Kumasi", "Takoradi", "Tema", "Tamale", "Cape Coast",
  "Ho", "Koforidua", "Sunyani", "East Legon", "Madina", "Spintex",
];

const SERVICES = [
  "box braids", "a silk press", "a haircut", "knotless braids",
  "a manicure", "a pedicure", "a beard trim", "cornrows",
  "a wash & blow-dry", "a fade", "lash extensions", "twists",
];

type Booking = { id: number; name: string; city: string; salon: string; service: string };

export function BookingPulse({ salons }: { salons: { name: string }[] }) {
  const [mounted, setMounted] = useState(false);
  const [current, setCurrent] = useState<Booking | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || dismissed || salons.length === 0) return;

    let id = 0;
    const pick = (): Booking => {
      id += 1;
      return {
        id,
        name: NAMES[Math.floor(Math.random() * NAMES.length)],
        city: CITIES[Math.floor(Math.random() * CITIES.length)],
        salon: salons[Math.floor(Math.random() * salons.length)].name,
        service: SERVICES[Math.floor(Math.random() * SERVICES.length)],
      };
    };

    const showOne = () => {
      setCurrent(pick());
      window.setTimeout(() => setCurrent(null), 5500);
    };

    const first = window.setTimeout(showOne, 3500);
    const interval = window.setInterval(showOne, 12000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
    };
  }, [mounted, dismissed, salons]);

  if (!mounted || !current) return null;

  return (
    <div
      key={current.id}
      className="fixed bottom-4 left-4 z-50 max-w-xs animate-fade-in"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3 rounded-xl border border-border bg-card/95 backdrop-blur p-3 pr-8 shadow-lg relative">
        <div className="shrink-0 rounded-full bg-primary/10 p-2">
          <CheckCircle2 className="w-4 h-4 text-primary" />
        </div>
        <div className="text-sm leading-snug">
          <p className="text-foreground">
            <span className="font-semibold">{current.name}</span>
            <span className="text-muted-foreground"> from {current.city} just booked </span>
            <span className="font-medium">{current.service}</span>
            <span className="text-muted-foreground"> at </span>
            <span className="font-semibold">{current.salon}</span>
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Just now</p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
