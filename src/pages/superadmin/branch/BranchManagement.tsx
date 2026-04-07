import { useState, useEffect, useMemo } from "react";
import { Search, Hotel, MapPin, Plus, X, GitBranch } from "lucide-react";
import api from "@/api/axios";
import { useNavigate } from "react-router-dom";
import { useBranchWorkspace } from "@/contexts/BranchWorkspaceContext";
import { useConfirm, useToast } from "@/components/confirm/ConfirmProvider";

interface Branch {
  _id: string;
  name: string;
  organizationId: string;
  organizationName?: string;
  organization?: {
    name?: string | null;
  } | null;
  city?: string;
  state?: string;
  country?: string;
  status?: "active" | "inactive" | "maintenance";
  rooms?: number;
  totalRooms?: number;
  isActive?: boolean;
}

interface BranchGroup {
  organizationName: string;
  branches: Branch[];
}

const BranchManagement = () => {
  const [search, setSearch] = useState("");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const confirm = useConfirm();
  const toast = useToast();
  const { enterWorkspace } = useBranchWorkspace();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const branchesRes = await api.get<{ data: Branch[] }>("/branches");
        setBranches(branchesRes.data.data || []);
      } catch (error) {
        console.error("Failed to fetch branches", error);
        toast.error("Failed to load branches");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  const filtered = branches.filter((branch) =>
    branch.name.toLowerCase().includes(search.toLowerCase()),
  );

  const getOrganizationName = (branch: Branch) =>
    branch.organization?.name?.trim() ||
    branch.organizationName?.trim() ||
    "Unknown Organization";

  const getBranchLocation = (branch: Branch) =>
    [branch.city, branch.state, branch.country].filter(Boolean).join(", ") ||
    "Location not set";

  const groupedBranches = useMemo<BranchGroup[]>(() => {
    const groups = new Map<string, BranchGroup>();

    for (const branch of filtered) {
      const organizationName = getOrganizationName(branch);
      const groupKey = branch.organizationId || organizationName;
      const existingGroup = groups.get(groupKey);

      if (existingGroup) {
        existingGroup.branches.push(branch);
      } else {
        groups.set(groupKey, {
          organizationName,
          branches: [branch],
        });
      }
    }

    return Array.from(groups.values());
  }, [filtered]);

  if (loading) {
    return (
      <div className="animate-fade-in bm-root">
        <div className="eb-loading">
          <span className="eb-loading-spinner" />
          <span>Loading branches...</span>
        </div>
      </div>
    );
  }

  const handleDelete = async (id: string) => {
    const branch = branches.find((item) => item._id === id);

    await confirm({
      title: "Confirm Deletion",
      message:
        "Are you sure you want to delete this item? This action cannot be undone.",
      itemName: branch?.name,
      successMessage: "Branch deleted successfully.",
      errorMessage: "Failed to delete branch.",
      onConfirm: async () => {
        await api.delete(`/branches/${id}`);
        setBranches((prev) => prev.filter((item) => item._id !== id));
      },
    });
  };

  const getStatusBadge = (branch: Branch) => {
    const status =
      branch.status || (branch.isActive === false ? "inactive" : "active");

    const cls =
      status === "active"
        ? "badge-active"
        : status === "maintenance"
          ? "badge-warning"
          : "badge-danger";

    return <span className={`luxury-badge ${cls} bm-status-badge`}>{status}</span>;
  };

  return (
    <div className="animate-fade-in bm-root">
      <div className="bm-page-header">
        <div className="add-branch-header add-branch-header--no-mb">
          <div className="add-branch-header-icon-wrap">
            <GitBranch className="add-branch-header-icon" />
          </div>
          <div>
            <h1 className="page-title">Branch Management</h1>
            <p className="page-subtitle">
              Monitor and manage hotel branches without changing subscription plans
            </p>
          </div>
        </div>

        <button
          className="luxury-btn luxury-btn-primary bm-add-btn"
          onClick={() => navigate("/branches/add")}
        >
          <Plus className="icon-sm" />
          Add Branch
        </button>
      </div>

      <div className="luxury-card bm-toolbar">
        <div className="bm-search-wrap">
          <Search className="bm-search-icon" />

          <input
            className="bm-search-input"
            placeholder="Search by branch name..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          {search && (
            <button className="bm-clear-btn" onClick={() => setSearch("")}>
              <X className="bm-clear-icon" />
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="luxury-card bm-empty-card">
          <div className="bm-empty-inner">
            <GitBranch className="bm-empty-icon" />
            <p className="bm-empty-title">No branches found</p>
          </div>
        </div>
      ) : (
        <div className="bm-groups-list">
          {groupedBranches.map((group) => (
            <div key={group.organizationName} className="luxury-card bm-org-card">
              <div className="bm-org-header">
                <div className="bm-org-header-left">
                  <div className="bm-org-icon-wrap">
                    <Hotel className="bm-org-icon" />
                  </div>
                  <span className="bm-org-name">{group.organizationName}</span>
                </div>

                <span className="luxury-badge badge-neutral bm-org-count-badge">
                  {group.branches.length}{" "}
                  {group.branches.length === 1 ? "branch" : "branches"}
                </span>
              </div>

              <div className="bm-branch-list">
                {group.branches.map((branch) => (
                  <div key={branch._id} className="bm-branch-row">
                    <div className="bm-branch-left">
                      <span className="bm-branch-name">{branch.name}</span>

                      <div className="bm-branch-meta">
                        <MapPin className="bm-meta-icon" />
                        <span>{getBranchLocation(branch)}</span>
                        <span className="bm-meta-sep">|</span>
                        <span>{branch.rooms || branch.totalRooms || 0} rooms</span>
                      </div>
                    </div>

                    <div className="bm-branch-actions">
                      {getStatusBadge(branch)}

                      <button
                        className="luxury-btn luxury-btn-outline bm-action-btn"
                        onClick={() => navigate(`/branches/edit/${branch._id}`)}
                      >
                        Edit
                      </button>

                      <button
                        className="luxury-btn luxury-btn-destructive bm-action-btn"
                        onClick={() => handleDelete(branch._id)}
                      >
                        Delete
                      </button>

                      <button
                        className="luxury-btn luxury-btn-primary bm-action-btn"
                        onClick={() => enterWorkspace(branch._id)}
                      >
                        Enter
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BranchManagement;
