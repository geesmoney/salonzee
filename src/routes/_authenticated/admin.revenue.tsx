import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  TrendingUp,
  Users,
  DollarSign,
  Sparkles,
  Target,
  Zap,
  Activity,
  Crown,
  RotateCcw,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/revenue")({
  head: () => ({ meta: [{ title: "Revenue Simulator — Salonzee Admin" }] }),
  ssr: false,
  component: RevenueSimulator,
});

// ---------- Types ----------
type Scenario = "conservative" | "realistic" | "aggressive";

type Inputs = {
  startSalons: number;
  monthlyGrowthPct: number; // %
  churnPct: number; // monthly %
  subscriptionGhs: number; // ARPU subscription
  commissionPct: number; // % of GMV
  avgGmvPerSalon: number; // monthly GHS per salon
  promoAttachPct: number; // % salons paying for promo
  promoArpu: number; // GHS/mo from promo
  adsRpmGhs: number; // GHS per 1000 impressions
  monthlyImpressionsPerSalon: number; // proxy: consumer impressions tied to salon count
  ghsPerUsd: number;
};

const PRESETS: Record<Scenario, Inputs> = {
  conservative: {
    startSalons: 50,
    monthlyGrowthPct: 8,
    churnPct: 4,
    subscriptionGhs: 80,
    commissionPct: 1,
    avgGmvPerSalon: 5000,
    promoAttachPct: 8,
    promoArpu: 200,
    adsRpmGhs: 8,
    monthlyImpressionsPerSalon: 2000,
    ghsPerUsd: 12,
  },
  realistic: {
    startSalons: 100,
    monthlyGrowthPct: 14,
    churnPct: 3,
    subscriptionGhs: 150,
    commissionPct: 3,
    avgGmvPerSalon: 8000,
    promoAttachPct: 15,
    promoArpu: 400,
    adsRpmGhs: 15,
    monthlyImpressionsPerSalon: 5000,
    ghsPerUsd: 12,
  },
  aggressive: {
    startSalons: 200,
    monthlyGrowthPct: 22,
    churnPct: 2.5,
    subscriptionGhs: 250,
    commissionPct: 5,
    avgGmvPerSalon: 12000,
    promoAttachPct: 25,
    promoArpu: 700,
    adsRpmGhs: 25,
    monthlyImpressionsPerSalon: 10000,
    ghsPerUsd: 12,
  },
};

// ---------- Simulation ----------
type MonthRow = {
  month: number;
  label: string;
  salons: number;
  subRevenue: number;
  commissionRevenue: number;
  promoRevenue: number;
  adsRevenue: number;
  totalRevenue: number;
  arr: number;
};

function simulate(i: Inputs, months: number): MonthRow[] {
  const rows: MonthRow[] = [];
  let salons = i.startSalons;
  const growth = i.monthlyGrowthPct / 100;
  const churn = i.churnPct / 100;
  for (let m = 1; m <= months; m++) {
    // Net growth applied to current salons + a constant inflow proportional to start
    const gross = salons * (1 + growth);
    const churned = salons * churn;
    salons = Math.max(0, gross - churned);

    const sub = salons * i.subscriptionGhs;
    const commission = salons * i.avgGmvPerSalon * (i.commissionPct / 100);
    const promo = salons * (i.promoAttachPct / 100) * i.promoArpu;
    const impressions = salons * i.monthlyImpressionsPerSalon;
    const ads = (impressions / 1000) * i.adsRpmGhs;
    const total = sub + commission + promo + ads;

    const year = Math.ceil(m / 12);
    rows.push({
      month: m,
      label: `Y${year} M${((m - 1) % 12) + 1}`,
      salons: Math.round(salons),
      subRevenue: sub,
      commissionRevenue: commission,
      promoRevenue: promo,
      adsRevenue: ads,
      totalRevenue: total,
      arr: total * 12,
    });
  }
  return rows;
}

// ---------- Helpers ----------
const fmtGhs = (n: number) => {
  if (n >= 1_000_000) return `GHS ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `GHS ${(n / 1_000).toFixed(1)}k`;
  return `GHS ${Math.round(n)}`;
};
const fmtUsd = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${Math.round(n)}`;
};
const fmtNum = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${Math.round(n)}`;

// Valuation multiples on ARR in USD
function valuation(arrUsd: number): { low: number; high: number; stage: string } {
  if (arrUsd < 100_000) return { low: 500_000, high: 2_000_000, stage: "Pre-PMF" };
  if (arrUsd < 1_000_000) return { low: arrUsd * 5, high: arrUsd * 8, stage: "Post-PMF" };
  if (arrUsd < 5_000_000) return { low: arrUsd * 8, high: arrUsd * 12, stage: "Scaling" };
  return { low: arrUsd * 10, high: arrUsd * 18, stage: "Regional leader" };
}

// ---------- Component ----------
function RevenueSimulator() {
  const { user, loading, isPlatformAdmin } = useAuth();
  const navigate = useNavigate();
  const [scenario, setScenario] = useState<Scenario>("realistic");
  const [inputs, setInputs] = useState<Inputs>(PRESETS.realistic);
  const [horizon, setHorizon] = useState(60); // months

  useEffect(() => {
    if (!loading) {
      if (!user) navigate({ to: "/login" });
      else if (!isPlatformAdmin) navigate({ to: "/" });
    }
  }, [user, loading, isPlatformAdmin, navigate]);

  const rows = useMemo(() => simulate(inputs, horizon), [inputs, horizon]);

  const last = rows[rows.length - 1];
  const yearEnds = useMemo(
    () => rows.filter((r) => r.month % 12 === 0),
    [rows],
  );

  const totalRevenue5y = useMemo(
    () => rows.reduce((s, r) => s + r.totalRevenue, 0),
    [rows],
  );

  const arrUsd = last ? last.arr / inputs.ghsPerUsd : 0;
  const val = valuation(arrUsd);

  const streamBreakdown = last
    ? [
        { name: "Subscription", value: last.subRevenue, color: "hsl(var(--primary))" },
        { name: "Commission", value: last.commissionRevenue, color: "#10b981" },
        { name: "Promo", value: last.promoRevenue, color: "#f59e0b" },
        { name: "Ads", value: last.adsRevenue, color: "#ef4444" },
      ]
    : [];

  const applyScenario = (s: Scenario) => {
    setScenario(s);
    setInputs(PRESETS[s]);
  };

  const setField = <K extends keyof Inputs>(k: K, v: Inputs[K]) => {
    setScenario("realistic"); // mark as custom-ish but keep label
    setInputs((prev) => ({ ...prev, [k]: v }));
  };

  if (loading || !isPlatformAdmin) {
    return <div className="p-10 text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="min-h-dvh bg-background">
      <SiteNav />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 20% 0%, hsl(var(--primary)/0.4), transparent 50%), radial-gradient(circle at 80% 100%, hsl(var(--primary)/0.2), transparent 50%)",
          }}
        />
        <div className="relative max-w-7xl mx-auto px-6 md:px-10 py-10 md:py-14">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
              <Sparkles className="h-3.5 w-3.5" /> Admin · Simulator
            </span>
            <span className="text-xs text-muted-foreground">
              Model business outcomes across {Math.round(horizon / 12)}-year horizons
            </span>
          </div>
          <h1 className="font-display text-4xl md:text-6xl tracking-tight text-foreground">
            Revenue Simulator
          </h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            Tune the levers below — salon growth, ARPU, commission, promo, ads — and see
            projected ARR, total 5-year revenue, and valuation in real time.
          </p>

          {/* Scenario tabs */}
          <div className="mt-6 flex flex-wrap gap-2">
            {(["conservative", "realistic", "aggressive"] as Scenario[]).map((s) => (
              <button
                key={s}
                onClick={() => applyScenario(s)}
                className={`px-4 py-2 rounded-full text-sm font-semibold capitalize transition-all ${
                  scenario === s
                    ? "bg-foreground text-background shadow-lg"
                    : "bg-muted text-foreground/70 hover:bg-muted/70"
                }`}
              >
                {s}
              </button>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyScenario(scenario)}
              className="ml-auto gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </Button>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 md:px-10 py-10 space-y-10">
        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={<Activity className="h-4 w-4" />}
            label={`Active salons · M${horizon}`}
            value={fmtNum(last?.salons ?? 0)}
            sub={`from ${fmtNum(inputs.startSalons)} start`}
            accent="primary"
          />
          <KpiCard
            icon={<DollarSign className="h-4 w-4" />}
            label="ARR (year-end)"
            value={fmtGhs(last?.arr ?? 0)}
            sub={fmtUsd(arrUsd)}
            accent="emerald"
          />
          <KpiCard
            icon={<TrendingUp className="h-4 w-4" />}
            label={`Total revenue · ${Math.round(horizon / 12)}y`}
            value={fmtGhs(totalRevenue5y)}
            sub={fmtUsd(totalRevenue5y / inputs.ghsPerUsd)}
            accent="amber"
          />
          <KpiCard
            icon={<Crown className="h-4 w-4" />}
            label={`Valuation · ${val.stage}`}
            value={`${fmtUsd(val.low)} – ${fmtUsd(val.high)}`}
            sub={`based on ${arrUsd > 0 ? (val.low / arrUsd).toFixed(0) : 0}–${arrUsd > 0 ? (val.high / arrUsd).toFixed(0) : 0}× ARR`}
            accent="violet"
          />
        </div>

        {/* Controls + main chart */}
        <div className="grid lg:grid-cols-[360px_1fr] gap-6">
          {/* Levers */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-5 h-fit lg:sticky lg:top-20">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <h3 className="font-display text-lg">Growth levers</h3>
            </div>

            <LeverGroup title="Salon base">
              <Lever
                label="Starting salons"
                value={inputs.startSalons}
                min={10}
                max={1000}
                step={10}
                onChange={(v) => setField("startSalons", v)}
                format={(v) => `${v}`}
              />
              <Lever
                label="Monthly growth"
                value={inputs.monthlyGrowthPct}
                min={0}
                max={40}
                step={0.5}
                onChange={(v) => setField("monthlyGrowthPct", v)}
                format={(v) => `${v}%`}
              />
              <Lever
                label="Monthly churn"
                value={inputs.churnPct}
                min={0}
                max={15}
                step={0.5}
                onChange={(v) => setField("churnPct", v)}
                format={(v) => `${v}%`}
              />
            </LeverGroup>

            <LeverGroup title="Per-salon revenue">
              <Lever
                label="Subscription"
                value={inputs.subscriptionGhs}
                min={0}
                max={600}
                step={10}
                onChange={(v) => setField("subscriptionGhs", v)}
                format={(v) => `GHS ${v}/mo`}
              />
              <Lever
                label="Avg salon GMV"
                value={inputs.avgGmvPerSalon}
                min={1000}
                max={30000}
                step={500}
                onChange={(v) => setField("avgGmvPerSalon", v)}
                format={(v) => `GHS ${v.toLocaleString()}/mo`}
              />
              <Lever
                label="Commission take rate"
                value={inputs.commissionPct}
                min={0}
                max={15}
                step={0.25}
                onChange={(v) => setField("commissionPct", v)}
                format={(v) => `${v}%`}
              />
            </LeverGroup>

            <LeverGroup title="Promo & ads">
              <Lever
                label="Promo attach rate"
                value={inputs.promoAttachPct}
                min={0}
                max={60}
                step={1}
                onChange={(v) => setField("promoAttachPct", v)}
                format={(v) => `${v}%`}
              />
              <Lever
                label="Promo ARPU"
                value={inputs.promoArpu}
                min={0}
                max={2000}
                step={50}
                onChange={(v) => setField("promoArpu", v)}
                format={(v) => `GHS ${v}/mo`}
              />
              <Lever
                label="Ad RPM"
                value={inputs.adsRpmGhs}
                min={0}
                max={80}
                step={1}
                onChange={(v) => setField("adsRpmGhs", v)}
                format={(v) => `GHS ${v}/1k`}
              />
              <Lever
                label="Impressions / salon"
                value={inputs.monthlyImpressionsPerSalon}
                min={0}
                max={50000}
                step={500}
                onChange={(v) => setField("monthlyImpressionsPerSalon", v)}
                format={(v) => `${fmtNum(v)}/mo`}
              />
            </LeverGroup>

            <LeverGroup title="Horizon">
              <Lever
                label="Projection length"
                value={horizon}
                min={12}
                max={84}
                step={6}
                onChange={(v) => setHorizon(v)}
                format={(v) => `${v} months`}
              />
            </LeverGroup>
          </div>

          {/* Main revenue chart */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-display text-xl">Monthly revenue by stream</h3>
                  <p className="text-xs text-muted-foreground">
                    Stacked, in Ghanaian Cedi
                  </p>
                </div>
                <Target className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="h-[360px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={rows}>
                    <defs>
                      <linearGradient id="g-sub" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                      </linearGradient>
                      <linearGradient id="g-com" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.2} />
                      </linearGradient>
                      <linearGradient id="g-pro" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.2} />
                      </linearGradient>
                      <linearGradient id="g-ads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity={0.2} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="label"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      interval={Math.max(1, Math.floor(horizon / 12))}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickFormatter={(v) => fmtGhs(v)}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                      formatter={(v: number, name: string) => [fmtGhs(v), name]}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area
                      type="monotone"
                      stackId="1"
                      dataKey="subRevenue"
                      name="Subscription"
                      stroke="hsl(var(--primary))"
                      fill="url(#g-sub)"
                    />
                    <Area
                      type="monotone"
                      stackId="1"
                      dataKey="commissionRevenue"
                      name="Commission"
                      stroke="#10b981"
                      fill="url(#g-com)"
                    />
                    <Area
                      type="monotone"
                      stackId="1"
                      dataKey="promoRevenue"
                      name="Promo"
                      stroke="#f59e0b"
                      fill="url(#g-pro)"
                    />
                    <Area
                      type="monotone"
                      stackId="1"
                      dataKey="adsRevenue"
                      name="Ads"
                      stroke="#ef4444"
                      fill="url(#g-ads)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Secondary charts */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="font-display text-lg mb-1 flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" /> Salon growth
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Net of churn, compounded monthly
                </p>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={rows}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="label"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                        interval={Math.max(1, Math.floor(horizon / 8))}
                      />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 12,
                          fontSize: 12,
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="salons"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2.5}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="font-display text-lg mb-1 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" /> Revenue mix (final month)
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Where the money comes from at horizon
                </p>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={streamBreakdown}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={50}
                        outerRadius={85}
                        paddingAngle={3}
                      >
                        {streamBreakdown.map((d) => (
                          <Cell key={d.name} fill={d.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 12,
                          fontSize: 12,
                        }}
                        formatter={(v: number) => fmtGhs(v)}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Year-end table */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="font-display text-xl">Year-end snapshot</h3>
              <p className="text-xs text-muted-foreground">
                Projected outcomes at each year boundary
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-5 py-3">Year</th>
                  <th className="text-right px-5 py-3">Salons</th>
                  <th className="text-right px-5 py-3">MRR</th>
                  <th className="text-right px-5 py-3">ARR (GHS)</th>
                  <th className="text-right px-5 py-3">ARR (USD)</th>
                  <th className="text-right px-5 py-3">Valuation range</th>
                </tr>
              </thead>
              <tbody>
                {yearEnds.map((y, i) => {
                  const usd = y.arr / inputs.ghsPerUsd;
                  const v = valuation(usd);
                  return (
                    <tr
                      key={y.month}
                      className="border-t border-border hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-5 py-3 font-semibold">Year {i + 1}</td>
                      <td className="px-5 py-3 text-right">{fmtNum(y.salons)}</td>
                      <td className="px-5 py-3 text-right">{fmtGhs(y.totalRevenue)}</td>
                      <td className="px-5 py-3 text-right font-medium">{fmtGhs(y.arr)}</td>
                      <td className="px-5 py-3 text-right text-muted-foreground">
                        {fmtUsd(usd)}
                      </td>
                      <td className="px-5 py-3 text-right text-primary font-medium">
                        {fmtUsd(v.low)} – {fmtUsd(v.high)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Per-stream bar chart */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-display text-xl mb-1">
            Year-end revenue by stream
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            How each revenue lever scales over the projection
          </p>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={yearEnds.map((y, i) => ({
                  year: `Y${i + 1}`,
                  Subscription: y.subRevenue,
                  Commission: y.commissionRevenue,
                  Promo: y.promoRevenue,
                  Ads: y.adsRevenue,
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="year" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickFormatter={(v) => fmtGhs(v)}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => fmtGhs(v)}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Subscription" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Commission" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Promo" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Ads" fill="#ef4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <p className="text-xs text-muted-foreground italic max-w-3xl">
          Disclaimer: This is a planning model, not a forecast. Actual outcomes depend on
          execution, market conditions, payment infrastructure adoption, and competitive
          dynamics. Use it to stress-test assumptions and align on targets — not as a
          guarantee.
        </p>
      </section>

      <SiteFooter />
    </div>
  );
}

// ---------- Subcomponents ----------
function KpiCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  accent: "primary" | "emerald" | "amber" | "violet";
}) {
  const ring = {
    primary: "ring-primary/30 from-primary/15",
    emerald: "ring-emerald-500/30 from-emerald-500/15",
    amber: "ring-amber-500/30 from-amber-500/15",
    violet: "ring-violet-500/30 from-violet-500/15",
  }[accent];
  const iconColor = {
    primary: "text-primary",
    emerald: "text-emerald-500",
    amber: "text-amber-500",
    violet: "text-violet-500",
  }[accent];
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br ${ring} to-card ring-1 p-5`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className={iconColor}>{icon}</span>
      </div>
      <div className="font-display text-2xl md:text-3xl tracking-tight text-foreground">
        {value}
      </div>
      <div className="text-xs text-muted-foreground mt-1">{sub}</div>
    </div>
  );
}

function LeverGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        {title}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Lever({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs text-foreground/80">{label}</label>
        <span className="text-xs font-semibold text-foreground tabular-nums">
          {format(value)}
        </span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(v) => onChange(v[0])}
      />
    </div>
  );
}
