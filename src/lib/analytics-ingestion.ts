import { z } from "zod";

const nullableText = (max: number) => z.string().max(max).nullable();
export const analyticsEventSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("visit"),
    session_id: z.string().uuid(),
    path: z.string().max(300).regex(/^\/(?!\/)[^?#\r\n]*$/),
    device: z.enum(["mobile", "desktop"]),
    source: z.string().min(1).max(60),
    referrer: nullableText(500),
    utm_source: nullableText(100),
    utm_medium: nullableText(100),
    utm_campaign: nullableText(150),
    gclid: nullableText(300),
  }).strict(),
  z.object({
    kind: z.literal("install"),
    session_id: z.string().uuid(),
    event: z.enum(["prompt_shown", "prompt_accepted", "prompt_dismissed", "installed", "home_screen_open"]),
    platform: z.enum(["android", "ios", "desktop", "other"]),
  }).strict(),
]);

export type AnalyticsEvent = z.infer<typeof analyticsEventSchema>;

// Browser origin checks mitigate cross-site submissions, not deliberate bots:
// non-browser clients can forge these headers. Never treat this as user auth.
export function isSameOriginSubmission(request: Request): boolean {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  return origin === new URL(request.url).origin &&
    (fetchSite === null || fetchSite === "same-origin");
}