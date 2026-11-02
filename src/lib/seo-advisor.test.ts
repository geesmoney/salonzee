import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { isSeoAdmin, seoInputSchema } from "./seo-advisor";

describe("Salonzee SEO advisor access", () => {
  test("platform admins may use the advisor", () => assert.equal(isSeoAdmin([{ role: "platform_admin" }]), true));
  test("salon owners are not platform admins", () => assert.equal(isSeoAdmin([{ role: "salon_admin" }]), false));
  test("signed-out visitors are not admins", () => assert.equal(isSeoAdmin([]), false));
  test("accepts a Ghanaian search phrase and target city", () => assert.deepEqual(seoInputSchema.parse({ phrase: "barbering shop near me", city: "Accra" }), { phrase: "barbering shop near me", city: "Accra" }));
  test("requires both phrase and city", () => assert.equal(seoInputSchema.safeParse({ phrase: "nail tech", city: "" }).success, false));
});