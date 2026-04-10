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
  Pencil,
  Trash2,
  MoreVertical,
  RotateCcw,
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/api/axios";
import { useAuth } from "@/contexts/AuthContext";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import { useBranchWorkspace } from "@/contexts/BranchWorkspaceContext";
import {
  useToast,
  useConfirm,
} from "@/components/confirm/ConfirmProvider";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import PermissionNotice from "@/components/auth/PermissionNotice";

interface Staff {
  _id: string;
  staffId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  department: string;
  designation: string;
  shift?: string;
  employmentType?: string;
  status?: string;
  invitationId?: string | null;
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

interface PendingInvitation {
  _id: string;
  name: string;
  email: string;
  role: string;
  salary: number;
  phone?: string;
  department?: string;
  shift?: string;
  employmentType?: string;
  staffStatus?: string;
  joinedDate?: string;
  expiresAt?: string;
  createdAt?: string;
}

interface ApiErrorResponse {
  message?: string;
}

interface ApiClientError {
  response?: {
    data?: ApiErrorResponse;
  };
}

interface RoleOption {
  _id: string;
  name: string;
  normalizedName: string;
  type?: string;
}

const HIDDEN_HR_ROLES = new Set([
  "SUPER_ADMIN",
  "CORPORATE_ADMIN",
  "Super Admin",
  "Corporate Admin",
]);

const departmentOptions = [
  "FRONT_OFFICE",
  "HOUSEKEEPING",
  "RESTAURANT",
  "HR",
  "ACCOUNTS",
];

const HR = () => {
  const { branchId: routeBranchId } = useParams();
  const { activeBranch } = useBranchWorkspace();
  const branchId = activeBranch?._id || routeBranchId;
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const { formatCurrency } = useSystemSettings();
  const { user } = useAuth();
  const { canAccess, canView, canCreate, canUpdate, canDelete } =
    useModulePermissions("HR");
  if (user && !canAccess) {
    navigate("/unauthorized");
  }

  const shouldHideContent = !!user && canAccess && !canView;

  const canManageRecords = canUpdate || canDelete || canAccess;

  const [staff, setStaff] = useState<Staff[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<
    PendingInvitation[]
  >([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [roleOptions, setRoleOptions] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  // ✅ Invite Staff State
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("");
  const [inviteJoinedDate, setInviteJoinedDate] = useState("");
  const [inviteSalary, setInviteSalary] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteDepartment, setInviteDepartment] = useState("");
  const [inviteShift, setInviteShift] = useState("Morning");
  const [inviteEmploymentType, setInviteEmploymentType] = useState("Full-time");
  const [inviteStatus, setInviteStatus] = useState("Invited");
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [editingInvitation, setEditingInvitation] =
    useState<PendingInvitation | null>(null);
  const [editingPayroll, setEditingPayroll] = useState<Payroll | null>(null);
  const [staffForm, setStaffForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    department: "",
    designation: "",
    shift: "Morning",
    employmentType: "Full-time",
    status: "Active",
    role: "",
    salary: "",
  });
  const [payrollForm, setPayrollForm] = useState({
    month: "",
    year: "",
    netSalary: "",
    status: "UNPAID",
  });
  const [openStaffId, setOpenStaffId] = useState<string | null>(null);
  const [openPayrollId, setOpenPayrollId] = useState<string | null>(null);
  const [resendingInviteId, setResendingInviteId] = useState<string | null>(null);

  // Optimistic tracking for attendance status
  const [attendanceStatus, setAttendanceStatus] = useState<
    Record<string, string>
  >({});

  // Default generating parameters for Payroll
  const [selectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear] = useState<number>(new Date().getFullYear());
  const visibleRoleOptions = useMemo(() => {
    const seenRoles = new Set<string>();

    return roleOptions.filter((role) => {
      if (
        HIDDEN_HR_ROLES.has(role.normalizedName) ||
        HIDDEN_HR_ROLES.has(role.name)
      ) {
        return false;
      }

      const dedupeKey = (role.normalizedName || role.name || "")
        .trim()
        .toUpperCase();

      if (!dedupeKey || seenRoles.has(dedupeKey)) {
        return false;
      }

      seenRoles.add(dedupeKey);
      return true;
    });
  }, [roleOptions]);

  const fetchStaff = useCallback(async () => {
    if (!branchId) return;

    try {
      setLoading(true);
      const res = await api.get<{ data: Staff[] }>("/hr/staff", {
        params: { branchId },
      });
      const staffList = res.data.data || [];
      console.log("Staff List:", staffList);
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

  const fetchPendingInvitations = useCallback(async () => {
    if (!branchId) return;

    try {
      const res = await api.get<PendingInvitation[] | { data: PendingInvitation[] }>(
        "/invitations/pending",
        {
          params: { branchId },
        },
      );
      const invitationList = Array.isArray(res.data)
        ? res.data
        : res.data.data || [];
      setPendingInvitations(invitationList);
    } catch {
      console.error("Failed to load pending invitations");
    }
  }, [branchId]);

  const fetchRoleOptions = useCallback(async () => {
    try {
      const res = await api.get<{ data: RoleOption[] }>("/hr/roles");
      setRoleOptions(res.data.data || []);
    } catch {
      console.error("Failed to load HR roles");
    }
  }, []);

  const refreshHrData = useCallback(async () => {
    await Promise.all([fetchStaff(), fetchPayroll(), fetchPendingInvitations()]);
  }, [fetchPayroll, fetchPendingInvitations, fetchStaff]);

  useEffect(() => {
    const handleClickOutside = () => {
      setOpenStaffId(null);
      setOpenPayrollId(null);
    };

    if (openStaffId || openPayrollId) {
      document.addEventListener("click", handleClickOutside);
    }

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [openStaffId, openPayrollId]);

  useEffect(() => {
    if (!branchId) return;

    fetchStaff();
    fetchPayroll();
    fetchPendingInvitations();
    fetchRoleOptions();
  }, [branchId, fetchPayroll, fetchPendingInvitations, fetchStaff, fetchRoleOptions]);

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
    } catch (error) {
      const apiError = error as ApiClientError;
      toast.error(apiError.response?.data?.message || "Error checking in");
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
    } catch (error) {
      const apiError = error as ApiClientError;
      toast.error(apiError.response?.data?.message || "Error checking out");
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
    } catch (error) {
      const apiError = error as ApiClientError;
      toast.error(
        apiError.response?.data?.message || "Failed to generate payroll",
      );
    }
  };

  const markPaid = async (payrollId: string) => {
    try {
      await api.patch(`/hr/payroll/${payrollId}/pay`);
      fetchPayroll();
      toast.success("Payroll marked as paid.");
    } catch (error) {
      const apiError = error as ApiClientError;
      toast.error(
        apiError.response?.data?.message || "Failed to update payroll",
      );
    }
  };

  // ✅ Invite Staff Function
  const handleOpenStaffEdit = (member: Staff) => {
    void fetchRoleOptions();
    setEditingStaff(member);
    setStaffForm({
      firstName: member.firstName || "",
      lastName: member.lastName || "",
      phone: member.phone || "",
      department:
        member.department && member.department !== "—" ? member.department : "",
      designation:
        member.designation && member.designation !== "—"
          ? member.designation
          : "",
      shift: member.shift || "Morning",
      employmentType: member.employmentType || "Full-time",
      status: member.status || "Active",
      role:
        member.designation && member.designation !== "—"
          ? member.designation
          : "",
      salary: String(member.salary ?? 0),
    });
  };

  const handleOpenInvitationEdit = (invitation: PendingInvitation) => {
    void fetchRoleOptions();
    setEditingInvitation(invitation);
    setShowInviteForm(true);
    setInviteName(invitation.name || "");
    setInviteEmail(invitation.email || "");
    setInviteRole(invitation.role || "");
    setInviteJoinedDate(
      invitation.joinedDate ? invitation.joinedDate.slice(0, 10) : "",
    );
    setInviteSalary(String(invitation.salary ?? 0));
    setInvitePhone(invitation.phone || "");
    setInviteDepartment(invitation.department || "");
    setInviteShift(invitation.shift || "Morning");
    setInviteEmploymentType(invitation.employmentType || "Full-time");
    setInviteStatus(invitation.staffStatus || "Invited");
  };

  const handleUpdateStaff = async () => {
    if (!editingStaff) return;

    if (!staffForm.department.trim()) {
      toast.warning("Department is required");
      return;
    }

    if (!staffForm.designation.trim()) {
      toast.warning("Designation is required");
      return;
    }

    const salaryValue = Number(staffForm.salary);
    if (!Number.isFinite(salaryValue) || salaryValue < 0) {
      toast.warning("Please enter a valid salary");
      return;
    }

    try {
      const payload = {
        firstName: staffForm.firstName.trim(),
        lastName: staffForm.lastName.trim(),
        phone: staffForm.phone.trim(),
        department: staffForm.department.trim(),
        designation: staffForm.designation.trim(),
        shift: staffForm.shift,
        employmentType: staffForm.employmentType,
        status: staffForm.status,
        role: staffForm.designation.trim(),
        salary: salaryValue,
      };

      console.log("Updating Staff:", payload);

      await api.patch(`/hr/staff/${editingStaff.staffId}`, payload);
      setEditingStaff(null);
      await refreshHrData();
      toast.success("Staff updated successfully.");
    } catch (error) {
      const apiError = error as ApiClientError;
      toast.error(
        apiError.response?.data?.message || "Failed to update staff.",
      );
    }
  };

  const handleDeleteStaff = async (member: Staff) => {
    const confirmed = await confirm({
      title: "Delete Staff",
      message: `Are you sure you want to delete ${member.firstName} ${member.lastName}?`,
      successMessage: "Staff deleted successfully.",
      errorMessage: "Failed to delete staff.",
      onConfirm: async () => {
        await api.delete(`/hr/staff/${member.staffId}`);
      },
    });

    if (confirmed) {
      if (editingStaff?.staffId === member.staffId) {
        setEditingStaff(null);
      }
      await refreshHrData();
    }
  };

  const handleOpenPayrollEdit = (payroll: Payroll) => {
    setEditingPayroll(payroll);
    setPayrollForm({
      month: String(payroll.month),
      year: String(payroll.year),
      netSalary: String(payroll.netSalary),
      status: payroll.status,
    });
  };

  const handleUpdatePayroll = async () => {
    if (!editingPayroll) return;

    try {
      await api.patch(`/hr/payroll/${editingPayroll.payrollId}`, {
        month: Number(payrollForm.month),
        year: Number(payrollForm.year),
        netSalary: Number(payrollForm.netSalary),
        status: payrollForm.status,
      });
      setEditingPayroll(null);
      await refreshHrData();
      toast.success("Payroll updated successfully.");
    } catch (error) {
      const apiError = error as ApiClientError;
      toast.error(
        apiError.response?.data?.message || "Failed to update payroll.",
      );
    }
  };

  const handleDeletePayroll = async (payroll: Payroll) => {
    const confirmed = await confirm({
      title: "Delete Payroll",
      message: `Are you sure you want to delete payroll ${payroll.payrollId}?`,
      successMessage: "Payroll deleted successfully.",
      errorMessage: "Failed to delete payroll.",
      onConfirm: async () => {
        await api.delete(`/hr/payroll/${payroll.payrollId}`);
      },
    });

    if (confirmed) {
      if (editingPayroll?.payrollId === payroll.payrollId) {
        setEditingPayroll(null);
      }
      await refreshHrData();
    }
  };

  const resetInviteForm = () => {
    setEditingInvitation(null);
    setInviteName("");
    setInviteEmail("");
    setInviteRole("");
    setInviteJoinedDate("");
    setInviteSalary("");
    setInvitePhone("");
    setInviteDepartment("");
    setInviteShift("Morning");
    setInviteEmploymentType("Full-time");
    setInviteStatus("Invited");
  };

  const handleInviteStaff = async () => {
    try {
      console.log("🚀 Starting Invite Flow");
      const salaryValue = inviteSalary.trim() === "" ? 0 : Number(inviteSalary);

      if (
        !inviteName ||
        !inviteEmail ||
        !inviteRole ||
        !inviteJoinedDate ||
        !invitePhone ||
        !inviteDepartment
      ) {
        toast.warning("All fields are required");
        return;
      }

      if (!Number.isFinite(salaryValue) || salaryValue < 0) {
        toast.warning("Please enter a valid salary");
        return;
      }

      console.log("📤 Sending invite payload:", {
        name: inviteName.trim(),
        email: inviteEmail.trim(),
        role: inviteRole,
        branchId,
        salary: salaryValue,
        phone: invitePhone,
        department: inviteDepartment,
        shift: inviteShift,
        employmentType: inviteEmploymentType,
        status: inviteStatus,
      });
      let inviteRes = { data: null as unknown };

      const payload = {
        name: inviteName.trim(),
        email: inviteEmail.trim(),
        role: inviteRole,
        branchId,
        salary: salaryValue, // ✅ IMPORTANT FIX
        phone: invitePhone.trim(),
        department: inviteDepartment.trim(),
        shift: inviteShift,
        employmentType: inviteEmploymentType,
        status: inviteStatus,
        joinedDate: inviteJoinedDate,
      };

      console.log("🎉 Invitation response:", inviteRes.data);

      inviteRes = { data: payload };

      if (editingInvitation) {
        await api.patch(`/invitations/${editingInvitation._id}`, payload);
      } else {
        await api.post("/invitations", payload);
      }

      await refreshHrData();
      toast.success(
        editingInvitation
          ? "Invitation updated successfully."
          : "Staff invited successfully.",
      );

      resetInviteForm();
      setShowInviteForm(false);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };

      console.error("❌ Invite Error Full Object:", error);
      console.error("❌ Invite Error Response:", err.response?.data);

      toast.error(
        err.response?.data?.message ||
          (editingInvitation
            ? "Error updating invitation"
            : "Error inviting staff"),
      );
    }
  };

  const handleResendPendingInvitation = async (invitation: PendingInvitation) => {
    try {
      setResendingInviteId(invitation._id);
      await api.post(`/invitations/${invitation._id}/resend`);
      toast.success("Invitation resent successfully");
      await fetchPendingInvitations();
    } catch (error) {
      const apiError = error as ApiClientError;
      toast.error(
        apiError.response?.data?.message || "Failed to resend invitation",
      );
    } finally {
      setResendingInviteId(null);
    }
  };

  const handleDeleteInvitation = async (invitation: PendingInvitation) => {
    const confirmed = await confirm({
      title: "Delete Invitation",
      message: `Delete the invitation for ${invitation.name}? The current invite link will stop working immediately.`,
      successMessage: "Invitation deleted successfully.",
      errorMessage: "Failed to delete invitation.",
      onConfirm: async () => {
        await api.delete(`/invitations/${invitation._id}`);
      },
    });

    if (confirmed) {
      if (editingInvitation?._id === invitation._id) {
        resetInviteForm();
        setShowInviteForm(false);
      }
      await refreshHrData();
    }
  };
  /* ── KPI Derivatives ── */
  const activeStaff = useMemo(
    () => staff.filter((member) => !member.invitationId),
    [staff],
  );

  const totalSalary = useMemo(() => {
    return activeStaff.reduce((sum, s) => sum + (s.salary || 0), 0);
  }, [activeStaff]);

  /* ── Pagination ── */
  const [staffPage, setStaffPage] = useState(1);
  const [invitationPage, setInvitationPage] = useState(1);
  const [payrollPage, setPayrollPage] = useState(1);
  const itemsPerPage = 7;
  const invitationItemsPerPage = 7;

  const totalInvitationPages = Math.ceil(
    pendingInvitations.length / invitationItemsPerPage,
  );
  const paginatedInvitations = pendingInvitations.slice(
    (invitationPage - 1) * invitationItemsPerPage,
    invitationPage * invitationItemsPerPage,
  );

  const totalStaffPages = Math.ceil(activeStaff.length / itemsPerPage);
  const paginatedStaff = activeStaff.slice(
    (staffPage - 1) * itemsPerPage,
    staffPage * itemsPerPage,
  );

  const totalPayrollPages = Math.ceil(payrolls.length / itemsPerPage);
  const paginatedPayrolls = payrolls.slice(
    (payrollPage - 1) * itemsPerPage,
    payrollPage * itemsPerPage,
  );

  if (shouldHideContent) {
    return (
      <PermissionNotice message="HR records are hidden because VIEW_EMPLOYEE is disabled for your role." />
    );
  }

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
          <button
            className="luxury-btn luxury-btn-primary hr-add-btn"
            onClick={() => {
              void fetchRoleOptions();
              resetInviteForm();
              setShowInviteForm(true);
            }}
          >
            <Plus size={15} />
            Add Staff
          </button>
        )}
      </div>

      {/* ── Invite Staff Section ── */}
      {showInviteForm && (
        <div className="luxury-card hr-invite-card">
          <button
            className="hr-invite-close"
            aria-label="Close"
            onClick={() => {
              setShowInviteForm(false);
              resetInviteForm();
            }}
          >
            <X size={16} />
          </button>

          <h3 className="hr-invite-title">
            {editingInvitation ? "Edit Invited Staff" : "Register New Staff"}
          </h3>

          <div className="hr-invite-grid">
            <div className="hr-invite-field">
              <label className="hr-invite-label" htmlFor="invite-full-name">Full Name</label>
              <input
                id="invite-full-name"
                className="luxury-input"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="e.g. John Doe"
                title="Full Name"
              />
            </div>

            <div className="hr-invite-field">
              <label className="hr-invite-label" htmlFor="invite-email">Email Address</label>
              <input
                id="invite-email"
                className="luxury-input"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="e.g. john@example.com"
                title="Email Address"
              />
            </div>

            <div className="hr-invite-field">
              <label className="hr-invite-label" htmlFor="invite-role">Assign Role</label>
              <select
                id="invite-role"
                className="luxury-input"
                value={inviteRole}
                title="Assign Role"
                onChange={(e) => setInviteRole(e.target.value)}
              >
                <option value="">Select Role</option>
                {visibleRoleOptions.map((role) => (
                  <option key={role._id} value={role.normalizedName || role.name}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="hr-invite-field">
              <label className="hr-invite-label" htmlFor="invite-joined-date">Joined Date</label>
              <input
                id="invite-joined-date"
                className="luxury-input"
                type="date"
                value={inviteJoinedDate}
                onChange={(e) => setInviteJoinedDate(e.target.value)}
                title="Joined Date"
              />
            </div>

            <div className="hr-invite-field">
              <label className="hr-invite-label" htmlFor="invite-salary">Monthly Salary ($)</label>
              <input
                id="invite-salary"
                className="luxury-input"
                type="number"
                value={inviteSalary}
                onChange={(e) => setInviteSalary(e.target.value)}
                placeholder="e.g. 3000"
                title="Monthly Salary"
              />
            </div>

            <div className="hr-invite-field">
              <label className="hr-invite-label" htmlFor="invite-phone">Phone Number</label>
              <input
                id="invite-phone"
                className="luxury-input"
                value={invitePhone}
                onChange={(e) => setInvitePhone(e.target.value)}
                placeholder="e.g. +1 555 123 4567"
                title="Phone Number"
              />
            </div>

            <div className="hr-invite-field">
              <label className="hr-invite-label" htmlFor="invite-department">Department</label>
              <input
                id="invite-department"
                className="luxury-input"
                value={inviteDepartment}
                onChange={(e) => setInviteDepartment(e.target.value)}
                placeholder="e.g. Front Office"
                title="Department"
              />
            </div>

            <div className="hr-invite-field">
              <label className="hr-invite-label" htmlFor="invite-shift">Shift</label>
              <select
                id="invite-shift"
                className="luxury-input"
                value={inviteShift}
                onChange={(e) => setInviteShift(e.target.value)}
                title="Shift"
              >
                <option value="Morning">Morning</option>
                <option value="Evening">Evening</option>
                <option value="Night">Night</option>
              </select>
            </div>

            <div className="hr-invite-field">
              <label className="hr-invite-label" htmlFor="invite-employment-type">Employment Type</label>
              <select
                id="invite-employment-type"
                className="luxury-input"
                value={inviteEmploymentType}
                onChange={(e) => setInviteEmploymentType(e.target.value)}
                title="Employment Type"
              >
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
              </select>
            </div>

            <div className="hr-invite-field">
              <label className="hr-invite-label" htmlFor="invite-status">Status</label>
              <select
                id="invite-status"
                className="luxury-input"
                value={inviteStatus}
                onChange={(e) => setInviteStatus(e.target.value)}
                title="Status"
              >
                <option value="Invited">Invited</option>
                <option value="Active">Active</option>
                <option value="Suspended">Suspended</option>
              </select>
            </div>
          </div>

          <hr className="hr-invite-divider" />

          <div className="hr-invite-actions">
            <button
              onClick={() => {
                setShowInviteForm(false);
                resetInviteForm();
              }}
              className="luxury-btn luxury-btn-ghost"
            >
              Cancel
            </button>
            <button
              onClick={handleInviteStaff}
              className="luxury-btn luxury-btn-primary"
            >
              {editingInvitation ? "Save Changes" : "Add to System"}
            </button>
          </div>
        </div>
      )}

      {/* ── Salary Summary KPI Cards ── */}
      {editingStaff && (
        <div className="luxury-card hr-invite-card">
          <button
            className="hr-invite-close"
            aria-label="Close"
            onClick={() => setEditingStaff(null)}
          >
            <X size={16} />
          </button>
          <h3 className="hr-invite-title">Edit Staff</h3>
          <div className="hr-invite-grid">
            <div className="hr-invite-field">
              <label className="hr-invite-label" htmlFor="edit-staff-first-name">First Name</label>
              <input
                id="edit-staff-first-name"
                className="luxury-input"
                value={staffForm.firstName}
                onChange={(e) =>
                  setStaffForm((prev) => ({ ...prev, firstName: e.target.value }))
                }
                title="First Name"
              />
            </div>
            <div className="hr-invite-field">
              <label className="hr-invite-label" htmlFor="edit-staff-last-name">Last Name</label>
              <input
                id="edit-staff-last-name"
                className="luxury-input"
                value={staffForm.lastName}
                onChange={(e) =>
                  setStaffForm((prev) => ({ ...prev, lastName: e.target.value }))
                }
                title="Last Name"
              />
            </div>
            <div className="hr-invite-field">
              <label className="hr-invite-label" htmlFor="edit-staff-department">Department</label>
              <select
                id="edit-staff-department"
                className="luxury-input"
                value={staffForm.department}
                onChange={(e) =>
                  setStaffForm((prev) => ({ ...prev, department: e.target.value }))
                }
                title="Department"
              >
                <option value="">Select Department</option>
                {departmentOptions.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
            </div>
            <div className="hr-invite-field">
              <label className="hr-invite-label" htmlFor="edit-staff-phone">Phone Number</label>
              <input
                id="edit-staff-phone"
                className="luxury-input"
                value={staffForm.phone}
                onChange={(e) =>
                  setStaffForm((prev) => ({ ...prev, phone: e.target.value }))
                }
                title="Phone Number"
              />
            </div>
            <div className="hr-invite-field">
              <label className="hr-invite-label" htmlFor="edit-staff-designation">Designation</label>
              <select
                id="edit-staff-designation"
                className="luxury-input"
                value={staffForm.designation}
                onChange={(e) =>
                  setStaffForm((prev) => ({
                    ...prev,
                    designation: e.target.value,
                    role: e.target.value,
                  }))
                }
                title="Designation"
              >
                <option value="">Select Designation</option>
                {visibleRoleOptions.map((role) => (
                  <option
                    key={role._id}
                    value={role.normalizedName || role.name}
                  >
                    {role.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="hr-invite-field">
              <label className="hr-invite-label" htmlFor="edit-staff-salary">Salary</label>
              <input
                id="edit-staff-salary"
                className="luxury-input"
                type="number"
                value={staffForm.salary}
                onChange={(e) =>
                  setStaffForm((prev) => ({ ...prev, salary: e.target.value }))
                }
                title="Salary"
              />
            </div>
            <div className="hr-invite-field">
              <label className="hr-invite-label" htmlFor="edit-staff-shift">Shift</label>
              <select
                id="edit-staff-shift"
                className="luxury-input"
                value={staffForm.shift}
                onChange={(e) =>
                  setStaffForm((prev) => ({ ...prev, shift: e.target.value }))
                }
                title="Shift"
              >
                <option value="Morning">Morning</option>
                <option value="Evening">Evening</option>
                <option value="Night">Night</option>
              </select>
            </div>
            <div className="hr-invite-field">
              <label className="hr-invite-label" htmlFor="edit-staff-employment-type">Employment Type</label>
              <select
                id="edit-staff-employment-type"
                className="luxury-input"
                value={staffForm.employmentType}
                onChange={(e) =>
                  setStaffForm((prev) => ({
                    ...prev,
                    employmentType: e.target.value,
                  }))
                }
                title="Employment Type"
              >
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
              </select>
            </div>
            <div className="hr-invite-field">
              <label className="hr-invite-label" htmlFor="edit-staff-status">Status</label>
              <select
                id="edit-staff-status"
                className="luxury-input"
                value={staffForm.status}
                onChange={(e) =>
                  setStaffForm((prev) => ({ ...prev, status: e.target.value }))
                }
                title="Status"
              >
                <option value="Invited">Invited</option>
                <option value="Active">Active</option>
                <option value="Suspended">Suspended</option>
              </select>
            </div>
          </div>
          <hr className="hr-invite-divider" />
          <div className="hr-invite-actions">
            <button
              onClick={() => setEditingStaff(null)}
              className="luxury-btn luxury-btn-ghost"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateStaff}
              className="luxury-btn luxury-btn-primary"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}

      {editingPayroll && (
        <div className="luxury-card hr-invite-card">
          <button
            className="hr-invite-close"
            aria-label="Close"
            onClick={() => setEditingPayroll(null)}
          >
            <X size={16} />
          </button>
          <h3 className="hr-invite-title">Edit Payroll</h3>
          <div className="hr-invite-grid">
            <div className="hr-invite-field">
              <label className="hr-invite-label" htmlFor="edit-payroll-month">Month</label>
              <input
                id="edit-payroll-month"
                className="luxury-input"
                type="number"
                min="1"
                max="12"
                value={payrollForm.month}
                onChange={(e) =>
                  setPayrollForm((prev) => ({ ...prev, month: e.target.value }))
                }
                title="Month"
              />
            </div>
            <div className="hr-invite-field">
              <label className="hr-invite-label" htmlFor="edit-payroll-year">Year</label>
              <input
                id="edit-payroll-year"
                className="luxury-input"
                type="number"
                value={payrollForm.year}
                onChange={(e) =>
                  setPayrollForm((prev) => ({ ...prev, year: e.target.value }))
                }
                title="Year"
              />
            </div>
            <div className="hr-invite-field">
              <label className="hr-invite-label" htmlFor="edit-payroll-net-salary">Net Salary</label>
              <input
                id="edit-payroll-net-salary"
                className="luxury-input"
                type="number"
                placeholder="e.g. 3000"
                title="Net Salary"
                value={payrollForm.netSalary}
                onChange={(e) =>
                  setPayrollForm((prev) => ({ ...prev, netSalary: e.target.value }))
                }
              />
            </div>
            <div className="hr-invite-field">
              <label className="hr-invite-label" htmlFor="edit-payroll-status">Status</label>
              <select
                id="edit-payroll-status"
                className="luxury-input"
                title="Select Payroll Status"
                value={payrollForm.status}
                onChange={(e) =>
                  setPayrollForm((prev) => ({ ...prev, status: e.target.value }))
                }
              >
                <option value="UNPAID">UNPAID</option>
                <option value="PAID">PAID</option>
              </select>
            </div>
          </div>
          <hr className="hr-invite-divider" />
          <div className="hr-invite-actions">
            <button
              onClick={() => setEditingPayroll(null)}
              className="luxury-btn luxury-btn-ghost"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdatePayroll}
              className="luxury-btn luxury-btn-primary"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}

      <div className="hr-kpi-grid">
        <div className="hr-kpi-card">
          <Briefcase size={16} className="text-foreground mb-1" />
          <span className="hr-kpi-value">{activeStaff.length}</span>
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
      <div className="luxury-card hr-table-card hr-pending-invitations-card">
        <div className="hr-section-header">
          <h3 className="hr-section-title">Pending Invitations</h3>
        </div>

        <div className="hr-table-scroll hr-pending-invitations-scroll">
          <table className="luxury-table">
            <thead>
              <tr>
                <th className="col-serial">#</th>
                <th>Name</th>
                <th>Email</th>
                <th>Department</th>
                <th>Role</th>
                <th>Salary</th>
                <th>Status</th>
                <th>Expires</th>
                <th className="hr-th-actions">Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedInvitations.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="text-center py-6 text-muted-foreground"
                  >
                    No pending invitations found.
                  </td>
                </tr>
              ) : (
                paginatedInvitations.map((invitation, i) => (
                  <tr key={invitation._id}>
                    <td className="col-serial">
                      {(invitationPage - 1) * invitationItemsPerPage + i + 1}
                    </td>
                    <td className="hr-cell-bold">{invitation.name}</td>
                    <td className="text-muted-foreground">
                      {invitation.email}
                    </td>
                    <td className="text-muted-foreground">
                      {invitation.department || "â€”"}
                    </td>
                    <td>
                      <span className="luxury-badge badge-info">
                        {invitation.role}
                      </span>
                    </td>
                    <td className="hr-cell-bold">
                      {formatCurrency(invitation.salary || 0)}
                    </td>
                    <td>
                      <span className="luxury-badge badge-warning text-[0.65rem]">
                        Pending
                      </span>
                    </td>
                    <td className="text-muted-foreground">
                      {invitation.expiresAt
                        ? new Date(invitation.expiresAt).toLocaleString()
                        : "â€”"}
                    </td>
                    <td>
                      <div className="hr-inline-actions">
                        {canUpdate && (
                          <>
                            <button
                              className="hr-icon-btn"
                              onClick={() => handleOpenInvitationEdit(invitation)}
                              title="Edit Staff Details"
                              aria-label={`Edit ${invitation.name}`}
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              className="hr-icon-btn hr-icon-btn-success"
                              onClick={() =>
                                handleResendPendingInvitation(invitation)
                              }
                              title="Resend Invite"
                              aria-label={`Resend invite to ${invitation.name}`}
                              disabled={resendingInviteId === invitation._id}
                            >
                              <RotateCcw size={15} />
                            </button>
                          </>
                        )}
                        {canDelete && (
                          <button
                            className="hr-icon-btn hr-icon-btn-danger"
                            onClick={() => handleDeleteInvitation(invitation)}
                            title="Delete Invitation"
                            aria-label={`Delete invitation for ${invitation.name}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalInvitationPages > 1 && (
          <div className="table-footer border-t border-[hsl(var(--border))]">
            <span className="pagination-info">
              Showing {(invitationPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(
                invitationPage * invitationItemsPerPage,
                pendingInvitations.length,
              )}{" "}
              of {pendingInvitations.length} entries
            </span>
            <div className="pagination">
              <button
                className="page-btn pagination-nav-btn"
                disabled={invitationPage === 1}
                onClick={() => setInvitationPage((p) => p - 1)}
                aria-label="Previous invitation page"
              >
                Previous
              </button>
              <span className="pagination-page-indicator">
                Page {invitationPage} of {totalInvitationPages}
              </span>
              <button
                className="page-btn pagination-nav-btn"
                disabled={invitationPage === totalInvitationPages}
                onClick={() => setInvitationPage((p) => p + 1)}
                aria-label="Next invitation page"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="luxury-card hr-table-card hr-standard-table-card">
        <div className="hr-section-header">
          <h3 className="hr-section-title">Staff List</h3>
        </div>

        <div className="hr-table-scroll hr-standard-table-scroll">
          <table className="luxury-table">
            <thead>
              <tr>
                <th className="col-serial">#</th>
                <th>Name</th>
                <th>Email</th>
                <th>Department</th>
                <th>Designation</th>
                <th>Salary</th>
                <th>Status</th>
                <th>Attendance</th>
                <th className="hr-th-actions">Action</th>
                <th className="hr-th-actions">Payroll</th>
              </tr>
            </thead>
            <tbody>
              {paginatedStaff.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
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
                      {s.email || "—"}
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
                        className={`luxury-badge ${s.status === "Active" ? "badge-active" : s.status === "Suspended" ? "badge-danger" : "badge-warning"} text-[0.65rem]`}
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
                      {canManageRecords && (
                        <div className="bk-action-wrapper">
                          <button
                            className="bk-action-trigger"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenStaffId(
                                openStaffId === s.staffId ? null : s.staffId,
                              );
                            }}
                            title="More Actions"
                          >
                            <MoreVertical size={18} />
                          </button>

                          {openStaffId === s.staffId && (
                            <div className="bk-action-menu">
                              <button
                                className="bk-action-item"
                                onClick={() => {
                                  handleOpenStaffEdit(s);
                                  setOpenStaffId(null);
                                }}
                              >
                                <Pencil size={15} />
                                Edit Staff
                              </button>
                              <button
                                className="bk-action-item bk-action-danger"
                                onClick={() => {
                                  handleDeleteStaff(s);
                                  setOpenStaffId(null);
                                }}
                              >
                                <Trash2 size={15} />
                                Delete Staff
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    <td>
                      <div className="flex gap-2 flex-wrap">
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
              {Math.min(staffPage * itemsPerPage, activeStaff.length)} of{" "}
              {activeStaff.length} entries
            </span>
            <div className="pagination">
              <button
                className="page-btn pagination-nav-btn"
                disabled={staffPage === 1}
                onClick={() => setStaffPage((p) => p - 1)}
                aria-label="Previous staff page"
              >
                Previous
              </button>
              <span className="pagination-page-indicator">
                Page {staffPage} of {totalStaffPages}
              </span>
              <button
                className="page-btn pagination-nav-btn"
                disabled={staffPage === totalStaffPages}
                onClick={() => setStaffPage((p) => p + 1)}
                aria-label="Next staff page"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Payroll Records Table ── */}
      <div className="luxury-card hr-table-card hr-standard-table-card">
        <div className="hr-section-header">
          <h3 className="hr-section-title">Payroll Records</h3>
        </div>

        <div className="hr-table-scroll hr-standard-table-scroll">
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
                        {p.status !== "PAID" && (
                          <button
                            onClick={() => markPaid(p.payrollId)}
                            className="hr-pay-btn"
                          >
                            <DollarSign size={13} />
                            Mark Paid
                          </button>
                        )}

                        {canManageRecords && (
                          <div className="bk-action-wrapper">
                            <button
                              className="bk-action-trigger"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenPayrollId(
                                  openPayrollId === p.payrollId
                                    ? null
                                    : p.payrollId,
                                );
                              }}
                              title="More Actions"
                            >
                              <MoreVertical size={18} />
                            </button>

                            {openPayrollId === p.payrollId && (
                              <div className="bk-action-menu">
                                <button
                                  className="bk-action-item"
                                  onClick={() => {
                                    handleOpenPayrollEdit(p);
                                    setOpenPayrollId(null);
                                  }}
                                >
                                  <Pencil size={15} />
                                  Edit Payroll
                                </button>
                                <button
                                  className="bk-action-item bk-action-danger"
                                  onClick={() => {
                                    handleDeletePayroll(p);
                                    setOpenPayrollId(null);
                                  }}
                                >
                                  <Trash2 size={15} />
                                  Delete Payroll
                                </button>
                              </div>
                            )}
                          </div>
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
                className="page-btn pagination-nav-btn"
                disabled={payrollPage === 1}
                onClick={() => setPayrollPage((p) => p - 1)}
                aria-label="Previous payroll page"
              >
                Previous
              </button>
              <span className="pagination-page-indicator">
                Page {payrollPage} of {totalPayrollPages}
              </span>
              <button
                className="page-btn pagination-nav-btn"
                disabled={payrollPage === totalPayrollPages}
                onClick={() => setPayrollPage((p) => p + 1)}
                aria-label="Next payroll page"
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
