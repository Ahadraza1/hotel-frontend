import React, { useEffect, useState, useMemo } from "react";
import {
  Plus,
  Edit,
  Trash2,
  BedDouble,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/api/axios";
import { useAuth } from "@/contexts/AuthContext";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import { useToast } from "@/components/confirm/ConfirmProvider";

export interface Room {
  _id: string;
  roomId: string;
  roomNumber: string;
  roomType: string;
  pricePerNight: number;
  status: string;
  capacity: number;
  floor: number;
  isActive?: boolean;
  maxOccupancy?: {
    adults?: number;
    children?: number;
  };
  bedType?: string;
  amenities?: string[];
}

const bedTypeLabels: Record<string, string> = {
  King: "King Size",
  Queen: "Queen Size",
  Twin: "Twin Beds",
  Double: "Double Bed",
  Single: "Single Bed",
};

const statusBadgeClass: Record<string, string> = {
  AVAILABLE: "badge-active",
  OCCUPIED: "badge-danger",
  MAINTENANCE: "badge-warning",
  BLOCKED: "badge-info",
};

const kpiConfig = [
  { status: "AVAILABLE", colorClass: "green" },
  { status: "OCCUPIED", colorClass: "gold" },
  { status: "MAINTENANCE", colorClass: "danger" },
  { status: "BLOCKED", colorClass: "muted" },
] as const;

const roomTypes = ["STANDARD", "DELUXE", "SUITE", "PRESIDENTIAL"];
const statusOptions = ["AVAILABLE", "OCCUPIED", "MAINTENANCE", "BLOCKED"];

const Rooms = () => {
  const { branchId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const { formatCurrency } = useSystemSettings();
  const { canAccess, canCreate, canUpdate } = useModulePermissions("ROOMS");

  const navigateGuard = useNavigate();

  if (user && !canAccess) {
    navigate("/unauthorized");
  }

  const canManageRooms = canCreate || canUpdate;

  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  // Derive status counts from rooms (no extra API call)
  const statusCounts = useMemo(() => {
    const map: Record<string, number> = {};
    rooms.forEach((r) => {
      map[r.status] = (map[r.status] || 0) + 1;
    });
    return map;
  }, [rooms]);

  const visibleRooms = useMemo(() => {
    let result = rooms;

    if (showArchived) {
      // 🔥 Show ONLY archived rooms
      result = result.filter((r) => r.isActive === false);
    } else {
      // 🔥 Default → show only active rooms
      result = result.filter((r) => r.isActive !== false);
    }

    if (filterStatus !== "ALL") {
      result = result.filter((r) => r.status === filterStatus);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.roomNumber.toLowerCase().includes(q) ||
          r.roomType.toLowerCase().includes(q),
      );
    }

    return result;
  }, [rooms, showArchived, filterStatus, searchQuery]);

  /* ── Pagination ── */
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, showArchived]);

  const totalPages = Math.ceil(visibleRooms.length / itemsPerPage);
  const paginatedRooms = visibleRooms.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const res = await api.get<{ data: Room[] }>(`/rooms`, {
        params: { branchId, includeArchived: showArchived },
      });
      setRooms(res.data.data || []);
    } catch {
      console.error("Failed to fetch rooms");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (branchId) fetchRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, showArchived]);

  const openEditModal = (room: Room) => {
    navigate(`/workspace/${branchId}/rooms/edit/${room._id}`, {
      state: { room },
    });
  };

  const handleStatusChange = async (roomId: string, status: string) => {
    try {
      await api.patch(`/rooms/${roomId}/status`, { status });
      fetchRooms();
    } catch {
      toast.error("Failed to change status");
    }
  };

  const handleDeactivate = async (roomId: string) => {
    try {
      await api.patch(`/rooms/${roomId}/deactivate`);
      fetchRooms();
      toast.success("Room archived successfully.");
    } catch {
      toast.error("Failed to deactivate room");
    }
  };

  const handleRestore = async (roomId: string) => {
    try {
      await api.patch(`/rooms/${roomId}/restore`);
      fetchRooms();
      toast.success("Room restored successfully.");
    } catch {
      toast.error("Failed to restore room");
    }
  };

  if (loading) {
    return (
      <div className="rm-root animate-fade-in">
        <div className="eb-loading">
          <span className="eb-loading-spinner" />
          <span>Loading rooms…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rm-root animate-fade-in">
      {/* ── Page Header ── */}
      <div className="rm-page-header">
        <div className="rm-title-group">
          <div className="add-branch-header-icon-wrap">
            <BedDouble className="add-branch-header-icon" />
          </div>
          <div>
            <h1 className="page-title">Rooms</h1>
            <p className="page-subtitle">
              Manage room inventory, types, and status
            </p>
          </div>
        </div>

        <div className="rm-header-actions">
          {canManageRooms && (
            <button
              id="add-room-btn"
              onClick={() => navigate(`/workspace/${branchId}/rooms/add`)}
              className="luxury-btn luxury-btn-primary rm-add-btn"
            >
              <Plus size={15} />
              Add Room
            </button>
          )}

          <button
            onClick={() => setShowArchived(!showArchived)}
            className="luxury-btn luxury-btn-outline"
          >
            {showArchived ? "Hide Archived" : "Show Archived"}
          </button>
        </div>
      </div>

      {/* ── Status KPI Cards ── */}
      <div className="rm-kpi-grid">
        {kpiConfig.map(({ status, colorClass }) => (
          <div key={status} className="rm-kpi-card">
            <span className={`rm-kpi-value rm-kpi-${colorClass}`}>
              {statusCounts[status] ?? 0}
            </span>
            <span className="rm-kpi-label">{status}</span>
          </div>
        ))}
      </div>

      {/* ── Rooms Table ── */}
      <div className="luxury-card rm-table-card">
        {/* Toolbar */}
        <div className="rm-toolbar flex items-center justify-between p-4 border-b border-[hsl(var(--border)/0.6)] gap-4 flex-wrap">
          <div className="inv-search-wrap flex-1 max-w-md">
            <Search className="inv-search-icon" />
            <input
              className="inv-search-input"
              placeholder="Search by room number or type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal
              size={14}
              className="text-muted-foreground mr-1"
            />
            <select
              className="luxury-input !py-1.5 !text-sm"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="rm-table-scroll">
          <table className="luxury-table">
            <thead>
              <tr>
                <th className="col-serial">#</th>
                <th>Room #</th>
                <th>Type</th>
                <th>Floor</th>
                <th>Capacity</th>
                <th>Price / Night</th>
                <th>Status</th>
                {canManageRooms && <th className="rm-th-actions">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {paginatedRooms.length === 0 ? (
                <tr>
                  <td colSpan={8} className="gf-table-empty">
                    No rooms found. Click "Add Room" to get started.
                  </td>
                </tr>
              ) : (
                paginatedRooms.map((room, i) => (
                  <tr key={room._id}>
                    <td className="col-serial">
                      {(currentPage - 1) * itemsPerPage + i + 1}
                    </td>
                    <td className="rm-cell-bold">
                      <div>{room.roomNumber}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {(room.amenities || []).join(", ") || "No amenities"}
                      </div>
                    </td>
                    <td>
                      <span className="rm-type-pill">{room.roomType}</span>
                      <div className="text-xs text-muted-foreground mt-1">
                        {bedTypeLabels[room.bedType || ""] || "-"}
                      </div>
                    </td>
                    <td className="user-email">
                      Floor{" "}
                      {room.floor ?? Math.floor(Number(room.roomNumber) / 100)}
                    </td>
                    <td className="user-email">
                      <div>{room.capacity} guests</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Adults: {room.maxOccupancy?.adults ?? 0} | Children: {room.maxOccupancy?.children ?? 0}
                      </div>
                    </td>
                    <td className="rm-cell-bold">
                      {formatCurrency(room.pricePerNight)}
                    </td>
                    <td>
                      {canManageRooms ? (
                        <select
                          value={room.status}
                          aria-label={`Status for room ${room.roomNumber}`}
                          onChange={(e) =>
                            handleStatusChange(room._id, e.target.value)
                          }
                          className="luxury-input rm-status-select"
                        >
                          {statusOptions.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className={`luxury-badge ${statusBadgeClass[room.status] ?? "badge-info"}`}
                        >
                          {room.status}
                        </span>
                      )}
                    </td>
                    {canManageRooms && (
                      <td className="rm-td-actions">
                        <button
                          aria-label={`Edit room ${room.roomNumber}`}
                          onClick={() => openEditModal(room)}
                          className="rm-icon-btn"
                        >
                          <Edit size={14} />
                        </button>
                        {room.isActive === false ? (
                          <button
                            onClick={() => handleRestore(room._id)}
                            className="rm-icon-btn"
                            title="Restore Room"
                          >
                            ♻
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDeactivate(room._id)}
                            className="rm-icon-btn rm-icon-btn-danger"
                            title="Archive Room"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
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
              {Math.min(currentPage * itemsPerPage, visibleRooms.length)} of{" "}
              {visibleRooms.length} entries
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
    </div>
  );
};

export default Rooms;
