import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import api from "@/api/axios";
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
  roomId: string;
  status: string;
}

interface GuestProfile {
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
  const { formatCurrency } = useSystemSettings();
  const { user } = useAuth();
  const { canAccess, canCreate, canUpdate } = useModulePermissions("CRM");

  if (user && !canAccess) {
    navigate("/unauthorized");
  }

  const canManageGuests = canCreate || canUpdate;

  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<GuestProfile | null>(null);

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

  const viewProfile = async (guestId: string) => {
    const res = await api.get<{
      data: {
        totalSpent: number;
        loyaltyPoints: number;
        guest: {
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
                {canUpdate && <th className="crm-th-actions">Actions</th>}
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

                    <td>
                      {canUpdate && (
                        <td>
                          <div className="crm-td-actions">
                            <button
                              aria-label={`Toggle VIP status`}
                              onClick={() => toggleVIP(guest.guestId)}
                              className={`crm-icon-btn crm-icon-btn-star ${guest.vipStatus ? "active" : ""}`}
                              title="Toggle VIP"
                            >
                              <Star
                                size={15}
                                strokeWidth={guest.vipStatus ? 3 : 2}
                              />
                            </button>

                            <button
                              aria-label={`Toggle Blacklist`}
                              onClick={() => toggleBlacklist(guest.guestId)}
                              className={`crm-icon-btn crm-icon-btn-ban ${guest.blacklisted ? "active" : ""}`}
                              title="Toggle Blacklist"
                            >
                              <Ban size={15} />
                            </button>

                            <button
                              aria-label={`View full dossier`}
                              onClick={() => viewProfile(guest.guestId)}
                              className="crm-icon-btn crm-icon-btn-view"
                              title="View Profile"
                            >
                              <Eye size={15} />
                            </button>
                          </div>
                        </td>
                      )}
                    </td>
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
                className="page-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                Previous
              </button>
              <button
                className="page-btn"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
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
            `${guest?.firstName?.[0] ?? ""}${guest?.lastName?.[0] ?? ""}`.toUpperCase() ||
            "G";
          const fullName =
            [guest?.firstName, guest?.lastName].filter(Boolean).join(" ") ||
            "Guest";
          const statusKey = (b: GuestBooking) =>
            b.status.toLowerCase().replace(/\s+/g, "_");
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
                        {guest?.email && <span>{guest.email}</span>}
                        {guest?.phone && <span>{guest.phone}</span>}
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
                                href={`${import.meta.env.VITE_API_URL}/uploads/guest-identities/${doc}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="crm-doc-btn crm-doc-btn-view"
                              >
                                View
                              </a>
                              <a
                                href={`${import.meta.env.VITE_API_URL}/uploads/guest-identities/${doc}`}
                                download
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
                                Room: {booking.roomId}
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
