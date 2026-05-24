// Ghana phone number helpers
export const GHANA_PHONE_REGEX = /^0[2-5][0-9]{8}$/;

export function isValidGhanaPhone(raw: string): boolean {
  return GHANA_PHONE_REGEX.test(raw.replace(/\s+/g, ""));
}

export function normalizeGhanaPhone(raw: string): string {
  const cleaned = raw.replace(/\s+/g, "");
  if (cleaned.startsWith("+233")) return cleaned;
  if (cleaned.startsWith("0")) return "+233" + cleaned.slice(1);
  return cleaned;
}

/** Convert any Ghana phone to E.164 digits (no +) for use in wa.me links. */
export function toWhatsAppDigits(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.startsWith("233")) return digits;
  if (digits.startsWith("0") && digits.length >= 10) return "233" + digits.slice(1);
  return digits || null;
}

/** Build a wa.me link with optional pre-filled message. Returns null if no valid phone. */
export function whatsappLink(phone: string | null | undefined, message?: string): string | null {
  const digits = toWhatsAppDigits(phone);
  if (!digits) return null;
  const base = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function formatGhs(amount: number | string): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  return `GH₵ ${n.toLocaleString("en-GH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export const GHANA_CITIES = [
  "Accra",
  "Kumasi",
  "Tema",
  "Takoradi",
  "Tamale",
  "Ho",
  "Cape Coast",
  "Sunyani",
  "Koforidua",
  "Wa",
];

export const SALON_TYPE_LABELS: Record<string, string> = {
  male: "Men's",
  female: "Women's",
  unisex: "Unisex",
};
