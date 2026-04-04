import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart2 } from "lucide-react";
import api from "@/api/axios";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";

const tabs = ["Revenue", "Occupancy", "RevPAR"];
const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface AnalyticsSeries {
  key: string;
  name: string;
  organizationId?: string;
}

interface AnalyticsPoint {
  label: string;
  bucketKey: string;
  [seriesKey: string]: string | number;
}

interface TrendResponse {
  series: AnalyticsSeries[];
  year?: number;
  month?: number;
  view?: "today" | "monthly" | "yearly";
  chartData: AnalyticsPoint[];
}

interface RevenueTrendResponse extends TrendResponse {
  comparison?: {
    current: number;
    previous: number;
    growth: number;
  } | null;
}

const Analytics = () => {
  const { formatCurrency, formatCompactCurrency } = useSystemSettings();
  const [activeTab, setActiveTab] = useState("Revenue");
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState<"today" | "monthly" | "yearly">("monthly");
  const [mode, setMode] = useState<"branch" | "organization">("branch");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());

  const [revenueTrend, setRevenueTrend] = useState<AnalyticsPoint[]>([]);
  const [revenueSeries, setRevenueSeries] = useState<AnalyticsSeries[]>([]);
  const [occupancyTrend, setOccupancyTrend] = useState<AnalyticsPoint[]>([]);
  const [occupancySeries, setOccupancySeries] = useState<AnalyticsSeries[]>([]);
  const [revParTrend, setRevParTrend] = useState<AnalyticsPoint[]>([]);
  const [revParSeries, setRevParSeries] = useState<AnalyticsSeries[]>([]);
  const [comparison, setComparison] = useState<{ current: number; previous: number; growth: number } | null>(null);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const commonParams = { view, year, month: selectedMonth, mode };
        const [revenueRes, occupancyRes, revParRes] = await Promise.all([
          api.get<{ data: RevenueTrendResponse }>("/analytics/revenue-by-branch", {
            params: commonParams,
          }),
          api.get<{ data: TrendResponse }>("/analytics/occupancy-trend", {
            params: commonParams,
          }),
          api.get<{ data: TrendResponse }>("/analytics/revpar-trend", {
            params: commonParams,
          }),
        ]);

        const revenueData = revenueRes.data.data;
        const occupancyData = occupancyRes.data.data;
        const revParData = revParRes.data.data;

        setRevenueTrend(revenueData?.chartData || []);
        setRevenueSeries(revenueData?.series || []);
        setComparison(revenueData?.comparison || null);
        setOccupancyTrend(occupancyData?.chartData || []);
        setOccupancySeries(occupancyData?.series || []);
        setRevParTrend(revParData?.chartData || []);
        setRevParSeries(revParData?.series || []);
      } catch (error) {
        console.error("Failed to load analytics", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchAnalytics();
  }, [mode, selectedMonth, view, year]);

  const tooltipStyle = {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    fontSize: "12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    color: "hsl(var(--foreground))",
  };

  const lineColors = [
    "#2F6B5F",
    "#CCA365",
    "#33658A",
    "#BC6C25",
    "#7A8B5B",
    "#8D5A97",
    "#4D7C0F",
    "#C2410C",
  ];

  const labelPrefix =
    view === "today" ? "Hour" : view === "monthly" ? "Period" : "Month";

  const renderControls = () => (
    <div className="bo-chart-controls an-controls">
      <div className="bo-chart-select-group an-controls-group an-controls-group-mode">
        <button
          className={`bo-chart-btn ${mode === "branch" ? "active" : ""}`}
          onClick={() => setMode("branch")}
        >
          Branch
        </button>
        <button
          className={`bo-chart-btn ${mode === "organization" ? "active" : ""}`}
          onClick={() => setMode("organization")}
        >
          Organization
        </button>
      </div>
      <div className="an-controls-group an-controls-group-view">
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
      </div>
      {view === "monthly" && (
        <div className="flex gap-2 items-center bo-chart-select-group an-controls-group an-controls-group-filter">
          <span className="bo-chart-divider" />
          <span className="bo-chart-year-label">Filter:</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="year-filter"
          >
            {monthLabels.map((label, index) => (
              <option key={label} value={index}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="year-filter"
          >
            {years.map((optionYear) => (
              <option key={optionYear} value={optionYear}>
                {optionYear}
              </option>
            ))}
          </select>
        </div>
      )}
      {view === "yearly" && (
        <div className="bo-chart-select-group an-controls-group an-controls-group-filter">
          <span className="bo-chart-divider" />
          <span className="bo-chart-year-label">Year:</span>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="year-filter"
          >
            {years.map((optionYear) => (
              <option key={optionYear} value={optionYear}>
                {optionYear}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );

  const renderTrendChart = ({
    data,
    series,
    yAxisFormatter,
    tooltipFormatter,
    cursorStroke,
    yAxisDomain,
  }: {
    data: AnalyticsPoint[];
    series: AnalyticsSeries[];
    yAxisFormatter: (value: number) => string;
    tooltipFormatter: (value: number, name: string) => [string, string];
    cursorStroke: string;
    yAxisDomain?: [number, number];
  }) => (
    <div className="an-chart-container">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={(value) => yAxisFormatter(Number(value))}
            axisLine={false}
            tickLine={false}
            domain={yAxisDomain}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value: number, name: string) => tooltipFormatter(Number(value), name)}
            labelFormatter={(label: string) => `${labelPrefix}: ${label}`}
            cursor={{ stroke: cursorStroke, strokeWidth: 1, strokeDasharray: "4 4" }}
          />
          <Legend
            verticalAlign="top"
            height={36}
            wrapperStyle={{ fontSize: "12px" }}
          />
          {series.map((item, index) => (
            <Line
              key={item.key}
              type="monotone"
              dataKey={item.key}
              name={item.name}
              stroke={lineColors[index % lineColors.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  if (loading) {
    return (
      <div className="animate-fade-in an-root">
        <div className="eb-loading">
          <span className="eb-loading-spinner" />
          <span>Loading analytics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in an-root">
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

      <div className="an-charts-grid">
        {activeTab === "Revenue" && (
          <div className="luxury-card an-chart-card" style={{ gridColumn: "1 / -1" }}>
            <div className="gf-section-header an-section-header">
              <div className="an-section-heading">
                <span className="gf-section-title" style={{ display: "block" }}>
                  {mode === "organization" ? "Revenue by Organization" : "Revenue by Branch"}
                </span>
                {view === "monthly" && comparison && (
                  <div className="an-comparison-row">
                    {comparison.growth > 0 && (
                      <span className="an-comparison-value an-comparison-positive">
                        ↑ {comparison.growth.toFixed(1)}%
                      </span>
                    )}
                    {comparison.growth < 0 && (
                      <span className="an-comparison-value an-comparison-negative">
                        ↓ {Math.abs(comparison.growth).toFixed(1)}%
                      </span>
                    )}
                    {comparison.growth === 0 && (
                      <span className="an-comparison-value an-comparison-neutral">0%</span>
                    )}
                    <span className="an-comparison-caption">vs last month</span>
                  </div>
                )}
              </div>
              {renderControls()}
            </div>
            {renderTrendChart({
              data: revenueTrend,
              series: revenueSeries,
              yAxisFormatter: (value) => formatCompactCurrency(value),
              tooltipFormatter: (value, name) => [formatCurrency(value), name],
              cursorStroke: "#CCA365",
            })}
          </div>
        )}

        {activeTab === "Occupancy" && (
          <div className="luxury-card an-chart-card" style={{ gridColumn: "1 / -1" }}>
            <div className="gf-section-header an-section-header">
              <div className="an-section-heading">
                <span className="gf-section-title">
                  {mode === "organization" ? "Occupancy by Organization" : "Occupancy Trend"}
                </span>
              </div>
              {renderControls()}
            </div>
            {renderTrendChart({
              data: occupancyTrend,
              series: occupancySeries,
              yAxisFormatter: (value) => `${value}%`,
              tooltipFormatter: (value, name) => [`${value}%`, name],
              cursorStroke: "hsl(160, 59%, 30%)",
              yAxisDomain: [0, 100],
            })}
          </div>
        )}

        {activeTab === "RevPAR" && (
          <div className="luxury-card an-chart-card" style={{ gridColumn: "1 / -1" }}>
            <div className="gf-section-header an-section-header">
              <div className="an-section-heading">
                <span className="gf-section-title">
                  {mode === "organization" ? "RevPAR by Organization" : "RevPAR Trend"}
                </span>
              </div>
              {renderControls()}
            </div>
            {renderTrendChart({
              data: revParTrend,
              series: revParSeries,
              yAxisFormatter: (value) => formatCompactCurrency(value),
              tooltipFormatter: (value, name) => [formatCurrency(value), name],
              cursorStroke: "#CCA365",
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;
