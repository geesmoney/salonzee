import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarDays, CheckCheck, RefreshCw, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { getPlatformBookingReport } from "@/lib/booking-reports.functions";
import { BOOKING_STATUSES, type ReportBasis, type ReportGrouping, type ReportPeriod } from "@/lib/booking-reports";

const reportOptions = (period: ReportPeriod, basis: ReportBasis, grouping: ReportGrouping) => queryOptions({
  queryKey: ["platform-booking-report", period, basis, grouping],
  queryFn: () => getPlatformBookingReport({ data: { period, basis, grouping } }),
  staleTime: 30000,
});
export const Route = createFileRoute("/_authenticated/admin/bookings")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Platform Booking Reports — Salonzee Admin" },
    { name: "description", content: "Platform-wide booking activity and appointment statuses across Salonzee businesses." },
    { property: "og:title", content: "Platform Booking Reports — Salonzee Admin" },
    { property: "og:description", content: "Daily, weekly and monthly bookings across all Salonzee shops." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(reportOptions("month", "appointment", "daily")),
  errorComponent: () => <div className="mx-auto max-w-xl p-8"><h1 className="text-2xl">Booking report unavailable</h1><p className="my-4 text-muted-foreground">This report is for platform admins. If you have access, please try again.</p><Button asChild><Link to="/admin/pending">Back to admin</Link></Button></div>,
  component: BookingReports,
});
const labels = { pending: "Pending", confirmed: "Confirmed", completed: "Completed", no_show: "No-show", cancelled: "Cancelled" };
function BookingReports() {
  const [period, setPeriod] = useState<ReportPeriod>("month");
  const [basis, setBasis] = useState<ReportBasis>("appointment");
  const [grouping, setGrouping] = useState<ReportGrouping>("daily");
  const { data, refetch, isFetching } = useSuspenseQuery(reportOptions(period, basis, grouping));
  const totals = data.totals;
  return <div className="min-h-dvh bg-background"><SiteNav /><main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm text-muted-foreground">Platform admin · All businesses</p><h1 className="mt-2 text-3xl font-serif">Booking reports</h1><p className="mt-2 text-sm text-muted-foreground">All shops, including test accounts · Accra time (UTC)</p></div><Button variant="outline" size="icon" aria-label="Refresh booking report" title="Refresh booking report" disabled={isFetching} onClick={() => refetch()}><RefreshCw className={isFetching ? "animate-spin" : ""} /></Button></div>
    <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Report period">{([['today', 'Today'], ['week', 'This week'], ['month', 'This month'], ['all', 'All time']] as const).map(([key, label]) => <Button key={key} variant={key === period ? "default" : "outline"} aria-pressed={key === period} onClick={() => setPeriod(key)}>{label}</Button>)}</div>
    <div className="mt-4 flex flex-wrap gap-4">
      <div className="space-y-2"><label id="basis-label" className="text-xs text-muted-foreground">Date basis</label><Select value={basis} onValueChange={(v: ReportBasis) => setBasis(v)}><SelectTrigger aria-labelledby="basis-label" className="w-52"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="appointment">Appointment date</SelectItem><SelectItem value="created">Booking created date</SelectItem></SelectContent></Select></div>
      <div className="space-y-2"><label id="grouping-label" className="text-xs text-muted-foreground">Breakdown</label><Select value={grouping} onValueChange={(v: ReportGrouping) => setGrouping(v)}><SelectTrigger aria-labelledby="grouping-label" className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="daily">Daily</SelectItem><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="monthly">Monthly</SelectItem></SelectContent></Select></div>
    </div>
    <p className="mt-3 text-xs text-muted-foreground">{basis === "appointment" ? "Appointments scheduled within the selected period to date." : "Bookings created within the selected period to date."} All time includes future appointments. Statuses reflect their current state, not when they changed.</p>
    <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">{[
      { label: "Total bookings", value: totals.total, icon: CalendarDays },
      { label: "Completed", value: totals.completed, icon: CheckCheck },
      { label: "Completion rate", value: `${totals.total ? Math.round(totals.completed / totals.total * 100) : 0}%`, icon: CheckCheck },
      { label: "Shops with bookings", value: data.shops.length, icon: Store },
    ].map(({ label, value, icon: Icon }) => <div key={label} className="rounded-lg border border-border bg-card p-4"><div className="flex items-center justify-between gap-2 text-sm text-muted-foreground"><span>{label}</span><Icon className="h-4 w-4 shrink-0" /></div><p className="mt-3 text-3xl font-semibold tabular-nums">{value}</p></div>)}</div>
    <section className="mt-8"><h2 className="text-lg">Booking statuses</h2><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">{BOOKING_STATUSES.map(status => <div key={status} className="border-l-2 border-primary pl-3"><p className="text-sm text-muted-foreground">{labels[status]}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{totals[status]}</p></div>)}</div></section>
    <section className="mt-8"><h2 className="mb-3 text-lg">{grouping === "daily" ? "Daily" : grouping === "weekly" ? "Weekly · Monday start" : "Monthly"} activity</h2><ReportTable firstLabel="Period" rows={data.trend.map(row => ({ ...row, key: row.date, name: row.date }))} /></section>
    <section className="mt-8"><h2 className="mb-3 text-lg">By business</h2><ReportTable firstLabel="Business" rows={data.shops.map(row => ({ ...row, key: row.id }))} /></section>
    <p className="mt-6 text-xs text-muted-foreground">Updated {new Date(data.updatedAt).toLocaleString("en-GB", { timeZone: "Africa/Accra" })} · Completed counts depend on shop owners marking appointments completed.</p>
  </main><SiteFooter /></div>;
}
function ReportTable({ firstLabel, rows }: { firstLabel: string; rows: { key: string; name: string; total: number; pending: number; confirmed: number; completed: number; no_show: number; cancelled: number }[] }) {
  if (!rows.length) return <p className="border-y border-border py-8 text-sm text-muted-foreground">No bookings in this period.</p>;
  return <div className="max-h-[480px] overflow-auto border-y border-border"><table className="w-full min-w-[700px] text-sm"><thead className="sticky top-0 bg-muted"><tr><th className="p-3 text-left">{firstLabel}</th><th className="p-3 text-right">Total</th>{BOOKING_STATUSES.map(status => <th key={status} className="p-3 text-right">{labels[status]}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.key} className="border-t border-border"><th className="max-w-64 p-3 text-left font-medium break-words">{row.name}</th><td className="p-3 text-right font-semibold tabular-nums">{row.total}</td>{BOOKING_STATUSES.map(status => <td key={status} className="p-3 text-right tabular-nums">{row[status]}</td>)}</tr>)}</tbody></table></div>;
}