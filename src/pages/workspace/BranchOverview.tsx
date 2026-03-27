
import { useEffect, useState } from "react";
import api from "@/api/axios";
import { useAuth } from "@/contexts/AuthContext";
import { useBranchWorkspace } from "@/contexts/BranchWorkspaceContext";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import {
  DollarSign,
  Hotel,
  Bed,
  Users,
  TrendingUp,
  AlertTriangle,
  BarChart2,
  LogIn,
  LogOut,
  Percent,
  WrenchIcon,
  BanIcon,
} from "lucide-react";

import {
  LineChart,
  Line,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface DashboardData {
  totalRevenue: number;
  todayRevenue: number;
  quarterlyRevenue: number;
  monthRevenue: number;
  totalPosRevenue: number;
  posTodayRevenue: number; // NEW
  posMonthRevenue: number; // Updated logic
  outstandingAmount: number;
  totalRooms: number;
  occupiedRooms: number;
  occupancyRate: number;
  revpar: number;
  activeBookings: number;
  todayCheckIns: number;
  todayCheckOuts: number;
  maintenanceRooms: number;
  blockedRooms: number;
  availableYears?: { year: number }[];
}

const BranchOverview = () => {
  const { hasPermission } = useAuth();
  const { activeBranch } = useBranchWorkspace();
  const { formatCurrency, formatCompactCurrency } = useSystemSettings();

  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [roomRevenueView, setRoomRevenueView] = useState("today");
  const [restaurantRevenueView, setRestaurantRevenueView] = useState("today");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const years = data?.availableYears || [];
  const [roomChartData, setRoomChartData] = useState<
    Record<string, string | number>[]
  >([]);
  const [restaurantChartData, setRestaurantChartData] = useState<
    Record<string, string | number>[]
  >([]);

  const roomTodayData = [
    { time: "6AM", revenue: 2800 },
    { time: "9AM", revenue: 5200 },
    { time: "12PM", revenue: 8200 },
    { time: "3PM", revenue: 11000 },
    { time: "6PM", revenue: 9800 },
    { time: "9PM", revenue: 5000 },
  ];

  const roomMonthlyData = [
    { week: "Week 1", revenue: 68000 },
    { week: "Week 2", revenue: 72000 },
    { week: "Week 3", revenue: 82000 },
    { week: "Week 4", revenue: 63000 },
  ];

  const roomQuarterlyData = [
    { month: "Jan", revenue: 240000 },
    { month: "Feb", revenue: 285000 },
    { month: "Mar", revenue: 260000 },
  ];

  const roomYearlyData = [
    { month: "Jan", revenue: 240000 },
    { month: "Feb", revenue: 270000 },
    { month: "Mar", revenue: 250000 },
    { month: "Apr", revenue: 260000 },
    { month: "May", revenue: 285000 },
    { month: "Jun", revenue: 305000 },
    { month: "Jul", revenue: 320000 },
    { month: "Aug", revenue: 340000 },
    { month: "Sep", revenue: 290000 },
    { month: "Oct", revenue: 270000 },
    { month: "Nov", revenue: 250000 },
    { month: "Dec", revenue: 310000 },
  ];

  const restaurantTodayData = [
    { time: "6AM", revenue: 3200 },
    { time: "9AM", revenue: 5800 },
    { time: "12PM", revenue: 9000 },
    { time: "3PM", revenue: 7200 },
    { time: "6PM", revenue: 4200 },
    { time: "9PM", revenue: 3000 },
  ];

  const restaurantMonthlyData = [
    { week: "Week 1", revenue: 42000 },
    { week: "Week 2", revenue: 48000 },
    { week: "Week 3", revenue: 51000 },
    { week: "Week 4", revenue: 39000 },
  ];

  const restaurantQuarterlyData = [
    { month: "Jan", revenue: 165000 },
    { month: "Feb", revenue: 180000 },
    { month: "Mar", revenue: 170000 },
  ];

  const restaurantYearlyData = [
    { month: "Jan", revenue: 160000 },
    { month: "Feb", revenue: 175000 },
    { month: "Mar", revenue: 165000 },
    { month: "Apr", revenue: 170000 },
    { month: "May", revenue: 185000 },
    { month: "Jun", revenue: 200000 },
    { month: "Jul", revenue: 215000 },
    { month: "Aug", revenue: 225000 },
    { month: "Sep", revenue: 195000 },
    { month: "Oct", revenue: 175000 },
    { month: "Nov", revenue: 160000 },
    { month: "Dec", revenue: 210000 },
  ];

  const getRoomChartData = () => {
    switch (roomRevenueView) {
      case "monthly":
        return roomMonthlyData;
      case "quarterly":
        return roomQuarterlyData;
      case "yearly":
        return roomYearlyData;
      default:
        return roomTodayData;
    }
  };

  const getRestaurantChartData = () => {
    switch (restaurantRevenueView) {
      case "monthly":
        return restaurantMonthlyData;
      case "quarterly":
        return restaurantQuarterlyData;
      case "yearly":
        return restaurantYearlyData;
      default:
        return restaurantTodayData;
    }
  };
  // console.log("Active Branch:", activeBranch);

  const fetchRoomChart = async (view: string) => {
    if (!activeBranch?._id) return;

    try {
      const res = await api.get<{ data: Record<string, string | number>[] }>(
        "/analytics/room-revenue-chart",
        {
          params: {
            branchId: activeBranch._id,
            view,
            year: selectedYear,
          },
        },
      );

      setRoomChartData(res.data.data);
    } catch (error) {
      console.error("Room chart error", error);
    }
  };

  const fetchRestaurantChart = async (view: string) => {
    if (!activeBranch?._id) return;

    try {
      const res = await api.get<{ data: Record<string, string | number>[] }>(
        "/analytics/restaurant-revenue-chart",
        {
          params: {
            branchId: activeBranch._id,
            view,
            year: selectedYear,
          },
        },
      );

      setRestaurantChartData(res.data.data);
    } catch (error) {
      console.error("Restaurant chart error", error);
    }
  };

  useEffect(() => {
    if (!activeBranch?._id) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        setData(null); // ✅ reset when branch changes

        const res = await api.get<{ data: DashboardData }>(
          "/analytics/branch-dashboard",
          {
            params: {
              branchId: activeBranch._id,
            },
          },
        );

        setData(res.data.data);
      } catch (error) {
        console.error("Failed to load branch dashboard", error);
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [activeBranch]);

  useEffect(() => {
    if (data?.availableYears && data.availableYears.length > 0) {
      setSelectedYear(data.availableYears[0].year);
    }
  }, [data]);

  useEffect(() => {
    if (!activeBranch?._id) return;

    fetchRoomChart(roomRevenueView);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomRevenueView, activeBranch, selectedYear]);

  useEffect(() => {
    if (!activeBranch?._id || roomRevenueView !== "today") return;

    const interval = setInterval(() => {
      fetchRoomChart("today");
    }, 30000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomRevenueView, activeBranch]);

  useEffect(() => {
    if (!activeBranch?._id) return;

    fetchRestaurantChart(restaurantRevenueView);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantRevenueView, activeBranch, selectedYear]);

  if (!activeBranch) {
    return (
      <div className="bo-root animate-fade-in">
        <div className="eb-loading">
          <span className="eb-loading-spinner" />
          <span>Loading branch…</span>
        </div>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="bo-root animate-fade-in">
        <div className="eb-loading">
          <span className="eb-loading-spinner" />
          <span>Loading dashboard…</span>
        </div>
      </div>
    );
  }

  void hasPermission; // kept to avoid unused-var lint

  return (
    <div className="bo-root animate-fade-in">
      {/* ── Page Header ── */}
      <div className="add-branch-header">
        <div className="add-branch-header-icon-wrap">
          <Hotel className="add-branch-header-icon" />
        </div>
        <div>
          <h1 className="page-title">{activeBranch.name}</h1>
          <p className="page-subtitle">
            Branch Control Center — live operational overview
          </p>
        </div>
      </div>

      {/* ── Financial KPIs ── */}
      <div className="bo-section-label">Room Revenue</div>
      <div className="bo-kpi-grid bo-kpi-grid-3">
        <div className="luxury-card kpi-card gf-kpi-card">
          <div className="gf-kpi-icon-wrap gf-kpi-icon-gold">
            <DollarSign className="gf-kpi-icon" />
          </div>
          <span className="kpi-value">
            {formatCurrency(data.totalRevenue || 0)}
          </span>
          <span className="kpi-label">Total Revenue</span>
        </div>

        <div className="luxury-card kpi-card gf-kpi-card">
          <div className="gf-kpi-icon-wrap gf-kpi-icon-green">
            <TrendingUp className="gf-kpi-icon" />
          </div>
          <span className="kpi-value">
            {formatCurrency(data.todayRevenue || 0)}
          </span>
          <span className="kpi-label">Today Revenue</span>
        </div>

        <div className="luxury-card kpi-card gf-kpi-card">
          <div className="gf-kpi-icon-wrap gf-kpi-icon-green">
            <TrendingUp className="gf-kpi-icon" />
          </div>
          <span className="kpi-value">
            {formatCurrency(data.monthRevenue || 0)}
          </span>
          <span className="kpi-label">Month Revenue</span>
        </div>
      </div>

      <div className="bo-section-label">POS Revenue</div>
      <div className="bo-kpi-grid bo-kpi-grid-3">
        <div className="luxury-card kpi-card gf-kpi-card">
          <div className="gf-kpi-icon-wrap gf-kpi-icon-gold">
            <DollarSign className="gf-kpi-icon" />
          </div>
          <span className="kpi-value">
            {formatCurrency(data.totalPosRevenue || 0)}
          </span>
          <span className="kpi-label">Total Revenue</span>
        </div>

        <div className="luxury-card kpi-card gf-kpi-card">
          <div className="gf-kpi-icon-wrap gf-kpi-icon-green">
            <TrendingUp className="gf-kpi-icon" />
          </div>
          <span className="kpi-value">
            {formatCurrency(data.posTodayRevenue || 0)}
          </span>
          <span className="kpi-label">Today Revenue</span>
        </div>

        <div className="luxury-card kpi-card gf-kpi-card">
          <div className="gf-kpi-icon-wrap gf-kpi-icon-green">
            <TrendingUp className="gf-kpi-icon" />
          </div>
          <span className="kpi-value">
            {formatCurrency(data.posMonthRevenue || 0)}
          </span>
          <span className="kpi-label">Month Revenue</span>
        </div>
      </div>

      {/* ── Operational KPIs ── */}
      <div className="bo-section-label">Rooms &amp; Occupancy</div>
      <div className="bo-kpi-grid bo-kpi-grid-4">
        <div className="luxury-card kpi-card gf-kpi-card">
          <div className="gf-kpi-icon-wrap gf-kpi-icon-muted">
            <Hotel className="gf-kpi-icon" />
          </div>
          <span className="kpi-value">{data.totalRooms}</span>
          <span className="kpi-label">Total Rooms</span>
        </div>

        <div className="luxury-card kpi-card gf-kpi-card">
          <div className="gf-kpi-icon-wrap gf-kpi-icon-amber">
            <Bed className="gf-kpi-icon" />
          </div>
          <span className="kpi-value">{data.occupiedRooms}</span>
          <span className="kpi-label">Occupied</span>
        </div>

        <div className="luxury-card kpi-card gf-kpi-card">
          <div className="gf-kpi-icon-wrap gf-kpi-icon-green">
            <Percent className="gf-kpi-icon" />
          </div>
          <span className="kpi-value">{data.occupancyRate}%</span>
          <span className="kpi-label">Occupancy Rate</span>
        </div>

        <div className="luxury-card kpi-card gf-kpi-card">
          <div className="gf-kpi-icon-wrap gf-kpi-icon-gold">
            <BarChart2 className="gf-kpi-icon" />
          </div>
          <span className="kpi-value">{formatCurrency(data.revpar || 0)}</span>
          <span className="kpi-label">RevPAR</span>
        </div>
      </div>

      {/* ── Activity KPIs ── */}
      <div className="bo-section-label">Today's Activity</div>
      <div className="bo-kpi-grid bo-kpi-grid-3">
        <div className="luxury-card kpi-card gf-kpi-card">
          <div className="gf-kpi-icon-wrap gf-kpi-icon-gold">
            <Users className="gf-kpi-icon" />
          </div>
          <span className="kpi-value">{data.activeBookings}</span>
          <span className="kpi-label">Active Bookings</span>
        </div>

        <div className="luxury-card kpi-card gf-kpi-card">
          <div className="gf-kpi-icon-wrap gf-kpi-icon-green">
            <LogIn className="gf-kpi-icon" />
          </div>
          <span className="kpi-value">{data.todayCheckIns}</span>
          <span className="kpi-label">Today Check-ins</span>
        </div>

        <div className="luxury-card kpi-card gf-kpi-card">
          <div className="gf-kpi-icon-wrap gf-kpi-icon-amber">
            <LogOut className="gf-kpi-icon" />
          </div>
          <span className="kpi-value">{data.todayCheckOuts}</span>
          <span className="kpi-label">Today Check-outs</span>
        </div>
      </div>

      {/* ── Operational Alerts ── */}
      <div className="luxury-card bo-alerts-card">
        <div className="bo-alerts-header">
          <AlertTriangle className="bo-alerts-icon" />
          <span className="bo-alerts-title">Operational Alerts</span>
        </div>
        <div className="bo-alerts-row">
          <div
            className={`bo-alert-item ${data.maintenanceRooms > 0 ? "bo-alert-warning" : "bo-alert-ok"}`}
          >
            <div className="bo-alert-icon-wrap">
              <WrenchIcon className="bo-alert-icon" />
            </div>
            <div className="bo-alert-info">
              <span className="bo-alert-count">{data.maintenanceRooms}</span>
              <span className="bo-alert-label">Maintenance Rooms</span>
            </div>
          </div>

          <div
            className={`bo-alert-item ${data.blockedRooms > 0 ? "bo-alert-danger" : "bo-alert-ok"}`}
          >
            <div className="bo-alert-icon-wrap">
              <BanIcon className="bo-alert-icon" />
            </div>
            <div className="bo-alert-info">
              <span className="bo-alert-count">{data.blockedRooms}</span>
              <span className="bo-alert-label">Blocked Rooms</span>
            </div>
          </div>
        </div>
      </div>
      {/* ── Room Revenue Chart ── */}

      <div className="luxury-card bo-chart-card">
        <div className="bo-chart-header">
          <h3 className="bo-chart-title">Room Revenue</h3>

          <div className="bo-chart-controls">
            <button
              className={`bo-chart-btn ${roomRevenueView === "today" ? "active" : ""}`}
              onClick={() => setRoomRevenueView("today")}
            >
              Today
            </button>
            <button
              className={`bo-chart-btn ${roomRevenueView === "monthly" ? "active" : ""}`}
              onClick={() => setRoomRevenueView("monthly")}
            >
              Monthly
            </button>
            <button
              className={`bo-chart-btn ${roomRevenueView === "quarterly" ? "active" : ""}`}
              onClick={() => setRoomRevenueView("quarterly")}
            >
              Quarterly
            </button>
            <button
              className={`bo-chart-btn ${roomRevenueView === "yearly" ? "active" : ""}`}
              onClick={() => setRoomRevenueView("yearly")}
            >
              Yearly
            </button>

            {(roomRevenueView === "quarterly" || roomRevenueView === "yearly") && (
              <div className="bo-chart-select-group">
                <span className="bo-chart-divider" />
                <span className="bo-chart-year-label">Year:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="year-filter"
                >
                  {years.map((item) => (
                    <option key={item.year} value={item.year}>
                      {item.year}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="bo-chart-wrapper">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={roomChartData?.length ? roomChartData : []}
              margin={{ top: 12, right: 16, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="roomAreaGold" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#B08D57" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#B08D57" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="4 4"
                vertical={false}
                stroke="rgba(0,0,0,0.07)"
              />
              <XAxis
                dataKey={
                  roomRevenueView === "today"
                    ? "period"
                    : roomRevenueView === "monthly"
                      ? "week"
                      : roomRevenueView === "quarterly"
                        ? "quarter"
                        : "month"
                }
                tick={{ fontSize: 11.5, fill: "#888", fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                dy={6}
              />
              <YAxis
                tickFormatter={(v: number) =>
                  formatCompactCurrency(v)
                }
                tick={{ fontSize: 11, fill: "#888" }}
                axisLine={false}
                tickLine={false}
                width={48}
              />
              <Tooltip
                contentStyle={{
                  background: "#fff",
                  border: "1px solid rgba(176,141,87,0.25)",
                  borderRadius: "10px",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                  padding: "10px 14px",
                  fontSize: "0.8125rem",
                }}
                labelStyle={{ color: "#555", fontWeight: 600, marginBottom: 4 }}
                formatter={(value: number) => [
                  formatCurrency(value),
                  "Revenue",
                ]}
                cursor={{ stroke: "rgba(176,141,87,0.3)", strokeWidth: 1, strokeDasharray: "4 4" }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#B08D57"
                strokeWidth={2.5}
                fill="url(#roomAreaGold)"
                dot={{ r: 4, fill: "#B08D57", stroke: "#fff", strokeWidth: 2 }}
                activeDot={{ r: 6, fill: "#B08D57", stroke: "#fff", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Restaurant Revenue Chart ── */}

      <div className="luxury-card bo-chart-card">
        <div className="bo-chart-header">
          <h3 className="bo-chart-title">Restaurant Revenue</h3>

          <div className="bo-chart-controls">
            <button
              className={`bo-chart-btn ${restaurantRevenueView === "today" ? "active" : ""}`}
              onClick={() => setRestaurantRevenueView("today")}
            >
              Today
            </button>
            <button
              className={`bo-chart-btn ${restaurantRevenueView === "monthly" ? "active" : ""}`}
              onClick={() => setRestaurantRevenueView("monthly")}
            >
              Monthly
            </button>
            <button
              className={`bo-chart-btn ${restaurantRevenueView === "quarterly" ? "active" : ""}`}
              onClick={() => setRestaurantRevenueView("quarterly")}
            >
              Quarterly
            </button>
            <button
              className={`bo-chart-btn ${restaurantRevenueView === "yearly" ? "active" : ""}`}
              onClick={() => setRestaurantRevenueView("yearly")}
            >
              Yearly
            </button>

            {(restaurantRevenueView === "quarterly" || restaurantRevenueView === "yearly") && (
              <div className="bo-chart-select-group">
                <span className="bo-chart-divider" />
                <span className="bo-chart-year-label">Year:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="year-filter"
                >
                  {years.map((item) => (
                    <option key={item.year} value={item.year}>
                      {item.year}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="bo-chart-wrapper">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={restaurantChartData?.length ? restaurantChartData : []}
              margin={{ top: 12, right: 16, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="restaurantAreaGold" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#B08D57" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#B08D57" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="4 4"
                vertical={false}
                stroke="rgba(0,0,0,0.07)"
              />
              <XAxis
                dataKey={
                  restaurantRevenueView === "today"
                    ? "period"
                    : restaurantRevenueView === "monthly"
                      ? "week"
                      : restaurantRevenueView === "quarterly"
                        ? "quarter"
                        : "month"
                }
                tick={{ fontSize: 11.5, fill: "#888", fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                dy={6}
              />
              <YAxis
                tickFormatter={(v: number) =>
                  formatCompactCurrency(v)
                }
                tick={{ fontSize: 11, fill: "#888" }}
                axisLine={false}
                tickLine={false}
                width={48}
              />
              <Tooltip
                contentStyle={{
                  background: "#fff",
                  border: "1px solid rgba(176,141,87,0.25)",
                  borderRadius: "10px",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                  padding: "10px 14px",
                  fontSize: "0.8125rem",
                }}
                labelStyle={{ color: "#555", fontWeight: 600, marginBottom: 4 }}
                formatter={(value: number) => [
                  formatCurrency(value),
                  "Revenue",
                ]}
                cursor={{ stroke: "rgba(176,141,87,0.3)", strokeWidth: 1, strokeDasharray: "4 4" }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#B08D57"
                strokeWidth={2.5}
                fill="url(#restaurantAreaGold)"
                dot={{ r: 4, fill: "#B08D57", stroke: "#fff", strokeWidth: 2 }}
                activeDot={{ r: 6, fill: "#B08D57", stroke: "#fff", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default BranchOverview;
