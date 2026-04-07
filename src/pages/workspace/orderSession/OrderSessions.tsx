import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  Bed,
  Clock3,
  Plus,
  Search,
  SlidersHorizontal,
  ShoppingBag,
  Trash2,
  User,
  Utensils,
  Wallet,
} from "lucide-react";
import api from "@/api/axios";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { useConfirm } from "@/components/confirm/ConfirmProvider";

type SessionStatus = "OPEN" | "BILL_REQUESTED" | "PAID" | "CLOSED";
type SessionType = "DINE_IN" | "ROOM_SERVICE" | "TAKEAWAY";

interface OrderSession {
  sessionId: string;
  type: SessionType;
  tableNo?: string | null;
  roomNo?: string | null;
  guestName?: string;
  status: SessionStatus;
  runningTotal: number;
  orderCount: number;
  createdAt: string;
}

const typeLabel: Record<SessionType, string> = {
  DINE_IN: "Dine-In",
  ROOM_SERVICE: "Room Service",
  TAKEAWAY: "Takeaway",
};

const statusConfig: Record<
  SessionStatus,
  { label: string; className: string }
> = {
  OPEN: { label: "Open", className: "badge-active" },
  BILL_REQUESTED: { label: "Bill Requested", className: "badge-warning" },
  PAID: { label: "Paid", className: "badge-paid" },
  CLOSED: { label: "Closed", className: "badge-info" },
};

const typeAccent: Record<SessionType, string> = {
  DINE_IN:
    "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300",
  ROOM_SERVICE:
    "bg-sky-500/10 text-sky-700 border-sky-500/20 dark:text-sky-300",
  TAKEAWAY:
    "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300",
};

const OrderSessions = () => {
  const { branchId } = useParams();
  const navigate = useNavigate();
  const { formatCurrency } = useSystemSettings();
  const confirm = useConfirm();

  const [sessions, setSessions] = useState<OrderSession[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [deletingSessionIds, setDeletingSessionIds] = useState<string[]>([]);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true);
        const response = await api.get<{ data: OrderSession[] }>("/pos/sessions");
        setSessions(response.data.data || []);
      } catch (error) {
        console.error("Failed to fetch sessions", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchSessions();
  }, []);

  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      const query = search.trim().toLowerCase();
      const locationLabel =
        session.type === "DINE_IN"
          ? `table ${session.tableNo || ""}`
          : session.type === "ROOM_SERVICE"
            ? `room ${session.roomNo || ""}`
            : `takeaway ${session.guestName || ""}`;

      const matchesSearch =
        !query ||
        session.sessionId.toLowerCase().includes(query) ||
        locationLabel.toLowerCase().includes(query) ||
        String(session.guestName || "").toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "ALL" || session.status === statusFilter;
      const matchesType = typeFilter === "ALL" || session.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [search, sessions, statusFilter, typeFilter]);

  const stats = useMemo(() => {
    const openCount = sessions.filter((session) => session.status === "OPEN").length;
    const billRequestedCount = sessions.filter(
      (session) => session.status === "BILL_REQUESTED",
    ).length;
    const takeawayCount = sessions.filter(
      (session) => session.type === "TAKEAWAY",
    ).length;
    const totalRevenue = sessions.reduce(
      (sum, session) => sum + Number(session.runningTotal || 0),
      0,
    );

    return {
      totalSessions: sessions.length,
      openCount,
      billRequestedCount,
      takeawayCount,
      totalRevenue,
    };
  }, [sessions]);

  const getTypeIcon = (type: SessionType) => {
    switch (type) {
      case "DINE_IN":
        return <Utensils size={18} />;
      case "ROOM_SERVICE":
        return <Bed size={18} />;
      case "TAKEAWAY":
        return <ShoppingBag size={18} />;
      default:
        return <Utensils size={18} />;
    }
  };

  const getSessionTitle = (session: OrderSession) => {
    if (session.type === "DINE_IN") {
      return `Table ${session.tableNo || "—"}`;
    }

    if (session.type === "ROOM_SERVICE") {
      return `Room ${session.roomNo || "—"}`;
    }

    return session.guestName?.trim() || "Takeaway Order";
  };

  const handleDeleteSession = async (session: OrderSession) => {
    setDeletingSessionIds((prev) => [...prev, session.sessionId]);

    const confirmed = await confirm({
      title: "Delete Session",
      message: `Are you sure you want to delete ${getSessionTitle(session)}?`,
      confirmLabel: "Delete",
      processingLabel: "Deleting...",
      successMessage: "Session deleted successfully",
      errorMessage: "Failed to delete session",
      onConfirm: async () => {
        await api.delete(`/pos/sessions/${session.sessionId}`);
        setSessions((prev) =>
          prev.filter((entry) => entry.sessionId !== session.sessionId),
        );
      },
    });

    if (!confirmed) {
      setDeletingSessionIds((prev) =>
        prev.filter((id) => id !== session.sessionId),
      );
      return;
    }

    setDeletingSessionIds((prev) =>
      prev.filter((id) => id !== session.sessionId),
    );
  };

  return (
    <div className="bk-root animate-fade-in">
      <div className="bk-page-header">
        <div className="bk-title-group">
          <div className="add-branch-header-icon-wrap">
            <Utensils className="add-branch-header-icon" />
          </div>
          <div>
            <h1 className="page-title">Order Sessions</h1>
            <p className="page-subtitle">
              Organize dine-in, room service, and takeaway orders from one clean
              session board.
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate(`/workspace/${branchId}/order-sessions/new`)}
          className="luxury-btn luxury-btn-primary bk-add-btn"
        >
          <Plus size={15} />
          New Session
        </button>
      </div>

      <div className="bk-kpi-grid">
        <div className="bk-kpi-card">
          <Utensils
            size={16}
            style={{
              color: "hsl(var(--grandeur-gold))",
              marginBottom: "0.25rem",
            }}
          />
          <span className="bk-kpi-value bk-kpi-gold">{stats.totalSessions}</span>
          <span className="bk-kpi-label">Total Sessions</span>
        </div>
        <div className="bk-kpi-card">
          <Clock3
            size={16}
            style={{
              color: "hsl(var(--premium-green))",
              marginBottom: "0.25rem",
            }}
          />
          <span className="bk-kpi-value bk-kpi-green">{stats.openCount}</span>
          <span className="bk-kpi-label">Open Now</span>
        </div>
        <div className="bk-kpi-card">
          <ShoppingBag
            size={16}
            style={{
              color: "hsl(var(--grandeur-gold))",
              marginBottom: "0.25rem",
            }}
          />
          <span className="bk-kpi-value bk-kpi-gold">
            {stats.billRequestedCount}
          </span>
          <span className="bk-kpi-label">Billing Queue</span>
        </div>
        <div className="bk-kpi-card">
          <Wallet
            size={16}
            style={{
              color: "hsl(var(--premium-green))",
              marginBottom: "0.25rem",
            }}
          />
          <span className="bk-kpi-value bk-kpi-green">
            {formatCurrency(stats.totalRevenue)}
          </span>
          <span className="bk-kpi-label">Running Total</span>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="h-[120px] rounded-[24px] border border-border/40 bg-muted/20 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="luxury-card bk-table-card border-[hsl(var(--grandeur-gold)/0.18)] shadow-[0_18px_45px_rgba(32,24,12,0.06)]">
          <div
            className="bk-toolbar"
            style={{ flexWrap: "wrap", justifyContent: "space-between" }}
          >
            <div className="bk-search-wrap">
              <Search className="bk-search-icon" size={16} />
              <input
                className="bk-search-input"
                placeholder="Search by session ID, table, room or guest name..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <SlidersHorizontal
                  size={14}
                  className="text-[hsl(var(--grandeur-gold))]"
                />
                <select
                  className="luxury-input !py-1.5 !text-xs !px-3 !h-9 min-w-[120px]"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  aria-label="Filter sessions by status"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="OPEN">Open</option>
                  <option value="BILL_REQUESTED">Billing</option>
                  <option value="PAID">Paid</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <ShoppingBag
                  size={14}
                  className="text-[hsl(var(--grandeur-gold))]"
                />
                <select
                  className="luxury-input !py-1.5 !text-xs !px-3 !h-9 min-w-[120px]"
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value)}
                  aria-label="Filter sessions by type"
                >
                  <option value="ALL">All Types</option>
                  <option value="DINE_IN">Dine-In</option>
                  <option value="ROOM_SERVICE">Room Service</option>
                  <option value="TAKEAWAY">Takeaway</option>
                </select>
              </div>
            </div>
          </div>

          {filteredSessions.length === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center px-6 py-12 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted/30 text-muted-foreground">
                <Search size={30} />
              </div>
              <h3 className="mt-6 text-2xl font-semibold text-foreground">
                No sessions found
              </h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                Try changing your filters or create a new order session to get
                started.
              </p>
            </div>
          ) : (
            <div className="bk-table-scroll">
              <table className="luxury-table w-full">
                <thead>
                  <tr>
                    <th className="w-16">#</th>
                    <th>Order NO</th>
                    <th>Type</th>
                    <th>Table / Room</th>
                    <th>Items</th>
                    <th className="text-right">Total</th>
                    <th>Status</th>
                    <th>Time</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSessions.map((session, index) => {
                    const status = statusConfig[session.status];
                    const location =
                      session.type === "DINE_IN"
                        ? session.tableNo || "-"
                        : session.type === "ROOM_SERVICE"
                          ? session.roomNo || "-"
                          : "Takeaway";

                    return (
                      <tr
                        key={session.sessionId}
                        className="group hover:bg-[hsl(var(--grandeur-gold)/0.02)] transition-colors"
                      >
                        <td className="font-medium text-muted-foreground/60">
                          {String(index + 1).padStart(2, "0")}
                        </td>
                        <td className="font-mono text-xs font-semibold">
                          #{session.sessionId.slice(-6).toUpperCase()}
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="text-[hsl(var(--grandeur-gold))]">
                              {getTypeIcon(session.type)}
                            </div>
                            <span className="text-sm font-medium">
                              {typeLabel[session.type]}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="text-sm font-bold text-foreground">
                            {location}
                          </span>
                        </td>
                        <td>
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/50 text-[11px] font-bold text-muted-foreground">
                            {session.orderCount}{" "}
                            {session.orderCount === 1 ? "item" : "items"}
                          </div>
                        </td>
                        <td className="text-right">
                          <span className="text-sm font-black text-[hsl(var(--grandeur-gold))]">
                            {formatCurrency(session.runningTotal)}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`luxury-badge ${status.className} rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider`}
                          >
                            {status.label}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground/70">
                            <Clock3 size={13} />
                            {new Date(session.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <button
                              type="button"
                              onClick={() => void handleDeleteSession(session)}
                              disabled={deletingSessionIds.includes(session.sessionId)}
                              className="ur-user-action-btn"
                              aria-label={`Delete session ${session.sessionId}`}
                            >
                              <Trash2 size={16} />
                            </button>
                            <button
                              onClick={() =>
                                navigate(
                                  `/workspace/${branchId}/order-sessions/${session.sessionId}`,
                                )
                              }
                              className="luxury-btn luxury-btn-primary !py-1.5 !px-4 text-xs font-bold transition-all hover:scale-105"
                            >
                              Open
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OrderSessions;
