import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CheckCircle2, Clock3, ListChecks, Sparkles } from "lucide-react";
import api from "@/api/axios";
import { ChartCard, EmptyReportState, MetricCard, ReportLoader } from "./ReportsShared";

interface HousekeepingReportResponse {
  summary: {
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    taskCompletionRate: number;
    averageCleaningTime: number;
  };
  roomsCleanedVsPending: { name: string; value: number }[];
  staffProductivity: { name: string; tasks: number; completedTasks: number }[];
}

const HousekeepingAnalytics = ({
  branchId,
  startDate,
  endDate,
}: {
  branchId: string;
  startDate: string;
  endDate: string;
}) => {
  const [data, setData] = useState<HousekeepingReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchReport = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await api.get<{ data: HousekeepingReportResponse }>("/reports/housekeeping", {
          params: { branchId, startDate, endDate },
        });

        if (isMounted) {
          setData(response.data.data);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.response?.data?.message || "Failed to load housekeeping analytics.");
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
    return <ReportLoader label="Loading housekeeping analytics…" />;
  }

  if (error || !data) {
    return (
      <EmptyReportState
        title="Housekeeping analytics unavailable"
        message={error || "No housekeeping tasks were found for this date range."}
      />
    );
  }

  return (
    <div className="reports-module-grid">
      <div className="reports-metrics-grid reports-metrics-grid-4">
        <MetricCard icon={<ListChecks size={18} />} label="Total Tasks" value={`${data.summary.totalTasks}`} />
        <MetricCard icon={<CheckCircle2 size={18} />} label="Completion Rate" value={`${data.summary.taskCompletionRate}%`} />
        <MetricCard icon={<Clock3 size={18} />} label="Avg Cleaning Time" value={`${data.summary.averageCleaningTime} mins`} />
        <MetricCard icon={<Sparkles size={18} />} label="Pending Tasks" value={`${data.summary.pendingTasks}`} />
      </div>

      <div className="reports-charts-grid reports-charts-grid-2">
        <ChartCard title="Rooms Cleaned vs Pending" subtitle="Task status breakdown">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.roomsCleanedVsPending}>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(0,0,0,0.08)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#7b8190" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#7b8190" }} axisLine={false} tickLine={false} width={42} />
              <Tooltip formatter={(value: number) => [`${value}`, "Tasks"]} />
              <Bar dataKey="value" fill="#3266B3" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Staff Productivity" subtitle="Tasks handled per staff">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.staffProductivity}>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(0,0,0,0.08)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#7b8190" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#7b8190" }} axisLine={false} tickLine={false} width={42} />
              <Tooltip formatter={(value: number, name: string) => [`${value}`, name === "completedTasks" ? "Completed" : "Tasks"]} />
              <Bar dataKey="tasks" fill="#D4A63B" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
};

export default HousekeepingAnalytics;
