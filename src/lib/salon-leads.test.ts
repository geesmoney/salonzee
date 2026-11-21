import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { normalizeSalonLeadPhone, salonLeadSchema } from "./salon-leads";

const validLead = {
  ownerName: "Ama Mensah",
  businessName: "Ama Beauty Studio",
  phone: "024 123 4567",
  businessCategory: "hair_salon",
  city: "Accra",
  area: "East Legon",
  preferredContact: "either",
  helpText: null,
  consent: true,
  honeypot: "",
  elapsedMs: 5000,
  utm_source: "google",
  utm_medium: "cpc",
  utm_campaign: "accra_salons",
  utm_term: "salon booking app",
  utm_content: null,
  gclid: "test-click-id",
  referrer: null,
  landing_path: "/get-listed",
};

describe("salon onboarding lead validation", () => {
  test("accepts a lead with phone or WhatsApp follow-up and ad attribution", () => {
    assert.equal(salonLeadSchema.safeParse(validLead).success, true);
    assert.equal(normalizeSalonLeadPhone(validLead.phone), "+233241234567");
  });

  test("requires permission to contact the business", () => {
    assert.equal(salonLeadSchema.safeParse({ ...validLead, consent: false }).success, false);
  });

  test("rejects invalid Ghana phone numbers", () => {
    assert.equal(salonLeadSchema.safeParse({ ...validLead, phone: "12345" }).success, false);
  });

  test("rejects unknown contact preferences and business categories", () => {
    assert.equal(salonLeadSchema.safeParse({ ...validLead, preferredContact: "email" }).success, false);
    assert.equal(salonLeadSchema.safeParse({ ...validLead, businessCategory: "unknown" }).success, false);
  });

  test("rejects caller-supplied administrative fields", () => {
    assert.equal(salonLeadSchema.safeParse({ ...validLead, status: "converted", created_at: "2020-01-01" }).success, false);
  });

  test("rejects oversized campaign values and external landing paths", () => {
    assert.equal(salonLeadSchema.safeParse({ ...validLead, utm_campaign: "x".repeat(151) }).success, false);
    assert.equal(salonLeadSchema.safeParse({ ...validLead, landing_path: "https://attacker.example" }).success, false);
  });
});
