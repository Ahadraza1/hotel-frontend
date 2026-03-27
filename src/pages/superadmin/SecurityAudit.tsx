import { useEffect, useState } from "react";
import {
  Shield,
  AlertTriangle,
  Eye,
  HardDrive,
  FileText,
  Clock,
} from "lucide-react";
import api from "@/api/axios";

interface SecurityOverview {
  uptime: string;
  threats: number;
  sessions: number;
  lastBackupStatus: string;
}

interface LoginEntry {
  _id?: string;
  user: string;
  time: string;
  ip: string;
  location: string;
  status: string;
}

interface AuditEntry {
  _id?: string;
  action: string;
  target: string;
  time: string;
  user: string;
  severity: string;
}

const SecurityAudit = () => {
  const [overview, setOverview] = useState<SecurityOverview>({
    uptime: "0%",
    threats: 0,
    sessions: 0,
    lastBackupStatus: "—",
  });

  const [loginHistory, setLoginHistory] = useState<LoginEntry[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSecurityData = async () => {
      try {
        const [overviewRes, loginRes, auditRes] = await Promise.all([
          api.get<{ data: SecurityOverview }>("/security/overview"),
          api.get<{ data: LoginEntry[] }>("/security/login-history"),
          api.get<{ data: AuditEntry[] }>("/security/audit-logs"),
        ]);

        setOverview(overviewRes.data.data ?? { uptime: "0%", threats: 0, sessions: 0, lastBackupStatus: "—" });
        setLoginHistory(loginRes.data.data || []);
        setAuditLogs(auditRes.data.data || []);
      } catch (error) {
        console.error("Failed to load security data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSecurityData();
  }, []);

  if (loading) {
    return (
      <div className="animate-fade-in sa-root">
        <div className="eb-loading">
          <span className="eb-loading-spinner" />
          <span>Loading security data…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in sa-root">

      {/* ── Page Header ── */}
      <div className="add-branch-header">
        <div className="add-branch-header-icon-wrap">
          <Shield className="add-branch-header-icon" />
        </div>
        <div>
          <h1 className="page-title">Security &amp; Audit</h1>
          <p className="page-subtitle">
            Monitor login activity, threats, and system integrity
          </p>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="sa-kpi-grid">
        <div className="luxury-card kpi-card gf-kpi-card">
          <div className="gf-kpi-icon-wrap gf-kpi-icon-green">
            <Shield className="gf-kpi-icon" />
          </div>
          <span className="kpi-value">{overview.uptime}</span>
          <span className="kpi-label">System Uptime</span>
        </div>

        <div className="luxury-card kpi-card gf-kpi-card">
          <div className="gf-kpi-icon-wrap sa-icon-danger">
            <AlertTriangle className="gf-kpi-icon" />
          </div>
          <span className="kpi-value">{overview.threats}</span>
          <span className="kpi-label">Threats Detected</span>
        </div>

        <div className="luxury-card kpi-card gf-kpi-card">
          <div className="gf-kpi-icon-wrap gf-kpi-icon-gold">
            <Eye className="gf-kpi-icon" />
          </div>
          <span className="kpi-value">{overview.sessions}</span>
          <span className="kpi-label">Active Sessions</span>
        </div>

        <div className="luxury-card kpi-card gf-kpi-card">
          <div className="gf-kpi-icon-wrap gf-kpi-icon-muted">
            <HardDrive className="gf-kpi-icon" />
          </div>
          <span className="kpi-value sa-value-sm">{overview.lastBackupStatus}</span>
          <span className="kpi-label">Last Backup</span>
        </div>
      </div>

      {/* ── Side-by-side tables ── */}
      <div className="sa-tables-row">

        {/* Login History */}
        <div className="luxury-card sa-table-card">
          {/* Sticky section title — outside scroll so it stays pinned */}
          <div className="sa-card-header">
            <div className="sa-card-title-group">
              <Clock className="sa-card-icon" aria-hidden="true" />
              <span className="sa-card-title">Login History</span>
            </div>
            <span className="sa-card-count">{loginHistory.length} entries</span>
          </div>

          {/* Scrollable region — only this part scrolls */}
          <div className="sa-body-scroll">
            <table className="luxury-table">
              <thead>
                <tr>
                  <th className="col-serial">#</th>
                  <th>User</th>
                  <th>IP</th>
                  <th>Location</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loginHistory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="gf-table-empty">No login records found</td>
                  </tr>
                ) : (
                  loginHistory.map((l, i) => (
                    <tr key={l._id || i}>
                      <td className="col-serial">{i + 1}</td>
                      <td>
                        <div className="user-info">
                          <p className="user-name">{l.user}</p>
                          <p className="user-email">{l.time}</p>
                        </div>
                      </td>
                      <td className="sa-mono">{l.ip}</td>
                      <td className="user-email">{l.location}</td>
                      <td>
                        <span className={`luxury-badge ${l.status === "success" ? "badge-active" : "badge-danger"}`}>
                          {l.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Logs */}
        <div className="luxury-card sa-table-card">
          {/* Sticky section title */}
          <div className="sa-card-header">
            <div className="sa-card-title-group">
              <FileText className="sa-card-icon" aria-hidden="true" />
              <span className="sa-card-title">Audit Logs</span>
            </div>
            <span className="sa-card-count">{auditLogs.length} entries</span>
          </div>

          {/* Scrollable region */}
          <div className="sa-body-scroll">
            <table className="luxury-table">
              <thead>
                <tr>
                  <th className="col-serial">#</th>
                  <th>Action</th>
                  <th>By</th>
                  <th>Severity</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="gf-table-empty">No audit logs found</td>
                  </tr>
                ) : (
                  auditLogs.map((a, i) => (
                    <tr key={a._id || i}>
                      <td className="col-serial">{i + 1}</td>
                      <td>
                        <div className="user-info">
                          <p className="user-name">{a.action}</p>
                          <p className="user-email">{a.target} · {a.time}</p>
                        </div>
                      </td>
                      <td className="user-email">{a.user}</td>
                      <td>
                        <span className={`luxury-badge ${
                          a.severity === "success"
                            ? "badge-active"
                            : a.severity === "warning"
                              ? "badge-warning"
                              : a.severity === "danger"
                                ? "badge-danger"
                                : "badge-info"
                        }`}>
                          {a.severity}
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
    </div>
  );
};

export default SecurityAudit;