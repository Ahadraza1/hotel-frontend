import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Clock3, PieChart as PieChartIcon, ShoppingBag, UtensilsCrossed } from "lucide-react";
import api from "@/api/axios";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { ChartCard, EmptyReportState, MetricCard, ReportLoader } from "./ReportsShared";

interface RestaurantReportResponse {
  summary: {
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
  };
  dailySalesRevenue: { date: string; value: number }[];
  topSellingItems: { name: string; quantity: number; revenue: number }[];
  orderTypeDistribution: { name: string; value: number }[];
  peakHours: { hour: string; orders: number }[];
}

const COLORS = ["#3266B3", "#D4A63B", "#6C9A8B"];

const RestaurantAnalytics = ({
  branchId,
  startDate,
  endDate,
}: {
  branchId: string;
  startDate: string;
  endDate: string;
}) => {
  const { formatCurrency, formatCompactCurrency } = useSystemSettings();
  const [data, setData] = useState<RestaurantReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchReport = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await api.get<{ data: RestaurantReportResponse }>("/reports/restaurant", {
          params: { branchId, startDate, endDate },
        });

        if (isMounted) {
          setData(response.data.data);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.response?.data?.message || "Failed to load restaurant analytics.");
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

  if (isLoading) {
    return <ReportLoader label="Loading restaurant analytics…" />;
  }

  if (error || !data) {
    return (
      <EmptyReportState
        title="Restaurant analytics unavailable"
        message={error || "No restaurant activity was found for this date range."}
      />
    );
  }

  return (
    <div className="reports-module-grid">
      <div className="reports-metrics-grid reports-metrics-grid-3">
        <MetricCard icon={<ShoppingBag size={18} />} label="Total Orders" value={`${data.summary.totalOrders}`} />
        <MetricCard icon={<UtensilsCrossed size={18} />} label="Daily Sales Revenue" value={formatCurrency(data.summary.totalRevenue)} />
        <MetricCard icon={<PieChartIcon size={18} />} label="Average Order Value" value={formatCurrency(data.summary.averageOrderValue)} />
      </div>

      <div className="reports-charts-grid reports-charts-grid-2">
        <ChartCard title="Daily Sales Revenue" subtitle="Revenue grouped by date">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.dailySalesRevenue}>
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
              <Line type="monotone" dataKey="value" stroke="#3266B3" strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Order Type Distribution" subtitle="Dine-in, room service, and takeaway">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={data.orderTypeDistribution} dataKey="value" nameKey="name" innerRadius={60} outerRadius={88}>
                {data.orderTypeDistribution.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [`${value}`, "Orders"]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="reports-legend">
            {data.orderTypeDistribution.map((entry, index) => (
              <div key={entry.name} className="reports-legend-item">
                <span className="reports-legend-swatch" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span>{entry.name}</span>
                <strong>{entry.value}</strong>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Top Selling Items" subtitle="Highest quantity sold">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.topSellingItems}>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(0,0,0,0.08)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#7b8190" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#7b8190" }} axisLine={false} tickLine={false} width={42} />
              <Tooltip formatter={(value: number) => [`${value}`, "Quantity"]} />
              <Bar dataKey="quantity" fill="#D4A63B" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Peak Hours" subtitle="Orders placed by hour">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.peakHours}>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(0,0,0,0.08)" />
              <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "#7b8190" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#7b8190" }} axisLine={false} tickLine={false} width={42} />
              <Tooltip formatter={(value: number) => [`${value}`, "Orders"]} />
              <Bar dataKey="orders" fill="#6C9A8B" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="reports-inline-note">
            <Clock3 size={15} />
            <span>Average order value: {formatCurrency(data.summary.averageOrderValue)}</span>
          </div>
        </ChartCard>
      </div>
    </div>
  );
};

export default RestaurantAnalytics;
