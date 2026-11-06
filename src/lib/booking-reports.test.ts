import { test } from "node:test";
import { strict as assert } from "node:assert";
import { periodStart, summarizeBookings, type ReportRow } from "./booking-reports";

test("daily, weekly and monthly periods use Accra dates and Monday week start", () => {
  const now = new Date("2026-11-06T06:46:00Z");
  assert.equal(periodStart("today", now), "2026-11-06");
  assert.equal(periodStart("week", now), "2026-11-02");
  assert.equal(periodStart("month", now), "2026-11-01");
  assert.equal(periodStart("all", now), null);
});
const rows: ReportRow[] = [
  { salon_id: "a", salons: { name: "Godwin's salon" }, booking_date: "2026-11-06", created_at: "2026-10-30T12:00:00Z", status: "completed" },
  { salon_id: "b", salons: { name: "Another shop" }, booking_date: "2026-11-07", created_at: "2026-11-06T12:00:00Z", status: "completed" },
  { salon_id: "b", salons: { name: "Another shop" }, booking_date: "2026-11-07", created_at: "2026-11-06T12:00:00Z", status: "cancelled" },
];
test("platform totals include every shop and keep completed separate from cancelled", () => {
  const report = summarizeBookings(rows, "appointment", "daily");
  assert.equal(report.totals.total, 3); assert.equal(report.totals.completed, 2); assert.equal(report.totals.cancelled, 1);
  assert.equal(report.shops.length, 2); assert.equal(report.shops[0].total, 2);
  assert.equal(report.trend[1].completed, 1);
});
test("weekly and monthly groups preserve counts and distinguish creation from appointment dates", () => {
  const weekly = summarizeBookings(rows, "appointment", "weekly");
  assert.equal(weekly.trend.length, 1); assert.equal(weekly.trend[0].date, "2026-11-02"); assert.equal(weekly.trend[0].total, 3);
  const monthly = summarizeBookings(rows, "created", "monthly");
  assert.equal(monthly.trend.length, 2); assert.equal(monthly.trend[0].date, "2026-10"); assert.equal(monthly.trend[0].completed, 1);
});