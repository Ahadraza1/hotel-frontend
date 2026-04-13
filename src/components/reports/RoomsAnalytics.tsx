import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  BedDouble,
  CalendarDays,
  Hotel,
  Landmark,
  Percent,
  Receipt,
} from "lucide-react";
import api from "@/api/axios";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { ChartCard, EmptyReportState, MetricCard, ReportLoader } from "./ReportsShared";

interface RoomsReportResponse {
  summary: {
    occupancyRate: number;
    occupiedRooms: number;
    totalRooms: number;
    adr: number;
    revpar: number;
    cancellationRate: number;
    totalRevenue: number;
    roomsSold: number;
    totalBookings: number;
    cancelledBookings: number;
  };
  revenueTrend: { date: string; value: number }[];
  bookingTrends: { date: string; value: number }[];
  bookingSources: { name: string; value: number }[];
}

const PIE_COLORS = ["#3266B3", "#D4A63B", "#6C9A8B", "#B7663C"];

const RoomsAnalytics = ({
  branchId,
  startDate,
  endDate,
}: {
  branchId: string;
  startDate: string;
  endDate: string;
}) => {
  const { formatCurrency, formatCompactCurrency } = useSystemSettings();
  const [data, setData] = useState<RoomsReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchReport = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await api.get<{ data: RoomsReportResponse }>("/reports/rooms", {
          params: { branchId, startDate, endDate },
        });

        if (isMounted) {
          setData(response.data.data);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.response?.data?.message || "Failed to load rooms analytics.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchReport();

    return () => {
      isMounted = false;
    };
  }, [branchId, endDate, startDate]);

  const hasChartData = useMemo(
    () =>
      !!data &&
      (data.revenueTrend.some((item) => item.value > 0) ||
        data.bookingTrends.some((item) => item.value > 0) ||
        data.bookingSources.some((item) => item.value > 0)),
    [data],
  );

  if (isLoading) {
    return <ReportLoader label="Loading rooms analytics…" />;
  }

  if (error || !data) {
    return <EmptyReportState title="Rooms analytics unavailable" message={error || "No rooms data found for this range."} />;
  }

  return (
    <div className="reports-module-grid">
      <div className="reports-metrics-grid reports-metrics-grid-4">
        <MetricCard
          icon={<Percent size={18} />}
          label="Occupancy Rate"
          value={`${data.summary.occupancyRate}%`}
          hint={`${data.summary.occupiedRooms}/${data.summary.totalRooms} rooms occupied`}
        />
        <MetricCard
          icon={<Landmark size={18} />}
          label="ADR"
          value={formatCurrency(data.summary.adr)}
          hint={`${data.summary.roomsSold} rooms sold`}
        />
        <MetricCard
          icon={<BarChart3 size={18} />}
          label="RevPAR"
          value={formatCurrency(data.summary.revpar)}
          hint={`Revenue ${formatCurrency(data.summary.totalRevenue)}`}
        />
        <MetricCard
          icon={<Receipt size={18} />}
          label="Cancellation Rate"
          value={`${data.summary.cancellationRate}%`}
          hint={`${data.summary.cancelledBookings} cancelled bookings`}
        />
      </div>

      {!hasChartData ? (
        <EmptyReportState message="No rooms analytics were generated for the selected dates." />
      ) : (
        <div className="reports-charts-grid reports-charts-grid-2">
          <ChartCard title="Revenue Trend" subtitle="Date vs total room revenue">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={data.revenueTrend}>
                <defs>
                  <linearGradient id="roomsRevenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3266B3" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#3266B3" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(0,0,0,0.08)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#7b8190" }} axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={(value: number) => formatCompactCurrency(value)}
                  tick={{ fontSize: 11, fill: "#7b8190" }}
                  axisLine={false}
                  tickLine={false}
                  width={54}
                />
                <Tooltip formatter={(value: number) => [formatCurrency(value), "Revenue"]} />
                <Area type="monotone" dataKey="value" stroke="#3266B3" strokeWidth={2.5} fill="url(#roomsRevenueFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Booking Sources" subtitle="Direct, online, and walk-in">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={data.bookingSources} dataKey="value" nameKey="name" innerRadius={60} outerRadius={88} paddingAngle={2}>
                  {data.bookingSources.map((entry, index) => (
                    <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value}`, "Bookings"]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="reports-legend">
              {data.bookingSources.map((entry, index) => (
                <div key={entry.name} className="reports-legend-item">
                  <span className="reports-legend-swatch" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                  <span>{entry.name}</span>
                  <strong>{entry.value}</strong>
                </div>
              ))}
            </div>
          </ChartCard>

          <ChartCard title="Booking Trends" subtitle="Bookings created over time">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.bookingTrends}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(0,0,0,0.08)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#7b8190" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#7b8190" }} axisLine={false} tickLine={false} width={42} />
                <Tooltip formatter={(value: number) => [`${value}`, "Bookings"]} />
                <Bar dataKey="value" fill="#D4A63B" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Rooms Snapshot" subtitle="Occupancy and performance summary">
            <div className="reports-insight-grid">
              <div className="reports-insight-tile">
                <Hotel size={18} />
                <span>Total Rooms</span>
                <strong>{data.summary.totalRooms}</strong>
              </div>
              <div className="reports-insight-tile">
                <BedDouble size={18} />
                <span>Occupied Rooms</span>
                <strong>{data.summary.occupiedRooms}</strong>
              </div>
              <div className="reports-insight-tile">
                <CalendarDays size={18} />
                <span>Total Bookings</span>
                <strong>{data.summary.totalBookings}</strong>
              </div>
              <div className="reports-insight-tile">
                <Landmark size={18} />
                <span>Total Revenue</span>
                <strong>{formatCurrency(data.summary.totalRevenue)}</strong>
              </div>
            </div>
          </ChartCard>
        </div>
      )}
    </div>
  );
};

export default RoomsAnalytics;
