import { z } from "zod";

export const seoInputSchema = z.object({
  phrase: z.string().trim().min(3).max(160),
  city: z.string().trim().min(2).max(80),
});

export function isSeoAdmin(roles: { role: string }[]) {
  return roles.some(({ role }) => role === "platform_admin");
}

export type SeoEvent = { type: "text" | "reasoning" | "error" | "done"; text?: string };