import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BedDouble, Save } from "lucide-react";
import api from "@/api/axios";
import { useToast } from "@/components/confirm/ConfirmProvider";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";

const roomTypes     = ["STANDARD", "DELUXE", "SUITE", "PRESIDENTIAL"];
const floorOptions  = Array.from({ length: 20 }, (_, i) => i + 1);
const bedTypeOptions = [
  { label: "King Size", value: "King" },
  { label: "Queen Size", value: "Queen" },
  { label: "Twin Beds", value: "Twin" },
  { label: "Double Bed", value: "Double" },
  { label: "Single Bed", value: "Single" },
];
const amenityOptions = [
  "Free Wi-Fi",
  "Air Conditioning (AC)",
  "Television (TV)",
  "Mini Bar",
  "Balcony",
  "Room Service",
  "Wardrobe",
];

const AddRoom = () => {
  const { branchId } = useParams();
  const navigate     = useNavigate();
  const toast = useToast();
  const { formatCurrency } = useSystemSettings();

  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    roomNumber:    "",
    roomType:      "STANDARD",
    pricePerNight: "",
    capacity:      "2",
    floor:         "1",
    maxAdults:     "",
    maxChildren:   "",
    bedType:       "",
    amenities:     [] as string[],
    description:   "",
  });

  const validateField = (name: string, value: string | string[]) => {
    if (name === "description") return "";
    if (Array.isArray(value)) {
      return value.length ? "" : "This field is required";
    }
    return String(value).trim() ? "" : "This field is required";
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    setFieldErrors((prev) => {
      const next = { ...prev };
      const nextError = validateField(name, value);
      if (nextError) next[name] = nextError;
      else delete next[name];
      return next;
    });
  };

  const handleAmenityChange = (amenity: string) => {
    const nextAmenities = form.amenities.includes(amenity)
      ? form.amenities.filter((item) => item !== amenity)
      : [...form.amenities, amenity];

    setForm((prev) => ({
      ...prev,
      amenities: nextAmenities,
    }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      const nextError = validateField("amenities", nextAmenities);
      if (nextError) next.amenities = nextError;
      else delete next.amenities;
      return next;
    });
  };

  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFieldErrors((prev) => {
      const next = { ...prev };
      const nextError = validateField(name, value);
      if (nextError) next[name] = nextError;
      else delete next[name];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    const requiredFields: Array<keyof typeof form> = [
      "roomNumber",
      "roomType",
      "pricePerNight",
      "capacity",
      "floor",
      "maxAdults",
      "maxChildren",
      "bedType",
      "amenities",
    ];

    requiredFields.forEach((field) => {
      const nextError = validateField(field, form[field]);
      if (nextError) nextErrors[field] = nextError;
    });

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    if (!form.pricePerNight || Number(form.pricePerNight) <= 0) {
      toast.warning("Please enter a valid price per night."); return;
    }
    if (form.maxAdults === "" || Number(form.maxAdults) < 0) {
      toast.warning("Adults occupancy is required and must be 0 or greater."); return;
    }
    if (form.maxChildren === "" || Number(form.maxChildren) < 0) {
      toast.warning("Children occupancy is required and must be 0 or greater."); return;
    }
    try {
      setSaving(true);
      await api.post("/rooms", {
        branchId,
        roomNumber:    form.roomNumber.trim(),
        roomType:      form.roomType,
        pricePerNight: Number(form.pricePerNight),
        capacity:      Number(form.capacity),
        floor:         Number(form.floor),
        maxOccupancy: {
          adults: Number(form.maxAdults),
          children: Number(form.maxChildren),
        },
        bedType: form.bedType,
        amenities: form.amenities,
        description:   form.description.trim(),
      });
      toast.success("Room created successfully.");
      navigate(`/workspace/${branchId}/rooms`);
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to create room. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ar-root animate-fade-in">

      {/* ── Page Header ── */}
      <div className="add-branch-header">
        <div className="ar-header-left">
          <button
            onClick={() => navigate(`/workspace/${branchId}/rooms`)}
            className="ar-back-btn"
            aria-label="Back to rooms"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="add-branch-header-icon-wrap">
            <BedDouble className="add-branch-header-icon" />
          </div>
          <div>
            <h1 className="page-title">Add New Room</h1>
            <p className="page-subtitle">Create a new room for this branch</p>
          </div>
        </div>
      </div>

      {/* ── Form Card ── */}
      <form onSubmit={handleSubmit} className="ar-form-layout" noValidate>

        {/* Left column — primary fields */}
        <div className="ar-form-main">

          {/* Room Identity */}
          <div className="luxury-card ar-section">
            <div className="ar-section-header">
              <h2 className="ar-section-title">Room Identity</h2>
              <p className="ar-section-sub">Basic identification and pricing</p>
            </div>

            <div className="ar-grid-2">
              <div className="ar-field">
                <label htmlFor="ar-roomNumber" className="ar-label">
                  Room Number <span className="ar-required">*</span>
                </label>
                <input
                  id="ar-roomNumber"
                  name="roomNumber"
                  value={form.roomNumber}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="luxury-input"
                  style={fieldErrors.roomNumber ? { borderColor: "#dc2626" } : undefined}
                  placeholder="e.g. 101, A-202"
                  required
                />
                {fieldErrors.roomNumber ? (
                  <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>
                    {fieldErrors.roomNumber}
                  </span>
                ) : null}
              </div>

              <div className="ar-field">
                <label htmlFor="ar-roomType" className="ar-label">Room Type</label>
                <select
                  id="ar-roomType"
                  name="roomType"
                  value={form.roomType}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="luxury-input"
                  style={fieldErrors.roomType ? { borderColor: "#dc2626" } : undefined}
                >
                  {roomTypes.map((t) => <option key={t}>{t}</option>)}
                </select>
                {fieldErrors.roomType ? (
                  <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>
                    {fieldErrors.roomType}
                  </span>
                ) : null}
              </div>

              <div className="ar-field">
                <label htmlFor="ar-price" className="ar-label">
                  Price / Night <span className="ar-required">*</span>
                </label>
                <input
                  id="ar-price"
                  type="number"
                  name="pricePerNight"
                  value={form.pricePerNight}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="luxury-input"
                  style={fieldErrors.pricePerNight ? { borderColor: "#dc2626" } : undefined}
                  placeholder="e.g. 250"
                  min="0"
                  required
                />
                {fieldErrors.pricePerNight ? (
                  <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>
                    {fieldErrors.pricePerNight}
                  </span>
                ) : null}
              </div>

              <div className="ar-field">
                <label htmlFor="ar-capacity" className="ar-label">Capacity (guests)</label>
                <input
                  id="ar-capacity"
                  type="number"
                  name="capacity"
                  value={form.capacity}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="luxury-input"
                  style={fieldErrors.capacity ? { borderColor: "#dc2626" } : undefined}
                  placeholder="e.g. 2"
                  min="1"
                />
                {fieldErrors.capacity ? (
                  <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>
                    {fieldErrors.capacity}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="luxury-card ar-section">
            <div className="ar-section-header">
              <h2 className="ar-section-title">Location</h2>
              <p className="ar-section-sub">Physical placement within the property</p>
            </div>

            <div className="ar-grid-2">
              <div className="ar-field">
                <label htmlFor="ar-floor" className="ar-label">Floor</label>
                <select
                  id="ar-floor"
                  name="floor"
                  value={form.floor}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="luxury-input"
                  style={fieldErrors.floor ? { borderColor: "#dc2626" } : undefined}
                >
                  {floorOptions.map((f) => (
                    <option key={f} value={f}>Floor {f}</option>
                  ))}
                </select>
                {fieldErrors.floor ? (
                  <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>
                    {fieldErrors.floor}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="luxury-card ar-section">
            <div className="ar-section-header">
              <h2 className="ar-section-title">Room Capacity & Features</h2>
              <p className="ar-section-sub">Occupancy, bed type, and amenities</p>
            </div>

            <div className="ar-grid-2">
              <div className="ar-field">
                <label htmlFor="ar-maxAdults" className="ar-label">
                  Adults <span className="ar-required">*</span>
                </label>
                <input
                  id="ar-maxAdults"
                  type="number"
                  name="maxAdults"
                  value={form.maxAdults}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="luxury-input"
                  style={fieldErrors.maxAdults ? { borderColor: "#dc2626" } : undefined}
                  placeholder="e.g. 2"
                  min="0"
                  required
                />
                {fieldErrors.maxAdults ? (
                  <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>
                    {fieldErrors.maxAdults}
                  </span>
                ) : null}
              </div>

              <div className="ar-field">
                <label htmlFor="ar-maxChildren" className="ar-label">
                  Children <span className="ar-required">*</span>
                </label>
                <input
                  id="ar-maxChildren"
                  type="number"
                  name="maxChildren"
                  value={form.maxChildren}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="luxury-input"
                  style={fieldErrors.maxChildren ? { borderColor: "#dc2626" } : undefined}
                  placeholder="e.g. 1"
                  min="0"
                  required
                />
                {fieldErrors.maxChildren ? (
                  <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>
                    {fieldErrors.maxChildren}
                  </span>
                ) : null}
              </div>

              <div className="ar-field ar-field-full">
                <label htmlFor="ar-bedType" className="ar-label">
                  Bed Type <span className="ar-required">*</span>
                </label>
                <select
                  id="ar-bedType"
                  name="bedType"
                  value={form.bedType}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="luxury-input"
                  style={fieldErrors.bedType ? { borderColor: "#dc2626" } : undefined}
                  required
                >
                  <option value="">Select Bed Type</option>
                  {bedTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {fieldErrors.bedType ? (
                  <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>
                    {fieldErrors.bedType}
                  </span>
                ) : null}
              </div>

              <div className="ar-field ar-field-full">
                <label className="ar-label">
                  Amenities <span className="ar-required">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {amenityOptions.map((amenity) => (
                    <label key={amenity} className="flex items-center gap-3 text-sm text-foreground">
                      <input
                        type="checkbox"
                        checked={form.amenities.includes(amenity)}
                        onChange={() => handleAmenityChange(amenity)}
                      />
                      <span>{amenity}</span>
                    </label>
                  ))}
                </div>
                {fieldErrors.amenities ? (
                  <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>
                    {fieldErrors.amenities}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="luxury-card ar-section">
            <div className="ar-section-header">
              <h2 className="ar-section-title">Description</h2>
              <p className="ar-section-sub">Optional notes or amenity details</p>
            </div>

            <div className="ar-field">
              <label htmlFor="ar-description" className="ar-label">Room Description</label>
              <textarea
                id="ar-description"
                name="description"
                value={form.description}
                onChange={handleChange}
                className="luxury-input ar-textarea"
                placeholder="Ocean view, king-size bed, balcony…"
                rows={4}
              />
            </div>
          </div>

        </div>

        {/* Right column — summary + submit */}
        <div className="ar-form-side">
          <div className="luxury-card ar-summary-card">
            <h3 className="ar-summary-title">Room Summary</h3>

            <div className="ar-summary-rows">
              <div className="ar-summary-row">
                <span className="ar-summary-key">Room #</span>
                <span className="ar-summary-val">{form.roomNumber || <span className="ar-empty">—</span>}</span>
              </div>
              <div className="ar-summary-row">
                <span className="ar-summary-key">Type</span>
                <span className="ar-summary-val">{form.roomType}</span>
              </div>
              <div className="ar-summary-row">
                <span className="ar-summary-key">Floor</span>
                <span className="ar-summary-val">Floor {form.floor}</span>
              </div>
              <div className="ar-summary-row">
                <span className="ar-summary-key">Capacity</span>
                <span className="ar-summary-val">{form.capacity} guests</span>
              </div>
              <div className="ar-summary-row">
                <span className="ar-summary-key">Max Occupancy</span>
                <span className="ar-summary-val">
                  {form.maxAdults || 0} Adults, {form.maxChildren || 0} Children
                </span>
              </div>
              <div className="ar-summary-row">
                <span className="ar-summary-key">Bed Type</span>
                <span className="ar-summary-val">
                  {bedTypeOptions.find((option) => option.value === form.bedType)?.label || <span className="ar-empty">—</span>}
                </span>
              </div>
              <div className="ar-summary-row">
                <span className="ar-summary-key">Amenities</span>
                <span className="ar-summary-val">
                  {form.amenities.length ? form.amenities.length : <span className="ar-empty">—</span>}
                </span>
              </div>
              <div className="ar-summary-row ar-summary-price-row">
                <span className="ar-summary-key">Price / Night</span>
                <span className="ar-summary-price">
                  {form.pricePerNight ? formatCurrency(Number(form.pricePerNight)) : <span className="ar-empty">—</span>}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="luxury-btn luxury-btn-primary ar-submit-btn"
            >
              {saving ? (
                <>
                  <span className="eb-loading-spinner ar-btn-spinner" />
                  Creating…
                </>
              ) : (
                <>
                  <Save size={15} />
                  Create Room
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate(`/workspace/${branchId}/rooms`)}
              className="luxury-btn luxury-btn-secondary ar-cancel-btn"
            >
              Cancel
            </button>
          </div>
        </div>

      </form>
    </div>
  );
};

export default AddRoom;
