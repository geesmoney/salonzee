import { describe, test, beforeEach, afterEach } from "node:test";
import { strict as assert } from "node:assert";
import { trackSignupPageView, trackSalonRegistration } from "./gtag";

const fired: string[] = [];

describe("Salonzee Google Ads conversions", () => {
  beforeEach(() => {
    fired.length = 0;
    (globalThis as Record<string, unknown>).window = {
      gtag: (_event: string, _name: string, opts: { send_to?: string }) => {
        fired.push(opts.send_to ?? "");
      },
    };
  });

  afterEach(() => {
    delete (globalThis as Record<string, unknown>).window;
  });

  test("page-view conversion reports the label Google provided", () => {
    trackSignupPageView();
    assert.deepEqual(fired, ["AW-16486991876/jVbiCNmUlJoZEISQzrU9"]);
  });

  test("registration conversion stays silent until its label is supplied", () => {
    trackSalonRegistration();
    assert.deepEqual(fired, []);
  });
});
