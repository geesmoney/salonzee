type Row = { booking_date: string; status: string; price_ghs_snapshot: number | string };

/** Spending counts completed bookings only; upcoming = pending/confirmed on or after today. */
export function summariseCustomerBookings(rows: Row[], today: string) {
  let upcoming = 0, completed = 0, spent = 0;
  for (const r of rows) {
    if (r.status === "completed") { completed++; spent += Number(r.price_ghs_snapshot) || 0; }
    else if ((r.status === "pending" || r.status === "confirmed") && r.booking_date >= today) upcoming++;
  }
  return { upcoming, completed, spent };
}
