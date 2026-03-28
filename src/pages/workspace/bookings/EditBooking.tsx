import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, Save } from "lucide-react";
import api from "@/api/axios";
import { useToast } from "@/components/confirm/ConfirmProvider";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { useModulePermissions } from "@/hooks/useModulePermissions";

interface Room {
  _id: string;
  roomNumber: string;
  roomType: string;
  pricePerNight: number;
  status: string;
}

interface GuestRow {
  name: string;
  email: string;
  phone: string;
  identity: File | null;
  existingIdentity?: string | null;
}

const BOOKING_SOURCE_OPTIONS = ["Walk-in", "Pre-booking", "Online"] as const;

interface BookingDetails {
  bookingId: string;
  roomId: string;
  guestName: string;
  guestType: "ADULT" | "CHILD";
  bookingSource?: "Walk-in" | "Pre-booking" | "Online";
  guestEmail: string;
  guestPhone: string;
  totalGuests: number;
  checkInDate: string;
  checkInTime?: string;
  checkOutDate: string;
  checkOutTime?: string;
  mainGuestIdentity?: string;
  guestsIdentity?: string[];
  guests?: Array<{
    name?: string;
    email?: string;
    phone?: string;
  }>;
}

const COUNTRY_CODES = ["+1", "+44", "+91", "+971"];

const splitPhoneNumber = (value: string) => {
  const matchedCode =
    COUNTRY_CODES.find((code) => value?.startsWith(code)) || "+1";

  return {
    countryCode: matchedCode,
    phone: value?.startsWith(matchedCode) ? value.slice(matchedCode.length) : value,
  };
};

const EditBooking = () => {
  const { branchId, bookingId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { formatCurrency } = useSystemSettings();
  const { canAccess, canUpdate } = useModulePermissions("BOOKINGS");

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [guests, setGuests] = useState<GuestRow[]>([]);
  const [existingMainGuestIdentity, setExistingMainGuestIdentity] = useState<string | null>(null);
  const [form, setForm] = useState({
    roomId: "",
    guestName: "",
    guestType: "",
    bookingSource: "Walk-in",
    email: "",
    countryCode: "+1",
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

  useEffect(() => {
    if (!canAccess || !canUpdate) {
      navigate("/unauthorized");
    }
  }, [canAccess, canUpdate, navigate]);

  useEffect(() => {
    if (!branchId || !bookingId) return;

    const loadData = async () => {
      try {
        setLoading(true);
        const [roomsRes, bookingRes] = await Promise.all([
          api.get<{ data: Room[] }>("/rooms", { params: { branchId } }),
          api.get<{ data: BookingDetails }>(`/bookings/${bookingId}`),
        ]);

        const booking = bookingRes.data.data;
        const phoneData = splitPhoneNumber(booking.guestPhone || "");
        const guestRows = Array.from(
          { length: Math.max(0, (booking.totalGuests || 1) - 1) },
          (_, index) => ({
            name: booking.guests?.[index]?.name || "",
            email: booking.guests?.[index]?.email || "",
            phone: booking.guests?.[index]?.phone || "",
            identity: null,
            existingIdentity: booking.guestsIdentity?.[index] || null,
          }),
        );

        setRooms(roomsRes.data.data || []);
        setGuests(guestRows);
        setExistingMainGuestIdentity(booking.mainGuestIdentity || null);
        setForm({
          roomId: booking.roomId,
          guestName: booking.guestName,
          guestType: booking.guestType || "",
          bookingSource: booking.bookingSource || "Walk-in",
          email: booking.guestEmail || "",
          countryCode: phoneData.countryCode,
          phone: phoneData.phone || "",
          totalGuests: booking.totalGuests || 1,
          checkInDate: booking.checkInDate ? new Date(booking.checkInDate).toISOString().slice(0, 10) : "",
          checkInTime: booking.checkInTime || "",
          checkOutDate: booking.checkOutDate ? new Date(booking.checkOutDate).toISOString().slice(0, 10) : "",
          checkOutTime: booking.checkOutTime || "",
          notes: "",
        });
      } catch (error) {
        console.error("Failed to load booking", error);
        toast.error("Failed to load booking.");
        navigate(`/workspace/${branchId}/bookings`);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [branchId, bookingId, navigate, toast]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;

    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      const nextError = validateRequired(name === "totalGuests" ? Number(value) : value);
      if (nextError) next[name] = nextError;
      else delete next[name];
      return next;
    });

    if (name === "totalGuests") {
      const count = Math.max(0, (parseInt(value, 10) || 1) - 1);
      setGuests((prev) =>
        Array.from({ length: count }, (_, index) => ({
          name: prev[index]?.name || "",
          email: prev[index]?.email || "",
          phone: prev[index]?.phone || "",
          identity: prev[index]?.identity || null,
          existingIdentity: prev[index]?.existingIdentity || null,
        })),
      );
    }
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

  const handleGuestChange = (index: number, field: keyof GuestRow, value: string) => {
    setGuests((prev) => {
      const nextGuests = [...prev];
      nextGuests[index] = { ...nextGuests[index], [field]: value };
      return nextGuests;
    });

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
    setGuests((prev) => {
      const nextGuests = [...prev];
      nextGuests[index] = { ...nextGuests[index], identity: file };
      return nextGuests;
    });

    setFieldErrors((prev) => {
      const next = { ...prev };
      const key = `guest-${index}-identity`;
      const hasExistingIdentity = guests[index]?.existingIdentity;
      const nextError = file || hasExistingIdentity ? "" : "This field is required";
      if (nextError) next[key] = nextError;
      else delete next[key];
      return next;
    });
  };

  const selectedRoom = useMemo(
    () => rooms.find((room) => room._id === form.roomId) ?? null,
    [rooms, form.roomId],
  );

  const nights = useMemo(() => {
    if (!form.checkInDate || !form.checkOutDate) return 0;
    const diff =
      new Date(form.checkOutDate).getTime() -
      new Date(form.checkInDate).getTime();
    return Math.max(0, Math.round(diff / 86400000));
  }, [form.checkInDate, form.checkOutDate]);

  const estimatedTotal = selectedRoom ? nights * selectedRoom.pricePerNight : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nextErrors: Record<string, string> = {};
    const requiredFields: Array<keyof typeof form> = [
      "roomId",
      "guestName",
      "guestType",
      "bookingSource",
      "email",
      "countryCode",
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

    const mainGuestIdentityError =
      mainGuestIdentity || existingMainGuestIdentity ? "" : "This field is required";
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

      const guestIdentityError =
        guest.identity || guest.existingIdentity ? "" : "This field is required";
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

      formData.append("roomId", form.roomId);
      formData.append("guestName", form.guestName.trim());
      formData.append("guestType", form.guestType);
      formData.append("bookingSource", form.bookingSource);
      formData.append("guestEmail", form.email);
      formData.append("guestPhone", `${form.countryCode}${form.phone}`);
      formData.append("totalGuests", String(form.totalGuests));
      formData.append("checkInDate", form.checkInDate);
      formData.append("checkInTime", form.checkInTime);
      formData.append("checkOutDate", form.checkOutDate);
      formData.append("checkOutTime", form.checkOutTime);

      if (mainGuestIdentity) {
        formData.append("mainGuestIdentity", mainGuestIdentity);
      }

      guests.forEach((guest, index) => {
        formData.append(`guests[${index}][name]`, guest.name);
        formData.append(`guests[${index}][email]`, guest.email);
        formData.append(`guests[${index}][phone]`, guest.phone);

        if (guest.identity) {
          formData.append("guestsIdentity", guest.identity);
        }
      });

      await api.put(`/bookings/${bookingId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Booking updated successfully.");
      navigate(`/workspace/${branchId}/bookings`);
    } catch (error) {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast.error(
        apiError.response?.data?.message || "Failed to update booking. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="ab-root animate-fade-in">
        <div className="bk-loading">
          <span className="eb-loading-spinner" />
          <span>Loading booking...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="ab-root animate-fade-in">
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
            <h1 className="page-title">Edit Booking</h1>
            <p className="page-subtitle">
              Update reservation details for this branch
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="ab-form-layout" noValidate>
        <div className="ab-form-main">
          <div className="luxury-card ab-section">
            <div className="ab-section-header">
              <h2 className="ab-section-title">Guest Details</h2>
              <p className="ab-section-sub">
                Enter the reservation guest information
              </p>
            </div>

            <div className="ab-grid-2">
              <div className="ab-field ab-field-full">
                <label htmlFor="edit-booking-guestName" className="ab-label">
                  Guest Name <span className="ab-required">*</span>
                </label>
                <input
                  id="edit-booking-guestName"
                  name="guestName"
                  value={form.guestName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="luxury-input"
                  style={fieldErrors.guestName ? { borderColor: "#dc2626" } : undefined}
                />
                {fieldErrors.guestName ? <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>{fieldErrors.guestName}</span> : null}
              </div>
              <div className="ab-field">
                <label htmlFor="edit-booking-guestType" className="ab-label">
                  Guest Type <span className="ab-required">*</span>
                </label>
                <select
                  id="edit-booking-guestType"
                  name="guestType"
                  value={form.guestType}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="luxury-input"
                  style={fieldErrors.guestType ? { borderColor: "#dc2626" } : undefined}
                >
                  <option value="">Select Guest Type</option>
                  <option value="ADULT">Adult</option>
                  <option value="CHILD">Child</option>
                </select>
                {fieldErrors.guestType ? <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>{fieldErrors.guestType}</span> : null}
              </div>
              <div className="ab-field">
                <label htmlFor="edit-booking-bookingSource" className="ab-label">
                  Booking Source <span className="ab-required">*</span>
                </label>
                <select
                  id="edit-booking-bookingSource"
                  name="bookingSource"
                  value={form.bookingSource}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="luxury-input"
                  style={fieldErrors.bookingSource ? { borderColor: "#dc2626" } : undefined}
                >
                  {BOOKING_SOURCE_OPTIONS.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
                {fieldErrors.bookingSource ? <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>{fieldErrors.bookingSource}</span> : null}
              </div>
              <div className="ab-field">
                <label htmlFor="edit-booking-email" className="ab-label">
                  Email
                </label>
                <input
                  id="edit-booking-email"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="luxury-input"
                  style={fieldErrors.email ? { borderColor: "#dc2626" } : undefined}
                />
                {fieldErrors.email ? <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>{fieldErrors.email}</span> : null}
              </div>
              <div className="ab-field">
                <label htmlFor="edit-booking-phone" className="ab-label">
                  Phone Number
                </label>
                <div className="flex gap-2">
                  <select
                    name="countryCode"
                    value={form.countryCode}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className="luxury-input max-w-[110px]"
                    style={fieldErrors.countryCode ? { borderColor: "#dc2626" } : undefined}
                  >
                    {COUNTRY_CODES.map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </select>
                  <input
                    id="edit-booking-phone"
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className="luxury-input"
                    style={fieldErrors.phone ? { borderColor: "#dc2626" } : undefined}
                  />
                </div>
                {fieldErrors.countryCode || fieldErrors.phone ? <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>{fieldErrors.countryCode || fieldErrors.phone}</span> : null}
              </div>
              <div className="ab-field">
                <label htmlFor="edit-booking-totalGuests" className="ab-label">
                  Total Guests
                </label>
                <input
                  id="edit-booking-totalGuests"
                  type="number"
                  name="totalGuests"
                  value={form.totalGuests}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="luxury-input"
                  style={fieldErrors.totalGuests ? { borderColor: "#dc2626" } : undefined}
                  min={1}
                />
                {fieldErrors.totalGuests ? <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>{fieldErrors.totalGuests}</span> : null}
              </div>
              <div className="ab-field">
                <label className="ab-label">Identity Proof (Main Guest)</label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setMainGuestIdentity(file);
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      const nextError = file || existingMainGuestIdentity ? "" : "This field is required";
                      if (nextError) next.mainGuestIdentity = nextError;
                      else delete next.mainGuestIdentity;
                      return next;
                    });
                  }}
                  className="luxury-input"
                  style={fieldErrors.mainGuestIdentity ? { borderColor: "#dc2626" } : undefined}
                />
                {existingMainGuestIdentity ? (
                  <span className="text-xs text-muted-foreground">Existing ID attached</span>
                ) : null}
                {fieldErrors.mainGuestIdentity ? <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>{fieldErrors.mainGuestIdentity}</span> : null}
              </div>
            </div>
          </div>

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
                  <label htmlFor={`edit-booking-guestName-${index}`} className="ab-label">
                    Guest {index + 2} Name
                  </label>
                  <input
                    id={`edit-booking-guestName-${index}`}
                    value={guest.name}
                    onChange={(e) => handleGuestChange(index, "name", e.target.value)}
                    onBlur={(e) => handleGuestChange(index, "name", e.target.value)}
                    className="luxury-input"
                    style={fieldErrors[`guest-${index}-name`] ? { borderColor: "#dc2626" } : undefined}
                  />
                  {fieldErrors[`guest-${index}-name`] ? <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>{fieldErrors[`guest-${index}-name`]}</span> : null}
                </div>
                <div className="ab-field">
                  <label htmlFor={`edit-booking-guestEmail-${index}`} className="ab-label">
                    Email
                  </label>
                  <input
                    id={`edit-booking-guestEmail-${index}`}
                    type="email"
                    value={guest.email}
                    onChange={(e) => handleGuestChange(index, "email", e.target.value)}
                    onBlur={(e) => handleGuestChange(index, "email", e.target.value)}
                    className="luxury-input"
                    style={fieldErrors[`guest-${index}-email`] ? { borderColor: "#dc2626" } : undefined}
                  />
                  {fieldErrors[`guest-${index}-email`] ? <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>{fieldErrors[`guest-${index}-email`]}</span> : null}
                </div>
                <div className="ab-field">
                  <label htmlFor={`edit-booking-guestPhone-${index}`} className="ab-label">
                    Phone
                  </label>
                  <input
                    id={`edit-booking-guestPhone-${index}`}
                    value={guest.phone}
                    onChange={(e) => handleGuestChange(index, "phone", e.target.value)}
                    onBlur={(e) => handleGuestChange(index, "phone", e.target.value)}
                    className="luxury-input"
                    style={fieldErrors[`guest-${index}-phone`] ? { borderColor: "#dc2626" } : undefined}
                  />
                  {fieldErrors[`guest-${index}-phone`] ? <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>{fieldErrors[`guest-${index}-phone`]}</span> : null}
                </div>
                <div className="ab-field">
                  <label className="ab-label">Identity Proof</label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleGuestFile(index, e.target.files?.[0] || null)}
                    className="luxury-input"
                    style={fieldErrors[`guest-${index}-identity`] ? { borderColor: "#dc2626" } : undefined}
                  />
                  {guest.existingIdentity ? (
                    <span className="text-xs text-muted-foreground">Existing ID attached</span>
                  ) : null}
                  {fieldErrors[`guest-${index}-identity`] ? <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>{fieldErrors[`guest-${index}-identity`]}</span> : null}
                </div>
              </div>
            ))}
          </div>

          <div className="luxury-card ab-section">
            <div className="ab-section-header">
              <h2 className="ab-section-title">Room Selection</h2>
              <p className="ab-section-sub">
                Choose from available rooms in this branch
              </p>
            </div>

            <div className="ab-grid-2">
              <div className="ab-field ab-field-full">
                <label htmlFor="edit-booking-roomId" className="ab-label">
                  Room <span className="ab-required">*</span>
                </label>
                <select
                  id="edit-booking-roomId"
                  name="roomId"
                  value={form.roomId}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="luxury-input"
                  style={fieldErrors.roomId ? { borderColor: "#dc2626" } : undefined}
                >
                  <option value="">- Select a room -</option>
                  {rooms.map((room) => (
                    <option key={room._id} value={room._id}>
                      Room {room.roomNumber} · {room.roomType} · {formatCurrency(room.pricePerNight)}/night
                    </option>
                  ))}
                </select>
                {fieldErrors.roomId ? <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>{fieldErrors.roomId}</span> : null}
              </div>
            </div>
          </div>

          <div className="luxury-card ab-section">
            <div className="ab-section-header">
              <h2 className="ab-section-title">Stay Duration</h2>
              <p className="ab-section-sub">
                Select check-in and check-out dates & times
              </p>
            </div>

            <div className="ab-grid-2">
              <div className="ab-field">
                <label htmlFor="edit-booking-checkInDate" className="ab-label">
                  Check-In Date <span className="ab-required">*</span>
                </label>
                <input
                  id="edit-booking-checkInDate"
                  type="date"
                  name="checkInDate"
                  value={form.checkInDate}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="luxury-input"
                  style={fieldErrors.checkInDate ? { borderColor: "#dc2626" } : undefined}
                />
                {fieldErrors.checkInDate ? <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>{fieldErrors.checkInDate}</span> : null}
              </div>
              <div className="ab-field">
                <label htmlFor="edit-booking-checkOutDate" className="ab-label">
                  Check-Out Date <span className="ab-required">*</span>
                </label>
                <input
                  id="edit-booking-checkOutDate"
                  type="date"
                  name="checkOutDate"
                  value={form.checkOutDate}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="luxury-input"
                  style={fieldErrors.checkOutDate ? { borderColor: "#dc2626" } : undefined}
                />
                {fieldErrors.checkOutDate ? <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>{fieldErrors.checkOutDate}</span> : null}
              </div>
            </div>

            <div className="ab-field">
              <label htmlFor="edit-booking-checkInTime" className="ab-label">
                Check-In Time
              </label>
              <input
                id="edit-booking-checkInTime"
                type="time"
                name="checkInTime"
                value={form.checkInTime}
                onChange={handleChange}
                onBlur={handleBlur}
                className="luxury-input"
                style={fieldErrors.checkInTime ? { borderColor: "#dc2626" } : undefined}
              />
              {fieldErrors.checkInTime ? <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>{fieldErrors.checkInTime}</span> : null}
            </div>

            <div className="ab-field">
              <label htmlFor="edit-booking-checkOutTime" className="ab-label">
                Check-Out Time
              </label>
              <input
                id="edit-booking-checkOutTime"
                type="time"
                name="checkOutTime"
                value={form.checkOutTime}
                onChange={handleChange}
                onBlur={handleBlur}
                className="luxury-input"
                style={fieldErrors.checkOutTime ? { borderColor: "#dc2626" } : undefined}
              />
              {fieldErrors.checkOutTime ? <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>{fieldErrors.checkOutTime}</span> : null}
            </div>
          </div>
        </div>

        <div className="ab-form-side">
          <div className="luxury-card ab-summary-card">
            <h3 className="ab-summary-title">Booking Summary</h3>
            <div className="ab-summary-rows">
              <div className="ab-summary-row">
                <span className="ab-summary-key">Guest</span>
                <span className="ab-summary-val">
                  {form.guestName || <span className="ab-empty">-</span>}
                </span>
              </div>
              <div className="ab-summary-row">
                <span className="ab-summary-key">Guest Type</span>
                <span className="ab-summary-val">
                  {form.guestType || <span className="ab-empty">-</span>}
                </span>
              </div>
              <div className="ab-summary-row">
                <span className="ab-summary-key">Source</span>
                <span className="ab-summary-val">
                  {form.bookingSource || <span className="ab-empty">-</span>}
                </span>
              </div>
              <div className="ab-summary-row">
                <span className="ab-summary-key">Room</span>
                <span className="ab-summary-val">
                  {selectedRoom ? `#${selectedRoom.roomNumber}` : <span className="ab-empty">-</span>}
                </span>
              </div>
              <div className="ab-summary-row">
                <span className="ab-summary-key">Check-In</span>
                <span className="ab-summary-val">
                  {form.checkInDate ? new Date(form.checkInDate).toLocaleDateString() : <span className="ab-empty">-</span>}
                </span>
              </div>
              <div className="ab-summary-row">
                <span className="ab-summary-key">Check-Out</span>
                <span className="ab-summary-val">
                  {form.checkOutDate ? new Date(form.checkOutDate).toLocaleDateString() : <span className="ab-empty">-</span>}
                </span>
              </div>
              <div className="ab-summary-row">
                <span className="ab-summary-key">Nights</span>
                <span className="ab-summary-val">
                  {nights > 0 ? `${nights} night${nights !== 1 ? "s" : ""}` : <span className="ab-empty">-</span>}
                </span>
              </div>
              <div className="ab-summary-row ab-summary-price-row">
                <span className="ab-summary-key">Est. Total</span>
                <span className="ab-summary-nights">
                  {estimatedTotal > 0 ? formatCurrency(estimatedTotal) : <span className="ab-empty">-</span>}
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
                  <span className="eb-loading-spinner mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={15} className="mr-2" />
                  Update Booking
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate(`/workspace/${branchId}/bookings`)}
              className="luxury-btn luxury-btn-outline ag-cancel-btn"
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default EditBooking;
