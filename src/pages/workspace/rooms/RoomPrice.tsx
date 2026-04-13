import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays, IndianRupee, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { format, addDays } from "date-fns";
import { useParams } from "react-router-dom";
import api from "@/api/axios";
import { useToast } from "@/components/confirm/ConfirmProvider";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";

interface RoomType {
  _id: string;
  name: string;
  description?: string;
}

interface RoomPriceRecord {
  _id: string;
  roomTypeId: string;
  date: string;
  price: number;
}

const todayKey = format(new Date(), "yyyy-MM-dd");

const RoomPrice = () => {
  const { branchId } = useParams();
  const toast = useToast();
  const { formatCurrency } = useSystemSettings();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rangeDays, setRangeDays] = useState<7 | 14>(7);
  const [startDate, setStartDate] = useState(todayKey);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [basePrices, setBasePrices] = useState<Record<string, number>>({});
  const [draftPrices, setDraftPrices] = useState<Record<string, string>>({});
  const [newRoomTypeName, setNewRoomTypeName] = useState("");
  const [newRoomTypeDescription, setNewRoomTypeDescription] = useState("");
  const [editingRoomTypeId, setEditingRoomTypeId] = useState("");
  const [bulkRoomTypeId, setBulkRoomTypeId] = useState("");
  const [bulkDate, setBulkDate] = useState("");
  const [bulkPrice, setBulkPrice] = useState("");

  const dateKeys = useMemo(
    () =>
      Array.from({ length: rangeDays }, (_, index) =>
        format(addDays(new Date(`${startDate}T00:00:00`), index), "yyyy-MM-dd"),
      ),
    [rangeDays, startDate],
  );

  const endDate = dateKeys[dateKeys.length - 1];

  const loadData = async () => {
    if (!branchId || !endDate) return;

    try {
      setLoading(true);

      const [roomTypesRes, pricesRes] = await Promise.all([
        api.get<{ data: RoomType[] }>("/room-types"),
        api.get<{ data: RoomPriceRecord[] }>("/room-prices", {
          params: { startDate, endDate },
        }),
      ]);

      const roomTypeList = roomTypesRes.data.data || [];
      const prices = (pricesRes.data.data || []).reduce<Record<string, number>>(
        (acc, item) => {
          acc[`${item.roomTypeId}::${item.date}`] = Number(item.price || 0);
          return acc;
        },
        {},
      );

      setRoomTypes(roomTypeList);
      setBasePrices(prices);
      setDraftPrices({});
      setBulkRoomTypeId((current) =>
        current && roomTypeList.some((item) => item._id === current)
          ? current
          : roomTypeList[0]?._id || "",
      );
      setBulkDate((current) =>
        current && dateKeys.includes(current) ? current : dateKeys[0] || "",
      );
    } catch (error) {
      console.error("Failed to load room pricing", error);
      toast.error("Failed to load room pricing.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [branchId, startDate, endDate]);

  const getCellKey = (roomTypeId: string, date: string) => `${roomTypeId}::${date}`;

  const getCellValue = (roomTypeId: string, date: string) => {
    const key = getCellKey(roomTypeId, date);
    if (draftPrices[key] !== undefined) {
      return draftPrices[key];
    }
    return basePrices[key] !== undefined ? String(basePrices[key]) : "";
  };

  const dirtyUpdates = useMemo(
    () =>
      Object.entries(draftPrices)
        .map(([key, value]) => {
          const [roomTypeId, date] = key.split("::");
          const normalizedValue = value.trim();
          const price = Number(normalizedValue);

          if (!roomTypeId || !date || !normalizedValue || Number.isNaN(price) || price < 0) {
            return null;
          }

          if (basePrices[key] !== undefined && Number(basePrices[key]) === price) {
            return null;
          }

          return { roomTypeId, date, price };
        })
        .filter((item): item is { roomTypeId: string; date: string; price: number } => Boolean(item)),
    [basePrices, draftPrices],
  );

  const handleCellChange = (roomTypeId: string, date: string, rawValue: string) => {
    if (rawValue && !/^\d*\.?\d*$/.test(rawValue)) {
      return;
    }

    const key = getCellKey(roomTypeId, date);
    setDraftPrices((prev) => ({ ...prev, [key]: rawValue }));
  };

  const applyBulkPrice = (mode: "row" | "column") => {
    const normalizedPrice = bulkPrice.trim();

    if (!normalizedPrice || Number.isNaN(Number(normalizedPrice)) || Number(normalizedPrice) < 0) {
      toast.warning("Enter a valid bulk price.");
      return;
    }

    const updates: Record<string, string> = {};

    if (mode === "row") {
      if (!bulkRoomTypeId) {
        toast.warning("Select a room type to apply the bulk price.");
        return;
      }

      dateKeys.forEach((date) => {
        updates[getCellKey(bulkRoomTypeId, date)] = normalizedPrice;
      });
    }

    if (mode === "column") {
      if (!bulkDate) {
        toast.warning("Select a date to apply the bulk price.");
        return;
      }

      roomTypes.forEach((roomType) => {
        updates[getCellKey(roomType._id, bulkDate)] = normalizedPrice;
      });
    }

    setDraftPrices((prev) => ({ ...prev, ...updates }));
  };

  const handleSavePrices = async () => {
    if (!dirtyUpdates.length) {
      toast.warning("No pricing changes to save.");
      return;
    }

    try {
      setSaving(true);
      await api.post("/room-prices/bulk", { updates: dirtyUpdates });
      toast.success("Room prices published successfully.");
      await loadData();
    } catch (error) {
      console.error("Failed to save room prices", error);
      toast.error("Failed to save room prices.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRoomType = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!newRoomTypeName.trim()) {
      toast.warning("Room type name is required.");
      return;
    }

    try {
      if (editingRoomTypeId) {
        await api.put(`/room-types/${editingRoomTypeId}`, {
          name: newRoomTypeName.trim(),
          description: newRoomTypeDescription.trim(),
        });
        toast.success("Room type updated successfully.");
      } else {
        await api.post("/room-types", {
          name: newRoomTypeName.trim(),
          description: newRoomTypeDescription.trim(),
        });
        toast.success("Room type created successfully.");
      }

      setNewRoomTypeName("");
      setNewRoomTypeDescription("");
      setEditingRoomTypeId("");
      await loadData();
    } catch (error) {
      console.error("Failed to create room type", error);
      toast.error("Failed to save room type.");
    }
  };

  const handleEditRoomType = (roomType: RoomType) => {
    setEditingRoomTypeId(roomType._id);
    setNewRoomTypeName(roomType.name);
    setNewRoomTypeDescription(roomType.description || "");
  };

  const handleCancelEdit = () => {
    setEditingRoomTypeId("");
    setNewRoomTypeName("");
    setNewRoomTypeDescription("");
  };

  const handleDeleteRoomType = async (roomType: RoomType) => {
    const confirmed = window.confirm(
      `Delete room type "${roomType.name}"? This will remove its saved pricing as well.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await api.delete(`/room-types/${roomType._id}`);

      if (editingRoomTypeId === roomType._id) {
        handleCancelEdit();
      }

      toast.success("Room type deleted successfully.");
      await loadData();
    } catch (error) {
      console.error("Failed to delete room type", error);
      toast.error(
        (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
          "Failed to delete room type.",
      );
    }
  };

  return (
    <div className="rp-root animate-fade-in">
      <div className="rp-page-header">
        <div className="rp-title-wrap">
          <div className="add-branch-header-icon-wrap">
            <CalendarDays className="add-branch-header-icon" />
          </div>
          <div>
            <h1 className="page-title">Room Price Management</h1>
            <p className="page-subtitle">
              Control day-wise rates by room type for branch workspace bookings.
            </p>
          </div>
        </div>

        <div className="rp-toolbar-card">
          <div className="rp-header-actions">
            <label className="rp-date-field">
              <span>Start date</span>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="luxury-input"
              />
            </label>

            <div className="rp-range-control">
              <span className="rp-control-label">Range</span>
              <div className="rp-range-toggle">
                <button
                  type="button"
                  className={`luxury-btn ${rangeDays === 7 ? "luxury-btn-primary" : "luxury-btn-outline"}`}
                  onClick={() => setRangeDays(7)}
                >
                  7 Days
                </button>
                <button
                  type="button"
                  className={`luxury-btn ${rangeDays === 14 ? "luxury-btn-primary" : "luxury-btn-outline"}`}
                  onClick={() => setRangeDays(14)}
                >
                  14 Days
                </button>
              </div>
            </div>
          </div>

          <div className="rp-toolbar-meta">
            <div className="rp-meta-block">
              <span className="rp-meta-label">Room types</span>
              <strong>{roomTypes.length}</strong>
            </div>
            <div className="rp-meta-block">
              <span className="rp-meta-label">Pending changes</span>
              <strong>{dirtyUpdates.length}</strong>
            </div>
            <button
              type="button"
              onClick={handleSavePrices}
              disabled={saving || !dirtyUpdates.length}
              className="luxury-btn luxury-btn-primary rp-save-btn"
            >
              <Save size={15} />
              {saving ? "Saving..." : "Save Prices"}
            </button>
          </div>
        </div>
      </div>

      <div className="rp-panel-grid">
        <form className="luxury-card rp-card" onSubmit={handleCreateRoomType}>
          <div className="rp-card-header">
            <h2 className="rp-card-title">Room Types</h2>
            <p className="rp-card-subtitle">Create once and reuse in room setup and pricing.</p>
          </div>

          <div className="rp-form-grid">
            <div className="rp-field">
              <label className="rp-label" htmlFor="rp-room-type-name">
                Room Type Name
              </label>
              <input
                id="rp-room-type-name"
                className="luxury-input"
                value={newRoomTypeName}
                onChange={(event) => setNewRoomTypeName(event.target.value)}
                placeholder="e.g. Deluxe"
              />
            </div>

            <div className="rp-field">
              <label className="rp-label" htmlFor="rp-room-type-description">
                Description
              </label>
              <input
                id="rp-room-type-description"
                className="luxury-input"
                value={newRoomTypeDescription}
                onChange={(event) => setNewRoomTypeDescription(event.target.value)}
                placeholder="Optional description"
              />
            </div>

            <div className="rp-type-form-actions">
              <button type="submit" className="luxury-btn luxury-btn-outline rp-add-type-btn">
                <Plus size={15} />
                {editingRoomTypeId ? "Update Room Type" : "Add Room Type"}
              </button>

              {editingRoomTypeId ? (
                <button
                  type="button"
                  className="luxury-btn luxury-btn-outline rp-cancel-type-btn"
                  onClick={handleCancelEdit}
                >
                  <X size={15} />
                  Cancel
                </button>
              ) : null}
            </div>
          </div>

          <div className="rp-type-chips">
            {roomTypes.length ? (
              roomTypes.map((roomType) => (
                <div key={roomType._id} className="rp-type-chip">
                  <div className="rp-type-chip-main">
                    <span>{roomType.name}</span>
                    <div className="rp-type-chip-actions">
                      <button
                        type="button"
                        className="rp-chip-icon-btn"
                        onClick={() => handleEditRoomType(roomType)}
                        aria-label={`Edit ${roomType.name}`}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        className="rp-chip-icon-btn rp-chip-icon-btn-danger"
                        onClick={() => handleDeleteRoomType(roomType)}
                        aria-label={`Delete ${roomType.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {roomType.description ? <small>{roomType.description}</small> : null}
                </div>
              ))
            ) : (
              <div className="rp-empty-state">Create a room type to start assigning rates.</div>
            )}
          </div>
        </form>

        <div className="luxury-card rp-card">
          <div className="rp-card-header">
            <h2 className="rp-card-title">Bulk Update</h2>
            <p className="rp-card-subtitle">Apply the same price across a room type row or a date column.</p>
          </div>

          <div className="rp-bulk-grid">
            <div className="rp-field">
              <label className="rp-label" htmlFor="rp-bulk-type">
                Room Type
              </label>
              <select
                id="rp-bulk-type"
                className="luxury-input"
                value={bulkRoomTypeId}
                onChange={(event) => setBulkRoomTypeId(event.target.value)}
              >
                <option value="">Select room type</option>
                {roomTypes.map((roomType) => (
                  <option key={roomType._id} value={roomType._id}>
                    {roomType.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="rp-field">
              <label className="rp-label" htmlFor="rp-bulk-date">
                Date
              </label>
              <select
                id="rp-bulk-date"
                className="luxury-input"
                value={bulkDate}
                onChange={(event) => setBulkDate(event.target.value)}
              >
                <option value="">Select date</option>
                {dateKeys.map((date) => (
                  <option key={date} value={date}>
                    {format(new Date(`${date}T00:00:00`), "dd MMM")}
                  </option>
                ))}
              </select>
            </div>

            <div className="rp-field">
              <label className="rp-label" htmlFor="rp-bulk-price">
                Price
              </label>
              <div className="rp-price-input-wrap">
                <IndianRupee size={15} />
                <input
                  id="rp-bulk-price"
                  className="luxury-input"
                  value={bulkPrice}
                  onChange={(event) => setBulkPrice(event.target.value)}
                  placeholder="Enter amount"
                />
              </div>
            </div>

            <div className="rp-bulk-actions">
              <button type="button" className="luxury-btn luxury-btn-outline" onClick={() => applyBulkPrice("row")}>
                Apply to Row
              </button>
              <button type="button" className="luxury-btn luxury-btn-outline" onClick={() => applyBulkPrice("column")}>
                Apply to Date
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="luxury-card rp-grid-card">
        {loading ? (
          <div className="eb-loading">
            <span className="eb-loading-spinner" />
            <span>Loading room pricing...</span>
          </div>
        ) : !roomTypes.length ? (
          <div className="rp-empty-state">No room types available for this branch yet.</div>
        ) : (
          <div className="rp-table-wrap">
            <table className="rp-table">
              <thead>
                <tr>
                  <th className="rp-sticky-left">Room Type</th>
                  {dateKeys.map((date) => (
                    <th key={date}>
                      <div className="rp-date-heading">{format(new Date(`${date}T00:00:00`), "dd MMM")}</div>
                      <small>{format(new Date(`${date}T00:00:00`), "EEE")}</small>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {roomTypes.map((roomType) => (
                  <tr key={roomType._id}>
                    <td className="rp-sticky-left">
                      <div className="rp-room-type-cell">
                        <strong>{roomType.name}</strong>
                        <small>{roomType.description || "Standard branch rate group"}</small>
                      </div>
                    </td>
                    {dateKeys.map((date) => {
                      const key = getCellKey(roomType._id, date);
                      const value = getCellValue(roomType._id, date);
                      const hasDraft = draftPrices[key] !== undefined;
                      return (
                        <td key={date}>
                          <div className={`rp-cell-wrap ${hasDraft ? "rp-cell-dirty" : ""}`}>
                            <span className="rp-currency">₹</span>
                            <input
                              inputMode="decimal"
                              value={value}
                              onChange={(event) => handleCellChange(roomType._id, date, event.target.value)}
                              className="rp-price-cell"
                              aria-label={`${roomType.name} price on ${date}`}
                            />
                          </div>
                          {basePrices[key] !== undefined ? (
                            <small className="rp-cell-hint">{formatCurrency(basePrices[key])}</small>
                          ) : (
                            <small className="rp-cell-hint">No rate set</small>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomPrice;
