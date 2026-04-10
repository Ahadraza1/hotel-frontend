import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Sparkles, Save } from "lucide-react";
import api from "@/api/axios";
import { useToast } from "@/components/confirm/ConfirmProvider";

interface Room {
  _id: string;
  roomNumber: string;
  roomType: string;
  status: string;
}

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  department?: string;
  designation?: string;
  role?: string;
}

const CreateHousekeepingTask = () => {
  const { branchId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [saving, setSaving] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [housekeepers, setHousekeepers] = useState<User[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    roomId: "",
    assignedTo: "",
    priority: "MEDIUM",
    notes: "",
  });

  const validateRequired = (value: string) =>
    value.trim() ? "" : "This field is required";

  /* ── Load rooms and housekeepers ── */
  useEffect(() => {
    if (!branchId) return;
    const load = async () => {
      try {
        const [roomsRes, staffRes] = await Promise.all([
          api.get<{ data: Room[] }>("/rooms", { params: { branchId } }),
          api.get<{ data: any[] }>("/hr/staff", { params: { branchId } }),
        ]);
        setRooms(roomsRes.data.data || []);
        setHousekeepers(
          (staffRes.data.data || []).filter((s: any) => {
            const department = String(s.department || "").trim().toUpperCase();
            const designation = String(s.designation || "").trim().toUpperCase();
            const role = String(s.role || "").trim().toUpperCase();

            return (
              department === "HOUSEKEEPING" ||
              designation === "HOUSEKEEPING" ||
              role === "HOUSEKEEPING"
            );
          }),
        );
      } catch {
        console.error("Failed to load data");
      }
    };
    load();
  }, [branchId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    setFieldErrors((prev) => {
      const next = { ...prev };
      const nextError = validateRequired(value);
      if (nextError) next[name] = nextError;
      else delete next[name];
      return next;
    });
  };

  const handleBlur = (
    e: React.FocusEvent<HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFieldErrors((prev) => {
      const next = { ...prev };
      const nextError = validateRequired(value);
      if (nextError) next[name] = nextError;
      else delete next[name];
      return next;
    });
  };

  /* ── Derive selected room details ── */
  const selectedRoom = rooms.find((r) => r._id === form.roomId) ?? null;

  /* ── Submit ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    (["roomId", "assignedTo", "priority", "notes"] as const).forEach((field) => {
      const nextError = validateRequired(form[field]);
      if (nextError) nextErrors[field] = nextError;
    });
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      setSaving(true);
      await api.post("/housekeeping", {
        branchId,
        roomId: form.roomId,
        priority: form.priority,
        assignedTo: form.assignedTo || undefined,
        notes: form.notes.trim(),
      });
      toast.success("Housekeeping task created successfully.");
      navigate(`/workspace/${branchId}/housekeeping`);
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(
        error.response?.data?.message ||
          "Failed to create task. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="cht-root animate-fade-in">
      {/* ── Page Header ── */}
      <div className="add-branch-header">
        <div className="cht-header-left">
          <button
            onClick={() => navigate(`/workspace/${branchId}/housekeeping`)}
            className="cht-back-btn"
            aria-label="Back to housekeeping"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="add-branch-header-icon-wrap">
            <Sparkles className="add-branch-header-icon" />
          </div>
          <div>
            <h1 className="page-title">New Housekeeping Task</h1>
            <p className="page-subtitle">
              Schedule a room cleaning or inspection
            </p>
          </div>
        </div>
      </div>

      {/* ── Form ── */}
      <form onSubmit={handleSubmit} className="cht-form-layout" noValidate>
        {/* Left column — primary fields */}
        <div className="cht-form-main">
          {/* Room Selection */}
          <div className="luxury-card cht-section">
            <div className="cht-section-header">
              <h2 className="cht-section-title">Room Details</h2>
              <p className="cht-section-sub">
                Select the room that requires attention
              </p>
            </div>

            <div className="cht-grid-2">
              <div className="cht-field cht-field-full">
                <label htmlFor="cht-roomId" className="cht-label">
                  Room <span className="cht-required">*</span>
                </label>
                <select
                  id="cht-roomId"
                  name="roomId"
                  value={form.roomId}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="luxury-input"
                  style={fieldErrors.roomId ? { borderColor: "#dc2626" } : undefined}
                  required
                >
                  <option value="">— Select a room —</option>
                  {rooms.map((r) => (
                    <option key={r._id} value={r._id}>
                      Room {r.roomNumber} ({r.roomType})
                    </option>
                  ))}
                </select>
                {fieldErrors.roomId ? (
                  <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>
                    {fieldErrors.roomId}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Task Specifications */}
          <div className="luxury-card cht-section">
            <div className="cht-section-header">
              <h2 className="cht-section-title">Task Specifications</h2>
              <p className="cht-section-sub">
                Set priority and provide special instructions
              </p>
            </div>

            <div className="cht-grid-2">
              <div className="cht-field">
                <label htmlFor="cht-priority" className="cht-label">
                  Priority
                </label>
                <select
                  id="cht-priority"
                  name="priority"
                  value={form.priority}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="luxury-input"
                  style={fieldErrors.priority ? { borderColor: "#dc2626" } : undefined}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
                {fieldErrors.priority ? (
                  <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>
                    {fieldErrors.priority}
                  </span>
                ) : null}
              </div>

              <div className="cht-field">
                <label htmlFor="cht-assignedTo" className="cht-label">
                  Assigned To
                </label>
                <select
                  id="cht-assignedTo"
                  name="assignedTo"
                  value={form.assignedTo}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="luxury-input"
                  style={fieldErrors.assignedTo ? { borderColor: "#dc2626" } : undefined}
                >
                  <option value="">— Unassigned —</option>
                  {housekeepers.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.firstName} {u.lastName}
                    </option>
                  ))}
                </select>
                {fieldErrors.assignedTo ? (
                  <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>
                    {fieldErrors.assignedTo}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="cht-field mt-4">
              <label htmlFor="cht-notes" className="cht-label">
                Instructions / Notes
              </label>
              <textarea
                id="cht-notes"
                name="notes"
                value={form.notes}
                onChange={handleChange}
                onBlur={handleBlur}
                className="luxury-input ar-textarea"
                style={fieldErrors.notes ? { borderColor: "#dc2626" } : undefined}
                placeholder="e.g. Deep clean required, extra towels, spot treatment on carpet..."
                rows={4}
              />
              {fieldErrors.notes ? (
                <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>
                  {fieldErrors.notes}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Right column — summary + submit */}
        <div className="cht-form-side">
          <div className="luxury-card cht-summary-card">
            <h3 className="cht-summary-title">Task Summary</h3>

            <div className="cht-summary-rows">
              <div className="cht-summary-row">
                <span className="cht-summary-key">Room</span>
                <span className="cht-summary-val">
                  {selectedRoom ? (
                    `#${selectedRoom.roomNumber}`
                  ) : (
                    <span className="cht-empty">—</span>
                  )}
                </span>
              </div>
              <div className="cht-summary-row">
                <span className="cht-summary-key">Priority</span>
                <span className="cht-summary-val">{form.priority}</span>
              </div>
              <div className="cht-summary-row">
                <span className="cht-summary-key">Assigned To</span>
                <span className="cht-summary-val truncate text-right max-w-[120px]">
                  {(() => {
                    const h = housekeepers.find((h) => h._id === form.assignedTo);
                    return h ? `${h.firstName} ${h.lastName}` : <span className="cht-empty">Unassigned</span>;
                  })()}
                </span>
              </div>
              <div className="cht-summary-row">
                <span className="cht-summary-key">Notes</span>
                <span className="cht-summary-val max-w-[120px] truncate text-right">
                  {form.notes ? (
                    form.notes
                  ) : (
                    <span className="cht-empty">None</span>
                  )}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="luxury-btn luxury-btn-primary cht-submit-btn"
            >
              {saving ? (
                <>
                  <span className="eb-loading-spinner cht-btn-spinner" />
                  Creating…
                </>
              ) : (
                <>
                  <Save size={15} />
                  Create Task
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate(`/workspace/${branchId}/housekeeping`)}
              className="luxury-btn luxury-btn-outline cht-cancel-btn"
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateHousekeepingTask;
