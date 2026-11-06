export const BOOKING_STATUSES = ["pending", "confirmed", "completed", "no_show", "cancelled"] as const;
export type BookingStatus = typeof BOOKING_STATUSES[number];
export type ReportPeriod = "today" | "week" | "month" | "all";
export type ReportBasis = "appointment" | "created";
export type ReportGrouping = "daily" | "weekly" | "monthly";
export type ReportRow = { salon_id: string; booking_date: string; created_at: string; status: BookingStatus; salons: { name: string } | null };

export function periodStart(period: ReportPeriod, now = new Date()) {
  const day = new Date(`${now.toISOString().slice(0, 10)}T00:00:00Z`);
  if (period === "all") return null;
  if (period === "week") day.setUTCDate(day.getUTCDate() - (day.getUTCDay() + 6) % 7);
  if (period === "month") day.setUTCDate(1);
  return day.toISOString().slice(0, 10);
}

export function groupDate(date: string, grouping: ReportGrouping) {
  if (grouping === "monthly") return date.slice(0, 7);
  if (grouping === "daily") return date;
  const day = new Date(`${date}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() - (day.getUTCDay() + 6) % 7);
  return day.toISOString().slice(0, 10);
}

const emptyCounts = () => ({ total: 0, pending: 0, confirmed: 0, completed: 0, no_show: 0, cancelled: 0 });
export function summarizeBookings(rows: ReportRow[], basis: ReportBasis, grouping: ReportGrouping) {
  const totals = emptyCounts();
  const shops = new Map<string, ReturnType<typeof emptyCounts> & { id: string; name: string }>();
  const trend = new Map<string, ReturnType<typeof emptyCounts> & { date: string }>();
  for (const row of rows) {
    totals.total++;
    totals[row.status]++;
    const shop = shops.get(row.salon_id) ?? { ...emptyCounts(), id: row.salon_id, name: row.salons?.name ?? "Unavailable shop" };
    shop.total++; shop[row.status]++; shops.set(row.salon_id, shop);
    const date = groupDate(basis === "appointment" ? row.booking_date : row.created_at.slice(0, 10), grouping);
    const bucket = trend.get(date) ?? { ...emptyCounts(), date };
    bucket.total++; bucket[row.status]++; trend.set(date, bucket);
  }
  return { totals, shops: [...shops.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name)), trend: [...trend.values()].sort((a, b) => a.date.localeCompare(b.date)) };
}