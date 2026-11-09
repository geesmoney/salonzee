// Browser-safe: pure parsing only, no browser or server globals. Shared by the
// public visit-location endpoint and the admin Traffic dashboard.

export type VisitorLocation = { country: string | null; region: string | null };

export type HeadersLike = { get(name: string): string | null };

// Cloudflare's markers for "we could not place this IP" plus Tor / VPN exit
// ranges. None of them is a real country, so they count as unknown.
const UNKNOWN = new Set(["XX", "ZZ", "T1"]);

function cleanCountry(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code) || UNKNOWN.has(code)) return null;
  return code;
}

function cleanRegion(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const region = raw.trim().replace(/\s+/g, " ");
  if (!region) return null;
  return region.slice(0, 60);
}

/**
 * Reads the visitor's coarse location from Cloudflare's request metadata
 * (`request.cf`), falling back to the `cf-ipcountry` header that Cloudflare
 * adds on incoming requests. Missing data simply yields nulls.
 */
export function readVisitorLocation(headers: HeadersLike, cf?: unknown): VisitorLocation {
  const cloud = (cf ?? {}) as { country?: unknown; region?: unknown; city?: unknown };
  return {
    country: cleanCountry(cloud.country) ?? cleanCountry(headers.get("cf-ipcountry")),
    region: cleanRegion(cloud.region) ?? cleanRegion(cloud.city),
  };
}
