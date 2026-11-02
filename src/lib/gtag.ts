// Google Ads conversion for completed salon registrations.
export function trackSignupConversion() {
  if (typeof window === "undefined") return;
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  gtag?.("event", "conversion", { send_to: "AW-16486991876/jVbiCNmUlJoZEISQzrU9" });
}
