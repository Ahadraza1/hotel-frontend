import { useEffect, useState } from "react";
import {
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
import { Award, HeartHandshake, Repeat2, Users } from "lucide-react";
import api from "@/api/axios";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { ChartCard, EmptyReportState, MetricCard, ReportLoader } from "./ReportsShared";

interface CRMReportResponse {
  summary: {
    newCustomers: number;
    returningCustomers: number;
    totalTrackedCustomers: number;
  };
  newVsReturningCustomers: { name: string; value: number }[];
  customerSatisfactionRatings: { name: string; value: number }[];
  bookingFrequency: { name: string; value: number }[];
  topCustomers: {
    id: string;
    name: string;
    email: string;
    totalSpent: number;
    totalStays: number;
    loyaltyPoints: number;
    vipStatus: boolean;
  }[];
}

const COLORS = ["#3266B3", "#D4A63B"];

const CRMAnalytics = ({
  branchId,
  startDate,
  endDate,
}: {
  branchId: string;
  startDate: string;
  endDate: string;
}) => {
  const { formatCurrency } = useSystemSettings();
  const [data, setData] = useState<CRMReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchReport = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await api.get<{ data: CRMReportResponse }>("/reports/crm", {
          params: { branchId, startDate, endDate },
        });

        if (isMounted) {
          setData(response.data.data);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.response?.data?.message || "Failed to load CRM analytics.");
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
    return <ReportLoader label="Loading CRM analytics…" />;
  }

  if (error || !data) {
    return (
      <EmptyReportState title="CRM analytics unavailable" message={error || "No CRM activity was found for this date range."} />
    );
  }

  return (
    <div className="reports-module-grid">
      <div className="reports-metrics-grid reports-metrics-grid-3">
        <MetricCard icon={<Users size={18} />} label="New Customers" value={`${data.summary.newCustomers}`} />
        <MetricCard icon={<Repeat2 size={18} />} label="Returning Customers" value={`${data.summary.returningCustomers}`} />
        <MetricCard icon={<HeartHandshake size={18} />} label="Tracked Customers" value={`${data.summary.totalTrackedCustomers}`} />
      </div>

      <div className="reports-charts-grid reports-charts-grid-2">
        <ChartCard title="New vs Returning Customers" subtitle="Customer mix for the selected branch">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={data.newVsReturningCustomers} dataKey="value" nameKey="name" innerRadius={60} outerRadius={88}>
                {data.newVsReturningCustomers.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [`${value}`, "Customers"]} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Customer Satisfaction Ratings" subtitle="Based on available branch performance ratings">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.customerSatisfactionRatings}>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(0,0,0,0.08)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#7b8190" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#7b8190" }} axisLine={false} tickLine={false} width={42} />
              <Tooltip formatter={(value: number) => [`${value}`, "Responses"]} />
              <Bar dataKey="value" fill="#6C9A8B" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Booking Frequency" subtitle="Repeat-stay distribution">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.bookingFrequency}>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(0,0,0,0.08)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#7b8190" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#7b8190" }} axisLine={false} tickLine={false} width={42} />
              <Tooltip formatter={(value: number) => [`${value}`, "Customers"]} />
              <Bar dataKey="value" fill="#D4A63B" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top Customers" subtitle="Highest-value guests">
          {data.topCustomers.length === 0 ? (
            <EmptyReportState title="No top customers yet" message="Guest revenue leaders will appear here once bookings start accumulating." />
          ) : (
            <div className="reports-table-wrap">
              <table className="luxury-table reports-mini-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Stays</th>
                    <th>Total Spent</th>
                    <th>Loyalty</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topCustomers.map((customer) => (
                    <tr key={customer.id}>
                      <td>
                        <div className="reports-customer-cell">
                          <span>{customer.name}</span>
                          {customer.vipStatus ? (
                            <small>
                              <Award size={12} />
                              VIP
                            </small>
                          ) : null}
                        </div>
                      </td>
                      <td>{customer.totalStays}</td>
                      <td>{formatCurrency(customer.totalSpent)}</td>
                      <td>{customer.loyaltyPoints}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
};

export default CRMAnalytics;
