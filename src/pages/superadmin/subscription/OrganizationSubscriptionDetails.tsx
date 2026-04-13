import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Download,
  Eye,
  FileText,
  Landmark,
  Loader2,
  Receipt,
  Search,
  Sparkles,
  Wallet,
} from "lucide-react";
import api from "@/api/axios";
import { useToast } from "@/components/confirm/ConfirmProvider";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import "@/pages/superadmin/subscription/subscription-details.css";

type SubscriptionStatus = "active" | "expired" | "trial" | "cancelled" | "pending";
type PaymentStatus = "paid" | "failed" | "pending";

interface SubscriptionDetailsResponse {
  organization: {
    _id: string;
    organizationId: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    totalBranches: number;
    createdDate: string | null;
    currency: string;
    status: SubscriptionStatus;
  };
  subscription: {
    planName: string;
    planType: "monthly" | "yearly" | null;
    price: number;
    startDate: string | null;
    expiryDate: string | null;
    autoRenewal: boolean;
    status: SubscriptionStatus;
    branchUsage: number;
    branchLimit: number | null;
  };
  kpis: {
    activePlan: string;
    billingCycle: string;
    branchUsage: string;
    nextBillingDate: string | null;
    totalPaid: number;
    status: SubscriptionStatus;
  };
  payments: Array<{
    _id: string;
    invoiceId: string | null;
    date: string | null;
    amount: number;
    subtotal: number;
    taxAmount: number;
    paymentMethod: string;
    status: PaymentStatus;
    billingCycle: "monthly" | "yearly";
    paymentId: string | null;
    orderId: string | null;
    hasInvoice: boolean;
    billingPeriodStart: string | null;
    billingPeriodEnd: string | null;
  }>;
}

const PAGE_SIZE = 6;

const formatDate = (value?: string | null) => {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const toTitleCase = (value?: string | null) => {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : "-";
};

const statusBadgeClass = (status?: string | null) => {
  if (status === "active" || status === "paid") return "badge-active";
  if (status === "expired" || status === "failed" || status === "cancelled") {
    return "badge-danger";
  }
  return "badge-warning";
};

const downloadBlob = (blob: Blob, fileName: string, openInNewTab = false) => {
  const url = window.URL.createObjectURL(blob);

  if (openInNewTab) {
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
    return;
  }

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
};

const OrganizationSubscriptionDetails = () => {
  const { organizationId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { formatCurrency } = useSystemSettings();

  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<SubscriptionDetailsResponse | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [processingAction, setProcessingAction] = useState<{
    key: string;
    type: "view" | "download" | "generate";
  } | null>(null);
  const [generatingLatest, setGeneratingLatest] = useState(false);

  const fetchDetails = useCallback(async () => {
    if (!organizationId) return;

    try {
      const response = await api.get<{ data: SubscriptionDetailsResponse }>(
        `/subscriptions/${organizationId}`,
      );
      setDetails(response.data.data);
    } catch (error) {
      console.error("Failed to load organization subscription details", error);
      toast.error("Failed to load subscription details");
    } finally {
      setLoading(false);
    }
  }, [organizationId, toast]);

  useEffect(() => {
    void fetchDetails();
  }, [fetchDetails]);

  const filteredPayments = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!details) return [];

    const payments = normalizedSearch
      ? details.payments.filter((payment) =>
          String(payment.invoiceId || "pending")
            .toLowerCase()
            .includes(normalizedSearch),
        )
      : details.payments;

    return payments;
  }, [details, search]);

  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedPayments = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredPayments.slice(start, start + PAGE_SIZE);
  }, [filteredPayments, page]);

  const handleInvoiceAccess = async (
    invoiceId: string,
    mode: "view" | "download",
  ) => {
    try {
      setProcessingAction({ key: invoiceId, type: mode });
      const response = await api.get(`/invoices/${invoiceId}/pdf${mode === "download" ? "?download=1" : ""}`, {
        responseType: "blob",
      });
      downloadBlob(
        response.data,
        `${invoiceId}.pdf`,
        mode === "view",
      );
    } catch (error) {
      console.error(`Failed to ${mode} invoice`, error);
      toast.error(`Failed to ${mode} invoice`);
    } finally {
      setProcessingAction(null);
    }
  };

  const handleGenerateInvoice = async (paymentId?: string | null) => {
    if (!organizationId) return;

    try {
      if (paymentId) {
        setProcessingAction({ key: paymentId, type: "generate" });
      } else {
        setGeneratingLatest(true);
      }

      const response = await api.post<{ data: { invoiceId: string } }>(
        "/invoices/generate",
        {
          organizationId,
          paymentId: paymentId || undefined,
        },
      );

      toast.success("Invoice generated successfully");
      await fetchDetails();

      const generatedInvoiceId = response.data.data.invoiceId;

      if (generatedInvoiceId) {
        await handleInvoiceAccess(generatedInvoiceId, "view");
      }
    } catch (error: any) {
      console.error("Failed to generate invoice", error);
      toast.error(
        error?.response?.data?.message || "Failed to generate invoice",
      );
    } finally {
      setProcessingAction(null);
      setGeneratingLatest(false);
    }
  };

  const kpiCards = useMemo(() => {
    if (!details) return [];

    return [
      {
        label: "Active Plan",
        value: details.kpis.activePlan,
        meta: details.subscription.planType ? toTitleCase(details.subscription.planType) : "Plan Snapshot",
        icon: Sparkles,
        tint: "hms-kpi-card-blue",
      },
      {
        label: "Billing Cycle",
        value: details.kpis.billingCycle,
        meta: details.subscription.autoRenewal ? "Auto renewal on" : "Manual renewal",
        icon: CalendarClock,
        tint: "hms-kpi-card-soft",
      },
      {
        label: "Branch Usage",
        value: details.kpis.branchUsage,
        meta: `${details.organization.totalBranches} active branches`,
        icon: Building2,
        tint: "hms-kpi-card-green",
      },
      {
        label: "Next Billing Date",
        value: details.kpis.nextBillingDate || "-",
        meta: details.subscription.expiryDate ? "Scheduled renewal" : "No renewal scheduled",
        icon: Landmark,
        tint: "hms-kpi-card-gray",
      },
      {
        label: "Total Paid",
        value: formatCurrency(details.kpis.totalPaid),
        meta: `${details.payments.length} payment records`,
        icon: Wallet,
        tint: "hms-kpi-card-blue",
      },
      {
        label: "Subscription Status",
        value: toTitleCase(details.kpis.status),
        meta: details.subscription.status === "trial" ? "Trial access" : "Current lifecycle state",
        icon: CheckCircle2,
        tint: "hms-kpi-card-green",
      },
    ];
  }, [details, formatCurrency]);

  if (loading) {
    return (
      <div className="hms-subscription-state">
        <Loader2 className="hms-spin" size={22} />
        <span>Loading organization subscription details...</span>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="luxury-card hms-subscription-state hms-subscription-state-error">
        <FileText size={22} />
        <span>Subscription details could not be loaded.</span>
      </div>
    );
  }

  return (
    <div className="hms-subscription-details-page animate-fade-in">
      <section className="luxury-card hms-subscription-hero">
        <div>
          <div className="hms-subscription-eyebrow">Organization Subscription Details</div>
          <div className="hms-subscription-hero-title-row">
            <h1 className="page-title">{details.organization.name}</h1>
            <span className={`luxury-badge ${statusBadgeClass(details.organization.status)}`}>
              {toTitleCase(details.organization.status)}
            </span>
          </div>
          <p className="page-subtitle">
            View plan lifecycle, branch allocation, billing history, and subscription invoices.
          </p>
        </div>

        <div className="hms-subscription-hero-actions">
          <button
            type="button"
            className="luxury-btn luxury-btn-primary"
            onClick={() => void handleGenerateInvoice()}
            disabled={generatingLatest || details.payments.length === 0}
          >
            {generatingLatest ? <Loader2 className="hms-spin" size={16} /> : <Receipt size={16} />}
            Generate Invoice
          </button>
          <button
            type="button"
            className="luxury-btn luxury-btn-outline"
            onClick={() => navigate("/subscriptions")}
          >
            <ArrowLeft size={16} />
            Back
          </button>
        </div>
      </section>

      <section className="hms-kpi-grid">
        {kpiCards.map((card) => {
          const Icon = card.icon;

          return (
            <article key={card.label} className={`luxury-card hms-kpi-card ${card.tint}`}>
              <div className="hms-kpi-card-top">
                <span className="kpi-label hms-kpi-label">{card.label}</span>
                <div className="hms-kpi-icon">
                  <Icon size={18} />
                </div>
              </div>
              <strong className="kpi-value hms-kpi-value">{card.value}</strong>
              <div className="hms-kpi-card-bottom">
                <span className="hms-kpi-meta">{card.meta}</span>
              </div>
            </article>
          );
        })}
      </section>

      <section className="hms-subscription-info-grid">
        <article className="luxury-card hms-info-card">
          <div className="hms-card-heading">
            <div>
              <h2>Organization Details</h2>
              <p className="page-subtitle">Primary contact and profile snapshot</p>
            </div>
          </div>

          <div className="hms-details-grid">
            <div className="hms-detail-item">
              <span>Organization Name</span>
              <strong>{details.organization.name}</strong>
            </div>
            <div className="hms-detail-item">
              <span>Email</span>
              <strong>{details.organization.email || "-"}</strong>
            </div>
            <div className="hms-detail-item">
              <span>Phone</span>
              <strong>{details.organization.phone || "-"}</strong>
            </div>
            <div className="hms-detail-item">
              <span>Address</span>
              <strong>{details.organization.address}</strong>
            </div>
            <div className="hms-detail-item">
              <span>Total Branches</span>
              <strong>{details.organization.totalBranches}</strong>
            </div>
            <div className="hms-detail-item">
              <span>Created Date</span>
              <strong>{formatDate(details.organization.createdDate)}</strong>
            </div>
          </div>
        </article>

        <article className="luxury-card hms-info-card">
          <div className="hms-card-heading">
            <div>
              <h2>Subscription Details</h2>
              <p className="page-subtitle">Current package and renewal attributes</p>
            </div>
          </div>

          <div className="hms-details-grid">
            <div className="hms-detail-item">
              <span>Plan Name</span>
              <strong>{details.subscription.planName}</strong>
            </div>
            <div className="hms-detail-item">
              <span>Plan Type</span>
              <strong>{toTitleCase(details.subscription.planType)}</strong>
            </div>
            <div className="hms-detail-item">
              <span>Price</span>
              <strong>{formatCurrency(details.subscription.price)}</strong>
            </div>
            <div className="hms-detail-item">
              <span>Start Date</span>
              <strong>{formatDate(details.subscription.startDate)}</strong>
            </div>
            <div className="hms-detail-item">
              <span>Expiry Date</span>
              <strong>{formatDate(details.subscription.expiryDate)}</strong>
            </div>
            <div className="hms-detail-item">
              <span>Auto Renewal</span>
              <strong>{details.subscription.autoRenewal ? "ON" : "OFF"}</strong>
            </div>
          </div>
        </article>
      </section>

      <section className="luxury-card hms-payments-card">
        <div className="hms-card-heading hms-payments-heading">
          <div>
            <h2>Payment History</h2>
            <p className="page-subtitle">Search invoices and manage generated PDF billing records</p>
          </div>

          <div className="hms-search-box">
            <Search size={16} />
            <input
              type="search"
              placeholder="Search by invoice ID"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        {filteredPayments.length === 0 ? (
          <div className="hms-empty-state">
            <div className="hms-empty-illustration">
              <Receipt size={40} />
            </div>
            <h3>No payment history available yet</h3>
            <p>Invoice records will appear here once this organization completes subscription payments.</p>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table className="luxury-table hms-payments-table">
                <thead>
                  <tr>
                    <th style={{ width: "72px" }}>S.No</th>
                    <th>Invoice ID</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Payment</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPayments.map((payment, index) => {
                    const isViewing =
                      processingAction?.type === "view" &&
                      processingAction.key === payment.invoiceId;
                    const isDownloading =
                      processingAction?.type === "download" &&
                      processingAction.key === payment.invoiceId;
                    const isGenerating =
                      processingAction?.type === "generate" &&
                      processingAction.key === payment._id;
                    const serialNumber = (page - 1) * PAGE_SIZE + index + 1;

                    return (
                      <tr key={payment._id}>
                        <td data-label="S.No" className="hms-serial-cell">
                          {String(serialNumber).padStart(2, "0")}
                        </td>
                        <td data-label="Invoice ID">
                          <div className="hms-invoice-id-cell">
                            <span>{payment.invoiceId || "Not generated"}</span>
                            <small>
                              {payment.billingPeriodStart && payment.billingPeriodEnd
                                ? `${formatDate(payment.billingPeriodStart)} - ${formatDate(payment.billingPeriodEnd)}`
                                : toTitleCase(payment.billingCycle)}
                            </small>
                          </div>
                        </td>
                        <td data-label="Date">{formatDate(payment.date)}</td>
                        <td data-label="Amount">{formatCurrency(payment.amount)}</td>
                        <td data-label="Payment Method">
                          {toTitleCase(payment.paymentMethod.replaceAll("_", " "))}
                        </td>
                        <td data-label="Status">
                          <span className={`luxury-badge ${statusBadgeClass(payment.status)}`}>
                            {toTitleCase(payment.status)}
                          </span>
                        </td>
                        <td data-label="Actions">
                          <div className="hms-table-actions">
                            <button
                              type="button"
                              className="luxury-btn luxury-btn-outline hms-action-btn"
                              onClick={() =>
                                payment.invoiceId && void handleInvoiceAccess(payment.invoiceId, "view")
                              }
                              disabled={!payment.invoiceId || !payment.hasInvoice || isViewing || isGenerating}
                            >
                              {isViewing ? <Loader2 className="hms-spin" size={14} /> : <Eye size={14} />}
                              View Invoice
                            </button>
                            <button
                              type="button"
                              className="luxury-btn luxury-btn-outline hms-action-btn"
                              onClick={() =>
                                payment.invoiceId && void handleInvoiceAccess(payment.invoiceId, "download")
                              }
                              disabled={!payment.invoiceId || !payment.hasInvoice || isDownloading || isGenerating}
                            >
                              {isDownloading ? <Loader2 className="hms-spin" size={14} /> : <Download size={14} />}
                              Download Invoice
                            </button>
                            <button
                              type="button"
                              className="luxury-btn luxury-btn-primary hms-action-btn"
                              onClick={() => void handleGenerateInvoice(payment._id)}
                              disabled={isGenerating || isViewing || isDownloading}
                            >
                              {isGenerating ? (
                                <Loader2 className="hms-spin" size={14} />
                              ) : (
                                <Receipt size={14} />
                              )}
                              {payment.hasInvoice ? "Regenerate Invoice" : "Generate Invoice"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="table-footer">
              <div className="pagination-info">
                Showing {(page - 1) * PAGE_SIZE + 1}-
                {Math.min(page * PAGE_SIZE, filteredPayments.length)} of {filteredPayments.length} payments
              </div>
              <div className="pagination">
                <button
                  type="button"
                  className="page-btn pagination-nav-btn"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page === 1}
                />
                <span className="pagination-page-indicator">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  className="page-btn pagination-nav-btn"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={page === totalPages}
                />
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default OrganizationSubscriptionDetails;
