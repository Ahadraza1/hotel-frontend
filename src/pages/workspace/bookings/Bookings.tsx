import { useEffect, useState, useMemo } from "react";
import {
  Plus,
  CalendarCheck,
  LogIn,
  LogOut,
  Clock,
  Search,
  SlidersHorizontal,
  BookOpen,
  Pencil,
  Trash2,
  MoreHorizontal,
  X,
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/api/axios";
import { useAuth } from "@/contexts/AuthContext";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import { useConfirm } from "@/components/confirm/ConfirmProvider";

interface Booking {
  _id: string;
  bookingId: string;
  roomId: string;
  guestName: string;
  bookingSource?: string;
  mainGuestIdentity?: string;
  guestsIdentity?: string[];
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  totalAmount: number;
  status: string;
  paymentStatus: string;
}

const statusBadge: Record<string, string> = {
  CONFIRMED: "badge-warning",
  CHECKED_IN: "badge-active",
  CHECKED_OUT: "badge-info",
  CANCELLED: "badge-danger",
};

const paymentBadge: Record<string, string> = {
  PENDING: "badge-warning",
  PARTIAL: "badge-warning",
  PAID: "badge-active",
};

const Bookings = () => {
  const { branchId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { formatCurrency } = useSystemSettings();
  const confirm = useConfirm();
  const { canAccess, canCreate, canUpdate, canDelete } =
    useModulePermissions("BOOKINGS");

  if (user && !canAccess) {
    navigate("/unauthorized");
  }

  const canManageBookings = canCreate || canUpdate;
  const canShowActions = canManageBookings || canDelete;

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCheckIn, setFilterCheckIn] = useState("");
  const [filterCheckOut, setFilterCheckOut] = useState("");
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  /* ── fetch ── */
  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await api.get<{ data: Booking[] }>("/bookings", {
        params: { branchId },
      });
      setBookings(res.data.data || []);
    } catch {
      console.error("Failed to fetch bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!branchId) return;
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  /* ── status update ── */
  const updateStatus = async (bookingId: string, status: string) => {
    await api.patch(`/bookings/${bookingId}/status`, { status });
    fetchBookings();
  };

  const handleDeleteBooking = async (bookingId: string) => {
    const confirmed = await confirm({
      title: "Delete Booking",
      message: "Are you sure you want to delete this booking?",
      successMessage: "Booking deleted successfully.",
      errorMessage: "Failed to delete booking.",
      onConfirm: async () => {
        await api.delete(`/bookings/${bookingId}`);
      },
    });

    if (confirmed) {
      await fetchBookings();
    }
  };

  /* ── KPI derivations ── */
  const kpi = useMemo(() => {
    const today = new Date().toDateString();
    return {
      checkIns: bookings.filter(
        (b) => new Date(b.checkInDate).toDateString() === today,
      ).length,
      checkOuts: bookings.filter(
        (b) => new Date(b.checkOutDate).toDateString() === today,
      ).length,
      confirmed: bookings.filter((b) => b.status === "CONFIRMED").length,
      checkedIn: bookings.filter((b) => b.status === "CHECKED_IN").length,
    };
  }, [bookings]);

  /* ── filtered list ── */
  const filtered = useMemo(() => {
    let result = bookings;

    if (filterCheckIn) {
      const checkInStr = new Date(filterCheckIn).toDateString();
      result = result.filter(
        (b) => new Date(b.checkInDate).toDateString() === checkInStr,
      );
    }

    if (filterCheckOut) {
      const checkOutStr = new Date(filterCheckOut).toDateString();
      result = result.filter(
        (b) => new Date(b.checkOutDate).toDateString() === checkOutStr,
      );
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (b) =>
          b.bookingId.toLowerCase().includes(q) ||
          b.guestName.toLowerCase().includes(q) ||
          b.status.toLowerCase().includes(q),
      );
    }
    return result;
  }, [bookings, search, filterCheckIn, filterCheckOut]);

  /* ── loading state ── */
  if (loading) {
    return (
      <div className="bk-root animate-fade-in">
        <div className="bk-loading">
          <span className="eb-loading-spinner" />
          <span>Loading bookings…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bk-root animate-fade-in">
      {/* ── Page Header ── */}
      <div className="bk-page-header">
        <div className="bk-title-group">
          <div className="add-branch-header-icon-wrap">
            <BookOpen className="add-branch-header-icon" />
          </div>
          <div>
            <h1 className="page-title">Bookings</h1>
            <p className="page-subtitle">
              Manage reservations, check-ins, and check-outs
            </p>
          </div>
        </div>

        {canManageBookings && (
          <button
            id="add-booking-btn"
            onClick={() => navigate(`/workspace/${branchId}/bookings/add`)}
            className="luxury-btn luxury-btn-primary bk-add-btn"
          >
            <Plus size={15} />
            New Booking
          </button>
        )}
      </div>

      {/* ── KPI Cards ── */}
      <div className="bk-kpi-grid">
        <div className="bk-kpi-card">
          <CalendarCheck
            size={16}
            style={{
              color: "hsl(var(--grandeur-gold))",
              marginBottom: "0.25rem",
            }}
          />
          <span className="bk-kpi-value bk-kpi-gold">{kpi.checkIns}</span>
          <span className="bk-kpi-label">Today's Check-Ins</span>
        </div>
        <div className="bk-kpi-card">
          <LogOut
            size={16}
            style={{
              color: "hsl(var(--premium-green))",
              marginBottom: "0.25rem",
            }}
          />
          <span className="bk-kpi-value bk-kpi-green">{kpi.checkOuts}</span>
          <span className="bk-kpi-label">Today's Check-Outs</span>
        </div>
        <div className="bk-kpi-card">
          <Clock
            size={16}
            style={{
              color: "hsl(var(--grandeur-gold))",
              marginBottom: "0.25rem",
            }}
          />
          <span className="bk-kpi-value bk-kpi-gold">{kpi.confirmed}</span>
          <span className="bk-kpi-label">Pending Confirmations</span>
        </div>
        <div className="bk-kpi-card">
          <LogIn
            size={16}
            style={{
              color: "hsl(var(--premium-green))",
              marginBottom: "0.25rem",
            }}
          />
          <span className="bk-kpi-value bk-kpi-green">{kpi.checkedIn}</span>
          <span className="bk-kpi-label">Currently Checked-In</span>
        </div>
      </div>

      {/* ── Table Card ── */}
      <div className="luxury-card bk-table-card">
        {/* Toolbar */}
        <div
          className="bk-toolbar"
          style={{ flexWrap: "wrap", justifyContent: "space-between" }}
        >
          <div className="bk-search-wrap">
            <Search className="bk-search-icon" />
            <input
              id="bk-search"
              className="bk-search-input"
              placeholder="Search bookings…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal
              size={13}
              className="text-muted-foreground mr-1"
            />
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                In:
              </span>
              <input
                type="date"
                className="luxury-input !py-1.5 !text-sm"
                value={filterCheckIn}
                onChange={(e) => setFilterCheckIn(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 ml-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Out:
              </span>
              <input
                type="date"
                className="luxury-input !py-1.5 !text-sm"
                value={filterCheckOut}
                onChange={(e) => setFilterCheckOut(e.target.value)}
              />
            </div>
            {(filterCheckIn || filterCheckOut) && (
              <button
                className="bk-filter-btn ml-1"
                onClick={() => {
                  setFilterCheckIn("");
                  setFilterCheckOut("");
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bk-table-scroll">
          <table className="luxury-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Booking ID</th>
                <th>Guest</th>
                <th>Source</th>
                <th>Check-In</th>
                <th>Check-Out</th>
                <th>Nights</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Amount</th>
                <th>Documents</th>
                {canShowActions && (
                  <th className="bk-th-actions">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={canShowActions ? 12 : 11} className="gf-table-empty">
                    {search
                      ? "No bookings match your search."
                      : 'No bookings found. Click "New Booking" to get started.'}
                  </td>
                </tr>
              ) : (
                filtered.map((b, i) => (
                  <tr key={b._id}>
                    <td className="col-serial">{i + 1}</td>
                    <td className="bk-cell-id">{b.bookingId}</td>
                    <td className="bk-cell-guest">{b.guestName}</td>
                    <td>{b.bookingSource || "Walk-in"}</td>
                    <td className="bk-cell-dates">
                      {new Date(b.checkInDate).toLocaleDateString()}
                    </td>
                    <td className="bk-cell-dates">
                      {new Date(b.checkOutDate).toLocaleDateString()}
                    </td>
                    <td className="user-email">
                      {b.nights} night{b.nights !== 1 ? "s" : ""}
                    </td>
                    <td>
                      <span
                        className={`luxury-badge ${statusBadge[b.status] ?? "badge-info"}`}
                      >
                        {b.status.replace("_", " ")}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`luxury-badge ${paymentBadge[b.paymentStatus] ?? "badge-info"}`}
                      >
                        {b.paymentStatus}
                      </span>
                    </td>
                    <td className="bk-cell-amount">
                      {formatCurrency(b.totalAmount)}
                    </td>

                    <td>
                      {b.mainGuestIdentity ? (
                        <a
                          href={`${import.meta.env.VITE_API_URL}/uploads/guest-identities/${b.mainGuestIdentity}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bk-action-btn"
                        >
                          View ID
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-xs">
                          No ID
                        </span>
                      )}
                    </td>

                    {canShowActions && (
                      <td>
                        <div className="bk-action-wrapper">
                          <button
                            className="bk-action-trigger"
                            aria-label="Open actions menu"
                            aria-haspopup="true"
                            aria-expanded={openActionId === b._id}
                            onClick={() =>
                              setOpenActionId(
                                openActionId === b._id ? null : b._id,
                              )
                            }
                          >
                            <MoreHorizontal size={18} aria-hidden="true" />
                          </button>

                          {openActionId === b._id && (
                            <div className="bk-action-menu">
                              {canUpdate && (
                                <button
                                  className="bk-action-item"
                                  onClick={() => {
                                    navigate(
                                      `/workspace/${branchId}/bookings/edit/${b.bookingId}`,
                                    );
                                    setOpenActionId(null);
                                  }}
                                >
                                  <Pencil size={15} />
                                  Update
                                </button>
                              )}

                              {b.status === "CONFIRMED" && (
                                <>
                                  <button
                                    className="bk-action-item"
                                    onClick={() => {
                                      updateStatus(b.bookingId, "CHECKED_IN");
                                      setOpenActionId(null);
                                    }}
                                  >
                                    <LogIn size={15} />
                                    Check-In
                                  </button>
                                  <button
                                    className="bk-action-item bk-action-danger"
                                    onClick={() => {
                                      updateStatus(b.bookingId, "CANCELLED");
                                      setOpenActionId(null);
                                    }}
                                  >
                                    <X size={15} />
                                    Cancel
                                  </button>
                                </>
                              )}

                              {b.status === "CHECKED_IN" && (
                                <button
                                  className="bk-action-item"
                                  onClick={() => {
                                    updateStatus(b.bookingId, "CHECKED_OUT");
                                    setOpenActionId(null);
                                  }}
                                >
                                  <LogOut size={15} />
                                  Check-Out
                                </button>
                              )}

                              {canDelete && (
                                <button
                                  className="bk-action-item bk-action-danger"
                                  onClick={() => {
                                    handleDeleteBooking(b.bookingId);
                                    setOpenActionId(null);
                                  }}
                                >
                                  <Trash2 size={15} />
                                  Delete
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    )}
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

export default Bookings;
