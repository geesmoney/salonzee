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
