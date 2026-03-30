import { useEffect, useState } from "react";
import api from "@/api/axios";
import { useAuth } from "@/contexts/AuthContext";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import { useConfirm } from "@/components/confirm/ConfirmProvider";
import PermissionNotice from "@/components/auth/PermissionNotice";
import {
  DollarSign,
  ArrowLeft,
  History,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Download,
  CreditCard,
} from "lucide-react";

interface Invoice {
  _id: string;
  invoiceId: string;
  type: "ROOM" | "RESTAURANT";
  bookingId?: string | null;
  guestName?: string;
  orderType?: "DINE_IN" | "ROOM_SERVICE" | "TAKEAWAY" | null;
  totalAmount: number;
  taxAmount: number;
  finalAmount: number;
  paidAmount: number;
  dueAmount: number;
  status: string;
  paymentHistory: {
    amount: number;
    method: string;
    paidAt: string;
  }[];
}

interface InvoiceFormState {
  totalAmount: string;
  taxAmount: string;
  finalAmount: string;
  paidAmount: string;
  dueAmount: string;
  status: string;
}

const viewInvoice = async (invoiceId: string) => {
  const res = await api.get(`/invoices/${invoiceId}/pdf`, {
    responseType: "blob",
  });

  const file = new Blob([res.data as any], { type: "application/pdf" });
  const fileURL = URL.createObjectURL(file);

  window.open(fileURL);
};

const downloadInvoice = async (invoiceId: string) => {
  const res = await api.get(`/invoices/${invoiceId}/pdf?download=true`, {
    responseType: "blob",
  });

  const url = window.URL.createObjectURL(new Blob([res.data as any]));
  const link = document.createElement("a");

  link.href = url;
  link.setAttribute("download", `invoice-${invoiceId}.pdf`);

  document.body.appendChild(link);
  link.click();
  link.remove();
};

const statusBadge: Record<string, string> = {
  UNPAID: "badge-unpaid",
  PARTIALLY_PAID: "badge-partially-paid",
  PAID: "badge-paid",
};

const renderStatusBadge = (status: string) => {
  const badgeClass = statusBadge[status] || "badge-info";
  return (
    <span className={`luxury-badge ${badgeClass}`}>
      {status === "PAID" && <span className="badge-dot" />}
      {status}
    </span>
  );
};

const orderTypeLabelMap: Record<string, string> = {
  DINE_IN: "Dine-in",
  ROOM_SERVICE: "Room Service",
  TAKEAWAY: "Takeaway",
};

const getInvoiceGuestName = (invoice: Invoice) =>
  invoice.guestName?.trim() || "Walk-in Guest";

const getInvoiceOrderType = (invoice: Invoice) =>
  invoice.orderType
    ? orderTypeLabelMap[invoice.orderType] || invoice.orderType
    : "Room Service";

const createInvoiceForm = (invoice: Invoice): InvoiceFormState => ({
  totalAmount: String(invoice.totalAmount ?? 0),
  taxAmount: String(invoice.taxAmount ?? 0),
  finalAmount: String(invoice.finalAmount ?? 0),
  paidAmount: String(invoice.paidAmount ?? 0),
  dueAmount: String(invoice.dueAmount ?? 0),
  status: invoice.status ?? "UNPAID",
});

const formatAmountForInput = (amount: number) => {
  if (!Number.isFinite(amount)) return "0.00";
  return (Math.round((amount + Number.EPSILON) * 100) / 100).toFixed(2);
};

const getDefaultPaymentAmount = (invoice: Invoice) =>
  formatAmountForInput(
    invoice.dueAmount > 0 ? invoice.dueAmount : (invoice.totalAmount ?? 0),
  );

const Finance = () => {
  const { user } = useAuth();
  const { formatCurrency, currencySymbol } = useSystemSettings();
  const confirm = useConfirm();
  const { canAccess, canView, canUpdate, canDelete } =
    useModulePermissions("FINANCE");
  if (user && !canAccess) {
    window.location.href = "/unauthorized";
  }

  const shouldHideContent = !!user && canAccess && !canView;

  const canRecordPayment = canUpdate;
  const canEditInvoices = canAccess;
  const canRemoveInvoices = canDelete || canAccess;

  const [roomInvoices, setRoomInvoices] = useState<Invoice[]>([]);
  const [restaurantInvoices, setRestaurantInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [activeView, setActiveView] = useState<"payment" | "edit" | null>(null);
  const [openActionId, setOpenActionId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [roomSearch, setRoomSearch] = useState("");
  const [restaurantSearch, setRestaurantSearch] = useState("");
  const [editForm, setEditForm] = useState<InvoiceFormState>({
    totalAmount: "",
    taxAmount: "",
    finalAmount: "",
    paidAmount: "",
    dueAmount: "",
    status: "UNPAID",
  });

  const fetchInvoices = async () => {
    const [roomRes, restaurantRes] = await Promise.all([
      api.get<{ data: Invoice[] }>("/invoices", {
        params: { type: "ROOM" },
      }),
      api.get<{ data: Invoice[] }>("/invoices", {
        params: { type: "RESTAURANT" },
      }),
    ]);

    setRoomInvoices(roomRes.data.data || []);
    setRestaurantInvoices(restaurantRes.data.data || []);
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const resetDetailState = () => {
    setSelectedInvoice(null);
    setActiveView(null);
    setPaymentAmount("");
    setPaymentMethod("CASH");
    setEditForm({
      totalAmount: "",
      taxAmount: "",
      finalAmount: "",
      paidAmount: "",
      dueAmount: "",
      status: "UNPAID",
    });
  };

  const openPaymentView = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setActiveView("payment");
    setPaymentAmount(getDefaultPaymentAmount(invoice));
    setPaymentMethod("CASH");
  };

  const openEditView = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setActiveView("edit");
    setEditForm(createInvoiceForm(invoice));
  };

  const handleRecordPayment = async () => {
    if (!selectedInvoice) return;

    await api.patch(`/invoices/${selectedInvoice.invoiceId}/payment`, {
      amount: Number(paymentAmount),
      method: paymentMethod,
    });

    const updatedInvoices = await Promise.all([
      api.get<{ data: Invoice[] }>("/invoices", {
        params: { type: "ROOM" },
      }),
      api.get<{ data: Invoice[] }>("/invoices", {
        params: { type: "RESTAURANT" },
      }),
    ]);

    setRoomInvoices(updatedInvoices[0].data.data || []);
    setRestaurantInvoices(updatedInvoices[1].data.data || []);
    resetDetailState();
  };

  const handleUpdateInvoice = async () => {
    if (!selectedInvoice) return;

    await api.patch(`/invoices/${selectedInvoice.invoiceId}`, {
      totalAmount: Number(editForm.totalAmount),
      taxAmount: Number(editForm.taxAmount),
      finalAmount: Number(editForm.finalAmount),
      paidAmount: Number(editForm.paidAmount),
      dueAmount: Number(editForm.dueAmount),
      status: editForm.status,
    });

    await fetchInvoices();
    resetDetailState();
  };

  const handleDeleteInvoice = async (invoice: Invoice) => {
    const confirmed = await confirm({
      title: "Delete Invoice",
      message: `Are you sure you want to delete invoice ${invoice.invoiceId}?`,
      successMessage: "Invoice deleted successfully.",
      errorMessage: "Failed to delete invoice.",
      onConfirm: async () => {
        await api.delete(`/invoices/${invoice.invoiceId}`);
      },
    });

    if (confirmed) {
      setOpenActionId(null);
      if (selectedInvoice?.invoiceId === invoice.invoiceId) {
        resetDetailState();
      }
      await fetchInvoices();
    }
  };

  const [roomCurrentPage, setRoomCurrentPage] = useState(1);
  const [restaurantCurrentPage, setRestaurantCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const filteredRoomInvoices = roomInvoices.filter((invoice) => {
    const normalizedSearch = roomSearch.trim().toLowerCase();

    if (!normalizedSearch) return true;

    return (
      invoice.invoiceId.toLowerCase().includes(normalizedSearch) ||
      getInvoiceGuestName(invoice).toLowerCase().includes(normalizedSearch)
    );
  });

  const filteredRestaurantInvoices = restaurantInvoices.filter((invoice) => {
    const normalizedSearch = restaurantSearch.trim().toLowerCase();

    if (!normalizedSearch) return true;

    return (
      invoice.invoiceId.toLowerCase().includes(normalizedSearch) ||
      getInvoiceGuestName(invoice).toLowerCase().includes(normalizedSearch)
    );
  });

  const roomTotalPages = Math.max(
    1,
    Math.ceil(filteredRoomInvoices.length / itemsPerPage),
  );
  const restaurantTotalPages = Math.max(
    1,
    Math.ceil(filteredRestaurantInvoices.length / itemsPerPage),
  );

  const paginatedRoomInvoices = filteredRoomInvoices.slice(
    (roomCurrentPage - 1) * itemsPerPage,
    roomCurrentPage * itemsPerPage,
  );

  const paginatedPOSInvoices = filteredRestaurantInvoices.slice(
    (restaurantCurrentPage - 1) * itemsPerPage,
    restaurantCurrentPage * itemsPerPage,
  );

  useEffect(() => {
    setRoomCurrentPage(1);
  }, [roomSearch]);

  useEffect(() => {
    setRestaurantCurrentPage(1);
  }, [restaurantSearch]);

  if (shouldHideContent) {
    return (
      <PermissionNotice message="Finance data is hidden because the module view permission is disabled for your role." />
    );
  }

  const renderActionMenu = (invoice: Invoice) => (
    <div className="bk-action-wrapper">
      <button
        className="bk-action-trigger"
        aria-label="Open actions menu"
        aria-haspopup="true"
        aria-expanded={openActionId === invoice._id}
        onClick={() =>
          setOpenActionId(openActionId === invoice._id ? null : invoice._id)
        }
      >
        <MoreHorizontal size={18} aria-hidden="true" />
      </button>

      {openActionId === invoice._id && (
        <div className="bk-action-menu">
          <button
            className="bk-action-item"
            onClick={() => {
              void viewInvoice(invoice.invoiceId);
              setOpenActionId(null);
            }}
          >
            <Eye size={15} />
            View
          </button>

          <button
            className="bk-action-item"
            onClick={() => {
              void downloadInvoice(invoice.invoiceId);
              setOpenActionId(null);
            }}
          >
            <Download size={15} />
            Download
          </button>

          {canEditInvoices && (
            <button
              className="bk-action-item"
              onClick={() => {
                openEditView(invoice);
                setOpenActionId(null);
              }}
            >
              <Pencil size={15} />
              Edit
            </button>
          )}

          {canRecordPayment && invoice.status !== "PAID" && (
            <button
              className="bk-action-item"
              onClick={() => {
                openPaymentView(invoice);
                setOpenActionId(null);
              }}
            >
              <CreditCard size={15} />
              Record Payment
            </button>
          )}

          {canRemoveInvoices && (
            <button
              className="bk-action-item bk-action-danger"
              onClick={() => {
                void handleDeleteInvoice(invoice);
              }}
            >
              <Trash2 size={15} />
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex-col-gap-6 animate-fade-in">
      {!selectedInvoice || !activeView ? (
        <>
          <div className="add-branch-header" style={{ marginBottom: 0 }}>
            <div className="flex items-center gap-4">
              <div className="add-branch-header-icon-wrap">
                <DollarSign className="add-branch-header-icon" />
              </div>
              <div>
                <h1 className="page-title">Finance & Invoices</h1>
                <p className="page-subtitle">
                  Track and record payments for the branch
                </p>
              </div>
            </div>
          </div>

          <div className="luxury-card finance-table-card">
            <h2 className="text-lg font-semibold mb-3">Rooms Invoices</h2>
            <div className="p-4 pb-0">
              <input
                type="text"
                className="luxury-input w-full"
                placeholder="Search room invoices by Invoice ID or Guest Name"
                value={roomSearch}
                onChange={(e) => setRoomSearch(e.target.value)}
              />
            </div>
            <div className="finance-table-scroll">
              <table className="luxury-table min-w-[700px]">
                <thead>
                  <tr>
                    <th className="col-serial">#</th>
                    <th>Invoice ID</th>
                    <th>Guest Name</th>
                    <th>Order Type</th>
                    <th>Total</th>
                    <th>Tax</th>
                    <th>Final</th>
                    <th>Paid</th>
                    <th>Due</th>
                    <th>Status</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRoomInvoices.length === 0 ? (
                    <tr>
                      <td
                        colSpan={11}
                        className="text-center py-6 text-muted-foreground"
                      >
                        No invoices found.
                      </td>
                    </tr>
                  ) : (
                    paginatedRoomInvoices.map((inv, i) => (
                      <tr key={inv._id}>
                        <td className="col-serial">
                          {(roomCurrentPage - 1) * itemsPerPage + i + 1}
                        </td>
                        <td className="font-mono text-xs">{inv.invoiceId}</td>
                        <td>{getInvoiceGuestName(inv)}</td>
                        <td>{getInvoiceOrderType(inv)}</td>
                        <td className="font-medium">
                          {formatCurrency(inv.totalAmount)}
                        </td>
                        <td className="text-muted-foreground">
                          {formatCurrency(inv.taxAmount)}
                        </td>
                        <td className="font-semibold">
                          {formatCurrency(inv.finalAmount)}
                        </td>
                        <td>{formatCurrency(inv.paidAmount)}</td>
                        <td>{formatCurrency(inv.dueAmount)}</td>
                        <td>{renderStatusBadge(inv.status)}</td>
                        <td className="text-right">{renderActionMenu(inv)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {roomTotalPages > 1 && (
              <div className="table-footer border-t border-[hsl(var(--border))] mt-0">
                <span className="pagination-info">
                  Showing {(roomCurrentPage - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(
                    roomCurrentPage * itemsPerPage,
                    filteredRoomInvoices.length,
                  )}{" "}
                  of {filteredRoomInvoices.length} entries
                </span>
                <div className="pagination">
                  <button
                    className="page-btn"
                    disabled={roomCurrentPage === 1}
                    onClick={() =>
                      setRoomCurrentPage((p) => Math.max(1, p - 1))
                    }
                  >
                    Previous
                  </button>
                  <button
                    className="page-btn"
                    disabled={roomCurrentPage === roomTotalPages}
                    onClick={() =>
                      setRoomCurrentPage((p) => Math.min(roomTotalPages, p + 1))
                    }
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="luxury-card finance-table-card mt-6">
            <h2 className="text-lg font-semibold mb-3">
              Restaurant POS Invoices
            </h2>

            <div className="mb-4">
              <input
                type="text"
                className="luxury-input w-full"
                placeholder="Search POS invoices by Invoice ID or Guest Name"
                value={restaurantSearch}
                onChange={(e) => setRestaurantSearch(e.target.value)}
              />
            </div>

            <div className="finance-table-scroll">
              <table className="luxury-table min-w-[700px]">
                <thead>
                  <tr>
                    <th className="col-serial">#</th>
                    <th>Invoice ID</th>
                    <th>Guest Name</th>
                    <th>Order Type</th>
                    <th>Total</th>
                    <th>Tax</th>
                    <th>Final</th>
                    <th>Paid</th>
                    <th>Due</th>
                    <th>Status</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedPOSInvoices.length === 0 ? (
                    <tr>
                      <td
                        colSpan={11}
                        className="text-center py-6 text-muted-foreground"
                      >
                        No POS invoices found.
                      </td>
                    </tr>
                  ) : (
                    paginatedPOSInvoices.map((inv, i) => (
                      <tr key={inv._id}>
                        <td className="col-serial">
                          {(restaurantCurrentPage - 1) * itemsPerPage + i + 1}
                        </td>
                        <td className="font-mono text-xs">{inv.invoiceId}</td>
                        <td>{getInvoiceGuestName(inv)}</td>
                        <td>{getInvoiceOrderType(inv)}</td>
                        <td>{formatCurrency(inv.totalAmount)}</td>
                        <td>{formatCurrency(inv.taxAmount)}</td>
                        <td>{formatCurrency(inv.finalAmount)}</td>
                        <td>{formatCurrency(inv.paidAmount)}</td>
                        <td>{formatCurrency(inv.dueAmount)}</td>
                        <td>{renderStatusBadge(inv.status)}</td>
                        <td className="text-right">{renderActionMenu(inv)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {restaurantTotalPages > 1 && (
              <div className="table-footer border-t border-[hsl(var(--border))] mt-0">
                <span className="pagination-info">
                  Showing {(restaurantCurrentPage - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(
                    restaurantCurrentPage * itemsPerPage,
                    filteredRestaurantInvoices.length,
                  )}{" "}
                  of {filteredRestaurantInvoices.length} entries
                </span>
                <div className="pagination">
                  <button
                    className="page-btn"
                    disabled={restaurantCurrentPage === 1}
                    onClick={() =>
                      setRestaurantCurrentPage((p) => Math.max(1, p - 1))
                    }
                  >
                    Previous
                  </button>
                  <button
                    className="page-btn"
                    disabled={restaurantCurrentPage === restaurantTotalPages}
                    onClick={() =>
                      setRestaurantCurrentPage((p) =>
                        Math.min(restaurantTotalPages, p + 1),
                      )
                    }
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="as-root">
          <div className="as-header-left mb-6">
            <button
              onClick={resetDetailState}
              className="as-back-btn"
              aria-label="Back to finances"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="page-title text-2xl mb-1">
                {activeView === "edit" ? "Edit Invoice" : "Record Payment"}
              </h1>
              <p className="page-subtitle text-xs font-mono mt-0">
                ID: {selectedInvoice.invoiceId}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 items-start">
            <div className="luxury-card as-section w-full">
              <div className="as-section-header">
                <h2 className="as-section-title">
                  {activeView === "edit"
                    ? "Invoice Details"
                    : "Payment Details"}
                </h2>
                <p className="as-section-sub">
                  {activeView === "edit"
                    ? "Update the selected invoice information."
                    : "Enter the payment amount and method."}
                </p>
              </div>

              {activeView === "edit" ? (
                <>
                  <div className="as-grid-2">
                    <div className="as-field">
                      <label className="as-label pb-2">Total Amount</label>
                      <label className="as-label -mb-1">{currencySymbol}</label>
                      <input
                        type="number"
                        className="luxury-input w-full"
                        value={editForm.totalAmount}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            totalAmount: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="as-field">
                      <label className="as-label pb-2">Tax Amount</label>
                      <label className="as-label -mb-1">{currencySymbol}</label>
                      <input
                        type="number"
                        className="luxury-input w-full"
                        value={editForm.taxAmount}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            taxAmount: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="as-field">
                      <label className="as-label pb-2">Final Amount</label>
                      <label className="as-label -mb-1">{currencySymbol}</label>
                      <input
                        type="number"
                        className="luxury-input w-full"
                        value={editForm.finalAmount}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            finalAmount: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="as-field">
                      <label className="as-label pb-2">Paid Amount</label>
                      <label className="as-label -mb-1">{currencySymbol}</label>
                      <input
                        type="number"
                        className="luxury-input w-full"
                        value={editForm.paidAmount}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            paidAmount: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="as-field">
                      <label className="as-label pb-2">Due Amount</label>
                      <label className="as-label -mb-1">{currencySymbol}</label>
                      <input
                        type="number"
                        className="luxury-input w-full"
                        value={editForm.dueAmount}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            dueAmount: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="as-field">
                      <label className="as-label pb-2">Status</label>
                      <select
                        className="luxury-input w-full mt-[1.2rem]"
                        value={editForm.status}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            status: e.target.value,
                          }))
                        }
                      >
                        <option value="UNPAID">UNPAID</option>
                        <option value="PARTIALLY_PAID">PARTIALLY_PAID</option>
                        <option value="PAID">PAID</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 mt-8">
                    <button
                      onClick={resetDetailState}
                      className="luxury-btn luxury-btn-outline as-cancel-btn flex-1 py-3 !bg-muted/30"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUpdateInvoice}
                      className="luxury-btn luxury-btn-primary as-submit-btn flex-1 py-3"
                    >
                      Update Invoice
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="as-grid-2">
                    <div className="as-field">
                      <label className="as-label pb-2">Payment Amount</label>
                      <label className="as-label -mb-1">{currencySymbol}</label>
                      <div className="relative">
                        <input
                          type="number"
                          placeholder="0.00"
                          className="luxury-input w-full"
                          step="0.01"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="as-field">
                      <label className="as-label pb-2">Payment Method</label>
                      <select
                        className="luxury-input w-full mt-[1.2rem]"
                        aria-label="Payment method"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                      >
                        <option value="CASH">Cash</option>
                        <option value="CARD">Card</option>
                        <option value="UPI">UPI</option>
                        <option value="BANK_TRANSFER">Bank Transfer</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 mt-8">
                    <button
                      onClick={resetDetailState}
                      className="luxury-btn luxury-btn-outline as-cancel-btn flex-1 py-3 !bg-muted/30"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleRecordPayment}
                      className="luxury-btn luxury-btn-primary as-submit-btn flex-1 py-3"
                      disabled={!paymentAmount || Number(paymentAmount) <= 0}
                    >
                      Confirm Payment
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="luxury-card as-section w-full">
              <div className="as-section-header flex items-center gap-3">
                <History size={20} className="text-muted-foreground" />
                <h2 className="as-section-title !mb-0">
                  {activeView === "edit"
                    ? "Payment History"
                    : "Payment History"}
                </h2>
              </div>

              <div className="flex-1 overflow-y-auto">
                {selectedInvoice.paymentHistory.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground min-h-[120px]">
                    <History size={24} className="mb-2 opacity-50" />
                    <p className="text-sm">No payments recorded yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedInvoice.paymentHistory.map((p, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3"
                      >
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-sm">
                            {formatCurrency(p.amount)}
                          </span>
                          <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium bg-muted px-2 py-0.5 rounded w-fit">
                            {p.method}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground font-medium">
                          {new Date(p.paidAt).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Finance;
