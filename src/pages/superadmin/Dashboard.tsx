import {
  Building2,
  Hotel,
  Users,
  DollarSign,
  Percent,
  Activity,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Info,
  AlertOctagon,
  LayoutDashboard,
  ArrowUpRight,
  ArrowDownRight,
  Star,
  TriangleAlert,
} from "lucide-react";
import { useEffect, useState } from "react";
import api from "@/api/axios";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface KPIData {
  totalOrganizations: number;
  totalBranches: number;
  activeUsers: number;
  globalRevenue: number;
  occupancy: number;
  systemHealth: number;
}

interface RevenueItem {
  month: string;
  revenue: number;
}

interface ActivityItem {
  id: number;
  type: string;
  message: string;
  time: string;
}

interface OrganizationBranchInsight {
  branchId: string;
  name: string;
  country: string;
  totalRooms: number;
  occupancy: number;
  revenue: number;
}

interface OrganizationBreakdownItem {
  organizationId: string;
  name: string;
  status: string;
  plan: string;
  totalBranches: number;
  totalRooms: number;
  avgOccupancy: number;
  totalRevenue: number;
  bestPerformingBranch: OrganizationBranchInsight | null;
  lowPerformingBranch: OrganizationBranchInsight | null;
  emptyStateMessage: string;
}

const activityIcons: Record<string, typeof CheckCircle> = {
  success: CheckCircle,
  warning: AlertTriangle,
  info: Info,
  danger: AlertOctagon,
};

const activityIconColors: Record<string, string> = {
  success: "dash-activity-icon-success",
  warning: "dash-activity-icon-warning",
  info: "dash-activity-icon-info",
  danger: "dash-activity-icon-danger",
};

const getStatusBadgeClass = (status: string) => {
  const normalizedStatus = status?.toLowerCase();

  if (normalizedStatus === "active") return "badge-active";
  if (normalizedStatus === "suspended") return "badge-danger";
  return "badge-warning";
};

const Dashboard = () => {
  const { formatCurrency, formatCompactCurrency } = useSystemSettings();
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueItem[]>([]);
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);
  const [organizationBreakdown, setOrganizationBreakdown] = useState<
    OrganizationBreakdownItem[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await api.get<{
          kpi: KPIData;
          revenueData: RevenueItem[];
          activityFeed: ActivityItem[];
          organizationBreakdown?: OrganizationBreakdownItem[];
        }>("/dashboard/overview");
        setKpiData(response.data.kpi);
        setRevenueData(response.data.revenueData);
        setActivityFeed(response.data.activityFeed);
        setOrganizationBreakdown(response.data.organizationBreakdown || []);
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading || !kpiData) {
    return (
      <div className="animate-fade-in dash-root">
        <div className="eb-loading">
          <span className="eb-loading-spinner" />
          <span>Loading dashboard...</span>
        </div>
      </div>
    );
  }

  const kpis = [
    {
      label: "Total Organizations",
      value: kpiData.totalOrganizations,
      trend: "+2",
      up: true,
      icon: Building2,
      colorClass: "gf-kpi-icon-gold",
    },
    {
      label: "Total Branches",
      value: kpiData.totalBranches,
      trend: "+1",
      up: true,
      icon: Hotel,
      colorClass: "gf-kpi-icon-green",
    },
    {
      label: "Active Users",
      value: kpiData.activeUsers.toLocaleString(),
      trend: "+5.2%",
      up: true,
      icon: Users,
      colorClass: "gf-kpi-icon-amber",
    },
    {
      label: "Global Revenue",
      value: formatCompactCurrency(kpiData.globalRevenue),
      trend: "+12.4%",
      up: true,
      icon: DollarSign,
      colorClass: "gf-kpi-icon-gold",
    },
    {
      label: "Occupancy Rate",
      value: `${kpiData.occupancy}%`,
      trend: "-2.1%",
      up: false,
      icon: Percent,
      colorClass: "gf-kpi-icon-muted",
    },
    {
      label: "System Health",
      value: `${kpiData.systemHealth}%`,
      trend: "Stable",
      up: true,
      icon: Activity,
      colorClass: "gf-kpi-icon-green",
    },
  ];

  return (
    <div className="animate-fade-in dash-root">
      <div className="add-branch-header">
        <div className="add-branch-header-icon-wrap">
          <LayoutDashboard className="add-branch-header-icon" />
        </div>
        <div>
          <h1 className="page-title">Command Center</h1>
          <p className="page-subtitle">
            Global overview of all operations across branches
          </p>
        </div>
      </div>

      <div className="dash-kpi-grid">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;

          return (
            <div key={kpi.label} className="luxury-card kpi-card gf-kpi-card">
              <div className="dash-kpi-top">
                <div className={`gf-kpi-icon-wrap ${kpi.colorClass}`}>
                  <Icon className="gf-kpi-icon" />
                </div>
                <span
                  className={kpi.up ? "kpi-trend-up dash-trend" : "kpi-trend-down dash-trend"}
                >
                  {kpi.up ? (
                    <TrendingUp className="dash-trend-icon" />
                  ) : (
                    <TrendingDown className="dash-trend-icon" />
                  )}
                  {kpi.trend}
                </span>
              </div>
              <span className="kpi-value">{kpi.value}</span>
              <span className="kpi-label">{kpi.label}</span>
            </div>
          );
        })}
      </div>

      <div className="dash-charts-row">
        <div className="luxury-card dash-area-card">
          <div className="gf-section-header">
            <span className="gf-section-title">Revenue Trend</span>
          </div>
          <div className="dash-chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="hsl(41, 55%, 57%)"
                      stopOpacity={0.22}
                    />
                    <stop
                      offset="100%"
                      stopColor="hsl(41, 55%, 57%)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
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
                  formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                  cursor={{
                    stroke: "hsl(var(--primary))",
                    strokeWidth: 1,
                    strokeDasharray: "4 4",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(41, 55%, 57%)"
                  strokeWidth={2}
                  fill="url(#goldGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="luxury-card dash-activity-card">
          <div className="gf-section-header">
            <span className="gf-section-title">Recent Activity</span>
            {activityFeed.length > 0 && (
              <span className="gf-payments-count">{activityFeed.length} events</span>
            )}
          </div>

          {activityFeed.length === 0 ? (
            <div className="dash-activity-empty">No recent activity</div>
          ) : (
            <div 
              className="dash-activity-list scrollbar-custom"
              style={{ 
                flex: 1, 
                overflowY: "auto", 
                paddingRight: "4px",
                maxHeight: "100%" 
              }}
            >
              {activityFeed.map((item) => {
                const Icon = activityIcons[item.type] || Info;
                const iconClass =
                  activityIconColors[item.type] || "dash-activity-icon-info";

                return (
                  <div key={item.id} className="dash-activity-item">
                    <div className={`dash-activity-icon-wrap ${iconClass}`}>
                      <Icon className="dash-activity-icon" />
                    </div>
                    <div className="dash-activity-body">
                      <p className="dash-activity-msg">{item.message}</p>
                      <p className="dash-activity-time">{item.time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="luxury-card dash-org-section-card">
        <div className="gf-section-header">
          <span className="gf-section-title">Organization Revenue Breakdown</span>
        </div>

        <div className="dash-org-list">
          {organizationBreakdown.length === 0 ? (
            <div className="dash-org-empty">No organization breakdown available</div>
          ) : (
            organizationBreakdown.map((organization) => (
              <div key={organization.organizationId} className="dash-org-card">
                <div className="dash-org-header">
                  <div className="dash-org-title-wrap">
                    <div className="gf-kpi-icon-wrap gf-kpi-icon-gold">
                      <Building2 className="gf-kpi-icon" />
                    </div>
                    <div className="dash-org-title-block">
                      <h3 className="dash-org-title">{organization.name}</h3>
                      <div className="dash-org-meta">
                        <span
                          className={`luxury-badge ${getStatusBadgeClass(organization.status)}`}
                        >
                          {organization.status}
                        </span>
                        <span className="dash-org-plan">{organization.plan}</span>
                      </div>
                    </div>
                  </div>

                  <div className="dash-org-revenue-block">
                    <span className="dash-org-revenue-value">
                      {formatCompactCurrency(organization.totalRevenue)}
                    </span>
                    <span className="kpi-label">Total Revenue</span>
                  </div>
                </div>

                <div className="dash-org-stats">
                  <div className="dash-org-stat">
                    <span className="dash-org-stat-value">{organization.totalBranches}</span>
                    <span className="dash-org-stat-label">Branches</span>
                  </div>
                  <div className="dash-org-stat">
                    <span className="dash-org-stat-value">{organization.totalRooms}</span>
                    <span className="dash-org-stat-label">Total Rooms</span>
                  </div>
                  <div className="dash-org-stat">
                    <span className="dash-org-stat-value">{organization.avgOccupancy}%</span>
                    <span className="dash-org-stat-label">Avg Occupancy</span>
                  </div>
                </div>

                {organization.totalBranches === 0 ? (
                  <div className="dash-org-empty-state">
                    <TriangleAlert className="dash-org-empty-icon" />
                    <span>{organization.emptyStateMessage || "No active branches"}</span>
                  </div>
                ) : (
                  <div className="dash-org-insights">
                    {organization.bestPerformingBranch && (
                      <div className="dash-org-insight-card">
                        <div className="dash-org-insight-main">
                          <div className="dash-org-insight-icon">
                            <ArrowUpRight className="dash-org-insight-arrow" />
                          </div>
                          <div className="dash-org-insight-copy">
                            <div className="dash-org-insight-label">
                              <Star className="dash-org-insight-label-icon dash-org-insight-label-icon-gold" />
                              Best Performing
                            </div>
                            <div className="dash-org-insight-name">
                              {organization.bestPerformingBranch.name}
                            </div>
                            <div className="dash-org-insight-subtitle">
                              {organization.bestPerformingBranch.country} ·{" "}
                              {organization.bestPerformingBranch.occupancy}% occupancy
                            </div>
                          </div>
                        </div>

                        <div className="dash-org-insight-revenue">
                          <span className="dash-org-insight-revenue-value">
                            {formatCompactCurrency(organization.bestPerformingBranch.revenue)}
                          </span>
                          <span className="dash-org-insight-revenue-label">revenue</span>
                        </div>
                      </div>
                    )}

                    {organization.lowPerformingBranch && (
                      <div className="dash-org-insight-card">
                        <div className="dash-org-insight-main">
                          <div className="dash-org-insight-icon">
                            <ArrowDownRight className="dash-org-insight-arrow" />
                          </div>
                          <div className="dash-org-insight-copy">
                            <div className="dash-org-insight-label">
                              <TriangleAlert className="dash-org-insight-label-icon dash-org-insight-label-icon-warning" />
                              Needs Attention
                            </div>
                            <div className="dash-org-insight-name">
                              {organization.lowPerformingBranch.name}
                            </div>
                            <div className="dash-org-insight-subtitle">
                              {organization.lowPerformingBranch.country} ·{" "}
                              {organization.lowPerformingBranch.occupancy}% occupancy
                            </div>
                          </div>
                        </div>

                        <div className="dash-org-insight-revenue">
                          <span className="dash-org-insight-revenue-value">
                            {formatCompactCurrency(organization.lowPerformingBranch.revenue)}
                          </span>
                          <span className="dash-org-insight-revenue-label">revenue</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
