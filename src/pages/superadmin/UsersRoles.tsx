import { useEffect, useState } from "react";
import {
  Search,
  Users as UsersIcon,
  Shield,
  UserCheck,
  X,
  Trash2,
  Pencil,
  Loader2,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import api from "@/api/axios";
import { useToast, useConfirm } from "@/components/confirm/ConfirmProvider";
import { useAuth } from "@/contexts/AuthContext";

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  roleRef?:
    | {
        _id: string;
        name: string;
        normalizedName?: string;
      }
    | string;
  organizationId?: string | null;
  organization?: {
    organizationId?: string;
    name?: string;
  } | null;
  branchId?: string | null;
  branch?: {
    _id?: string;
    name?: string;
    organizationId?: string;
  } | null;
  isActive: boolean;
}

interface Role {
  _id: string;
  name: string;
  normalizedName?: string;
}

interface RoleDistribution {
  name: string;
  value: number;
  color: string;
  dotClass: string;
}

interface RoleEditState {
  user: User;
  selectedRole: string;
}

const ROLE_CHART_COLORS = [
  "hsl(41, 55%, 57%)",
  "hsl(160, 59%, 30%)",
  "hsl(210, 40%, 50%)",
  "hsl(0, 58%, 39%)",
  "hsl(280, 40%, 50%)",
  "hsl(30, 40%, 50%)",
];

const ROLE_DOT_CLASSES = [
  "dot-gold",
  "dot-emerald",
  "dot-blue",
  "dot-danger",
  "dot-violet",
  "dot-orange",
];

const buildRoleDistribution = (usersData: User[]): RoleDistribution[] => {
  const distributionMap: Record<string, number> = {};

  usersData.forEach((user) => {
    distributionMap[user.role] = (distributionMap[user.role] || 0) + 1;
  });

  return Object.keys(distributionMap).map((role, index) => ({
    name: role,
    value: distributionMap[role],
    color: ROLE_CHART_COLORS[index % ROLE_CHART_COLORS.length],
    dotClass: ROLE_DOT_CLASSES[index % ROLE_DOT_CLASSES.length],
  }));
};

const getOrganizationName = (user: User) =>
  user.organization?.name?.trim() || "N/A";

const getBranchName = (user: User) => user.branch?.name?.trim() || "N/A";

const getRoleKey = (role: Pick<Role, "name" | "normalizedName"> | string) =>
  typeof role === "string"
    ? role
    : role.normalizedName || role.name;

const isSuperAdminRole = (role: Pick<Role, "name" | "normalizedName"> | string) =>
  getRoleKey(role) === "SUPER_ADMIN";

const UsersRoles = () => {
  const toast = useToast();
  const confirm = useConfirm();
  const { user: currentUser, hasPermission } = useAuth();
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [roleDistribution, setRoleDistribution] = useState<RoleDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusUpdatingIds, setStatusUpdatingIds] = useState<string[]>([]);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [roleUpdatingIds, setRoleUpdatingIds] = useState<string[]>([]);
  const [roleEditor, setRoleEditor] = useState<RoleEditState | null>(null);

  const fetchRoles = async (targetUser?: User) => {
    const params = targetUser?.organizationId
      ? {
          organizationId: targetUser.organizationId,
          ...(targetUser.branchId ? { branchId: targetUser.branchId } : {}),
        }
      : undefined;
    const rolesRes = await api.get<{ data: Role[] }>("/roles", { params });
    const rolesData = rolesRes.data.data || [];

    console.log("roles", rolesData);
    setRoles(rolesData);

    return rolesData;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, rolesData] = await Promise.all([
          api.get<{ data: User[] }>("/users"),
          fetchRoles(),
        ]);

        const usersData = usersRes.data.data || [];

        setUsers(usersData);
        setRoleDistribution(buildRoleDistribution(usersData));
      } catch (error) {
        console.error("Failed to load users/roles", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filtered = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()),
  );

  const canManageUser = (targetUser: User) => {
    if (currentUser?.role === "SUPER_ADMIN") return true;

    if (currentUser?.role === "CORPORATE_ADMIN") {
      return (
        !!currentUser.organizationId &&
        currentUser.organizationId === targetUser.organizationId
      );
    }

    return false;
  };

  const canEditUserRole = (targetUser: User) =>
    canManageUser(targetUser) && hasPermission("UPDATE_USER");

  const syncUsers = (updater: (prev: User[]) => User[]) => {
    setUsers((prev) => {
      const nextUsers = updater(prev);
      setRoleDistribution(buildRoleDistribution(nextUsers));
      return nextUsers;
    });
  };

  const handleToggleStatus = async (targetUser: User) => {
    const nextStatus = !targetUser.isActive;

    setStatusUpdatingIds((prev) => [...prev, targetUser._id]);

    try {
      const response = await api.patch<{ message?: string; data?: User }>(
        `/users/${targetUser._id}/status`,
        {
          isActive: nextStatus,
        },
      );

      setUsers((prev) =>
        prev.map((user) =>
          user._id === targetUser._id
            ? { ...user, isActive: nextStatus }
            : user,
        ),
      );

      toast.success(
        response.data?.message ||
          (nextStatus
            ? "User Activated Successfully"
            : "User Deactivated Successfully"),
      );
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to update user status";

      toast.error(message);
    } finally {
      setStatusUpdatingIds((prev) => prev.filter((id) => id !== targetUser._id));
    }
  };

  const handleDeleteUser = async (targetUser: User) => {
    setDeletingIds((prev) => [...prev, targetUser._id]);

    const confirmed = await confirm({
      title: "Delete User",
      message: "Are you sure you want to delete this user?",
      confirmLabel: "Delete",
      processingLabel: "Deleting...",
      successMessage: "User Deleted Successfully",
      errorMessage: "Failed to delete user",
      onConfirm: async () => {
        await api.delete(`/users/${targetUser._id}`);
        syncUsers((prev) => prev.filter((user) => user._id !== targetUser._id));
      },
    });

    if (!confirmed) {
      setDeletingIds((prev) => prev.filter((id) => id !== targetUser._id));
      return;
    }

    setDeletingIds((prev) => prev.filter((id) => id !== targetUser._id));
  };

  const openRoleEditor = async (targetUser: User) => {
    if (!canEditUserRole(targetUser)) {
      return;
    }

    try {
      const rolesData = await fetchRoles(targetUser);

      setRoleEditor({
        user: targetUser,
        selectedRole:
          rolesData.find(
            (role) =>
              (role.normalizedName || role.name) === targetUser.role,
          )?.normalizedName || targetUser.role,
      });
    } catch (error) {
      console.error("Failed to load roles", error);
      toast.error("Failed to load roles");
    }
  };

  const closeRoleEditor = () => {
    if (!roleEditor || roleUpdatingIds.includes(roleEditor.user._id)) {
      return;
    }

    setRoleEditor(null);
  };

  const handleRoleSave = async () => {
    if (!roleEditor) return;

    const { user: targetUser, selectedRole } = roleEditor;
    if (!canEditUserRole(targetUser)) {
      return;
    }

    if (!selectedRole || selectedRole === targetUser.role) {
      setRoleEditor(null);
      return;
    }

    const selectedRoleOption = roles.find(
      (role) => (role.normalizedName || role.name) === selectedRole,
    );

    if (!selectedRoleOption) {
      toast.error("Selected role not found");
      return;
    }

    const confirmed = await confirm({
      title:
        targetUser.role === "SUPER_ADMIN"
          ? "Change Super Admin Role"
          : "Change User Role",
      message:
        targetUser.role === "SUPER_ADMIN"
          ? `This user is currently a Super Admin. Changing the role to ${selectedRoleOption.normalizedName || selectedRoleOption.name} will remove Super Admin access.`
          : `Are you sure you want to change this user's role to ${selectedRoleOption.normalizedName || selectedRoleOption.name}?`,
      confirmLabel: "Save",
      processingLabel: "Saving...",
    });

    if (!confirmed) return;

    setRoleUpdatingIds((prev) => [...prev, targetUser._id]);

    try {
      const response = await api.patch<{ success: boolean; user: User }>(
        `/users/${targetUser._id}/role`,
        { role: selectedRoleOption.normalizedName || selectedRoleOption.name },
      );

      if (response.data.success) {
        syncUsers((prev) =>
          prev.map((user) =>
            user._id === targetUser._id
              ? {
                  ...user,
                  role: response.data.user.role,
                  roleRef: response.data.user.roleRef,
                }
              : user,
          ),
        );
        setRoleEditor(null);
        toast.success("Role updated successfully");
      }
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to update user role";
      toast.error(message);
    } finally {
      setRoleUpdatingIds((prev) => prev.filter((id) => id !== targetUser._id));
    }
  };

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.isActive).length;
  const editableRoles = roles.filter((role) => !isSuperAdminRole(role));

  if (loading) {
    return (
      <div className="animate-fade-in ur-root">
        <div className="eb-loading">
          <span className="eb-loading-spinner" />
          <span>Loading users...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in ur-root">
      <div className="add-branch-header">
        <div className="add-branch-header-icon-wrap">
          <UsersIcon className="add-branch-header-icon" />
        </div>
        <div>
          <h1 className="page-title">Users &amp; Roles</h1>
          <p className="page-subtitle">
            Manage system users and their role assignments
          </p>
        </div>
      </div>

      <div className="ur-kpi-grid">
        <div className="luxury-card kpi-card gf-kpi-card">
          <div className="gf-kpi-icon-wrap gf-kpi-icon-gold">
            <UsersIcon className="gf-kpi-icon" />
          </div>
          <span className="kpi-value">{totalUsers}</span>
          <span className="kpi-label">Total Users</span>
        </div>

        <div className="luxury-card kpi-card gf-kpi-card">
          <div className="gf-kpi-icon-wrap gf-kpi-icon-green">
            <UserCheck className="gf-kpi-icon" />
          </div>
          <span className="kpi-value">{activeUsers}</span>
          <span className="kpi-label">Active Users</span>
        </div>

        <div className="luxury-card kpi-card gf-kpi-card">
          <div className="gf-kpi-icon-wrap gf-kpi-icon-amber">
            <Shield className="gf-kpi-icon" />
          </div>
          <span className="kpi-value">{roles.length}</span>
          <span className="kpi-label">Defined Roles</span>
        </div>
      </div>

      <div className="ur-content-row">
        <div className="ur-table-section">
          <div className="luxury-card ur-search-card">
            <div className="ur-search-wrap">
              <Search className="ur-search-icon" />
              <input
                id="user-search"
                className="ur-search-input"
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search users"
              />
              {search && (
                <button
                  className="ur-search-clear"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  <X className="ur-search-clear-icon" />
                </button>
              )}
            </div>
          </div>

          <div className="luxury-card ur-table-card">
            <div className="ur-table-scroll">
              <table className="luxury-table">
                <thead>
                  <tr>
                    <th className="col-serial">#</th>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Organization</th>
                    <th>Branch</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="gf-table-empty">
                        No users found{search ? ` matching "${search}"` : ""}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((u, idx) => (
                      <tr key={u._id}>
                        <td className="col-serial">{idx + 1}</td>
                        <td>
                          <div className="user-info">
                            <p className="user-name">{u.name}</p>
                            <p className="user-email">{u.email}</p>
                          </div>
                        </td>
                        <td>
                          <div className="ur-role-cell">
                            <span className="ur-role-badge">{u.role}</span>
                            {canEditUserRole(u) ? (
                              <button
                                type="button"
                                className="ur-role-edit-btn"
                                aria-label={`Edit role for ${u.name}`}
                                onClick={() => {
                                  void openRoleEditor(u);
                                }}
                                disabled={
                                  roleUpdatingIds.includes(u._id) ||
                                  deletingIds.includes(u._id)
                                }
                              >
                                {roleUpdatingIds.includes(u._id) ? (
                                  <Loader2
                                    size={14}
                                    className="ur-role-edit-spinner"
                                  />
                                ) : (
                                  <Pencil size={14} />
                                )}
                              </button>
                            ) : null}
                          </div>
                        </td>
                        <td className="user-email">{getOrganizationName(u)}</td>
                        <td className="user-email">{getBranchName(u)}</td>
                        <td>
                          <div className="flex items-center justify-between gap-3">
                            <button
                              type="button"
                              role="switch"
                              aria-checked={u.isActive}
                              aria-label={`${u.isActive ? "Deactivate" : "Activate"} ${u.name}`}
                              className={`rpe-toggle ${u.isActive ? "rpe-toggle-on" : "rpe-toggle-off"}`}
                              onClick={() => handleToggleStatus(u)}
                              disabled={
                                !canManageUser(u) ||
                                statusUpdatingIds.includes(u._id) ||
                                deletingIds.includes(u._id)
                              }
                            >
                              <span
                                className={`rpe-toggle-thumb ${u.isActive ? "rpe-toggle-thumb-on" : "rpe-toggle-thumb-off"}`}
                              />
                            </button>

                            <span
                              className={`luxury-badge ${u.isActive ? "badge-active" : "badge-danger"}`}
                            >
                              {u.isActive ? "active" : "inactive"}
                            </span>

                            {canManageUser(u) ? (
                              <button
                                type="button"
                                className="ur-user-action-btn"
                                aria-label={`Delete ${u.name}`}
                                onClick={() => handleDeleteUser(u)}
                                disabled={
                                  deletingIds.includes(u._id) ||
                                  statusUpdatingIds.includes(u._id)
                                }
                              >
                                <Trash2 size={16} />
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="luxury-card ur-chart-card">
          <div className="gf-section-header">
            <span className="gf-section-title">Role Distribution</span>
            <span className="gf-payments-count">
              {roleDistribution.length} roles
            </span>
          </div>

          <div className="ur-chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={roleDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={74}
                  dataKey="value"
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {roleDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    color: "hsl(var(--foreground))",
                  }}
                  formatter={(value: number, name: string) => [value, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="ur-legend">
            {roleDistribution.map((r) => (
              <div key={r.name} className="ur-legend-row">
                <span className={`legend-dot ${r.dotClass}`} />
                <span className="ur-legend-name">{r.name}</span>
                <span className="ur-legend-value">{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {roleEditor && canEditUserRole(roleEditor.user) ? (
        <div className="rpe-modal-layer" role="presentation">
          <div className="rpe-modal-backdrop" onClick={closeRoleEditor} />
          <div className="rpe-modal ur-role-modal" role="dialog" aria-modal="true">
            <div className="rpe-modal-header">
              <div>
                <h2 className="rpe-modal-title">Edit User Role</h2>
                <p className="rpe-modal-subtitle">
                  Update role assignment for {roleEditor.user.name}
                </p>
              </div>
              <button
                type="button"
                className="rpe-modal-close"
                aria-label="Close modal"
                onClick={closeRoleEditor}
                disabled={roleUpdatingIds.includes(roleEditor.user._id)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="rpe-modal-body">
              <div className="rpe-modal-form">
                <label className="rpe-modal-field">
                  <span className="rpe-modal-label">Role</span>
                  <select
                    className="luxury-select ur-role-select"
                    value={roleEditor.selectedRole}
                    onChange={(e) =>
                      setRoleEditor((prev) =>
                        prev
                          ? {
                              ...prev,
                              selectedRole: e.target.value,
                            }
                          : prev,
                      )
                    }
                    disabled={
                      roleUpdatingIds.includes(roleEditor.user._id) ||
                      roleEditor.user.role === "SUPER_ADMIN"
                    }
                  >
                    {roleEditor.user.role === "SUPER_ADMIN" ? (
                      <option value={roleEditor.user.role}>
                        {roleEditor.user.role}
                      </option>
                    ) : editableRoles.length > 0 ? (
                      editableRoles.map((role) => (
                        <option
                          key={role._id}
                          value={role.normalizedName || role.name}
                        >
                          {role.normalizedName || role.name}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>
                        No roles available
                      </option>
                    )}
                  </select>
                </label>

                {roleEditor.user.role === "SUPER_ADMIN" ? (
                  <div className="ur-role-modal-note">
                    This user currently has Super Admin access. Saving a new role
                    will remove that access after confirmation.
                  </div>
                ) : null}

                <div className="rpe-modal-actions">
                  <button
                    type="button"
                    className="luxury-btn luxury-btn-outline"
                    onClick={closeRoleEditor}
                    disabled={roleUpdatingIds.includes(roleEditor.user._id)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="luxury-btn luxury-btn-primary"
                    onClick={handleRoleSave}
                    disabled={
                      roleUpdatingIds.includes(roleEditor.user._id) ||
                      roleEditor.selectedRole === roleEditor.user.role
                    }
                  >
                    {roleUpdatingIds.includes(roleEditor.user._id) ? (
                      <>
                        <Loader2 size={16} className="ur-role-edit-spinner" />
                        Saving...
                      </>
                    ) : (
                      "Save"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default UsersRoles;
