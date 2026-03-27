import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { BarChart2 } from "lucide-react";
import api from "@/api/axios";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";

const tabs = [
  "Revenue",
  "Occupancy",
  // "ADR",
  "RevPAR",
  // "Seasonal",
  // "Cancellations",
];

interface RevenueBranch {
  name: string;
  value: number;
}

interface OccupancyBranchSeries {
  key: string;
  name: string;
  organizationId?: string;
}

interface OccupancyPoint {
  month: string;
  monthKey: string;
  [branchKey: string]: string | number;
}

interface OccupancyTrendResponse {
  branches: OccupancyBranchSeries[];
  year?: number;
  chartData: OccupancyPoint[];
}

interface RevenueBranchResponse {
  branchName: string;
  revenue: number;
}

const Analytics = () => {
  const { formatCurrency, formatCompactCurrency } = useSystemSettings();
  const [activeTab, setActiveTab] = useState("Revenue");
  const [revenueByBranch, setRevenueByBranch] = useState<{name: string, value: number}[]>([]);
  const [occupancyTrend, setOccupancyTrend] = useState<OccupancyPoint[]>([]);
  const [occupancyBranches, setOccupancyBranches] = useState<OccupancyBranchSeries[]>([]);
  const [revParTrend, setRevParTrend] = useState<OccupancyPoint[]>([]);
  const [revParBranches, setRevParBranches] = useState<OccupancyBranchSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [comparison, setComparison] = useState<{current: number, previous: number, growth: number} | null>(null);

  const [view, setView] = useState("monthly");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [occupancyYear, setOccupancyYear] = useState(new Date().getFullYear());
  const [revParYear, setRevParYear] = useState(new Date().getFullYear());

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [revenueRes, occupancyRes, revparRes] = await Promise.all([
          api.get<{ data: RevenueBranchResponse[] }>("/analytics/revenue-by-branch", {
            params: { view, year, month: selectedMonth }
          }),
          api.get<{ data: OccupancyTrendResponse }>("/analytics/occupancy-trend", {
            params: { year: occupancyYear }
          }),
          api.get<{ data: OccupancyTrendResponse }>("/analytics/revpar-trend", {
            params: { year: revParYear }
          }),
        ]);

        const resData = revenueRes.data.data as { chartData?: RevenueBranchResponse[], comparison?: { current: number, previous: number, growth: number } } | RevenueBranchResponse[];
        const chartData = (resData && 'chartData' in resData) ? resData.chartData : resData;
        const mappedRevenue = (chartData as RevenueBranchResponse[] || []).map((item: RevenueBranchResponse) => ({
          name: item.branchName,
          value: item.revenue
        }));

        setRevenueByBranch(mappedRevenue);
        setComparison((resData && 'comparison' in resData) ? resData.comparison || null : null);
        setOccupancyTrend(occupancyRes.data.data?.chartData || []);
        setOccupancyBranches(occupancyRes.data.data?.branches || []);
        setRevParTrend(revparRes.data.data?.chartData || []);
        setRevParBranches(revparRes.data.data?.branches || []);
      } catch (error) {
        console.error("Failed to load analytics", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [view, year, selectedMonth, occupancyYear, revParYear]);

  if (loading) {
    return (
      <div className="animate-fade-in an-root">
        <div className="eb-loading">
          <span className="eb-loading-spinner" />
          <span>Loading analytics…</span>
        </div>
      </div>
    );
  }

  const tooltipStyle = {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    fontSize: "12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    color: "hsl(var(--foreground))",
  };

  const occupancyLineColors = [
    "#2F6B5F",
    "#CCA365",
    "#33658A",
    "#BC6C25",
    "#7A8B5B",
    "#8D5A97",
    "#4D7C0F",
    "#C2410C",
  ];

  return (
    <div className="animate-fade-in an-root">

      {/* ── Page Header ── */}
      <div className="add-branch-header">
        <div className="add-branch-header-icon-wrap">
          <BarChart2 className="add-branch-header-icon" />
        </div>
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">
            Deep dive into performance metrics across all branches
          </p>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className="an-tab-bar">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`an-tab-btn ${activeTab === tab ? "an-tab-active" : ""}`}
            aria-pressed={activeTab === tab || undefined}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Charts Grid ── */}
      <div className="an-charts-grid">

        {/* Revenue by Branch — horizontal bar */}
        {activeTab === "Revenue" && (
        <div className="luxury-card an-chart-card" style={{ gridColumn: "1 / -1" }}>
          <div className="gf-section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span className="gf-section-title" style={{ display: "block" }}>Revenue by Branch</span>
              {view === "monthly" && comparison && (
                <div style={{ marginTop: "0.25rem", fontSize: "0.875rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  {comparison.growth > 0 && <span style={{ color: "hsl(160, 59%, 40%)", fontWeight: 500 }}>↑ {comparison.growth.toFixed(1)}%</span>}
                  {comparison.growth < 0 && <span style={{ color: "hsl(0, 84%, 60%)", fontWeight: 500 }}>↓ {Math.abs(comparison.growth).toFixed(1)}%</span>}
                  {comparison.growth === 0 && <span style={{ color: "hsl(var(--muted-foreground))" }}>0%</span>}
                  <span style={{ color: "hsl(var(--muted-foreground))" }}>vs last month</span>
                </div>
              )}
            </div>
            <div className="bo-chart-controls">
              <button
                className={`bo-chart-btn ${view === "today" ? "active" : ""}`}
                onClick={() => setView("today")}
              >
                Today
              </button>
              <button
                className={`bo-chart-btn ${view === "monthly" ? "active" : ""}`}
                onClick={() => setView("monthly")}
              >
                Monthly
              </button>
              <button
                className={`bo-chart-btn ${view === "yearly" ? "active" : ""}`}
                onClick={() => setView("yearly")}
              >
                Yearly
              </button>
              {view === "monthly" && (
                <div className="flex gap-2 items-center bo-chart-select-group">
                  <span className="bo-chart-divider" />
                  <span className="bo-chart-year-label">Filter:</span>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="year-filter"
                  >
                    {[
                      "Jan","Feb","Mar","Apr","May","Jun",
                      "Jul","Aug","Sep","Oct","Nov","Dec"
                    ].map((m, index) => (
                      <option key={index} value={index}>{m}</option>
                    ))}
                  </select>

                  <select
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="year-filter"
                  >
                    {years.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              )}
              {view === "yearly" && (
                <div className="bo-chart-select-group">
                  <span className="bo-chart-divider" />
                  <span className="bo-chart-year-label">Year:</span>
                  <select
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="year-filter"
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
          <div className="an-chart-container" style={{ paddingRight: "10px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueByBranch} layout="vertical" margin={{ top: 10, right: 20, left: 0, bottom: 0 }} barCategoryGap="20%">
                <defs>
                  <linearGradient id="goldBar" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#CCA365" stopOpacity={0.85} />
                    <stop offset="100%" stopColor="#E5C790" stopOpacity={1} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="4 4"
                  stroke="hsl(var(--border))"
                  horizontal={false}
                  vertical={true}
                  opacity={0.6}
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11.5, fill: "hsl(var(--muted-foreground))", fontWeight: 500 }}
                  tickFormatter={(v) => formatCompactCurrency(v)}
                  axisLine={false}
                  tickLine={false}
                  tickMargin={8}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))", fontWeight: 500 }}
                  width={110}
                  axisLine={false}
                  tickLine={false}
                  tickMargin={8}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number) => [formatCurrency(v), "Revenue"]}
                  cursor={{ fill: "rgba(204, 163, 101, 0.08)" }}
                  wrapperStyle={{ outline: 'none' }}
                />
                <Bar
                  dataKey="value"
                  fill="url(#goldBar)"
                  radius={[0, 6, 6, 0]}
                  barSize={22}
                  background={{ fill: 'rgba(204, 163, 101, 0.05)', radius: 6 }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        )}

        {/* Occupancy Trend — area chart */}
        {activeTab === "Occupancy" && (
        <div className="luxury-card an-chart-card" style={{ gridColumn: "1 / -1" }}>
          <div className="gf-section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="gf-section-title">Occupancy Trend</span>
            <div className="bo-chart-select-group">
              <span className="bo-chart-year-label">Year:</span>
              <select
                value={occupancyYear}
                onChange={(e) => setOccupancyYear(Number(e.target.value))}
                className="year-filter"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="an-chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={occupancyTrend} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
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
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number, name: string) => [`${v}%`, name]}
                  labelFormatter={(label: string) => `Month: ${label}`}
                  cursor={{ stroke: "hsl(160, 59%, 30%)", strokeWidth: 1, strokeDasharray: "4 4" }}
                />
                <Legend
                  verticalAlign="top"
                  height={36}
                  wrapperStyle={{ fontSize: "12px" }}
                />
                {occupancyBranches.map((branch, index) => (
                  <Line
                    key={branch.key}
                    type="monotone"
                    dataKey={branch.key}
                    name={branch.name}
                    stroke={occupancyLineColors[index % occupancyLineColors.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        )}

        {/* RevPAR Trend — line chart */}
        {activeTab === "RevPAR" && (
        <div className="luxury-card an-chart-card" style={{ gridColumn: "1 / -1" }}>
          <div className="gf-section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="gf-section-title">RevPAR Trend</span>
            <div className="bo-chart-select-group">
              <span className="bo-chart-year-label">Year:</span>
              <select
                value={revParYear}
                onChange={(e) => setRevParYear(Number(e.target.value))}
                className="year-filter"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="an-chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revParTrend} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
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
                  contentStyle={tooltipStyle}
                  formatter={(v: number, name: string) => [formatCurrency(v), name]}
                  labelFormatter={(label: string) => `Month: ${label}`}
                  cursor={{ stroke: "#CCA365", strokeWidth: 1, strokeDasharray: "4 4" }}
                />
                <Legend
                  verticalAlign="top"
                  height={36}
                  wrapperStyle={{ fontSize: "12px" }}
                />
                {revParBranches.map((branch, index) => (
                  <Line
                    key={branch.key}
                    type="monotone"
                    dataKey={branch.key}
                    name={branch.name}
                    stroke={occupancyLineColors[index % occupancyLineColors.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        )}

      </div>
    </div>
  );
};

export default Analytics;
