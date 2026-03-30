import { useEffect, useState, useMemo } from "react";
import {
  Plus,
  CheckCircle,
  Clock,
  AlertCircle,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/api/axios";
import { useAuth } from "@/contexts/AuthContext";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import { useToast } from "@/components/confirm/ConfirmProvider";
import PermissionNotice from "@/components/auth/PermissionNotice";

interface Room {
  _id: string;
  roomNumber: string;
}

interface Task {
  housekeepingId: string;
  roomId: {
    _id: string;
    roomNumber: string;
  };
  status: string;
  priority: string;
  assignedTo?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  notes?: string;
  createdAt?: string;
}

const statusBadge: Record<string, string> = {
  DIRTY: "badge-danger",
  ASSIGNED: "badge-warning",
  IN_PROGRESS: "badge-info",
  CLEAN: "badge-active",
  INSPECTED: "badge-active",
};

const priorityBadge: Record<string, string> = {
  LOW: "badge-info",
  MEDIUM: "badge-warning",
  HIGH: "badge-danger",
  URGENT: "badge-danger",
};

const Housekeeping = () => {
  const { branchId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const { canAccess, canView, canCreate, canUpdate } =
    useModulePermissions("HOUSEKEEPING");
  if (user && !canAccess) {
    navigate("/unauthorized");
  }

  const shouldHideContent = !!user && canAccess && !canView;

  const canManageHousekeeping = canCreate || canUpdate;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await api.get<{ data: Task[] }>("/housekeeping", {
        params: { branchId },
      });
      setTasks(res.data.data || []);
    } catch {
      console.error("Failed to fetch housekeeping tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [branchId]);

  const updateStatus = async (id: string, status: string) => {
    await api.patch(`/housekeeping/${id}/status`, { status });
    fetchTasks();
    toast.success("Task status updated successfully.");
  };

  const deactivateTask = async (id: string) => {
    try {
      await api.patch(`/housekeeping/${id}/deactivate`);
      fetchTasks();
      toast.success("Task deactivated successfully.");
    } catch {
      toast.error("Failed to deactivate task");
    }
  };

  /* ── KPI Derivations ── */
  const kpi = useMemo(() => {
    return {
      total: tasks.length,
      dirty: tasks.filter((t) => t.status === "DIRTY").length,
      inProgress: tasks.filter(
        (t) => t.status === "IN_PROGRESS" || t.status === "ASSIGNED",
      ).length,
      completed: tasks.filter(
        (t) => t.status === "CLEAN" || t.status === "INSPECTED",
      ).length,
    };
  }, [tasks]);

  if (shouldHideContent) {
    return (
      <PermissionNotice message="Housekeeping tasks are hidden because VIEW_TASK is disabled for your role." />
    );
  }

  if (loading) {
    return (
      <div className="hk-root animate-fade-in">
        <div className="hk-loading">
          <span className="eb-loading-spinner" />
          <span>Loading tasks…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="hk-root animate-fade-in">
      {/* ── Page Header ── */}
      <div className="hk-page-header">
        <div className="hk-title-group">
          <div className="add-branch-header-icon-wrap">
            <Sparkles className="add-branch-header-icon" />
          </div>
          <div>
            <h1 className="page-title">Housekeeping Management</h1>
            <p className="page-subtitle">
              Track and manage room cleaning and inspections
            </p>
          </div>
        </div>

        {canCreate && (
          <button
            onClick={() => navigate(`/workspace/${branchId}/housekeeping/add`)}
            className="luxury-btn luxury-btn-primary hk-add-btn"
          >
            <Plus size={15} />
            Create Task
          </button>
        )}
      </div>

      {/* ── KPI Cards ── */}
      <div className="hk-kpi-grid">
        <div className="hk-kpi-card">
          <AlertCircle
            size={16}
            style={{ color: "hsl(var(--danger))", marginBottom: "0.25rem" }}
          />
          <span className="hk-kpi-value hk-kpi-danger">{kpi.dirty}</span>
          <span className="hk-kpi-label">Dirty Rooms</span>
        </div>
        <div className="hk-kpi-card">
          <Clock
            size={16}
            style={{
              color: "hsl(var(--grandeur-gold))",
              marginBottom: "0.25rem",
            }}
          />
          <span className="hk-kpi-value hk-kpi-gold">{kpi.inProgress}</span>
          <span className="hk-kpi-label">In Progress</span>
        </div>
        <div className="hk-kpi-card">
          <CheckCircle
            size={16}
            style={{
              color: "hsl(var(--premium-green))",
              marginBottom: "0.25rem",
            }}
          />
          <span className="hk-kpi-value hk-kpi-green">{kpi.completed}</span>
          <span className="hk-kpi-label">Cleaned Today</span>
        </div>
        <div className="hk-kpi-card">
          <Sparkles
            size={16}
            style={{
              color: "hsl(var(--muted-foreground))",
              marginBottom: "0.25rem",
            }}
          />
          <span className="hk-kpi-value hk-kpi-info">{kpi.total}</span>
          <span className="hk-kpi-label">Total Active Tasks</span>
        </div>
      </div>

      {/* ── Task Table ── */}
      <div className="luxury-card hk-table-card">
        <div className="hk-table-scroll">
          <table className="luxury-table">
            <thead>
              <tr>
                <th className="col-serial">#</th>
                <th>Room</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Assigned To</th>
                <th>Notes</th>
                <th className="hk-th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-6 text-muted-foreground"
                  >
                    No active tasks found. Click "Create Task" to add one.
                  </td>
                </tr>
              ) : (
                tasks.map((task, i) => (
                  <tr key={task.housekeepingId}>
                    <td className="col-serial">{i + 1}</td>
                    <td className="hk-cell-bold">
                      Room {task.roomId?.roomNumber || "—"}
                    </td>
                    <td>
                      <span
                        className={`luxury-badge ${statusBadge[task.status] || "badge-info"}`}
                      >
                        {task.status.replace("_", " ")}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`luxury-badge ${priorityBadge[task.priority] || "badge-info"}`}
                      >
                        {task.priority}
                      </span>
                    </td>
                    <td>
                      {task.assignedTo ? (
                        `${task.assignedTo.firstName} ${task.assignedTo.lastName}`
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td
                      className="text-muted-foreground max-w-xs truncate"
                      title={task.notes}
                    >
                      {task.notes || "—"}
                    </td>

                    <td>
                      {canUpdate && (
                        <div className="hk-td-actions">
                          <select
                            className="luxury-input hk-status-select"
                            aria-label={`Update status for room ${task.roomId?.roomNumber}`}
                            value={task.status}
                            onChange={(e) =>
                              updateStatus(task.housekeepingId, e.target.value)
                            }
                          >
                            <option value="DIRTY">DIRTY</option>
                            <option value="ASSIGNED">ASSIGNED</option>
                            <option value="IN_PROGRESS">IN_PROGRESS</option>
                            <option value="CLEAN">CLEAN</option>
                            <option value="INSPECTED">INSPECTED</option>
                          </select>

                          <button
                            aria-label={`Deactivate task for room ${task.roomId?.roomNumber}`}
                            onClick={() => deactivateTask(task.housekeepingId)}
                            className="hk-icon-btn hk-icon-btn-danger"
                            title="Deactivate"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Housekeeping;
