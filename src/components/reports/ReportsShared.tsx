import type { ReactNode } from "react";
import { Lock, TrendingUp } from "lucide-react";

interface MetricCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
}

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

interface EmptyStateProps {
  title?: string;
  message: string;
}

interface LockedFeatureProps {
  title: string;
  description: string;
}

export const ReportLoader = ({ label = "Loading analytics…" }: { label?: string }) => (
  <div className="luxury-card reports-loader-card">
    <div className="eb-loading">
      <span className="eb-loading-spinner" />
      <span>{label}</span>
    </div>
  </div>
);

export const MetricCard = ({ icon, label, value, hint }: MetricCardProps) => (
  <div className="luxury-card kpi-card reports-metric-card">
    <div className="reports-metric-icon">{icon}</div>
    <span className="kpi-value">{value}</span>
    <span className="kpi-label">{label}</span>
    {hint ? <span className="reports-metric-hint">{hint}</span> : null}
  </div>
);

export const ChartCard = ({ title, subtitle, children }: ChartCardProps) => (
  <div className="luxury-card reports-chart-card">
    <div className="reports-chart-head">
      <div>
        <h3 className="bo-chart-title">{title}</h3>
        {subtitle ? <p className="reports-chart-subtitle">{subtitle}</p> : null}
      </div>
    </div>
    <div className="reports-chart-body">{children}</div>
  </div>
);

export const EmptyReportState = ({
  title = "No report data",
  message,
}: EmptyStateProps) => (
  <div className="reports-empty-state">
    <TrendingUp className="reports-empty-icon" />
    <h3>{title}</h3>
    <p>{message}</p>
  </div>
);

export const LockedFeatureCard = ({
  title,
  description,
}: LockedFeatureProps) => (
  <div className="luxury-card reports-locked-card">
    <div className="reports-locked-icon">
      <Lock size={22} />
    </div>
    <h2 className="page-title">{title}</h2>
    <p className="page-subtitle">{description}</p>
  </div>
);
