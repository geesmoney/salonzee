import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { summariseCustomerBookings } from "./customer-bookings";

describe("summariseCustomerBookings", () => {
  test("counts spending only from completed bookings and upcoming from future active ones", () => {
    const s = summariseCustomerBookings([
      { booking_date: "2026-11-01", status: "completed", price_ghs_snapshot: 150 },
      { booking_date: "2026-11-25", status: "confirmed", price_ghs_snapshot: 200 },
      { booking_date: "2026-11-26", status: "pending", price_ghs_snapshot: "80" },
      { booking_date: "2026-11-27", status: "cancelled", price_ghs_snapshot: 90 },
      { booking_date: "2026-11-10", status: "pending", price_ghs_snapshot: 50 },
    ], "2026-11-21");
    assert.deepEqual(s, { upcoming: 2, completed: 1, spent: 150 });
  });
});
