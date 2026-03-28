import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BedDouble,
  CalendarDays,
  CreditCard,
  FileText,
  Loader2,
  LogIn,
  LogOut,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  UserRound,
  XCircle,
} from "lucide-react";
import api from "@/api/axios";
import { useToast, useConfirm } from "@/components/confirm/ConfirmProvider";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import { useAuth } from "@/contexts/AuthContext";

type BookingStatus = "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELLED";
type PaymentStatus = "PENDING" | "PARTIAL" | "PAID";
type PaymentMethod = "CASH" | "CARD" | "UPI";

interface BookingServiceItem {
  _id: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
}

interface BookingDetail {
  _id: string;
  bookingId: string;
  status: BookingStatus;
  bookingSource?: string;
  createdAt: string;
  guestName: string;
  totalGuests?: number;
  guestPhone?: string;
  guestEmail?: string;
  identityProof?: {
    url?: string | null;
    fileName?: string | null;
    fileType?: string | null;
  } | null;
  checkInDate: string;
  checkOutDate: string;
  checkInTime?: string;
  checkOutTime?: string;
  actualCheckIn?: string | null;
  actualCheckOut?: string | null;
  nights: number;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod | null;
  paymentDate?: string | null;
  room?: {
    _id: string;
    roomNumber: string;
    roomType: string;
    floor?: number;
    pricePerNight: number;
  } | null;
  branch?: {
    _id: string;
    name: string;
    location?: string;
    address?: string;
  } | null;
  services?: BookingServiceItem[];
  invoice?: {
    invoiceId: string;
    pdfUrl: string;
  } | null;
  financialSummary?: {
    roomCharges: number;
    serviceCharges: number;
    taxAmount: number;
    totalAmount: number;
    taxPercentage: number;
    paymentStatus: PaymentStatus;
    paymentMethod?: PaymentMethod | null;
    paymentDate?: string | null;
  };
}

interface ServiceFormState {
  name: string;
  price: string;
  quantity: string;
}

const PRESET_SERVICES = [
  { name: "Room Service — Breakfast", price: 45 },
  { name: "Room Service — Dinner", price: 85 },
  { name: "Laundry — Standard", price: 25 },
  { name: "Laundry — Express", price: 50 },
  { name: "Spa — Classic Massage", price: 120 },
  { name: "Spa — Premium Package", price: 250 },
  { name: "Mini Bar", price: 35 },
  { name: "Extra Bed", price: 60 },
  { name: "Airport Transfer", price: 100 },
  { name: "Late Checkout Fee", price: 75 },
] as const;

const emptyServiceForm: ServiceFormState = {
  name: "",
  price: "0",
  quantity: "1",
};

const statusLabelMap: Record<BookingStatus, string> = {
  CONFIRMED: "Booked",
  CHECKED_IN: "Checked-In",
  CHECKED_OUT: "Checked-Out",
  CANCELLED: "Cancelled",
};

const statusBadgeMap: Record<BookingStatus, string> = {
  CONFIRMED: "badge-warning",
  CHECKED_IN: "badge-active",
  CHECKED_OUT: "badge-info",
  CANCELLED: "badge-danger",
};

const paymentBadgeMap: Record<PaymentStatus, string> = {
  PENDING: "badge-warning",
  PARTIAL: "badge-warning",
  PAID: "badge-active",
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  return new Date(value).toLocaleString();
};

const formatScheduledDateTime = (date?: string | null, time?: string | null) => {
  if (!date) return "—";

  const formattedDate = new Date(date).toLocaleDateString();
  return time ? `${formattedDate}, ${time}` : formattedDate;
};

const formatStatusText = (status?: string | null) =>
  status ? status.replace("_", "-") : "—";

const getDocumentUrl = (documentPath?: string | null) => {
  if (!documentPath) return null;

  const baseUrl =
    (import.meta.env.VITE_API_BASE_URL || window.location.origin).replace(
      /\/api\/?$/,
      "",
    );
  const filePath = documentPath.startsWith("http")
    ? documentPath
    : documentPath.startsWith("/uploads/")
      ? documentPath
      : `/uploads/guest-identities/${documentPath.replace(/^\/+/, "")}`;

  return filePath.startsWith("http") ? filePath : `${baseUrl}${filePath}`;
};

const getFileExtension = (value?: string | null) => {
  if (!value) return "";
  const sanitizedValue = value.split("?")[0].split("#")[0];
  const parts = sanitizedValue.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
};

const isImageFile = (fileType?: string | null, fileNameOrUrl?: string | null) =>
  Boolean(
    fileType?.toLowerCase().startsWith("image/") ||
      ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(
        getFileExtension(fileNameOrUrl),
      ),
  );

const isPdfFile = (fileType?: string | null, fileNameOrUrl?: string | null) =>
  Boolean(
    fileType?.toLowerCase().includes("pdf") ||
      getFileExtension(fileNameOrUrl) === "pdf",
  );

const ViewBooking = () => {
  const { branchId, bookingId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const { formatCurrency } = useSystemSettings();
  const { canAccess, canUpdate } = useModulePermissions("BOOKINGS");
  const { hasPermission } = useAuth();

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<BookingServiceItem | null>(null);
  const [serviceForm, setServiceForm] = useState<ServiceFormState>(emptyServiceForm);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const canProcessPayment = hasPermission("RECORD_PAYMENT") || canUpdate;

  const loadBooking = async () => {
    if (!bookingId) return;

    try {
      setLoading(true);
      const response = await api.get<{ data: BookingDetail }>(`/bookings/${bookingId}`);
      setBooking(response.data.data);
    } catch (error) {
      console.error("Failed to load booking", error);
      toast.error("Failed to load booking.");
      navigate(`/workspace/${branchId}/bookings`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canAccess) {
      navigate("/unauthorized");
      return;
    }

    loadBooking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId, canAccess]);

  const summary = booking?.financialSummary;
  const services = booking?.services || [];
  const isBooked = booking?.status === "CONFIRMED";
  const isCheckedIn = booking?.status === "CHECKED_IN";
  const isCheckedOut = booking?.status === "CHECKED_OUT";
  const isCancelled = booking?.status === "CANCELLED";
  const isPaid = booking?.paymentStatus === "PAID";
  const canEditBooking = canUpdate && !isCheckedOut && !isCancelled;
  const canEditServices = canUpdate && isCheckedIn && !isPaid;

  const serviceDraftTotal = useMemo(() => {
    const price = Number(serviceForm.price || 0);
    const quantity = Number(serviceForm.quantity || 0);
    return Number.isFinite(price * quantity) ? price * quantity : 0;
  }, [serviceForm.price, serviceForm.quantity]);

  const identityDocumentUrl = useMemo(
    () => getDocumentUrl(booking?.identityProof?.url),
    [booking?.identityProof?.url],
  );

  const resetServiceModal = () => {
    setServiceModalOpen(false);
    setEditingService(null);
    setServiceForm(emptyServiceForm);
  };

  const openAddService = () => {
    setEditingService(null);
    setServiceForm(emptyServiceForm);
    setServiceModalOpen(true);
  };

  const openEditService = (service: BookingServiceItem) => {
    setEditingService(service);
    setServiceForm({
      name: service.name,
      price: String(service.price),
      quantity: String(service.quantity),
    });
    setServiceModalOpen(true);
  };

  const runStatusUpdate = async (status: BookingStatus) => {
    if (!bookingId) return;

    try {
      setBusyAction(status);
      await api.patch(`/bookings/${bookingId}/status`, {
        status,
      });

      if (status === "CHECKED_IN") {
        toast.success("Guest checked in successfully.");
      } else if (status === "CHECKED_OUT") {
        toast.success("Guest has been checked out.");
      } else if (status === "CANCELLED") {
        toast.success("Booking cancelled successfully.");
      }

      await loadBooking();
    } catch (error) {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast.error(apiError.response?.data?.message || "Failed to update booking status.");
    } finally {
      setBusyAction(null);
    }
  };

  const handleCancelBooking = async () => {
    const confirmed = await confirm({
      title: "Cancel Booking",
      message: "Are you sure you want to cancel this booking?",
      confirmLabel: "Cancel Booking",
      cancelLabel: "Keep Booking",
    });

    if (confirmed) {
      await runStatusUpdate("CANCELLED");
    }
  };

  const handleCheckOut = async () => {
    if (!bookingId || !booking) return;

    if (booking.paymentStatus !== "PAID") {
      toast.error("Payment must be completed before checkout.");
      return;
    }

    await runStatusUpdate("CHECKED_OUT");
  };

  const handleSubmitService = async () => {
    if (!bookingId) return;

    const payload = {
      name: serviceForm.name.trim(),
      price: Number(serviceForm.price),
      quantity: Number(serviceForm.quantity),
    };

    if (!payload.name) {
      toast.warning("Service name is required.");
      return;
    }

    if (payload.price < 0 || payload.quantity <= 0) {
      toast.warning("Enter a valid service price and quantity.");
      return;
    }

    try {
      setBusyAction(editingService ? "UPDATE_SERVICE" : "ADD_SERVICE");

      const response = editingService
        ? await api.patch<{ data: BookingDetail }>(
            `/bookings/${bookingId}/services/${editingService._id}`,
            payload,
          )
        : await api.post<{ data: BookingDetail }>(`/bookings/${bookingId}/services`, payload);

      setBooking(response.data.data);
      resetServiceModal();
      toast.success(editingService ? "Service updated successfully." : "Service added successfully.");
      await loadBooking();
    } catch (error) {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast.error(apiError.response?.data?.message || "Failed to save service.");
    } finally {
      setBusyAction(null);
    }
  };

  const handleRemoveService = async (service: BookingServiceItem) => {
    if (!bookingId) return;

    const confirmed = await confirm({
      title: "Remove Service",
      message: `Remove ${service.name} from this booking?`,
      confirmLabel: "Remove",
      processingLabel: "Removing...",
      successMessage: "Service removed successfully.",
      errorMessage: "Failed to remove service.",
      onConfirm: async () => {
        setBusyAction("REMOVE_SERVICE");
        await api.delete(`/bookings/${bookingId}/services/${service._id}`);
        await loadBooking();
      },
    });

    if (!confirmed) {
      setBusyAction(null);
    } else {
      setBusyAction(null);
    }
  };

  const openInvoiceBlob = async (invoiceId: string) => {
    const response = await api.get(`/invoices/${invoiceId}/pdf`, {
      responseType: "blob",
    });

    const blobUrl = URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
    window.open(blobUrl, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  };

  const handleViewIdentity = () => {
    if (!identityDocumentUrl) {
      toast.warning("Document not available");
      return;
    }

    if (isImageFile(booking.identityProof?.fileType, booking.identityProof?.fileName || booking.identityProof?.url)) {
      setPreviewImage(identityDocumentUrl);
      return;
    }

    if (isPdfFile(booking.identityProof?.fileType, booking.identityProof?.fileName || booking.identityProof?.url)) {
      window.open(identityDocumentUrl, "_blank", "noopener,noreferrer");
      return;
    }

    const link = document.createElement("a");
    link.href = identityDocumentUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.setAttribute(
      "download",
      booking.identityProof?.fileName ||
        identityDocumentUrl.split("/").pop() ||
        "identity-proof",
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGenerateInvoice = async () => {
    if (!bookingId) return;

    try {
      setBusyAction("INVOICE");
      const invoiceId = booking?.invoice?.invoiceId
        ? booking.invoice.invoiceId
        : (
            await api.post<{ data: { invoiceId: string } }>(`/bookings/${bookingId}/invoice`)
          ).data.data.invoiceId;

      await openInvoiceBlob(invoiceId);
      toast.success("Invoice opened successfully.");
      await loadBooking();
    } catch (error) {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast.error(apiError.response?.data?.message || "Failed to generate invoice.");
    } finally {
      setBusyAction(null);
    }
  };

  const handleProcessPayment = async (method: PaymentMethod) => {
    if (!bookingId) return;

    try {
      setBusyAction("PAYMENT");
      const response = await api.post<{ data: BookingDetail }>(`/bookings/${bookingId}/payment`, {
        method,
      });

      setBooking(response.data.data);
      setPaymentModalOpen(false);
      toast.success(`Payment received via ${method}.`);
      await loadBooking();
      await handleGenerateInvoice();
    } catch (error) {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast.error(apiError.response?.data?.message || "Failed to process payment.");
    } finally {
      setBusyAction(null);
    }
  };

  if (loading || !booking) {
    return (
      <div className="bk-root animate-fade-in">
        <div className="bk-loading">
          <span className="eb-loading-spinner" />
          <span>Loading booking...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bvd-root animate-fade-in">
      <div className="bvd-shell">
        <div className="bvd-header">
          <div className="bvd-header-left">
            <button
              type="button"
              onClick={() => navigate(`/workspace/${branchId}/bookings`)}
              className="ab-back-btn"
              aria-label="Back to bookings"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="bvd-title">{booking.bookingId}</h1>
              <p className="bvd-subtitle">
                Created {new Date(booking.createdAt).toLocaleDateString()} • {booking.bookingSource || "Walk-in"}
              </p>
            </div>
          </div>
          <span className={`luxury-badge ${statusBadgeMap[booking.status]}`}>
            {statusLabelMap[booking.status]}
          </span>
        </div>

        <div className="bvd-actions">
          {isBooked ? (
            <>
              <button
                type="button"
                className="luxury-btn luxury-btn-primary bvd-btn-green"
                onClick={() => runStatusUpdate("CHECKED_IN")}
                disabled={busyAction !== null}
              >
                {busyAction === "CHECKED_IN" ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
                Check In
              </button>
              <button
                type="button"
                className="luxury-btn luxury-btn-destructive"
                onClick={handleCancelBooking}
                disabled={busyAction !== null}
              >
                <XCircle size={16} />
                Cancel
              </button>
            </>
          ) : null}

          {isCheckedIn ? (
            <>
              <button
                type="button"
                className="luxury-btn luxury-btn-secondary bvd-btn-gold"
                onClick={openAddService}
                disabled={!canEditServices || busyAction !== null}
              >
                <Plus size={16} />
                Add Service
              </button>
              <button
                type="button"
                className="luxury-btn luxury-btn-outline"
                onClick={() => setPaymentModalOpen(true)}
                disabled={!canProcessPayment || isPaid || busyAction !== null}
              >
                <CreditCard size={16} />
                Process Payment
              </button>
              <button
                type="button"
                className="luxury-btn luxury-btn-primary bvd-btn-green"
                onClick={handleCheckOut}
                disabled={busyAction !== null}
              >
                <LogOut size={16} />
                Check Out
              </button>
            </>
          ) : null}

          {(isCheckedOut || isPaid) && (
            <button
              type="button"
              className="luxury-btn luxury-btn-outline"
              onClick={handleGenerateInvoice}
              disabled={busyAction !== null}
            >
              <FileText size={16} />
              Generate Invoice
            </button>
          )}

          {canEditBooking ? (
            <button
              type="button"
              className="luxury-btn luxury-btn-ghost"
              onClick={() => navigate(`/workspace/${branchId}/bookings/edit/${booking.bookingId}`)}
              disabled={busyAction !== null}
            >
              <Pencil size={16} />
              Edit Booking
            </button>
          ) : null}
        </div>

        <div className="bvd-card-grid">
          <section className="luxury-card bvd-info-card">
            <div className="bvd-card-head">
              <UserRound size={15} />
              <span>Guest</span>
            </div>
            <div className="bvd-card-body">
              <strong>{booking.guestName}</strong>
              <span>
                {booking.totalGuests || 1} guest{(booking.totalGuests || 1) !== 1 ? "s" : ""} staying
              </span>
              <span>{booking.guestPhone || "No phone added"}</span>
              {booking.identityProof?.url ? (
                <button
                  type="button"
                  className="bvd-identity-link"
                  onClick={handleViewIdentity}
                >
                  ID / Passport attached
                </button>
              ) : (
                <span>ID / Passport not attached</span>
              )}
            </div>
          </section>

          <section className="luxury-card bvd-info-card">
            <div className="bvd-card-head">
              <BedDouble size={15} />
              <span>Room</span>
            </div>
            <div className="bvd-card-body">
              <strong>
                Room {booking.room?.roomNumber || "—"} — {formatStatusText(booking.room?.roomType || "")}
              </strong>
              <span>Room No: {booking.room?.roomNumber || "—"}</span>
              <span>Floor {booking.room?.floor ?? "—"}</span>
              <span className="bvd-highlight">
                {formatCurrency(booking.room?.pricePerNight || 0)}/night
              </span>
            </div>
          </section>

          <section className="luxury-card bvd-info-card">
            <div className="bvd-card-head">
              <MapPin size={15} />
              <span>Branch</span>
            </div>
            <div className="bvd-card-body">
              <strong>{booking.branch?.name || "—"}</strong>
              <span>{booking.branch?.location || booking.branch?.address || "—"}</span>
            </div>
          </section>
        </div>

        <section className="luxury-card bvd-section-card">
          <div className="bvd-card-head">
            <CalendarDays size={15} />
            <span>Stay Dates</span>
          </div>
          <div className={`bvd-stay-grid ${booking.actualCheckOut ? "bvd-stay-grid-four" : booking.actualCheckIn ? "bvd-stay-grid-three" : ""}`}>
            <div>
                <span className="bvd-meta-label">Check-In</span>
              <strong>{formatScheduledDateTime(booking.checkInDate, booking.checkInTime)}</strong>
            </div>
            <div>
              <span className="bvd-meta-label">Check-Out</span>
              <strong>{formatScheduledDateTime(booking.checkOutDate, booking.checkOutTime)}</strong>
            </div>
            {booking.actualCheckIn ? (
              <div>
                <span className="bvd-meta-label">Actual Check-In</span>
                <strong className="bvd-text-success">{formatDateTime(booking.actualCheckIn)}</strong>
              </div>
            ) : null}
            {booking.actualCheckOut ? (
              <div>
                <span className="bvd-meta-label">Actual Check-Out</span>
                <strong className="bvd-text-success">{formatDateTime(booking.actualCheckOut)}</strong>
              </div>
            ) : null}
          </div>
        </section>

        <section className="luxury-card bvd-section-card">
          <div className="bvd-section-header">
            <h2 className="bvd-section-title">Services & Charges</h2>
          </div>
          {services.length === 0 ? (
            <div className="bvd-empty-state">No services added yet.</div>
          ) : (
            <div className="bvd-table-scroll">
              <table className="luxury-table">
                <thead>
                  <tr>
                    <th>Service Name</th>
                    <th>Price</th>
                    <th>Quantity</th>
                    <th>Total</th>
                    {canEditServices ? <th>Actions</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {services.map((service) => (
                    <tr key={service._id}>
                      <td>{service.name}</td>
                      <td>{formatCurrency(service.price)}</td>
                      <td>{service.quantity}</td>
                      <td>{formatCurrency(service.total)}</td>
                      {canEditServices ? (
                        <td>
                          <div className="bvd-service-actions">
                            <button
                              type="button"
                              className="bvd-inline-btn"
                              onClick={() => openEditService(service)}
                            >
                              <Pencil size={14} />
                              Edit
                            </button>
                            <button
                              type="button"
                              className="bvd-inline-btn bvd-inline-btn-danger"
                              onClick={() => handleRemoveService(service)}
                            >
                              <Trash2 size={14} />
                              Remove
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="luxury-card bvd-section-card bvd-bill-card">
          <div className="bvd-section-header">
            <h2 className="bvd-section-title">Bill Summary</h2>
          </div>
          <div className="bvd-summary-list">
            <div className="bvd-summary-row">
              <span>Room Charges</span>
              <strong>{formatCurrency(summary?.roomCharges || 0)}</strong>
            </div>
            <div className="bvd-summary-row">
              <span>Service Charges</span>
              <strong>{formatCurrency(summary?.serviceCharges || 0)}</strong>
            </div>
            <div className="bvd-summary-row">
              <span>Tax ({summary?.taxPercentage || 0}%)</span>
              <strong>{formatCurrency(summary?.taxAmount || 0)}</strong>
            </div>
            <div className="bvd-summary-row bvd-summary-total">
              <span>Total Amount</span>
              <strong className="bvd-highlight">{formatCurrency(summary?.totalAmount || 0)}</strong>
            </div>
            <div className="bvd-summary-row">
              <span>Payment Status</span>
              <span className={`luxury-badge ${paymentBadgeMap[booking.paymentStatus]}`}>
                {booking.paymentStatus === "PENDING" ? "Pending" : booking.paymentStatus}
              </span>
            </div>
            {summary?.paymentMethod ? (
              <div className="bvd-summary-row">
                <span>Payment Method</span>
                <strong>{summary.paymentMethod}</strong>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      {serviceModalOpen ? (
        <div className="bvd-modal-layer" role="presentation">
          <div className="bvd-modal-backdrop" onClick={resetServiceModal} />
          <div className="bvd-modal-card">
            <h3 className="bvd-modal-title">{editingService ? "Edit Service" : "Add Service"}</h3>
            <div className="bvd-preset-grid">
              {PRESET_SERVICES.map((service) => (
                <button
                  key={service.name}
                  type="button"
                  className="bvd-preset-btn"
                  onClick={() =>
                    setServiceForm({
                      name: service.name,
                      price: String(service.price),
                      quantity: serviceForm.quantity || "1",
                    })
                  }
                >
                  {service.name} ({formatCurrency(service.price)})
                </button>
              ))}
            </div>
            <div className="ab-field">
              <label className="ab-label">Service Name</label>
              <input
                className="luxury-input"
                value={serviceForm.name}
                onChange={(e) => setServiceForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Custom service"
              />
            </div>
            <div className="ab-grid-2">
              <div className="ab-field">
                <label className="ab-label">Price ($)</label>
                <input
                  className="luxury-input"
                  type="number"
                  min="0"
                  value={serviceForm.price}
                  onChange={(e) => setServiceForm((prev) => ({ ...prev, price: e.target.value }))}
                />
              </div>
              <div className="ab-field">
                <label className="ab-label">Quantity</label>
                <input
                  className="luxury-input"
                  type="number"
                  min="1"
                  value={serviceForm.quantity}
                  onChange={(e) => setServiceForm((prev) => ({ ...prev, quantity: e.target.value }))}
                />
              </div>
            </div>
            <div className="bvd-modal-total">Total: {formatCurrency(serviceDraftTotal)}</div>
            <div className="bvd-modal-actions">
              <button type="button" className="luxury-btn luxury-btn-outline" onClick={resetServiceModal}>
                Cancel
              </button>
              <button
                type="button"
                className="luxury-btn luxury-btn-secondary bvd-btn-gold"
                onClick={handleSubmitService}
                disabled={busyAction !== null}
              >
                {busyAction === "ADD_SERVICE" || busyAction === "UPDATE_SERVICE" ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Plus size={16} />
                )}
                {editingService ? "Update Service" : "Add Service"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {paymentModalOpen ? (
        <div className="bvd-modal-layer" role="presentation">
          <div className="bvd-modal-backdrop" onClick={() => setPaymentModalOpen(false)} />
          <div className="bvd-modal-card bvd-payment-modal">
            <h3 className="bvd-modal-title">Process Payment</h3>
            <div className="bvd-payment-total">{formatCurrency(summary?.totalAmount || 0)}</div>
            <div className="bvd-payment-options">
              {(["CASH", "CARD", "UPI"] as PaymentMethod[]).map((method) => (
                <button
                  key={method}
                  type="button"
                  className="bvd-payment-option"
                  onClick={() => handleProcessPayment(method)}
                  disabled={busyAction !== null}
                >
                  {method === "CASH" ? "Cash" : method === "CARD" ? "Card" : "UPI"}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="luxury-btn luxury-btn-ghost"
              onClick={() => setPaymentModalOpen(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {previewImage ? (
        <div className="bvd-modal-layer" role="presentation">
          <div className="bvd-modal-backdrop" onClick={() => setPreviewImage(null)} />
          <div className="bvd-modal-card">
            <img
              src={previewImage}
              alt="Identity proof preview"
              style={{ maxWidth: "100%", maxHeight: "80vh", objectFit: "contain" }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ViewBooking;
