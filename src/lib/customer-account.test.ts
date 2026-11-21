import { describe, expect, it } from "vitest";
import { accountAreaFor } from "./customer-account";

describe("accountAreaFor", () => {
  it("sends a customer without a salon to My bookings", () => {
    expect(accountAreaFor(false, false)).toBe("/account");
  });

  it("keeps a salon owner on the salon dashboard", () => {
    expect(accountAreaFor(false, true)).toBe("/salon/dashboard");
  });

  it("keeps a platform administrator on the admin review page", () => {
    expect(accountAreaFor(true, false)).toBe("/admin/pending");
  });
});
