// Google Ads conversion tracking helpers.
// Two conversion actions are configured in the account:
//   1. "Page view"   — someone opens the salon sign-up page.
//   2. "Registration" — someone completes salon registration.

const GOOGLE_ADS_ID = "AW-16486991876";

// Label for the "Page view" conversion action (from the event snippet Google provided).
const PAGE_VIEW_LABEL = "jVbiCNmUlJoZEISQzrU9";

// Label for the "Registration" conversion action.
// Google Ads → Goals → Conversions → Registration → Tag setup → Event snippet,
// the value inside send_to: "AW-16486991876/<this label>".
// Left empty on purpose: nothing fires until the real label is pasted here.
const REGISTRATION_LABEL = "";

function fireConversion(label: string) {
  if (typeof window === "undefined" || !label) return;
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  gtag?.("event", "conversion", { send_to: `${GOOGLE_ADS_ID}/${label}` });
}

// Conversion 1 — "Page view": a visit to the salon sign-up page.
export function trackSignupPageView() {
  fireConversion(PAGE_VIEW_LABEL);
}

// Conversion 2 — "Registration": a salon finished registering.
export function trackSalonRegistration() {
  fireConversion(REGISTRATION_LABEL);
}
