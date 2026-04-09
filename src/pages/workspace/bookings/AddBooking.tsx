import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, Save } from "lucide-react";
import api from "@/api/axios";
import { useToast } from "@/components/confirm/ConfirmProvider";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";

interface Room {
  _id: string;
  roomNumber: string;
  roomType: string;
  pricePerNight: number;
  status: string;
}

const BOOKING_SOURCE_OPTIONS = ["Walk-in", "Pre-booking", "Online"] as const;
const MEAL_TYPE_OPTIONS = [
  { value: "INCLUDED", label: "Included" },
  { value: "NOT_INCLUDED", label: "Not Included" },
] as const;
const INCLUDED_MEAL_OPTIONS = [
  { value: "BREAKFAST", label: "Breakfast" },
  { value: "LUNCH", label: "Lunch" },
  { value: "DINNER", label: "Dinner" },
] as const;
const PAYMENT_MODE_OPTIONS = [
  { value: "POSTPAID", label: "Postpaid" },
  { value: "PREPAID", label: "Prepaid" },
  { value: "OTHER", label: "Other" },
] as const;

const AddBooking = () => {
  const { branchId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { formatCurrency } = useSystemSettings();

  const [saving, setSaving] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [guests, setGuests] = useState([
    { name: "", email: "", phone: "", identity: null as File | null },
  ]);

  const [form, setForm] = useState({
    roomId: "",
    guestName: "",
    guestType: "",
    bookingSource: "Walk-in",
    mealType: "NOT_INCLUDED",
    includedMeals: [] as string[],
    paymentMode: "POSTPAID",
    email: "",
    phone: "",
    totalGuests: 1,

    checkInDate: "",
    checkInTime: "",

    checkOutDate: "",
    checkOutTime: "",
    notes: "",
  });

  const [mainGuestIdentity, setMainGuestIdentity] = useState<File | null>(null);

  const validateRequired = (value: string | number | File | null) => {
    if (value instanceof File) return "";
    if (typeof value === "number") return value ? "" : "This field is required";
    return String(value ?? "").trim() ? "" : "This field is required";
  };

  /* ── Load available rooms ── */
  useEffect(() => {
    if (!branchId) return;
    const load = async () => {
      try {
        const res = await api.get<{ data: Room[] }>("/rooms", {
          params: {
            branchId,
            checkInDate: form.checkInDate,
            checkOutDate: form.checkOutDate,
            totalGuests: form.totalGuests,
          },
        });

        setRooms((res.data.data || []).filter((r) => r.status === "AVAILABLE"));
      } catch {
        console.error("Failed to load rooms");
      }
    };
    load();
  }, [branchId, form.checkInDate, form.checkOutDate, form.totalGuests]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;

    const nextForm =
      name === "mealType" && value !== "INCLUDED"
        ? { ...form, [name]: value, includedMeals: [] }
        : { ...form, [name]: value };

    setForm(nextForm);
    setFieldErrors((prev) => {
      const next = { ...prev };
      const nextError = validateRequired(name === "totalGuests" ? Number(value) : value);
      if (nextError) next[name] = nextError;
      else delete next[name];
      if (name === "mealType" && value !== "INCLUDED") {
        delete next.includedMeals;
      }
      return next;
    });

    if (name === "totalGuests") {
      const count = Math.max(0, (parseInt(value) || 1) - 1);

      const newGuests = Array.from({ length: count }, (_, i) => ({
        name: guests[i]?.name || "",
        email: guests[i]?.email || "",
        phone: guests[i]?.phone || "",
        identity: guests[i]?.identity || null,
      }));

      setGuests(newGuests);
    }
  };

  const handleIncludedMealsChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const selectedValues = Array.from(e.target.selectedOptions, (option) => option.value);
    setForm((prev) => ({ ...prev, includedMeals: selectedValues }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      if ((form.mealType === "INCLUDED") && selectedValues.length === 0) {
        next.includedMeals = "Select at least one meal";
      } else {
        delete next.includedMeals;
      }
      return next;
    });
  };

  const handleIncludedMealToggle = (mealValue: string, checked: boolean) => {
    const selectedValues = checked
      ? [...form.includedMeals, mealValue]
      : form.includedMeals.filter((meal) => meal !== mealValue);

    setForm((prev) => ({ ...prev, includedMeals: selectedValues }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (form.mealType === "INCLUDED" && selectedValues.length === 0) {
        next.includedMeals = "Select at least one meal";
      } else {
        delete next.includedMeals;
      }
      return next;
    });
  };

  const handleGuestChange = (index: number, field: string, value: string) => {
    const updatedGuests = [...guests];
    updatedGuests[index][field] = value;
    setGuests(updatedGuests);
    setFieldErrors((prev) => {
      const next = { ...prev };
      const key = `guest-${index}-${field}`;
      const nextError = validateRequired(value);
      if (nextError) next[key] = nextError;
      else delete next[key];
      return next;
    });
  };

  const handleGuestFile = (index: number, file: File | null) => {
    const updatedGuests = [...guests];
    updatedGuests[index].identity = file;
    setGuests(updatedGuests);
    setFieldErrors((prev) => {
      const next = { ...prev };
      const key = `guest-${index}-identity`;
      const nextError = validateRequired(file);
      if (nextError) next[key] = nextError;
      else delete next[key];
      return next;
    });
  };

  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFieldErrors((prev) => {
      const next = { ...prev };
      const nextError = validateRequired(name === "totalGuests" ? Number(value) : value);
      if (nextError) next[name] = nextError;
      else delete next[name];
      return next;
    });
  };

  /* ── Derive selected room details ── */
  const selectedRoom = rooms.find((r) => r._id === form.roomId) ?? null;

  /* ── Night count ── */
  const nights = (() => {
    if (!form.checkInDate || !form.checkOutDate) return 0;
    const diff =
      new Date(form.checkOutDate).getTime() -
      new Date(form.checkInDate).getTime();
    return Math.max(0, Math.round(diff / 86400000));
  })();

  const estimatedTotal = selectedRoom ? nights * selectedRoom.pricePerNight : 0;

  /* ── Submit ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    const requiredFields: Array<keyof typeof form> = [
      "roomId",
      "guestName",
      "guestType",
      "bookingSource",
      "mealType",
      "paymentMode",
      "email",
      "phone",
      "totalGuests",
      "checkInDate",
      "checkInTime",
      "checkOutDate",
      "checkOutTime",
      "notes",
    ];

    requiredFields.forEach((field) => {
      const nextError = validateRequired(form[field]);
      if (nextError) nextErrors[field] = nextError;
    });

    if (form.mealType === "INCLUDED" && form.includedMeals.length === 0) {
      nextErrors.includedMeals = "Select at least one meal";
    }

    const mainGuestIdentityError = validateRequired(mainGuestIdentity);
    if (mainGuestIdentityError) {
      nextErrors.mainGuestIdentity = mainGuestIdentityError;
    }

    guests.forEach((guest, index) => {
      const guestNameError = validateRequired(guest.name);
      if (guestNameError) nextErrors[`guest-${index}-name`] = guestNameError;

      const guestEmailError = validateRequired(guest.email);
      if (guestEmailError) nextErrors[`guest-${index}-email`] = guestEmailError;

      const guestPhoneError = validateRequired(guest.phone);
      if (guestPhoneError) nextErrors[`guest-${index}-phone`] = guestPhoneError;

      const guestIdentityError = validateRequired(guest.identity);
      if (guestIdentityError) nextErrors[`guest-${index}-identity`] = guestIdentityError;
    });

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    if (nights <= 0) {
      toast.warning("Check-out must be after check-in.");
      return;
    }

    try {
      setSaving(true);
      const formData = new FormData();

      formData.append("branchId", branchId || "");
      formData.append("roomId", form.roomId);
      formData.append("guestName", form.guestName.trim());
      formData.append("guestType", form.guestType);
      formData.append("bookingSource", form.bookingSource);
      formData.append("mealType", form.mealType);
      form.includedMeals.forEach((meal) => formData.append("includedMeals[]", meal));
      formData.append("paymentMode", form.paymentMode);
      formData.append("guestEmail", form.email);
      formData.append("guestPhone", form.phone);
      formData.append("totalGuests", String(form.totalGuests));
      formData.append("checkInDate", form.checkInDate);
      formData.append("checkInTime", form.checkInTime);
      formData.append("checkOutDate", form.checkOutDate);
      formData.append("checkOutTime", form.checkOutTime);

      if (mainGuestIdentity) {
        formData.append("identityProof", mainGuestIdentity);
      }

      guests.forEach((g, i) => {
        formData.append(`guests[${i}][name]`, g.name);
        formData.append(`guests[${i}][email]`, g.email);
        formData.append(`guests[${i}][phone]`, g.phone);

        if (g.identity) {
          formData.append("guestsIdentity", g.identity);
        }
      });

      await api.post("/bookings", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Booking created successfully.");
      navigate(`/workspace/${branchId}/bookings`);
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(
        error.response?.data?.message ||
          "Failed to create booking. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ab-root animate-fade-in">
      {/* ── Page Header ── */}
      <div className="add-branch-header">
        <div className="ab-header-left">
          <button
            onClick={() => navigate(`/workspace/${branchId}/bookings`)}
            className="ab-back-btn"
            aria-label="Back to bookings"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="add-branch-header-icon-wrap">
            <BookOpen className="add-branch-header-icon" />
          </div>
          <div>
            <h1 className="page-title">New Booking</h1>
            <p className="page-subtitle">
              Create a new reservation for this branch
            </p>
          </div>
        </div>
      </div>

      {/* ── Form ── */}
      <form onSubmit={handleSubmit} className="ab-form-layout" noValidate>
        {/* Left column — primary fields */}
        <div className="ab-form-main">
          {/* Guest Details */}
          <div className="luxury-card ab-section">
            <div className="ab-section-header">
              <h2 className="ab-section-title">Guest Details</h2>
              <p className="ab-section-sub">
                Enter the reservation guest information
              </p>
            </div>

            <div className="ab-grid-2">
              <div className="ab-field ab-field-full">
                <label htmlFor="ab-guestName" className="ab-label">
                  Guest Name <span className="ab-required">*</span>
                </label>
                <input
                  id="ab-guestName"
                  name="guestName"
                  value={form.guestName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="luxury-input"
                  style={fieldErrors.guestName ? { borderColor: "#dc2626" } : undefined}
                  placeholder="e.g. John Smith"
                  required
                />
                {fieldErrors.guestName ? (
                  <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>
                    {fieldErrors.guestName}
                  </span>
                ) : null}
              </div>
              <div className="ab-field">
                <label htmlFor="ab-guestType" className="ab-label">
                  Guest Type <span className="ab-required">*</span>
                </label>
                <select
                  id="ab-guestType"
                  name="guestType"
                  value={form.guestType}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="luxury-input"
                  style={fieldErrors.guestType ? { borderColor: "#dc2626" } : undefined}
                  required
                >
                  <option value="">Select Guest Type</option>
                  <option value="ADULT">Adult</option>
                  <option value="CHILD">Child</option>
                </select>
                {fieldErrors.guestType ? (
                  <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>
                    {fieldErrors.guestType}
                  </span>
                ) : null}
              </div>
              <div className="ab-field">
                <label htmlFor="ab-bookingSource" className="ab-label">
                  Booking Source <span className="ab-required">*</span>
                </label>
                <select
                  id="ab-bookingSource"
                  name="bookingSource"
                  value={form.bookingSource}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="luxury-input"
                  style={fieldErrors.bookingSource ? { borderColor: "#dc2626" } : undefined}
                  required
                >
                  {BOOKING_SOURCE_OPTIONS.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
                {fieldErrors.bookingSource ? (
                  <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>
                    {fieldErrors.bookingSource}
                  </span>
                ) : null}
              </div>
              <div className="ab-field">
                <label htmlFor="ab-mealType" className="ab-label">
                  Meal Type <span className="ab-required">*</span>
                </label>
                <select
                  id="ab-mealType"
                  name="mealType"
                  value={form.mealType}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="luxury-input"
                  style={fieldErrors.mealType ? { borderColor: "#dc2626" } : undefined}
                  required
                >
                  {MEAL_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {fieldErrors.mealType ? (
                  <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>
                    {fieldErrors.mealType}
                  </span>
                ) : null}
              </div>
              {form.mealType === "INCLUDED" ? (
                <div className="ab-field">
                  <label className="ab-label">
                    Included Meals <span className="ab-required">*</span>
                  </label>
                  <div
                    className="luxury-input"
                    style={{
                      ...(fieldErrors.includedMeals ? { borderColor: "#dc2626" } : undefined),
                      minHeight: "auto",
                      padding: "0.9rem 1rem",
                    }}
                  >
                    {INCLUDED_MEAL_OPTIONS.map((option) => (
                      <label
                        key={option.value}
                        htmlFor={`ab-included-meal-${option.value}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.65rem",
                          cursor: "pointer",
                          padding: "0.35rem 0",
                        }}
                      >
                        <input
                          id={`ab-included-meal-${option.value}`}
                          type="checkbox"
                          checked={form.includedMeals.includes(option.value)}
                          onChange={(e) =>
                            handleIncludedMealToggle(option.value, e.target.checked)
                          }
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                  {fieldErrors.includedMeals ? (
                    <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>
                      {fieldErrors.includedMeals}
                    </span>
                  ) : null}
                </div>
              ) : null}
              <div className="ab-field">
                <label htmlFor="ab-paymentMode" className="ab-label">
                  Payment Mode <span className="ab-required">*</span>
                </label>
                <select
                  id="ab-paymentMode"
                  name="paymentMode"
                  value={form.paymentMode}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="luxury-input"
                  style={fieldErrors.paymentMode ? { borderColor: "#dc2626" } : undefined}
                  required
                >
                  {PAYMENT_MODE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {fieldErrors.paymentMode ? (
                  <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>
                    {fieldErrors.paymentMode}
                  </span>
                ) : null}
              </div>
              {/* Email */}
              <div className="ab-field">
                <label htmlFor="ab-email" className="ab-label">
                  Email
                </label>
                <input
                  id="ab-email"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="luxury-input"
                  style={fieldErrors.email ? { borderColor: "#dc2626" } : undefined}
                  placeholder="guest@email.com"
                />
                {fieldErrors.email ? (
                  <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>
                    {fieldErrors.email}
                  </span>
                ) : null}
              </div>

              {/* Phone */}
              <div className="ab-field">
                <label htmlFor="ab-phone" className="ab-label">
                  Phone Number
                </label>

                <input
                  id="ab-phone"
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="luxury-input"
                  style={fieldErrors.phone ? { borderColor: "#dc2626" } : undefined}
                  placeholder="Phone number"
                />
                {fieldErrors.phone ? (
                  <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>
                    {fieldErrors.phone}
                  </span>
                ) : null}
              </div>

              {/* Total Guests */}
              <div className="ab-field">
                <label htmlFor="ab-totalGuests" className="ab-label">
                  Total Guests
                </label>
                <input
                  id="ab-totalGuests"
                  type="number"
                  name="totalGuests"
                  value={form.totalGuests}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="luxury-input"
                  style={fieldErrors.totalGuests ? { borderColor: "#dc2626" } : undefined}
                  min={1}
                />
                {fieldErrors.totalGuests ? (
                  <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>
                    {fieldErrors.totalGuests}
                  </span>
                ) : null}
              </div>

              <div className="ab-field">
                <label htmlFor="ab-mainGuestIdentity" className="ab-label">Identity Proof (Main Guest) <span className="ab-required">*</span></label>
                <input
                  id="ab-mainGuestIdentity"
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setMainGuestIdentity(file);
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      const nextError = validateRequired(file);
                      if (nextError) next.mainGuestIdentity = nextError;
                      else delete next.mainGuestIdentity;
                      return next;
                    });
                  }}
                  className="luxury-input"
                  style={fieldErrors.mainGuestIdentity ? { borderColor: "#dc2626" } : undefined}
                  title="Upload identity proof document"
                  aria-label="Identity proof for main guest"
                />
                {fieldErrors.mainGuestIdentity ? (
                  <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>
                    {fieldErrors.mainGuestIdentity}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Additional Guests */}
          <div className="luxury-card ab-section">
            <div className="ab-section-header">
              <h2 className="ab-section-title">Guest List</h2>
              <p className="ab-section-sub">
                Enter details for each staying guest
              </p>
            </div>

            {guests.map((guest, index) => (
              <div key={index} className="ab-grid-2 mb-[15px]">
                <div className="ab-field">
                  <label htmlFor={`ab-guestName-${index}`} className="ab-label">
                    Guest {index + 2} Name
                  </label>
                  <input
                    id={`ab-guestName-${index}`}
                    value={guest.name}
                    onChange={(e) =>
                      handleGuestChange(index, "name", e.target.value)
                    }
                    className="luxury-input"
                    style={fieldErrors[`guest-${index}-name`] ? { borderColor: "#dc2626" } : undefined}
                    onBlur={(e) =>
                      handleGuestChange(index, "name", e.target.value)
                    }
                  />
                  {fieldErrors[`guest-${index}-name`] ? (
                    <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>
                      {fieldErrors[`guest-${index}-name`]}
                    </span>
                  ) : null}
                </div>

                <div className="ab-field">
                  <label
                    htmlFor={`ab-guestEmail-${index}`}
                    className="ab-label"
                  >
                    Email
                  </label>
                  <input
                    id={`ab-guestEmail-${index}`}
                    type="email"
                    value={guest.email}
                    onChange={(e) =>
                      handleGuestChange(index, "email", e.target.value)
                    }
                    className="luxury-input"
                    style={fieldErrors[`guest-${index}-email`] ? { borderColor: "#dc2626" } : undefined}
                    onBlur={(e) =>
                      handleGuestChange(index, "email", e.target.value)
                    }
                  />
                  {fieldErrors[`guest-${index}-email`] ? (
                    <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>
                      {fieldErrors[`guest-${index}-email`]}
                    </span>
                  ) : null}
                </div>

                <div className="ab-field">
                  <label
                    htmlFor={`ab-guestPhone-${index}`}
                    className="ab-label"
                  >
                    Phone
                  </label>
                  <input
                    id={`ab-guestPhone-${index}`}
                    value={guest.phone}
                    onChange={(e) =>
                      handleGuestChange(index, "phone", e.target.value)
                    }
                    className="luxury-input"
                    style={fieldErrors[`guest-${index}-phone`] ? { borderColor: "#dc2626" } : undefined}
                    onBlur={(e) =>
                      handleGuestChange(index, "phone", e.target.value)
                    }
                  />
                  {fieldErrors[`guest-${index}-phone`] ? (
                    <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>
                      {fieldErrors[`guest-${index}-phone`]}
                    </span>
                  ) : null}
                </div>

                <div className="ab-field">
                  <label className="ab-label">Identity Proof</label>
                  <input
                    type="file"
                    onChange={(e) =>
                      handleGuestFile(index, e.target.files?.[0] || null)
                    }
                    className="luxury-input"
                    style={fieldErrors[`guest-${index}-identity`] ? { borderColor: "#dc2626" } : undefined}
                    title="Upload identity proof document for guest"
                    aria-label="Identity proof for guest"
                  />
                  {fieldErrors[`guest-${index}-identity`] ? (
                    <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>
                      {fieldErrors[`guest-${index}-identity`]}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          {/* Room Selection */}
          <div className="luxury-card ab-section">
            <div className="ab-section-header">
              <h2 className="ab-section-title">Room Selection</h2>
              <p className="ab-section-sub">
                Choose from available rooms in this branch
              </p>
            </div>

            <div className="ab-grid-2">
              <div className="ab-field ab-field-full">
                <label htmlFor="ab-roomId" className="ab-label">
                  Room <span className="ab-required">*</span>
                </label>
                <select
                  id="ab-roomId"
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
                      Room {r.roomNumber} · {r.roomType} · 
                      {formatCurrency(r.pricePerNight)}/night
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

          {/* Stay Duration */}
          <div className="luxury-card ab-section">
            <div className="ab-section-header">
              <h2 className="ab-section-title">Stay Duration</h2>
              <p className="ab-section-sub">
                Select check-in and check-out dates & times
              </p>
            </div>

            <div className="ab-grid-2">
              <div className="ab-field">
                <label htmlFor="ab-checkIn" className="ab-label">
                  Check-In Date <span className="ab-required">*</span>
                </label>
                <input
                  id="ab-checkIn"
                  type="date"
                  name="checkInDate"
                  value={form.checkInDate}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="luxury-input"
                  style={fieldErrors.checkInDate ? { borderColor: "#dc2626" } : undefined}
                  required
                />
                {fieldErrors.checkInDate ? (
                  <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>
                    {fieldErrors.checkInDate}
                  </span>
                ) : null}
              </div>

              <div className="ab-field">
                <label htmlFor="ab-checkOut" className="ab-label">
                  Check-Out Date <span className="ab-required">*</span>
                </label>
                <input
                  id="ab-checkOut"
                  type="date"
                  name="checkOutDate"
                  value={form.checkOutDate}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="luxury-input"
                  style={fieldErrors.checkOutDate ? { borderColor: "#dc2626" } : undefined}
                  required
                />
                {fieldErrors.checkOutDate ? (
                  <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>
                    {fieldErrors.checkOutDate}
                  </span>
                ) : null}
              </div>
            </div>

            {/* Check-In Time */}
            <div className="ab-field">
              <label htmlFor="ab-checkInTime" className="ab-label">
                Check-In Time
              </label>
              <input
                id="ab-checkInTime"
                type="time"
                name="checkInTime"
                value={form.checkInTime}
                onChange={handleChange}
                onBlur={handleBlur}
                className="luxury-input"
                style={fieldErrors.checkInTime ? { borderColor: "#dc2626" } : undefined}
              />
              {fieldErrors.checkInTime ? (
                <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>
                  {fieldErrors.checkInTime}
                </span>
              ) : null}
            </div>

            {/* Check-Out Time */}
            <div className="ab-field">
              <label htmlFor="ab-checkOutTime" className="ab-label">
                Check-Out Time
              </label>
              <input
                id="ab-checkOutTime"
                type="time"
                name="checkOutTime"
                value={form.checkOutTime}
                onChange={handleChange}
                onBlur={handleBlur}
                className="luxury-input"
                style={fieldErrors.checkOutTime ? { borderColor: "#dc2626" } : undefined}
              />
              {fieldErrors.checkOutTime ? (
                <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>
                  {fieldErrors.checkOutTime}
                </span>
              ) : null}
            </div>
          </div>

          {/* Notes */}
          <div className="luxury-card ab-section">
            <div className="ab-section-header">
              <h2 className="ab-section-title">Notes</h2>
              <p className="ab-section-sub">
                Optional special requests or remarks
              </p>
            </div>

            <div className="ab-field">
              <label htmlFor="ab-notes" className="ab-label">
                Additional Notes
              </label>
              <textarea
                id="ab-notes"
                name="notes"
                value={form.notes}
                onChange={handleChange}
                onBlur={handleBlur}
                className="luxury-input ar-textarea"
                style={fieldErrors.notes ? { borderColor: "#dc2626" } : undefined}
                placeholder="e.g. Early check-in requested, requires wheelchair access…"
                rows={3}
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
        <div className="ab-form-side">
          <div className="luxury-card ab-summary-card">
            <h3 className="ab-summary-title">Booking Summary</h3>

            <div className="ab-summary-rows">
              <div className="ab-summary-row">
                <span className="ab-summary-key">Guest</span>
                <span className="ab-summary-val">
                  {form.guestName || <span className="ab-empty">—</span>}
                </span>
              </div>
              <div className="ab-summary-row">
                <span className="ab-summary-key">Source</span>
                <span className="ab-summary-val">
                  {form.bookingSource || <span className="ab-empty">—</span>}
                </span>
              </div>
              <div className="ab-summary-row">
                <span className="ab-summary-key">Meal Type</span>
                <span className="ab-summary-val">
                  {MEAL_TYPE_OPTIONS.find((option) => option.value === form.mealType)?.label || <span className="ab-empty">â€”</span>}
                </span>
              </div>
              {form.mealType === "INCLUDED" ? (
                <div className="ab-summary-row">
                  <span className="ab-summary-key">Included Meals</span>
                  <span className="ab-summary-val">
                    {form.includedMeals.length
                      ? form.includedMeals
                          .map(
                            (meal) =>
                              INCLUDED_MEAL_OPTIONS.find((option) => option.value === meal)?.label || meal,
                          )
                          .join(", ")
                      : <span className="ab-empty">â€”</span>}
                  </span>
                </div>
              ) : null}
              <div className="ab-summary-row">
                <span className="ab-summary-key">Payment Mode</span>
                <span className="ab-summary-val">
                  {PAYMENT_MODE_OPTIONS.find((option) => option.value === form.paymentMode)?.label || <span className="ab-empty">â€”</span>}
                </span>
              </div>
              <div className="ab-summary-row">
                <span className="ab-summary-key">Room</span>
                <span className="ab-summary-val">
                  {selectedRoom ? (
                    `#${selectedRoom.roomNumber}`
                  ) : (
                    <span className="ab-empty">—</span>
                  )}
                </span>
              </div>
              <div className="ab-summary-row">
                <span className="ab-summary-key">Type</span>
                <span className="ab-summary-val">
                  {selectedRoom ? (
                    selectedRoom.roomType
                  ) : (
                    <span className="ab-empty">—</span>
                  )}
                </span>
              </div>
              <div className="ab-summary-row">
                <span className="ab-summary-key">Check-In</span>
                <span className="ab-summary-val">
                  {form.checkInDate ? (
                    new Date(form.checkInDate).toLocaleDateString()
                  ) : (
                    <span className="ab-empty">—</span>
                  )}
                </span>
              </div>

              <div className="ab-summary-row">
                <span className="ab-summary-key">Check-In Time</span>
                <span className="ab-summary-val">
                  {form.checkInTime || <span className="ab-empty">—</span>}
                </span>
              </div>

              <div className="ab-summary-row">
                <span className="ab-summary-key">Check-Out</span>
                <span className="ab-summary-val">
                  {form.checkOutDate ? (
                    new Date(form.checkOutDate).toLocaleDateString()
                  ) : (
                    <span className="ab-empty">—</span>
                  )}
                </span>
              </div>

              <div className="ab-summary-row">
                <span className="ab-summary-key">Check-Out Time</span>
                <span className="ab-summary-val">
                  {form.checkOutTime || <span className="ab-empty">—</span>}
                </span>
              </div>

              <div className="ab-summary-row">
                <span className="ab-summary-key">Guests</span>
                <span className="ab-summary-val">
                  {form.totalGuests || <span className="ab-empty">—</span>}
                </span>
              </div>

              <div className="ab-summary-row">
                <span className="ab-summary-key">Nights</span>
                <span className="ab-summary-val">
                  {nights > 0 ? (
                    `${nights} night${nights !== 1 ? "s" : ""}`
                  ) : (
                    <span className="ab-empty">—</span>
                  )}
                </span>
              </div>
              <div className="ab-summary-row ab-summary-price-row">
                <span className="ab-summary-key">Est. Total</span>
                <span className="ab-summary-nights">
                  {estimatedTotal > 0 ? (
                    formatCurrency(estimatedTotal)
                  ) : (
                    <span className="ab-empty">—</span>
                  )}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="luxury-btn luxury-btn-primary ab-submit-btn"
            >
              {saving ? (
                <>
                  <span className="eb-loading-spinner ab-btn-spinner" />
                  Creating…
                </>
              ) : (
                <>
                  <Save size={15} />
                  Confirm Booking
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate(`/workspace/${branchId}/bookings`)}
              className="luxury-btn luxury-btn-outline ab-cancel-btn"
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddBooking;
