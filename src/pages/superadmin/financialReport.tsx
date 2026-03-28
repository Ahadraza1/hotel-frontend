import { useEffect, useState } from "react";
import { DollarSign, CreditCard, RefreshCw, Receipt, TrendingUp, Wallet } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import api from "@/api/axios";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";

interface MonthlyRevenue {
  month: string;
  revenue: number;
}

interface PlanDist {
  name: string;
  value: number;
  color: string;
  dotClass?: string;
}

interface RecentPayment {
  _id: string;
  organizationName: string;
  tier: string;
  amount: number;
  date: string;
  status: string;
}

interface OverviewData {
  monthlyRevenue: number;
  mrr: number;
  refunds: number;
  activeInvoices: number;
  totalSubscriptionRevenue: number;
  todayRevenue: number;
  monthlySubscriptionRevenue: number;
  yearlyRevenue: number;
}

/* ── Site luxury palette ── */
const THEME_COLORS = [
  "hsl(41, 55%, 57%)",   // gold
  "hsl(160, 59%, 30%)",  // emerald
  "hsl(210, 40%, 50%)",  // blue
  "hsl(280, 40%, 50%)",  // violet
  "hsl(350, 60%, 55%)",  // rose
  "hsl(30,  40%, 50%)",  // orange
];

const THEME_DOT_CLASSES = [
  "dot-gold",
  "dot-emerald",
  "dot-blue",
  "dot-violet",
  "dot-rose",
  "dot-orange",
];

const GlobalFinance = () => {
  const { formatCurrency, formatCompactCurrency } = useSystemSettings();
  const [overview, setOverview] = useState<OverviewData>({
    monthlyRevenue: 0,
    mrr: 0,
    refunds: 0,
    activeInvoices: 0,
    totalSubscriptionRevenue: 0,
    todayRevenue: 0,
    monthlySubscriptionRevenue: 0,
    yearlyRevenue: 0,
  });

  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue[]>([]);
  const [planDist, setPlanDist] = useState<PlanDist[]>([]);
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFinance = async () => {
      try {
        const [overviewRes, revenueRes, planRes, paymentsRes] =
          await Promise.all([
            api.get<{ data: OverviewData }>("/financial-reports/overview"),
            api.get<{ data: MonthlyRevenue[] }>("/financial-reports/monthly-revenue"),
            api.get<{ data: PlanDist[] }>("/financial-reports/plan-distribution"),
            api.get<{ data: RecentPayment[] }>("/financial-reports/recent-payments"),
          ]);

        setOverview(
          overviewRes.data.data ?? {
            monthlyRevenue: 0,
            mrr: 0,
            refunds: 0,
            activeInvoices: 0,
            totalSubscriptionRevenue: 0,
            todayRevenue: 0,
            monthlySubscriptionRevenue: 0,
            yearlyRevenue: 0,
          },
        );
        setMonthlyRevenue(revenueRes.data.data || []);
        const rawPlan: PlanDist[] = planRes.data.data || [];
        setPlanDist(
          rawPlan.map((p, i) => ({
            ...p,
            color: THEME_COLORS[i % THEME_COLORS.length],
            dotClass: THEME_DOT_CLASSES[i % THEME_DOT_CLASSES.length],
          }))
        );
        setRecentPayments(paymentsRes.data.data || []);
      } catch (error) {
        console.error("Failed to load finance data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFinance();
  }, []);

  if (loading) {
    return (
      <div className="animate-fade-in gf-root">
        <div className="eb-loading">
          <span className="eb-loading-spinner" />
          <span>Loading financial data…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in gf-root">

      {/* ── Page Header ── */}
      <div className="add-branch-header">
        <div className="add-branch-header-icon-wrap">
          <TrendingUp className="add-branch-header-icon" />
        </div>
        <div>
          <h1 className="page-title">Financial Reports</h1>
          <p className="page-subtitle">Platform revenue, billing, and financial overview</p>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="gf-kpi-grid">

        <div className="luxury-card kpi-card gf-kpi-card">
          <div className="gf-kpi-icon-wrap gf-kpi-icon-gold">
            <DollarSign className="gf-kpi-icon" />
          </div>
          <span className="kpi-value">{formatCurrency(overview.monthlyRevenue)}</span>
          <span className="kpi-label">Monthly Revenue</span>
        </div>

        {/* <div className="luxury-card kpi-card gf-kpi-card">
          <div className="gf-kpi-icon-wrap gf-kpi-icon-green">
            <CreditCard className="gf-kpi-icon" />
          </div>
          <span className="kpi-value">${overview.mrr?.toLocaleString()}</span>
          <span className="kpi-label">Subscription MRR</span>
        </div> */}

        <div className="luxury-card kpi-card gf-kpi-card">
          <div className="gf-kpi-icon-wrap gf-kpi-icon-amber">
            <RefreshCw className="gf-kpi-icon" />
          </div>
          <span className="kpi-value">{formatCurrency(overview.refunds)}</span>
          <span className="kpi-label">Refunds This Month</span>
        </div>

        <div className="luxury-card kpi-card gf-kpi-card">
          <div className="gf-kpi-icon-wrap gf-kpi-icon-muted">
            <Receipt className="gf-kpi-icon" />
          </div>
          <span className="kpi-value">{overview.activeInvoices}</span>
          <span className="kpi-label">Active Invoices</span>
        </div>

        <div className="luxury-card kpi-card gf-kpi-card">
          <div className="gf-kpi-icon-wrap gf-kpi-icon-gold">
            <Wallet className="gf-kpi-icon" />
          </div>
          <span className="kpi-value">{formatCurrency(overview.totalSubscriptionRevenue)}</span>
          <span className="kpi-label">Total Revenue</span>
        </div>

        <div className="luxury-card kpi-card gf-kpi-card">
          <div className="gf-kpi-icon-wrap gf-kpi-icon-green">
            <CreditCard className="gf-kpi-icon" />
          </div>
          <span className="kpi-value">{formatCurrency(overview.todayRevenue)}</span>
          <span className="kpi-label">Today Revenue</span>
        </div>

        <div className="luxury-card kpi-card gf-kpi-card">
          <div className="gf-kpi-icon-wrap gf-kpi-icon-amber">
            <DollarSign className="gf-kpi-icon" />
          </div>
          <span className="kpi-value">{formatCurrency(overview.monthlySubscriptionRevenue)}</span>
          <span className="kpi-label">Monthly Revenue</span>
        </div>

        <div className="luxury-card kpi-card gf-kpi-card">
          <div className="gf-kpi-icon-wrap gf-kpi-icon-muted">
            <TrendingUp className="gf-kpi-icon" />
          </div>
          <span className="kpi-value">{formatCurrency(overview.yearlyRevenue)}</span>
          <span className="kpi-label">Yearly Revenue</span>
        </div>

      </div>

      {/* ── Charts Row ── */}
      <div className="gf-charts-row">

        {/* Bar Chart */}
        <div className="luxury-card gf-bar-card">
          <div className="gf-section-header">
            <span className="gf-section-title">Monthly Platform Revenue</span>
          </div>
          <div className="gf-chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyRevenue} barCategoryGap="35%">
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(v) => formatCompactCurrency(v)}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  }}
                  formatter={(value: number) => [
                    formatCurrency(value),
                    "Revenue",
                  ]}
                  cursor={{ fill: "hsl(var(--primary) / 0.06)" }}
                />
                <Bar
                  dataKey="revenue"
                  fill="hsl(41, 55%, 57%)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Plan Distribution */}
        <div className="luxury-card pdc-card">
          <div className="pdc-header">
            <h3 className="kpi-label pdc-title">Plan Distribution</h3>
            {planDist.length > 0 && (
              <span className="pdc-total-pill">
                {planDist.reduce((s, r) => s + r.value, 0)}% Total
              </span>
            )}
          </div>

          <div className="pdc-chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <defs>
                  {planDist.map((e: PlanDist, i) => (
                    <radialGradient key={i} id={`pdcGrad${i}`} cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor={e.color} stopOpacity={1} />
                      <stop offset="100%" stopColor={e.color} stopOpacity={0.75} />
                    </radialGradient>
                  ))}
                </defs>
                <Pie
                  data={planDist}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={72}
                  dataKey="value"
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {planDist.map((e: PlanDist, i) => (
                    <Cell key={e.name} fill={`url(#pdcGrad${i})`} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    color: "hsl(var(--foreground))",
                  }}
                  formatter={(value: number, name: string) => [
                    `${value}%`,
                    name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="pdc-centre-label">
              <span className="pdc-centre-count">{planDist.length}</span>
              <span className="pdc-centre-sub">Plans</span>
            </div>
          </div>

          <div className="pdc-legend">
            {planDist.map((r: PlanDist) => (
              <div key={r.name} className="pdc-legend-row">
                <span className={`legend-dot ${r.dotClass ?? "dot-gold"}`} />
                <span className="pdc-legend-name">{r.name}</span>
                <div className="pdc-track">
                  <div
                    className="pdc-fill"
                    style={{
                      width: `${Math.min(r.value, 100)}%`,
                      background: r.color,
                    }}
                  />
                </div>
                <span className="pdc-legend-value">{r.value}%</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── Recent Payments Table ── */}
      <div className="luxury-card gf-table-card">
        <div className="gf-section-header gf-section-header-border">
          <span className="gf-section-title">Recent Payments</span>
          <span className="gf-payments-count">{recentPayments.length} entries</span>
        </div>
        <div className="gf-table-scroll">
          <table className="luxury-table">
            <thead>
              <tr>
                <th>Organization</th>
                <th>Tier</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentPayments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="gf-table-empty">No recent payments found</td>
                </tr>
              ) : (
                recentPayments.map((p: RecentPayment) => (
                  <tr key={p._id}>
                    <td className="td-primary">{p.organizationName}</td>
                    <td>
                      <span className="luxury-badge badge-info">
                        {p.tier || "-"}
                      </span>
                    </td>
                    <td>{p.amount > 0 ? formatCurrency(p.amount) : "—"}</td>
                    <td className="user-email">{p.date}</td>
                    <td>
                      <span
                        className={`luxury-badge ${
                          p.status === "paid" ? "badge-active" : "badge-warning"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default GlobalFinance;
