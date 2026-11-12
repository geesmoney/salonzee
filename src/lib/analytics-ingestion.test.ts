import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { analyticsEventSchema, isSameOriginSubmission } from "./analytics-ingestion";

const visit = {
  kind: "visit", session_id: "48714abc-3580-4eae-901d-6aa2380fe873", path: "/register-salon",
  device: "mobile", source: "google_ads", referrer: null, utm_source: "google",
  utm_medium: "cpc", utm_campaign: "owners", gclid: "example-click",
};

describe("analytics submission safeguards", () => {
  test("anonymous visits retain Google Ads attribution", () => {
    assert.deepEqual(analyticsEventSchema.parse(visit), visit);
  });
  test("rejects caller-supplied phone, timestamps and location", () => {
    for (const extra of [{ phone: "0240000000" }, { created_at: "2020-01-01" }, { country: "GH" }]) {
      assert.equal(analyticsEventSchema.safeParse({ ...visit, ...extra }).success, false);
    }
  });
  test("rejects oversized campaigns", () => {
    assert.equal(analyticsEventSchema.safeParse({ ...visit, utm_campaign: "x".repeat(151) }).success, false);
  });
  test("rejects paths containing query strings", () => {
    assert.equal(analyticsEventSchema.safeParse({ ...visit, path: "/?phone=0240000000" }).success, false);
  });
  test("accepts only known install events", () => {
    const install = { kind: "install", session_id: visit.session_id, platform: "android", event: "installed" };
    assert.equal(analyticsEventSchema.safeParse(install).success, true);
    assert.equal(analyticsEventSchema.safeParse({ ...install, event: "fake" }).success, false);
  });
  test("rejects cross-site and missing-origin submissions", () => {
    const request = (headers: Record<string, string>) => new Request("https://salonzee.com/_serverFn/x", { method: "POST", headers });
    assert.equal(isSameOriginSubmission(request({ origin: "https://salonzee.com", "sec-fetch-site": "same-origin" })), true);
    assert.equal(isSameOriginSubmission(request({ origin: "https://attacker.example" })), false);
    assert.equal(isSameOriginSubmission(request({ origin: "https://salonzee.com", "sec-fetch-site": "cross-site" })), false);
    assert.equal(isSameOriginSubmission(request({})), false);
  });
});