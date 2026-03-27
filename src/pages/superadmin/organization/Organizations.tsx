// Imports
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Building2,
  X,
  MoreHorizontal,
  Eye,
  Edit2,
  Pause,
  Trash2,
} from "lucide-react";
import api from "@/api/axios";
import { useConfirm, useToast } from "@/components/confirm/ConfirmProvider";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import "@/pages/superadmin/organization/organization.css";

interface Organization {
  _id: string;
  name: string;
  admins: string[];
  branches?: number;
  users?: number;
  branchesCount?: number;
  usersCount?: number;
  status: string;
  revenue: number;
  isBlocked?: boolean;
}

const Organizations = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [planFilter, setPlanFilter] = useState("All");

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const navigate = useNavigate();
  const confirm = useConfirm();
  const toast = useToast();
  const { formatCompactCurrency } = useSystemSettings();

  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  // 🔥 Fetch from backend
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const response = await api.get<{ data: Organization[] }>(
          "/organizations",
          {
            params: {
              page: currentPage,
              limit: pageSize,
              search,
              status: statusFilter !== "All" ? statusFilter : undefined,
            },
          },
        );

        const mapped = (response.data.data || []).map((org) => ({
          ...org,
          branches:
            org.branchesCount ??
            (Array.isArray(org.branches)
              ? org.branches.length
              : (org.branches ?? 0)),
          users:
            org.usersCount ??
            (Array.isArray(org.users) ? org.users.length : (org.users ?? 0)),
          status: org.isBlocked ? "suspended" : org.status,
        }));

        setOrganizations(mapped);
      } catch (error) {
        console.error("Failed to fetch organizations", error);
      }
    };

    fetchOrganizations();
  }, [currentPage, search, statusFilter]);

  const selectedOrg = organizations.find((o) => o._id === selectedOrgId);

  const filtered = organizations.filter((o) => {
    const matchesSearch =
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.admins[0]?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "All" || o.status === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = filtered.slice(startIndex, startIndex + pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, planFilter]);

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return <span className="luxury-badge badge-active">Active</span>;
      case "suspended":
      case "inactive":
        return <span className="luxury-badge badge-danger">Inactive</span>;
      case "trial":
        return <span className="luxury-badge badge-warning">Trial</span>;
      default:
        return <span className="luxury-badge">{status}</span>;
    }
  };

  const handleDelete = async (id: string) => {
    const organization = organizations.find((org) => org._id === id);

    await confirm({
      title: "Confirm Deletion",
      message:
        "Are you sure you want to delete this item? This action cannot be undone.",
      itemName: organization?.name,
      successMessage: "Organization deleted successfully.",
      errorMessage: "Failed to delete organization.",
      onConfirm: async () => {
        await api.delete(`/organizations/${id}`);
        setOrganizations((prev) => prev.filter((org) => org._id !== id));
      },
    });
  };

  const handleBlockToggle = async (id: string, isBlocked?: boolean) => {
    try {
      if (isBlocked) {
        await api.patch(`/organizations/${id}/unblock`);
      } else {
        await api.patch(`/organizations/${id}/block`);
      }

      setOrganizations((prev) =>
        prev.map((org) =>
          org._id === id
            ? {
                ...org,
                isBlocked: !isBlocked,
                status: !isBlocked ? "suspended" : "active",
              }
            : org,
        ),
      );
    } catch (error: unknown) {
      const axiosError = error as {
        response?: { data?: { message?: string } };
      };
      toast.error(
        axiosError?.response?.data?.message ||
          "Failed to update organization status",
      );
    }
  };

  const handleStatusToggle = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "suspended" : "active";

    try {
      await api.patch(`/organizations/${id}/status`, {
        status: newStatus,
      });

      // Update UI instantly
      setOrganizations((prev) =>
        prev.map((org) =>
          org._id === id ? { ...org, status: newStatus } : org,
        ),
      );
    } catch (error: unknown) {
      const axiosError = error as {
        response?: { data?: { message?: string } };
      };
      toast.error(axiosError?.response?.data?.message || "Failed to update status");
    }
  };

  return (
    <div className="animate-fade-in org-root">

      {/* ── Page Header ── */}
      <div className="org-page-header">
        <div className="add-branch-header" style={{ marginBottom: 0 }}>
          <div className="add-branch-header-icon-wrap">
            <Building2 className="add-branch-header-icon" />
          </div>
          <div>
            <h1 className="page-title">Organizations</h1>
            <p className="page-subtitle">Manage all organizations on the platform</p>
          </div>
        </div>
        <Link to="/organizations/add" className="luxury-btn luxury-btn-primary org-add-btn">
          <Plus className="org-add-icon" />
          Add Organization
        </Link>
      </div>

      {/* ── Toolbar: Search + Filters ── */}
      <div className="org-toolbar">
        <div className="org-search-wrap">
          <Search className="org-search-icon" />
          <input
            id="org-search"
            type="text"
            className="org-search-input"
            placeholder="Search organizations or owner…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search organizations"
          />
          {search && (
            <button
              className="org-search-clear"
              onClick={() => setSearch("")}
              aria-label="Clear search"
            >
              <X className="org-search-clear-icon" />
            </button>
          )}
        </div>

        <div className="org-filters">
          <select
            className="luxury-input org-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="All">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="trial">Trial</option>
          </select>
        </div>
      </div>

      {/* ── Table Card ── */}
      <div className="luxury-card org-table-card">

        <div className="org-table-scroll">
          <table className="luxury-table org-table">
            <thead>
              <tr>
                <th className="col-serial">#</th>
                <th>Organization</th>
                <th>Owner</th>
                <th>Branches</th>
                <th>Users</th>
                <th>Status</th>
                <th>Revenue</th>
                <th className="org-th-action">Action</th>
              </tr>
            </thead>

            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="org-empty-state">
                    <div className="org-empty-inner">
                      <div className="org-empty-icon-wrap">
                        <Building2 className="org-empty-icon" />
                      </div>
                      <p className="org-empty-title">No organizations found</p>
                      <p className="org-empty-sub">
                        {search || statusFilter !== "All"
                          ? "Try adjusting your search or filters."
                          : "Add your first organization to get started."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedData.map((org, index) => (
                  <tr key={org._id} className="org-row">
                    <td className="col-serial">{startIndex + index + 1}</td>
                    <td className="td-primary">{org.name}</td>
                    <td className="user-email">{org.admins?.[0] ?? "—"}</td>
                    <td>{org.branches ?? 0}</td>
                    <td>{org.users ?? 0}</td>
                    <td>{getStatusBadge(org.status)}</td>
                    <td className="org-revenue-cell">
                      {formatCompactCurrency(org.revenue || 0)}
                    </td>

                    <td className="org-td-action">
                      <div className="org-action-wrapper">
                        <button
                          className="org-action-trigger"
                          aria-label="Open actions menu"
                          aria-haspopup="true"
                          aria-expanded={openActionId === org._id}
                          onClick={() =>
                            setOpenActionId(
                              openActionId === org._id ? null : org._id,
                            )
                          }
                        >
                          <MoreHorizontal size={18} aria-hidden="true" />
                        </button>

                        {openActionId === org._id && (
                          <div className="org-action-menu">
                            <button
                              className="org-action-item"
                              onClick={() => {
                                navigate(`/organizations/view/${org._id}`);
                                setOpenActionId(null);
                              }}
                            >
                              <Eye size={16} />
                              View
                            </button>

                            <button
                              className="org-action-item"
                              onClick={() =>
                                navigate(`/organizations/edit/${org._id}`)
                              }
                            >
                              <Edit2 size={16} />
                              Edit
                            </button>

                            <button
                              className="org-action-item"
                              onClick={() => {
                                handleBlockToggle(org._id, org.isBlocked);
                                setOpenActionId(null);
                              }}
                            >
                              <Pause size={16} />
                              {org.isBlocked ? "Unblock" : "Block"}
                            </button>

                            <button
                              className="org-action-item org-action-danger"
                              onClick={() => {
                                handleDelete(org._id);
                                setOpenActionId(null);
                              }}
                            >
                              <Trash2 size={16} />
                              Delete
                            </button>
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

        {/* Pagination Footer */}
        <div className="table-footer">
          <div className="pagination-info">
            Showing {paginatedData.length} of {totalItems} organizations
          </div>

          <div className="pagination">
            <button
              className="page-btn"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                className={`page-btn ${currentPage === page ? "active" : ""}`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}

            <button
              className="page-btn"
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={currentPage === totalPages || totalPages === 0}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {selectedOrg && (
        <div className="fixed inset-0 z-[2000] flex justify-end">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSelectedOrgId(null)}
          />
          <div className="relative w-full max-w-[480px] bg-card border-l border-border h-full flex flex-col shadow-2xl"></div>
        </div>
      )}
    </div>
  );
};

export default Organizations;
