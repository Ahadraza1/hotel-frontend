import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Plus,
  CheckCircle,
  XCircle,
  DollarSign,
  Users,
  Briefcase,
  BadgeDollarSign,
  UserCheck,
  X,
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/api/axios";
import { useAuth } from "@/contexts/AuthContext";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import { useBranchWorkspace } from "@/contexts/BranchWorkspaceContext";
import { useToast } from "@/components/confirm/ConfirmProvider";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";

interface Staff {
  _id: string;
  staffId: string;
  firstName: string;
  lastName: string;
  department: string;
  designation: string;
  salary: number;
  attendanceStatus?: string;
}

interface Payroll {
  payrollId: string;
  staffId: string;
  month: number;
  year: number;
  netSalary: number;
  status: string;
}

const HR = () => {
  const { branchId: routeBranchId } = useParams();
  const { activeBranch } = useBranchWorkspace();
  const branchId = activeBranch?._id || routeBranchId;
  const navigate = useNavigate();
  const toast = useToast();
  const { formatCurrency } = useSystemSettings();
  const { user } = useAuth();
  const { canAccess, canCreate, canUpdate } = useModulePermissions("HR");

  if (user && !canAccess) {
    navigate("/unauthorized");
  }

  const [staff, setStaff] = useState<Staff[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(true);
  // ✅ Invite Staff State
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("RECEPTIONIST");
  const [inviteJoinedDate, setInviteJoinedDate] = useState("");
  const [inviteSalary, setInviteSalary] = useState("");

  // Optimistic tracking for attendance status
  const [attendanceStatus, setAttendanceStatus] = useState<
    Record<string, string>
  >({});

  // Default generating parameters for Payroll
  const [selectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear] = useState<number>(new Date().getFullYear());

  const fetchStaff = useCallback(async () => {
    if (!branchId) return;

    try {
      setLoading(true);
      const res = await api.get<{ data: Staff[] }>("/hr/staff", {
        params: { branchId },
      });
      const staffList = res.data.data || [];
      setStaff(staffList);
      setAttendanceStatus(
        staffList.reduce<Record<string, string>>((acc, member) => {
          if (member.attendanceStatus) {
            acc[member.staffId] = member.attendanceStatus;
          }
          return acc;
        }, {}),
      );
    } catch {
      console.error("Failed to load staff");
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  const fetchPayroll = useCallback(async () => {
    if (!branchId) return;

    try {
      const res = await api.get<{ data: Payroll[] }>("/hr/payroll", {
        params: { branchId },
      });
      setPayrolls(res.data.data || []);
    } catch {
      console.error("Failed to load payroll");
    }
  }, [branchId]);

  useEffect(() => {
    if (!branchId) return;

    fetchStaff();
    fetchPayroll();
  }, [branchId, fetchPayroll, fetchStaff]);

  /* ── Actions ── */
  const checkIn = async (staffId: string, statusKey: string) => {
    if (!branchId) {
      toast.warning("Branch is required");
      return;
    }

    try {
      await api.post(`/hr/attendance/${staffId}/check-in`, {
        branch: branchId,
      });
      setAttendanceStatus((prev) => ({ ...prev, [statusKey]: "Checked In" }));
      toast.success("Checked In");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Error checking in");
    }
  };

  const checkOut = async (staffId: string, statusKey: string) => {
    if (!branchId) {
      toast.warning("Branch is required");
      return;
    }

    try {
      await api.post(`/hr/attendance/${staffId}/check-out`, {
        branch: branchId,
      });
      setAttendanceStatus((prev) => ({ ...prev, [statusKey]: "Checked Out" }));
      toast.success("Checked Out");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Error checking out");
    }
  };

  const generatePayroll = async (staffId: string) => {
    try {
      await api.post(`/hr/payroll/${staffId}/generate`, {
        month: selectedMonth,
        year: selectedYear,
      });
      fetchPayroll();
      toast.success("Payroll generated successfully.");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to generate payroll");
    }
  };

  const markPaid = async (payrollId: string) => {
    try {
      await api.patch(`/hr/payroll/${payrollId}/pay`);
      fetchPayroll();
      toast.success("Payroll marked as paid.");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update payroll");
    }
  };

  // ✅ Invite Staff Function
  const handleInviteStaff = async () => {
    try {
      console.log("🚀 Starting Invite Flow");

      if (
        !inviteName ||
        !inviteEmail ||
        !inviteRole ||
        !inviteSalary ||
        !inviteJoinedDate
      ) {
        toast.warning("All fields are required");
        return;
      }

      console.log("📤 Sending invite payload:", {
        name: inviteName,
        email: inviteEmail,
        role: inviteRole,
        branchId,
        salary: Number(inviteSalary),
      });

      const inviteRes = await api.post("/invitations", {
        name: inviteName,
        email: inviteEmail,
        role: inviteRole,
        branchId,
        salary: Number(inviteSalary), // ✅ IMPORTANT FIX
        joinedDate: inviteJoinedDate,
      });

      console.log("🎉 Invitation response:", inviteRes.data);

      toast.success("Staff invited successfully.");

      setInviteName("");
      setInviteEmail("");
      setInviteRole("");
      setInviteJoinedDate("");
      setInviteSalary("");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };

      console.error("❌ Invite Error Full Object:", error);
      console.error("❌ Invite Error Response:", err.response?.data);

      toast.error(err.response?.data?.message || "Error inviting staff");
    }
  };
  /* ── KPI Derivatives ── */
  const totalSalary = useMemo(() => {
    return staff.reduce((sum, s) => sum + (s.salary || 0), 0);
  }, [staff]);

  /* ── Pagination ── */
  const [staffPage, setStaffPage] = useState(1);
  const [payrollPage, setPayrollPage] = useState(1);
  const itemsPerPage = 20;

  const totalStaffPages = Math.ceil(staff.length / itemsPerPage);
  const paginatedStaff = staff.slice(
    (staffPage - 1) * itemsPerPage,
    staffPage * itemsPerPage,
  );

  const totalPayrollPages = Math.ceil(payrolls.length / itemsPerPage);
  const paginatedPayrolls = payrolls.slice(
    (payrollPage - 1) * itemsPerPage,
    payrollPage * itemsPerPage,
  );

  if (loading && staff.length === 0) {
    return (
      <div className="hr-root animate-fade-in">
        <div className="hr-loading">
          <span className="eb-loading-spinner" />
          <span>Loading HR data…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="hr-root animate-fade-in">
      {/* ── Page Header ── */}
      <div className="hr-page-header">
        <div className="hr-title-group">
          <div className="add-branch-header-icon-wrap">
            <Users className="add-branch-header-icon" />
          </div>
          <div>
            <h1 className="page-title">HR Management</h1>
            <p className="page-subtitle">
              Manage personnel, payroll, and attendance records
            </p>
          </div>
        </div>

        {canCreate && (
          <button className="luxury-btn luxury-btn-primary hr-add-btn">
            <Plus size={15} />
            Add Staff
          </button>
        )}
      </div>

      {/* ── Invite Staff Section ── */}
      <div className="luxury-card hr-invite-card">
        <button
          className="hr-invite-close"
          aria-label="Close"
          onClick={() => {
            setInviteName("");
            setInviteEmail("");
            setInviteRole("RECEPTIONIST");
            setInviteJoinedDate("");
            setInviteSalary("");
          }}
        >
          <X size={16} />
        </button>

        <h3 className="hr-invite-title">Register New Staff</h3>

        <div className="hr-invite-grid">
          <div className="hr-invite-field">
            <label className="hr-invite-label">Full Name</label>
            <input
              className="luxury-input"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder="e.g. John Doe"
            />
          </div>

          <div className="hr-invite-field">
            <label className="hr-invite-label">Email Address</label>
            <input
              className="luxury-input"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="e.g. john@example.com"
            />
          </div>

          <div className="hr-invite-field">
            <label className="hr-invite-label">Assign Role</label>
            <select
              className="luxury-input"
              value={inviteRole}
              title="Assign Role"
              onChange={(e) => setInviteRole(e.target.value)}
            >
              <option value="">Select Role</option>
              <option value="RECEPTIONIST">Receptionist</option>
              <option value="CHEF">Chef</option>
              <option value="ACCOUNTANT">Accountant</option>
              <option value="HR">Branch HR </option>
              <option value="RESTAURANT">Restaurant Manager</option>
              <option value="HOUSEKEEPING">Housekeeping</option>
            </select>
          </div>

          <div className="hr-invite-field">
            <label className="hr-invite-label">Joined Date</label>
            <input
              className="luxury-input"
              type="date"
              value={inviteJoinedDate}
              onChange={(e) => setInviteJoinedDate(e.target.value)}
            />
          </div>

          <div className="hr-invite-field">
            <label className="hr-invite-label">Monthly Salary ($)</label>
            <input
              className="luxury-input"
              type="number"
              value={inviteSalary}
              onChange={(e) => setInviteSalary(e.target.value)}
              placeholder="e.g. 3000"
            />
          </div>
        </div>

        <hr className="hr-invite-divider" />

        <div className="hr-invite-actions">
          <button
            onClick={() => {
              setInviteName("");
              setInviteEmail("");
              setInviteRole("");
              setInviteJoinedDate("");
              setInviteSalary("");
            }}
            className="luxury-btn luxury-btn-ghost"
          >
            Cancel
          </button>
          <button
            onClick={handleInviteStaff}
            className="luxury-btn luxury-btn-primary"
          >
            Add to System
          </button>
        </div>
      </div>

      {/* ── Salary Summary KPI Cards ── */}
      <div className="hr-kpi-grid">
        <div className="hr-kpi-card">
          <Briefcase size={16} className="text-foreground mb-1" />
          <span className="hr-kpi-value">{staff.length}</span>
          <span className="hr-kpi-label">Total Staff</span>
        </div>

        <div className="hr-kpi-card">
          <BadgeDollarSign
            size={16}
            className="text-[hsl(var(--premium-green))] mb-1"
          />
          <span className="hr-kpi-value hr-kpi-green">
            {formatCurrency(totalSalary)}
          </span>
          <span className="hr-kpi-label">Total Monthly Salary</span>
        </div>

        <div className="hr-kpi-card">
          <UserCheck
            size={16}
            className="text-[hsl(var(--grandeur-gold))] mb-1"
          />
          <span className="hr-kpi-value hr-kpi-gold text-[1.4rem] mt-[0.4rem]">
            Auto-calculated
          </span>
          <span className="hr-kpi-label">Overtime Summary</span>
        </div>
      </div>

      {/* ── Staff List Table ── */}
      <div className="luxury-card hr-table-card">
        <div className="hr-section-header">
          <h3 className="hr-section-title">Staff List</h3>
        </div>

        <div className="hr-table-scroll">
          <table className="luxury-table">
            <thead>
              <tr>
                <th className="col-serial">#</th>
                <th>Name</th>
                <th>Department</th>
                <th>Designation</th>
                <th>Salary</th>
                <th>Status</th>
                <th>Attendance</th>
                <th className="hr-th-actions">Payroll</th>
              </tr>
            </thead>
            <tbody>
              {paginatedStaff.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center py-6 text-muted-foreground"
                  >
                    No staff members found.
                  </td>
                </tr>
              ) : (
                paginatedStaff.map((s, i) => (
                  <tr key={s.staffId}>
                    <td className="col-serial">
                      {(staffPage - 1) * itemsPerPage + i + 1}
                    </td>
                    <td className="hr-cell-bold">
                      {s.firstName} {s.lastName}
                    </td>
                    <td className="text-muted-foreground">
                      {s.department || "—"}
                    </td>
                    <td>
                      <span className="luxury-badge badge-info">
                        {s.designation || "—"}
                      </span>
                    </td>
                    <td className="hr-cell-bold">
                      {formatCurrency(s.salary || 0)}
                    </td>

                    <td>
                      <span
                        className={`luxury-badge ${attendanceStatus[s.staffId] === "Checked In" ? "badge-active" : attendanceStatus[s.staffId] === "Checked Out" ? "badge-danger" : "badge-info"} text-[0.65rem]`}
                      >
                        {attendanceStatus[s.staffId] || "—"}
                      </span>
                    </td>

                    <td>
                      {canUpdate && (
                        <div className="flex gap-2">
                          <button
                            aria-label={`Check in ${s.firstName}`}
                            onClick={() => checkIn(s._id, s.staffId)}
                            className="hr-icon-btn hr-icon-btn-success"
                            title="Check In"
                          >
                            <CheckCircle size={15} />
                          </button>
                          <button
                            aria-label={`Check out ${s.firstName}`}
                            onClick={() => checkOut(s._id, s.staffId)}
                            className="hr-icon-btn hr-icon-btn-danger"
                            title="Check Out"
                          >
                            <XCircle size={15} />
                          </button>
                        </div>
                      )}
                    </td>

                    <td>
                      <div className="hr-td-actions">
                        <button
                          onClick={() => generatePayroll(s._id)}
                          className="hr-generate-btn"
                        >
                          Generate Payroll
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Staff Pagination Footer */}
        {totalStaffPages > 1 && (
          <div className="table-footer border-t border-[hsl(var(--border))]">
            <span className="pagination-info">
              Showing {(staffPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(staffPage * itemsPerPage, staff.length)} of{" "}
              {staff.length} entries
            </span>
            <div className="pagination">
              <button
                className="page-btn"
                disabled={staffPage === 1}
                onClick={() => setStaffPage((p) => p - 1)}
              >
                Previous
              </button>
              <button
                className="page-btn"
                disabled={staffPage === totalStaffPages}
                onClick={() => setStaffPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Payroll Records Table ── */}
      <div className="luxury-card hr-table-card">
        <div className="hr-section-header">
          <h3 className="hr-section-title">Payroll Records</h3>
        </div>

        <div className="hr-table-scroll">
          <table className="luxury-table">
            <thead>
              <tr>
                <th className="col-serial">#</th>
                <th>Staff ID</th>
                <th>Period (MM/YYYY)</th>
                <th>Net Salary</th>
                <th>Status</th>
                <th className="hr-th-actions">Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPayrolls.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-6 text-muted-foreground"
                  >
                    No payroll records found.
                  </td>
                </tr>
              ) : (
                paginatedPayrolls.map((p, i) => (
                  <tr key={p.payrollId}>
                    <td className="col-serial">
                      {(payrollPage - 1) * itemsPerPage + i + 1}
                    </td>
                    <td className="text-muted-foreground font-mono text-xs">
                      {p.staffId}
                    </td>
                    <td>
                      {p.month.toString().padStart(2, "0")}/{p.year}
                    </td>
                    <td className="hr-cell-bold">
                      {formatCurrency(p.netSalary)}
                    </td>
                    <td>
                      <span
                        className={`luxury-badge ${p.status === "PAID" ? "badge-active" : "badge-warning"}`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td>
                      <div className="hr-td-actions">
                        {p.status !== "PAID" ? (
                          <button
                            onClick={() => markPaid(p.payrollId)}
                            className="hr-pay-btn"
                          >
                            <DollarSign size={13} />
                            Mark Paid
                          </button>
                        ) : (
                          <span className="text-muted-foreground text-xs font-semibold uppercase">
                            —
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Payroll Pagination Footer */}
        {totalPayrollPages > 1 && (
          <div className="table-footer border-t border-[hsl(var(--border))]">
            <span className="pagination-info">
              Showing {(payrollPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(payrollPage * itemsPerPage, payrolls.length)} of{" "}
              {payrolls.length} entries
            </span>
            <div className="pagination">
              <button
                className="page-btn"
                disabled={payrollPage === 1}
                onClick={() => setPayrollPage((p) => p - 1)}
              >
                Previous
              </button>
              <button
                className="page-btn"
                disabled={payrollPage === totalPayrollPages}
                onClick={() => setPayrollPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HR;
