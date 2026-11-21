import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { accountAreaFor } from "./customer-account";

describe("accountAreaFor", () => {
  test("sends a customer without a salon to My bookings", () => {
    assert.equal(accountAreaFor(false, false), "/account");
  });

  test("keeps a salon owner on the salon dashboard", () => {
    assert.equal(accountAreaFor(false, true), "/salon/dashboard");
  });

  test("keeps a platform administrator on the admin review page", () => {
    assert.equal(accountAreaFor(true, false), "/admin/pending");
  });
});
