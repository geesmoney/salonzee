// Slot generation utilities (timezone-safe; Ghana is UTC+0)
type DayHours = { open: string; close: string; closed: boolean };
export type OperatingHours = Record<string, DayHours>;

const DAY_KEYS = [
  "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
];

export function generateSlots(
  date: Date,
  hours: OperatingHours,
  slotMinutes: number,
  serviceDurationMinutes = 30,
): string[] {
  const dayKey = DAY_KEYS[date.getDay()];
  const day = hours?.[dayKey];
  if (!day || day.closed) return [];

  const [openH, openM] = day.open.split(":").map(Number);
  const [closeH, closeM] = day.close.split(":").map(Number);
  const openMins = openH * 60 + openM;
  const closeMins = closeH * 60 + closeM;

  const slots: string[] = [];
  for (let t = openMins; t + serviceDurationMinutes <= closeMins; t += slotMinutes) {
    const h = Math.floor(t / 60);
    const m = t % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`);
  }
  return slots;
}

export function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const newH = Math.floor(total / 60);
  const newM = total % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}:00`;
}

export function formatTimeLabel(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

export function formatDateISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function nextNDates(n: number, start = new Date()): Date[] {
  const out: Date[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    out.push(d);
  }
  return out;
}
