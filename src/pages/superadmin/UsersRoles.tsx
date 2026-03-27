import { useEffect, useState } from "react";
import {
  Search,
  Users as UsersIcon,
  Shield,
  UserCheck,
  X,
  Trash2,
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
  organizationId?: string | null;
  branchId?: {
    name?: string;
  } | null;
  isActive: boolean;
}

interface RoleDistribution {
  name: string;
  value: number;
  color: string;
  dotClass: string;
}

const UsersRoles = () => {
  const toast = useToast();
  const confirm = useConfirm();
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [roleDistribution, setRoleDistribution] = useState<RoleDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusUpdatingIds, setStatusUpdatingIds] = useState<string[]>([]);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, rolesRes] = await Promise.all([
          api.get<{ data: User[] }>("/users"),
          api.get<{ data: { name: string }[] }>("/roles"),
        ]);

        const usersData = usersRes.data.data || [];
        const rolesData = rolesRes.data.data || [];

        setUsers(usersData);
        setRoles(rolesData.map((r) => r.name));

        // 🔥 Calculate role distribution dynamically
        const distributionMap: Record<string, number> = {};
        usersData.forEach((u: User) => {
          distributionMap[u.role] = (distributionMap[u.role] || 0) + 1;
        });

        const colors = [
          "hsl(41, 55%, 57%)",
          "hsl(160, 59%, 30%)",
          "hsl(210, 40%, 50%)",
          "hsl(0, 58%, 39%)",
          "hsl(280, 40%, 50%)",
          "hsl(30, 40%, 50%)",
        ];

        const dotClasses = [
          "dot-gold",
          "dot-emerald",
          "dot-blue",
          "dot-danger",
          "dot-violet",
          "dot-orange",
        ];

        const formattedDistribution: RoleDistribution[] = Object.keys(distributionMap).map(
          (role, index) => ({
            name: role,
            value: distributionMap[role],
            color: colors[index % colors.length],
            dotClass: dotClasses[index % dotClasses.length],
          })
        );

        setRoleDistribution(formattedDistribution);
      } catch (error) {
        console.error("Failed to load users/roles", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filtered = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase())
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
        setUsers((prev) => prev.filter((user) => user._id !== targetUser._id));
      },
    });

    if (!confirmed) {
      setDeletingIds((prev) => prev.filter((id) => id !== targetUser._id));
      return;
    }

    setDeletingIds((prev) => prev.filter((id) => id !== targetUser._id));
  };

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.isActive).length;

  if (loading) {
    return (
      <div className="animate-fade-in ur-root">
        <div className="eb-loading">
          <span className="eb-loading-spinner" />
          <span>Loading users…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in ur-root">

      {/* ── Page Header ── */}
      <div className="add-branch-header">
        <div className="add-branch-header-icon-wrap">
          <UsersIcon className="add-branch-header-icon" />
        </div>
        <div>
          <h1 className="page-title">Users &amp; Roles</h1>
          <p className="page-subtitle">Manage system users and their role assignments</p>
        </div>
      </div>

      {/* ── KPI Cards ── */}
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

      {/* ── Main Content: Table + Role Distribution ── */}
      <div className="ur-content-row">

        {/* Left: Search + Table */}
        <div className="ur-table-section">

          {/* Search bar */}
          <div className="luxury-card ur-search-card">
            <div className="ur-search-wrap">
              <Search className="ur-search-icon" />
              <input
                id="user-search"
                className="ur-search-input"
                placeholder="Search users…"
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

          {/* Table card */}
          <div className="luxury-card ur-table-card">
            <div className="ur-table-scroll">
              <table className="luxury-table">
                <thead>
                  <tr>
                    <th className="col-serial">#</th>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Branch</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="gf-table-empty">
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
                          <span className="ur-role-badge">{u.role}</span>
                        </td>
                        <td className="user-email">
                          {u.branchId?.name || "All"}
                        </td>
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

                            <span className={`luxury-badge ${u.isActive ? "badge-active" : "badge-danger"}`}>
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

        {/* Right: Role Distribution chart */}
        <div className="luxury-card ur-chart-card">
          <div className="gf-section-header">
            <span className="gf-section-title">Role Distribution</span>
            <span className="gf-payments-count">{roleDistribution.length} roles</span>
          </div>

          {/* Donut chart */}
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

          {/* Legend */}
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
    </div>
  );
};

export default UsersRoles;
