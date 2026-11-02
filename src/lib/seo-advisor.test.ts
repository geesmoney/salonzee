import { describe, test, expect } from "bun:test";
import { isSeoAdmin, seoInputSchema } from "./seo-advisor";

describe("Salonzee SEO advisor access", () => {
  test("platform admins may use the advisor", () => expect(isSeoAdmin([{ role: "platform_admin" }])).toBe(true));
  test("salon owners are not platform admins", () => expect(isSeoAdmin([{ role: "salon_admin" }])).toBe(false));
  test("signed-out visitors are not admins", () => expect(isSeoAdmin([])).toBe(false));
  test("accepts a Ghanaian search phrase and target city", () => expect(seoInputSchema.parse({ phrase: "barbering shop near me", city: "Accra" })).toEqual({ phrase: "barbering shop near me", city: "Accra" }));
  test("requires both phrase and city", () => expect(seoInputSchema.safeParse({ phrase: "nail tech", city: "" }).success).toBe(false));
});