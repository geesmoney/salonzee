import { z } from "zod";
import { BUSINESS_CATEGORY_LABELS, type BusinessCategory } from "@/lib/ghana";

export const businessCategorySchema = z.enum([
  "hair_salon",
  "barbershop",
  "braiding",
  "nail_tech",
  "makeup",
  "lashes_brows",
  "spa",
  "other",
]);

const optionalText = (max: number) => z.string().trim().max(max).nullable();
const cleanPhone = (raw: string) => raw.replace(/[\s()\-]/g, "");

export function isValidSalonLeadPhone(raw: string): boolean {
  return /^(?:0[2-5][0-9]{8}|\+233[2-5][0-9]{8})$/.test(cleanPhone(raw));
}

export function normalizeSalonLeadPhone(raw: string): string {
  const phone = cleanPhone(raw);
  return phone.startsWith("0") ? `+233${phone.slice(1)}` : phone;
}

export const salonLeadSchema = z.object({
  ownerName: z.string().trim().min(2, "Enter your name.").max(100),
  businessName: z.string().trim().min(2, "Enter your business name.").max(120),
  phone: z.string().trim().max(20).refine(isValidSalonLeadPhone, "Enter a valid Ghana phone number."),
  businessCategory: businessCategorySchema,
  city: z.string().trim().min(2).max(60),
  area: optionalText(100),
  preferredContact: z.enum(["phone", "whatsapp", "either"]),
  helpText: optionalText(500),
  consent: z.boolean().refine((value) => value, "Please allow us to contact you about this request."),
  honeypot: z.string().max(200),
  elapsedMs: z.number().int().min(0).max(86_400_000),
  utm_source: optionalText(100),
  utm_medium: optionalText(100),
  utm_campaign: optionalText(150),
  utm_term: optionalText(150),
  utm_content: optionalText(150),
  gclid: optionalText(300),
  referrer: optionalText(500),
  landing_path: z.string().max(300).regex(/^\/(?!\/)[^?#\r\n]*$/),
}).strict();

export type SalonLeadInput = z.infer<typeof salonLeadSchema>;
export type SalonLeadStatus = "new" | "contacted" | "converted" | "archived";

export const CONTACT_PREFERENCE_LABELS = {
  phone: "Phone call",
  whatsapp: "WhatsApp",
  either: "Phone or WhatsApp",
} as const;

export function salonLeadAlertMessage(lead: {
  ownerName: string;
  businessName: string;
  phone: string;
  businessCategory: BusinessCategory;
  city: string;
  area: string | null;
  preferredContact: "phone" | "whatsapp" | "either";
}): string {
  const location = [lead.area, lead.city].filter(Boolean).join(", ");
  return `New Salonzee onboarding lead: ${lead.businessName} (${BUSINESS_CATEGORY_LABELS[lead.businessCategory]}) in ${location}. ${lead.ownerName} prefers ${CONTACT_PREFERENCE_LABELS[lead.preferredContact]}: ${lead.phone}. Follow up: https://salonzee.com/admin/leads`;
}
