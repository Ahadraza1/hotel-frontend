import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import api from "@/api/axios";
import { useConfirm } from "@/components/confirm/ConfirmProvider";
import PermissionNotice from "@/components/auth/PermissionNotice";
import {
  Star,
  Ban,
  Eye,
  Plus,
  Search,
  Users,
  ShieldAlert,
  AwardIcon,
  MoreHorizontal,
  X,
  SlidersHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";

interface Guest {
  guestId: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;

  loyaltyPoints: number;
  vipStatus: boolean;
  blacklisted: boolean;

  totalStays?: number;
  totalGuests?: number;
  totalSpent?: number;
  currentStatus?: string;
  documents?: string[];
}

interface GuestBooking {
  bookingId: string;
  roomId?: string | { roomId?: string; roomNumber?: string } | null;
  status: string;
}

interface GuestProfile {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  totalSpent: number;
  loyaltyPoints: number;
  totalStays?: number;
  totalGuests?: number;
  currentStatus?: string;
  documents?: string[];
  bookings: GuestBooking[];
}

const CRM = () => {
  const { branchId } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { formatCurrency } = useSystemSettings();
  const { user } = useAuth();
  const { canAccess, canView, canCreate, canUpdate, canDelete } =
    useModulePermissions("CRM");
  if (user && !canAccess) {
    navigate("/unauthorized");
  }

  const shouldHideContent = !!user && canAccess && !canView;

  const canManageGuests = canCreate || canUpdate;
  const canShowActions = canManageGuests || canDelete;

  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<GuestProfile | null>(null);
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  const uploadsBaseUrl = useMemo(() => {
    const configuredBaseUrl =
      import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "";

    if (!configuredBaseUrl) {
      return "";
    }

    try {
      return new URL(configuredBaseUrl).origin;
    } catch {
      return configuredBaseUrl.replace(/\/api\/?$/, "").replace(/\/$/, "");
    }
  }, []);

  const getGuestDocumentUrl = useCallback(
    (documentName: string) => {
      const normalizedPath = decodeURIComponent(String(documentName || "").trim())
        .replace(/^https?:\/\/[^/]+/i, "")
        .replace(/^\/+/, "")
        .replace(/^uploads\/+/i, "")
        .replace(/\\/g, "/");

      return `${uploadsBaseUrl || ""}/uploads/${normalizedPath}`;
    },
    [uploadsBaseUrl],
  );

  const fetchGuests = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<{ data: Guest[] }>("/crm/guests", {
        params: { branchId },
      });
      setGuests(res.data.data || []);
    } catch {
      console.error("Failed to load guests");
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    fetchGuests();
  }, [fetchGuests]);

  const toggleVIP = async (guestId: string) => {
    await api.patch(`/crm/guests/${guestId}/vip`);
    fetchGuests();
  };

  const toggleBlacklist = async (guestId: string) => {
    await api.patch(`/crm/guests/${guestId}/blacklist`);
    fetchGuests();
  };

  const handleDeleteGuest = async (guestId: string, guestName: string) => {
    const confirmed = await confirm({
      title: "Delete Guest",
      message: `Are you sure you want to delete ${guestName}?`,
      successMessage: "Guest deleted successfully.",
      errorMessage: "Failed to delete guest.",
      onConfirm: async () => {
        await api.delete(`/crm/guests/${guestId}`);
      },
    });

    if (confirmed) {
      setOpenActionId(null);
      if (selectedGuestId === guestId) {
        setSelectedGuestId(null);
        setProfileData(null);
      }
      await fetchGuests();
    }
  };

  const viewProfile = async (guestId: string) => {
    const res = await api.get<{
      data: {
        totalSpent: number;
        loyaltyPoints: number;
        guest: {
          firstName?: string;
          lastName?: string;
          email?: string;
          phone?: string;
          totalStays: number;
          totalGuests: number;
          currentStatus: string;
          documents: string[];
        };
        bookings: GuestBooking[];
      };
    }>(`/crm/guests/${guestId}/profile`);

    const payload = res.data.data;

    setProfileData({
      firstName: payload.guest?.firstName,
      lastName: payload.guest?.lastName,
      email: payload.guest?.email,
      phone: payload.guest?.phone,
      totalSpent: payload.totalSpent,
      loyaltyPoints: payload.loyaltyPoints,
      totalStays: payload.guest?.totalStays,
      totalGuests: payload.guest?.totalGuests,
      currentStatus: payload.guest?.currentStatus,
      documents: payload.guest?.documents || [],
      bookings: payload.bookings || [],
    });

    setSelectedGuestId(guestId);
  };

  /* ── Derived Data ── */
  const filteredGuests = useMemo(() => {
    let result = guests;

    if (filterType === "VIP") {
      result = result.filter((g) => g.vipStatus);
    } else if (filterType === "BLACKLISTED") {
      result = result.filter((g) => g.blacklisted);
    }

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter((g) => {
        const full = `${g.firstName || ""} ${g.lastName || ""}`.toLowerCase();
        return (
          full.includes(lowerSearch) ||
          (g.email && g.email.toLowerCase().includes(lowerSearch)) ||
          (g.phone && g.phone.toLowerCase().includes(lowerSearch))
        );
      });
    }

    return result;
  }, [guests, searchTerm, filterType]);

  /* ── Pagination ── */
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType]);

  const totalPages = Math.ceil(filteredGuests.length / itemsPerPage);
  const paginatedGuests = filteredGuests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const totalGuests = guests.length;
  const vipGuests = guests.filter((g) => g.vipStatus).length;
  const blacklistedGuests = guests.filter((g) => g.blacklisted).length;
  const avgLoyalty =
    totalGuests > 0
      ? Math.floor(
          guests.reduce((sum, g) => sum + (g.loyaltyPoints || 0), 0) /
            totalGuests,
        )
      : 0;

  if (shouldHideContent) {
    return (
      <PermissionNotice message="Guest records are hidden because VIEW_GUEST is disabled for your role." />
    );
  }

  if (loading && guests.length === 0) {
    return (
      <div className="crm-root animate-fade-in">
        <div className="flex items-center justify-center p-20 text-muted-foreground gap-3">
          <span className="eb-loading-spinner" /> Loading CRM...
        </div>
      </div>
    );
  }

  return (
    <div className="crm-root animate-fade-in">
      {/* ── Page Header ── */}
      <div className="crm-page-header">
        <div className="crm-title-group">
          <div className="add-branch-header-icon-wrap">
            <Users className="add-branch-header-icon" />
          </div>
          <div>
            <h1 className="page-title">Guest CRM</h1>
            <p className="page-subtitle">
              Manage customer profiles and interactions
            </p>
          </div>
        </div>

        {canManageGuests && (
          <button
            onClick={() => navigate(`/workspace/${branchId}/crm/add`)}
            className="luxury-btn luxury-btn-primary crm-add-btn"
          >
            <Plus size={15} />
            Add Guest
          </button>
        )}
      </div>

      {/* ── KPI Grid ── */}
      <div className="crm-kpi-grid">
        <div className="crm-kpi-card">
          <Users size={16} className="text-muted-foreground mb-1" />
          <span className="crm-kpi-value">{totalGuests}</span>
          <span className="crm-kpi-label">Total Profiles</span>
        </div>

        <div className="crm-kpi-card">
          <Star size={16} className="crm-kpi-gold mb-1" />
          <span className="crm-kpi-value crm-kpi-gold">{vipGuests}</span>
          <span className="crm-kpi-label">VIP Members</span>
        </div>

        <div className="crm-kpi-card">
          <AwardIcon size={16} className="crm-kpi-info mb-1" />
          <span className="crm-kpi-value crm-kpi-info">{avgLoyalty}</span>
          <span className="crm-kpi-label">Avg Loyalty</span>
        </div>

        <div className="crm-kpi-card">
          <ShieldAlert size={16} className="crm-kpi-danger mb-1" />
          <span className="crm-kpi-value crm-kpi-danger">
            {blacklistedGuests}
          </span>
          <span className="crm-kpi-label">Blacklisted</span>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="crm-toolbar">
        <div className="crm-search">
          <Search size={15} className="crm-search-icon" />
          <input
            type="text"
            className="crm-search-input"
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={14} className="text-muted-foreground mr-1" />
          <select
            className="luxury-input !py-1.5 !text-sm"
            title="Filter guests by status"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="ALL">All Guests</option>
            <option value="VIP">VIP Members</option>
            <option value="BLACKLISTED">Blacklisted Guests</option>
          </select>
        </div>
      </div>

      {/* ── Guest Table ── */}
      <div className="luxury-card crm-table-card">
        <div className="crm-table-scroll">
          <table className="luxury-table">
            <thead>
              <tr>
                <th className="col-serial">#</th>
                <th>Guest Details</th>
                <th>Contact Information</th>
                <th>Loyalty Data</th>
                <th>Tags & Flags</th>
                {canShowActions && <th className="crm-th-actions">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {paginatedGuests.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No matching guests found.
                  </td>
                </tr>
              ) : (
                paginatedGuests.map((guest, i) => (
                  <tr key={guest.guestId}>
                    <td className="col-serial">
                      {(currentPage - 1) * itemsPerPage + i + 1}
                    </td>
                    <td className="crm-cell-bold">
                      {guest.firstName} {guest.lastName}
                    </td>
                    <td>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[0.8rem] text-foreground">
                          {guest.email || "—"}
                        </span>
                        <span className="text-[0.75rem] text-muted-foreground">
                          {guest.phone || "—"}
                        </span>
                      </div>
                    </td>
                    <td className="font-mono text-[0.85rem] font-semibold text-foreground">
                      {guest.loyaltyPoints?.toLocaleString() || "0"}{" "}
                      <span className="text-[0.7rem] text-muted-foreground font-sans">
                        pts
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2 items-center">
                        {guest.vipStatus && (
                          <span className="luxury-badge badge-warning crm-vip-badge">
                            VIP Status
                          </span>
                        )}
                        {guest.blacklisted && (
                          <span className="luxury-badge badge-danger">
                            Blacklisted
                          </span>
                        )}
                        {!guest.vipStatus && !guest.blacklisted && (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </div>
                    </td>

                    {canShowActions && (
                      <td>
                        <div className="bk-action-wrapper">
                          <button
                            className="bk-action-trigger"
                            aria-label="Open actions menu"
                            aria-haspopup="true"
                            aria-expanded={openActionId === guest.guestId}
                            onClick={() =>
                              setOpenActionId(
                                openActionId === guest.guestId
                                  ? null
                                  : guest.guestId,
                              )
                            }
                          >
                            <MoreHorizontal size={18} aria-hidden="true" />
                          </button>

                          {openActionId === guest.guestId && (
                            <div className="bk-action-menu">
                              <button
                                className="bk-action-item"
                                onClick={() => {
                                  void viewProfile(guest.guestId);
                                  setOpenActionId(null);
                                }}
                              >
                                <Eye size={15} />
                                View
                              </button>

                              {canUpdate && (
                                <>
                                  <button
                                    className="bk-action-item"
                                    onClick={() => {
                                      void toggleVIP(guest.guestId);
                                      setOpenActionId(null);
                                    }}
                                  >
                                    <Star size={15} />
                                    {guest.vipStatus ? "Remove VIP" : "Mark VIP"}
                                  </button>

                                  <button
                                    className="bk-action-item"
                                    onClick={() => {
                                      void toggleBlacklist(guest.guestId);
                                      setOpenActionId(null);
                                    }}
                                  >
                                    <Ban size={15} />
                                    {guest.blacklisted
                                      ? "Remove Blacklist"
                                      : "Blacklist"}
                                  </button>

                                  <button
                                    className="bk-action-item"
                                    onClick={() => {
                                      navigate(
                                        `/workspace/${branchId}/crm/edit/${guest.guestId}`,
                                      );
                                      setOpenActionId(null);
                                    }}
                                  >
                                    <Pencil size={15} />
                                    Edit
                                  </button>
                                </>
                              )}

                              {canDelete && (
                                <button
                                  className="bk-action-item bk-action-danger"
                                  onClick={() => {
                                    void handleDeleteGuest(
                                      guest.guestId,
                                      `${guest.firstName} ${guest.lastName || ""}`.trim(),
                                    );
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

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="table-footer border-t border-[hsl(var(--border))]">
            <span className="pagination-info">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, filteredGuests.length)} of{" "}
              {filteredGuests.length} entries
            </span>
            <div className="pagination">
              <button
                className="page-btn pagination-nav-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                aria-label="Previous page"
              >
                Previous
              </button>
              <span className="pagination-page-indicator">
                Page {currentPage} of {totalPages}
              </span>
              <button
                className="page-btn pagination-nav-btn"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                aria-label="Next page"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Profile Modal */}
      {selectedGuestId &&
        profileData &&
        (() => {
          const guest = guests.find((g) => g.guestId === selectedGuestId);
          const initials =
            `${profileData.firstName?.[0] ?? guest?.firstName?.[0] ?? ""}${profileData.lastName?.[0] ?? guest?.lastName?.[0] ?? ""}`.toUpperCase() ||
            "G";
          const fullName =
            [
              profileData.firstName ?? guest?.firstName,
              profileData.lastName ?? guest?.lastName,
            ]
              .filter(Boolean)
              .join(" ") ||
            "Guest";
          const email = profileData.email ?? guest?.email;
          const phone = profileData.phone ?? guest?.phone;
          const statusKey = (b: GuestBooking) =>
            b.status.toLowerCase().replace(/\s+/g, "_");
          const roomLabel = (booking: GuestBooking) => {
            if (!booking.roomId) {
              return "N/A";
            }

            if (typeof booking.roomId === "string") {
              return booking.roomId;
            }

            return booking.roomId.roomNumber || booking.roomId.roomId || "N/A";
          };
          return (
            <div
              className="crm-profile-overlay"
              onClick={() => setSelectedGuestId(null)}
            >
              <div
                className="crm-profile-panel"
                onClick={(e) => e.stopPropagation()}
              >
                {/* ── Hero Header ── */}
                <div className="crm-profile-hero">
                  <div className="crm-profile-hero-topbar">
                    <span className="crm-profile-tag">Guest Profile</span>
                    <button
                      onClick={() => setSelectedGuestId(null)}
                      className="crm-profile-close"
                      aria-label="Close profile"
                    >
                      <X size={15} strokeWidth={2} />
                    </button>
                  </div>

                  <div className="crm-profile-identity">
                    <div className="crm-profile-avatar">{initials}</div>
                    <div>
                      <p className="crm-profile-name">{fullName}</p>
                      <p className="crm-profile-contact">
                        {email && <span>{email}</span>}
                        {phone && <span>{phone}</span>}
                      </p>
                    </div>
                  </div>

                  {(guest?.vipStatus || guest?.blacklisted) && (
                    <div className="crm-profile-badges">
                      {guest.vipStatus && (
                        <span className="luxury-badge badge-warning crm-vip-badge">
                          ★ VIP Member
                        </span>
                      )}
                      {guest.blacklisted && (
                        <span className="luxury-badge badge-danger">
                          Blacklisted
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* ── 2×2 Metric Grid ── */}
                <div className="crm-profile-metrics">
                  <div className="crm-profile-metric">
                    <span className="crm-profile-metric-icon">
                      Lifetime Value
                    </span>
                    <span className="crm-profile-metric-val gold">
                      {formatCurrency(profileData.totalSpent ?? 0)}
                    </span>
                  </div>
                  <div className="crm-profile-metric">
                    <span className="crm-profile-metric-icon">
                      Loyalty Points
                    </span>
                    <span className="crm-profile-metric-val">
                      {profileData.loyaltyPoints?.toLocaleString() ?? "0"}
                    </span>
                  </div>
                  <div className="crm-profile-metric">
                    <span className="crm-profile-metric-icon">Total Stays</span>
                    <span className="crm-profile-metric-val">
                      {profileData.totalStays ?? 0}
                    </span>
                  </div>
                  <div className="crm-profile-metric">
                    <span className="crm-profile-metric-icon">
                      Guests Hosted
                    </span>
                    <span className="crm-profile-metric-val">
                      {profileData.totalGuests ?? 0}
                    </span>
                  </div>
                </div>

                {/* ── Scrollable Body ── */}
                <div className="crm-profile-body">
                  {/* Current Status */}
                  <div className="crm-profile-status-row">
                    <span className="crm-profile-status-label">
                      Current Status
                    </span>
                    <span className="crm-profile-status-val">
                      {profileData.currentStatus || "No active booking"}
                    </span>
                  </div>

                  {/* Documents */}
                  <div>
                    <div className="crm-profile-section-head">
                      <div className="crm-profile-section-bar" />
                      <h4 className="crm-profile-section-title">
                        Uploaded Documents
                      </h4>
                    </div>
                    {profileData.documents &&
                    profileData.documents.length > 0 ? (
                      <div className="crm-profile-list">
                        {profileData.documents.map((doc, i) => (
                          <div key={i} className="crm-doc-row">
                            <span className="crm-doc-name">{doc}</span>
                            <div className="crm-doc-actions">
                              <a
                                href={getGuestDocumentUrl(doc)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="crm-doc-btn crm-doc-btn-view"
                              >
                                View
                              </a>
                              <a
                                href={getGuestDocumentUrl(doc)}
                                download={doc}
                                className="crm-doc-btn"
                              >
                                Download
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="crm-profile-empty">
                        No documents uploaded for this guest.
                      </div>
                    )}
                  </div>

                  {/* Reservation History */}
                  <div>
                    <div className="crm-profile-section-head">
                      <div className="crm-profile-section-bar" />
                      <h4 className="crm-profile-section-title">
                        Reservation History
                      </h4>
                    </div>
                    {profileData.bookings && profileData.bookings.length > 0 ? (
                      <div className="crm-profile-list">
                        {profileData.bookings.map((booking) => (
                          <div
                            key={booking.bookingId}
                            className="crm-booking-card"
                          >
                            <div className="crm-booking-left">
                              <span className="crm-booking-id">
                                #{booking.bookingId.slice(-8)}
                              </span>
                              <span className="crm-booking-room">
                                Room: {roomLabel(booking)}
                              </span>
                            </div>
                            <span
                              className={`crm-booking-status ${statusKey(booking)}`}
                            >
                              {booking.status.replace(/_/g, " ")}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="crm-profile-empty">
                        No past reservations found.
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Sticky Footer ── */}
                <div className="crm-profile-footer">
                  <button
                    className="crm-profile-footer-close"
                    onClick={() => setSelectedGuestId(null)}
                  >
                    <X size={13} strokeWidth={2} /> Close Profile
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
};

export default CRM;
