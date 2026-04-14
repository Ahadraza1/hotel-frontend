import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  Check,
  CreditCard,
  Crown,
  Eye,
  Layers3,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  XCircle,
  X,
} from "lucide-react";
import api from "@/api/axios";
import { useAuth } from "@/contexts/AuthContext";
import { useConfirm, useToast } from "@/components/confirm/ConfirmProvider";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, callback: (response: Record<string, unknown>) => void) => void;
    };
  }
}

interface Plan {
  _id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  branchLimit: number | null;
  features: string[];
  featureFlags: string[];
  isActive: boolean;
  isPopular?: boolean;
}

interface SubscriptionSummary {
  status: "active" | "expired" | "trial" | "cancelled";
  planId?: string | null;
  planType?: "monthly" | "yearly" | null;
  billingCycle: "monthly" | "yearly" | null;
  expiryDate: string | null;
  canAddBranch: boolean;
  restrictionReason: string | null;
  expiryWarning: boolean;
  activePlan: {
    planId?: string;
    name: string;
    branchLimit: number | null;
    features: string[];
    description: string;
  } | null;
  branchUsage: number;
  branchLimit: number | null;
}

interface OrganizationSummary {
  _id: string;
  organizationId: string;
  organizationName: string;
  activePlan: string;
  planType: string;
  branchUsage: string;
  expiryDate: string | null;
  status: "active" | "expired" | "trial" | "cancelled";
  subscription: SubscriptionSummary;
}

interface DashboardData {
  plans: Plan[];
  organizations: OrganizationSummary[];
  branches: Array<{ _id: string }>;
  currentOrganization: OrganizationSummary | null;
  banners: { type: "warning" | "danger"; message: string }[];
}

interface PlanFormState {
  _id?: string;
  name: string;
  description: string;
  monthlyPrice: string;
  yearlyPrice: string;
  branchLimit: string;
  features: string;
  featureFlags: string[];
  isActive: boolean;
  isPopular: boolean;
}

const calculateSavingsPercentage = (monthlyPrice: number, yearlyPrice: number) => {
  if (!Number.isFinite(monthlyPrice) || !Number.isFinite(yearlyPrice) || monthlyPrice <= 0) {
    return null;
  }

  if (yearlyPrice >= monthlyPrice * 12) {
    return null;
  }

  const yearlyMonthlyEquivalent = yearlyPrice / 12;
  const savings = monthlyPrice - yearlyMonthlyEquivalent;
  const savingsPercentage = (savings / monthlyPrice) * 100;
  const finalPercentage = Math.round(savingsPercentage);

  return finalPercentage > 0 ? finalPercentage : null;
};

const FEATURE_FLAGS = [
  { label: "Room Management", value: "ROOM_MANAGEMENT" },
  { label: "Housekeeping", value: "HOUSEKEEPING" },
  { label: "Inventory", value: "INVENTORY" },
  { label: "HR Management", value: "HR" },
  { label: "Analytics", value: "ANALYTICS" },
  { label: "Invoice", value: "INVOICE" },
  { label: "Restaurant Management", value: "RESTAURANT" },
];

const emptyPlanForm: PlanFormState = {
  name: "",
  description: "",
  monthlyPrice: "0",
  yearlyPrice: "0",
  branchLimit: "",
  features: "",
  featureFlags: [],
  isActive: true,
  isPopular: false,
};

const PLAN_HIERARCHY = ["FREE", "BASIC", "PROFESSIONAL", "ENTERPRISE"] as const;

const PLAN_NAME_ALIASES: Record<string, (typeof PLAN_HIERARCHY)[number]> = {
  FREE: "FREE",
  TRIAL: "FREE",
  BASIC: "BASIC",
  STARTER: "BASIC",
  PROFESSIONAL: "PROFESSIONAL",
  PRO: "PROFESSIONAL",
  ENTERPRISE: "ENTERPRISE",
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const planLimitLabel = (limit: number | null) =>
  limit === null ? "Unlimited Branches" : `Up to ${limit} Branches`;

const normalizePlanHierarchyName = (name?: string | null) =>
  PLAN_NAME_ALIASES[String(name || "").trim().toUpperCase()] || null;

const getPlanHierarchyIndex = (plan?: Pick<Plan, "name"> | null) => {
  const normalizedName = normalizePlanHierarchyName(plan?.name);
  return normalizedName ? PLAN_HIERARCHY.indexOf(normalizedName) : -1;
};

const isFreeTierPlan = (plan?: Pick<Plan, "name"> | null) =>
  getPlanHierarchyIndex(plan) === 0;

const comparePlans = (currentPlan?: Plan | null, selectedPlan?: Plan | null) => {
  const currentIndex = getPlanHierarchyIndex(currentPlan);
  const selectedIndex = getPlanHierarchyIndex(selectedPlan);

  if (currentIndex >= 0 && selectedIndex >= 0) {
    return selectedIndex - currentIndex;
  }

  const currentMonthlyPrice = Number(currentPlan?.monthlyPrice || 0);
  const selectedMonthlyPrice = Number(selectedPlan?.monthlyPrice || 0);

  if (selectedMonthlyPrice !== currentMonthlyPrice) {
    return selectedMonthlyPrice - currentMonthlyPrice;
  }

  const currentYearlyPrice = Number(currentPlan?.yearlyPrice || 0);
  const selectedYearlyPrice = Number(selectedPlan?.yearlyPrice || 0);

  if (selectedYearlyPrice !== currentYearlyPrice) {
    return selectedYearlyPrice - currentYearlyPrice;
  }

  return String(selectedPlan?.name || "").localeCompare(
    String(currentPlan?.name || ""),
  );
};

type BillingCycle = "monthly" | "yearly";

type PlanActionState = "current" | "upgrade" | "downgrade" | "select";

const loadRazorpayScript = async () => {
  if (window.Razorpay) return true;

  return new Promise<boolean>((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const SubscriptionPlans = () => {
  const toast = useToast();
  const confirm = useConfirm();
  const { formatCurrency } = useSystemSettings();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [planForm, setPlanForm] = useState<PlanFormState>(emptyPlanForm);
  const [assigningOrganization, setAssigningOrganization] =
    useState<OrganizationSummary | null>(null);
  const [openOrganizationActionId, setOpenOrganizationActionId] = useState<
    string | null
  >(null);
  const [assignPlanId, setAssignPlanId] = useState("");
  const [assignBillingCycle, setAssignBillingCycle] =
    useState<BillingCycle>("monthly");
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);

  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const currentOrganization = dashboard?.currentOrganization || null;

  const fetchDashboard = useCallback(async () => {
    try {
      const response = await api.get<{ data: DashboardData }>(
        "/subscriptions/dashboard",
      );
      setDashboard(response.data.data);
    } catch (error) {
      console.error("Failed to load subscription dashboard", error);
      toast.error("Failed to load subscription data");
    } finally {
      setLoading(false);
    }
  }, [setDashboard, toast]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    const isModalOpen = planModalOpen || !!assigningOrganization;

    if (isModalOpen) {
      document.body.classList.add("sb-modal-open");
      document.body.style.overflow = "hidden";
    } else {
      document.body.classList.remove("sb-modal-open");
      document.body.style.overflow = "";
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (planModalOpen) closePlanModal();
        if (assigningOrganization) setAssigningOrganization(null);
      }
    };

    if (isModalOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.classList.remove("sb-modal-open");
      document.body.style.overflow = "";
    };
  }, [planModalOpen, assigningOrganization]);

  useEffect(() => {
    const handleDocumentClick = () => {
      setOpenOrganizationActionId(null);
    };

    if (openOrganizationActionId) {
      document.addEventListener("click", handleDocumentClick);
    }

    return () => {
      document.removeEventListener("click", handleDocumentClick);
    };
  }, [openOrganizationActionId]);

  const sortedPlans = useMemo(() => {
    return [...(dashboard?.plans || [])].sort(
      (left, right) => left.monthlyPrice - right.monthlyPrice,
    );
  }, [dashboard?.plans]);

  const currentPlan = useMemo(() => {
    const activePlanId =
      currentOrganization?.subscription.planId ||
      currentOrganization?.subscription.activePlan?.planId ||
      null;
    const activePlanName =
      currentOrganization?.subscription.activePlan?.name || null;

    if (!activePlanId && !activePlanName) {
      return null;
    }

    return (
      sortedPlans.find(
        (plan) => plan._id === activePlanId || plan.name === activePlanName,
      ) || {
        _id: "current-plan",
        name: activePlanName || "",
        description:
          currentOrganization?.subscription.activePlan?.description || "",
        monthlyPrice: 0,
        yearlyPrice: 0,
        branchLimit:
          currentOrganization?.subscription.activePlan?.branchLimit ?? null,
        features: currentOrganization?.subscription.activePlan?.features || [],
        isActive: true,
      }
    );
  }, [
    currentOrganization?.subscription.activePlan,
    currentOrganization?.subscription.planId,
    sortedPlans,
  ]);

  const currentPlanType =
    currentOrganization?.subscription.planType ||
    currentOrganization?.subscription.billingCycle ||
    null;
  const hasInactiveSubscription =
    currentOrganization?.subscription.status === "cancelled" ||
    currentOrganization?.subscription.status === "expired";

  const getPlanActionState = useCallback(
    (plan: Plan, selectedBillingType: BillingCycle): PlanActionState => {
      if (!currentPlan) {
        return "select";
      }

      if (!isSuperAdmin && hasInactiveSubscription) {
        return "select";
      }

      const currentPlanId =
        currentOrganization?.subscription.planId ||
        currentOrganization?.subscription.activePlan?.planId ||
        currentPlan._id;
      const isMatchingPlan = currentPlanId === plan._id;
      const isCurrentPlanInSelectedTab =
        isMatchingPlan && currentPlanType === selectedBillingType;

      if (isCurrentPlanInSelectedTab) {
        return "current";
      }

      if (isFreeTierPlan(plan) && !isFreeTierPlan(currentPlan)) {
        return "downgrade";
      }

      if (currentPlanType === "yearly" && selectedBillingType === "monthly") {
        return "downgrade";
      }

      if (currentPlanType === "monthly" && selectedBillingType === "yearly") {
        return "upgrade";
      }

      const planComparison = comparePlans(currentPlan, plan);

      if (planComparison < 0) {
        return "downgrade";
      }

      if (planComparison > 0) {
        return "upgrade";
      }

      return "select";
    },
    [
      hasInactiveSubscription,
      isSuperAdmin,
      currentOrganization?.subscription.activePlan?.planId,
      currentOrganization?.subscription.planId,
      currentPlan,
      currentPlanType,
    ],
  );

  const planFormSavings = useMemo(() => {
    const monthlyPrice = Number(planForm.monthlyPrice || 0);
    const yearlyPrice = Number(planForm.yearlyPrice || 0);
    const savingsPercentage = calculateSavingsPercentage(monthlyPrice, yearlyPrice);

    if (savingsPercentage === null) {
      return null;
    }

    return {
      percentage: savingsPercentage,
      monthlyEquivalent: yearlyPrice / 12,
    };
  }, [planForm.monthlyPrice, planForm.yearlyPrice]);

  const overviewCards = useMemo(() => {
    if (!dashboard) return [];

    if (isSuperAdmin) {
      const activeSubscriptions = dashboard.organizations.filter(
        (organization) => organization.status === "active",
      ).length;

      return [
        {
          label: "Plans Available",
          value: String(dashboard.plans.length),
          icon: Layers3,
        },
        {
          label: "Organizations",
          value: String(dashboard.organizations.length),
          icon: Building2,
        },
        {
          label: "Active Subscriptions",
          value: String(activeSubscriptions),
          icon: CreditCard,
        },
      ];
    }

    return [
      {
        label: "Active Plan",
        value: currentOrganization?.activePlan || "No Active Plan",
        icon: Crown,
      },
      {
        label: "Branch Usage",
        value: currentOrganization?.branchUsage || "0 / 0",
        icon: Building2,
      },
      {
        label: "Expiry Date",
        value: formatDate(currentOrganization?.expiryDate),
        icon: CalendarClock,
      },
    ];
  }, [
    currentOrganization?.activePlan,
    currentOrganization?.branchUsage,
    currentOrganization?.expiryDate,
    dashboard,
    isSuperAdmin,
  ]);

  const openCreatePlanModal = () => {
    setPlanForm(emptyPlanForm);
    setPlanModalOpen(true);
  };

  const openEditPlanModal = (plan: Plan) => {
    setPlanForm({
      _id: plan._id,
      name: plan.name,
      description: plan.description || "",
      monthlyPrice: String(plan.monthlyPrice ?? 0),
      yearlyPrice: String(plan.yearlyPrice ?? 0),
      branchLimit: plan.branchLimit === null ? "" : String(plan.branchLimit),
      features: (plan.features || []).join("\n"),
      featureFlags: plan.featureFlags || [],
      isActive: plan.isActive ?? true,
      isPopular: plan.isPopular ?? false,
    });
    setPlanModalOpen(true);
  };

  const closePlanModal = () => {
    setPlanModalOpen(false);
    setPlanForm(emptyPlanForm);
  };


  const savePlan = async () => {
    try {
      setSaving(true);

      const payload = {
        name: planForm.name,
        description: planForm.description,
        monthlyPrice: Number(planForm.monthlyPrice || 0),
        yearlyPrice: Number(planForm.yearlyPrice || 0),
        branchLimit:
          planForm.branchLimit.trim() === ""
            ? null
            : Number(planForm.branchLimit),
        features: planForm.features
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
        featureFlags: planForm.featureFlags,
        isActive: planForm.isActive,
        isPopular: planForm.isPopular,
      };

      if (planForm._id) {
        await api.put(`/subscriptions/plans/${planForm._id}`, payload);
        toast.success("Plan updated successfully.");
      } else {
        await api.post("/subscriptions/plans", payload);
        toast.success("Plan created successfully.");
      }

      closePlanModal();
      await fetchDashboard();
    } catch (error: unknown) {
      toast.error(
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || "Failed to save plan",
      );
    } finally {
      setSaving(false);
    }
  };

  const deletePlan = async (plan: Plan) => {
    await confirm({
      title: "Delete Plan",
      message:
        "Are you sure you want to delete this plan? Existing subscriptions will keep their current snapshot.",
      itemName: plan.name,
      successMessage: "Plan deleted successfully.",
      errorMessage: "Failed to delete plan.",
      onConfirm: async () => {
        await api.delete(`/subscriptions/plans/${plan._id}`);
        await fetchDashboard();
      },
    });
  };

  const assignPlan = async () => {
    if (!assigningOrganization || !assignPlanId) {
      toast.error("Select a plan before saving.");
      return;
    }

    const selectedPlan =
      sortedPlans.find((plan) => plan._id === assignPlanId) || null;
    const organizationCurrentPlan =
      sortedPlans.find(
        (plan) => plan.name === assigningOrganization.subscription.activePlan?.name,
      ) || null;

    if (selectedPlan && organizationCurrentPlan) {
      const comparison = comparePlans(organizationCurrentPlan, selectedPlan);

      if (comparison < 0) {
        toast.error("Downgrade not allowed. You can only upgrade the plan.");
        return;
      }

      if (comparison === 0) {
        toast.error("This organization is already on the selected plan.");
        return;
      }
    }

    try {
      setSaving(true);
      await api.post(
        `/subscriptions/organizations/${assigningOrganization.organizationId}/assign`,
        {
          planId: assignPlanId,
          billingCycle: assignBillingCycle,
        },
      );

      toast.success("Plan assigned successfully.");
      setAssigningOrganization(null);
      setAssignPlanId("");
      await fetchDashboard();
    } catch (error: unknown) {
      toast.error(
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || "Failed to assign plan",
      );
    } finally {
      setSaving(false);
    }
  };

  const openOrganizationPlanEditor = (organization: OrganizationSummary) => {
    const currentPlan =
      sortedPlans.find(
        (plan) => plan.name === organization.subscription.activePlan?.name,
      ) || null;

    setAssigningOrganization(organization);
    setAssignBillingCycle(
      organization.subscription.billingCycle === "yearly" ? "yearly" : "monthly",
    );
    setAssignPlanId(currentPlan?._id || "");
    setOpenOrganizationActionId(null);
  };

  const cancelOrganizationPlan = async (organization: OrganizationSummary) => {
    await confirm({
      title: "Cancel Plan",
      message: `Are you sure you want to cancel the plan for ${organization.organizationName}?`,
      itemName: organization.organizationName,
      successMessage: "Plan cancelled successfully.",
      errorMessage: "Failed to cancel plan.",
      confirmLabel: "Cancel Plan",
      onConfirm: async () => {
        await api.post(
          `/subscriptions/organizations/${organization.organizationId}/cancel`,
        );
        setOpenOrganizationActionId(null);
        await fetchDashboard();
      },
    });
  };

  const upgradePlan = async (plan: Plan) => {
    try {
      setProcessingPlanId(plan._id);

      // ✅ Load Razorpay SDK
      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded || !window.Razorpay) {
        toast.error("Failed to load Razorpay SDK.");
        return;
      }

      // ✅ Create order from backend
      const orderResponse = await api.post<{
        data: {
          directActivation?: boolean;
          key: string;
          order: { id: string; amount: number; currency: string };
        };
      }>("/subscriptions/checkout/order", {
        planId: plan._id,
        billingCycle,
      });

      const payload = orderResponse?.data?.data;

      if (payload?.directActivation) {
        toast.success("Subscription activated successfully!");
        await fetchDashboard();
        setProcessingPlanId(null);
        return;
      }

      if (!payload || !payload.order) {
        throw new Error("Invalid order response from server");
      }

      console.log("✅ Razorpay Order:", payload);

      // ✅ Razorpay Options
      const options = {
        key: payload.key,
        amount: payload.order.amount,
        currency: payload.order.currency,
        name: "Hotel Desk",
        description: `${plan.name} ${billingCycle} subscription`,
        order_id: payload.order.id,

        handler: async (response: Record<string, string>) => {
          try {
            console.log("💳 Payment Success:", response);

            await api.post("/subscriptions/checkout/verify", {
               planId: plan._id,
               billingCycle,
               razorpay_order_id: response.razorpay_order_id,
               razorpay_payment_id: response.razorpay_payment_id,
               razorpay_signature: response.razorpay_signature,
            });

            toast.success("🎉 Subscription activated successfully!");
            await fetchDashboard();
          } catch (error: unknown) {
            console.error("❌ Verification Failed:", error);
            toast.error(
              (error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Payment verification failed",
            );
          } finally {
            setProcessingPlanId(null);
          }
        },

        modal: {
          ondismiss: () => {
            console.log("⚠️ Payment popup closed");
            setProcessingPlanId(null);
          },
        },

        prefill: {
          name: user?.name || "",
          email: user?.email || "",
        },

        theme: {
          color: "#b08a44",
        },
      };

      const razorpay = new (window as unknown as {
        Razorpay: new (options: Record<string, unknown>) => {
          open: () => void;
          on: (event: string, callback: (response: Record<string, unknown>) => void) => void;
        };
      }).Razorpay(options as Record<string, unknown>);

      // ✅ Handle payment failure
      razorpay.on("payment.failed", (response: Record<string, unknown>) => {
        console.error("❌ Payment Failed:", response);
        toast.error("Payment failed. Please try again.");
        setProcessingPlanId(null);
      });

      // ✅ Open Razorpay
      razorpay.open();
    } catch (error: unknown) {
      console.error("❌ Checkout Error:", error);
      setProcessingPlanId(null);

      toast.error(
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to start checkout"
      );
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in bm-root">
        <div className="eb-loading">
          <span className="eb-loading-spinner" />
          <span>Loading subscription plans...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in sb-root">
      <div className="luxury-card sb-hero-card">
        <div className="sb-plan-toolbar">
          <div className="add-branch-header sb-page-heading">
            <div className="add-branch-header-icon-wrap">
              <Crown className="add-branch-header-icon" />
            </div>
            <div>
              <h1 className="page-title">Subscription Plans</h1>
              <p className="page-subtitle">
                {isSuperAdmin
                  ? "Create, edit, and assign plans for all organizations."
                  : "Choose and manage your organization subscription."}
              </p>
            </div>
          </div>

          <div className="sb-header-actions">
            {isSuperAdmin && (
              <button
                className="luxury-btn luxury-btn-primary bm-add-btn"
                onClick={openCreatePlanModal}
              >
                <Plus className="icon-sm" />
                Create Plan
              </button>
            )}

            <div
              className="sb-billing-toggle"
              aria-label="Billing cycle toggle"
            >
              <button
                className={`sb-toggle-btn ${billingCycle === "monthly" ? "sb-toggle-btn-active" : ""}`}
                onClick={() => setBillingCycle("monthly")}
              >
                Monthly
              </button>
              <button
                className={`sb-toggle-btn ${billingCycle === "yearly" ? "sb-toggle-btn-active" : ""}`}
                onClick={() => setBillingCycle("yearly")}
              >
                Yearly
              </button>
            </div>
          </div>
        </div>

        <div className="sb-summary-grid sb-summary-grid-hero">
          {overviewCards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.label}
                className="luxury-card sb-summary-card sb-summary-card-hero"
              >
                <div className="sb-summary-icon-wrap">
                  <Icon size={18} />
                </div>
                <span className="sb-summary-label">{card.label}</span>
                <span className="sb-summary-value">{card.value}</span>
              </div>
            );
          })}
        </div>
      </div>

      {!!dashboard?.banners?.length && (
        <div className="sb-banners">
          {dashboard.banners.map((banner, index) => (
            <div
              key={`${banner.type}-${index}`}
              className={`sb-banner ${banner.type === "danger" ? "sb-banner-danger" : "sb-banner-warning"}`}
            >
              <AlertTriangle className="sb-banner-icon" />
              <span>{banner.message}</span>
            </div>
          ))}
        </div>
      )}

      <div className="sb-section-shell">
        <span className="add-branch-section-pill">Subscription Catalog</span>
        <h2 className="sb-section-title">Choose Your Plan</h2>
        <p className="sb-section-copy">
          Compare branch limits, included features, and pricing before assigning
          or upgrading.
        </p>
      </div>

      <div className="sb-plan-grid sb-plan-grid-wide">
        {sortedPlans.map((plan, index) => {
          const planActionState = getPlanActionState(plan, billingCycle);
          const isCurrentPlan = planActionState === "current";
          const isSelectable =
            planActionState === "upgrade" || planActionState === "select";
          const planPrice =
            billingCycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
          const showPopular = plan.isPopular;
          const isPlanActive = plan.isActive;

          if (!isSuperAdmin && !isPlanActive) return null;

          return (
            <div
              key={plan._id}
              className={`luxury-card sb-plan-card sb-plan-card-showcase ${isCurrentPlan ? "sb-plan-card-current" : ""}`}
            >
              {showPopular && (
                <span className="sb-popular-pill">Most Popular</span>
              )}

              {!isPlanActive && isSuperAdmin && (
                <span className="sb-popular-pill sb-inactive-pill" style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", top: showPopular ? "4.5rem" : "1.5rem" }}>Inactive</span>
              )}

              {isSuperAdmin && (
                <div className="sb-plan-actions sb-plan-actions-corner">
                  <button
                    className="sb-icon-btn"
                    onClick={() => openEditPlanModal(plan)}
                    aria-label={`Edit ${plan.name}`}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="sb-icon-btn sb-icon-btn-danger"
                    onClick={() => deletePlan(plan)}
                    aria-label={`Delete ${plan.name}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}

              <div className="sb-showcase-icon-wrap">
                <Crown className="sb-plan-icon" />
              </div>

              <div className="sb-showcase-title">
                <h3>{plan.name}</h3>
                <p>{plan.description}</p>
              </div>

              <div className="sb-showcase-price">
                <span className="sb-plan-price-value">
                  {formatCurrency(planPrice)}
                </span>
                <span className="sb-plan-price-cycle">
                  /{billingCycle === "yearly" ? "year" : "month"}
                </span>
              </div>

              <div className="sb-showcase-limit">
                {planLimitLabel(plan.branchLimit)}
              </div>

              <div className="sb-plan-features">
                {plan.features.map((feature) => (
                  <div key={feature} className="sb-plan-feature">
                    <Check size={14} />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              {isSuperAdmin ? (
                <button
                  className="luxury-btn luxury-btn-outline sb-plan-btn"
                  onClick={() => openEditPlanModal(plan)}
                >
                  Edit Plan
                </button>
              ) : (
                <button
                  className={`luxury-btn ${isCurrentPlan ? "luxury-btn-outline" : "luxury-btn-primary"} sb-plan-btn`}
                  disabled={processingPlanId === plan._id || !isSelectable}
                  onClick={() => upgradePlan(plan)}
                >
                  {processingPlanId === plan._id
                    ? "Processing..."
                    : !isSuperAdmin && hasInactiveSubscription
                      ? "Buy Plan"
                      : planActionState === "current"
                      ? "Current Plan"
                      : planActionState === "downgrade"
                        ? "Downgrade not allowed"
                        : currentPlan
                          ? "Upgrade Plan"
                          : "Select Plan"}
                </button>
              )}
            </div>
          );
        })}

        {!sortedPlans.length && (
          <div className="luxury-card sb-empty-card">
            <div className="sb-empty-icon-wrap">
              <Layers3 size={20} />
            </div>
            <h3 className="sb-empty-title">No subscription plans yet</h3>
            <p className="sb-empty-copy">
              Create your first plan to start assigning subscriptions across
              organizations.
            </p>
          </div>
        )}
      </div>

      {isSuperAdmin && (
        <div className="luxury-card sb-organization-card">
          <div className="sb-section-header">
            <div>
              <span className="add-branch-section-pill">
                Organization Billing
              </span>
              <h5 className="sb-section-title">Organization Subscriptions</h5>
            </div>
          </div>

          <div className="sb-table-wrap">
            <table className="luxury-table sb-table">
              <thead>
                <tr>
                  <th style={{ width: "60px" }}>S.No.</th>
                  <th>Organization Name</th>
                  <th>Active Plan</th>
                  <th>Plan Type</th>
                  <th>Branch Usage</th>
                  <th>Expiry Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {dashboard?.organizations.length ? (
                  dashboard.organizations.map((organization, index) => (
                    <tr key={organization.organizationId}>
                      <td className="sb-cell-muted" style={{ fontWeight: 600 }}>
                        {String(index + 1).padStart(2, "0")}
                      </td>
                      <td>
                        <div className="sb-org-cell">
                          <span className="sb-org-name">
                            {organization.organizationName}
                          </span>
                          <span
                            className={`luxury-badge ${organization.status === "active" ? "badge-active" : "badge-warning"}`}
                          >
                            {organization.status}
                          </span>
                        </div>
                      </td>
                      <td>{organization.activePlan}</td>
                      <td className="sb-cell-muted">{organization.planType}</td>
                      <td>{organization.branchUsage}</td>
                      <td>{formatDate(organization.expiryDate)}</td>
                      <td>
                        <div
                          style={{
                            position: "relative",
                            display: "inline-flex",
                          }}
                        >
                          <button
                            className="sb-icon-btn"
                            aria-label="Open actions menu"
                            aria-haspopup="true"
                            aria-expanded={
                              openOrganizationActionId === organization.organizationId
                            }
                            onClick={(event) => {
                              event.stopPropagation();
                              setOpenOrganizationActionId((current) =>
                                current === organization.organizationId
                                  ? null
                                  : organization.organizationId,
                              );
                            }}
                          >
                            <MoreHorizontal size={18} />
                          </button>

                          {openOrganizationActionId === organization.organizationId ? (
                            <div
                              style={{
                                position: "absolute",
                                top: "42px",
                                right: 0,
                                width: "220px",
                                background: "hsl(var(--card))",
                                borderRadius: "16px",
                                boxShadow:
                                  "0 20px 45px rgba(0, 0, 0, 0.22), 0 4px 16px rgba(0, 0, 0, 0.12)",
                                border: "1px solid hsl(var(--border) / 0.8)",
                                padding: "6px 0",
                                zIndex: 30,
                              }}
                              onClick={(event) => event.stopPropagation()}
                            >
                              <button
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "12px",
                                  padding: "11px 18px",
                                  fontSize: "14px",
                                  fontWeight: 500,
                                  color: "hsl(var(--foreground))",
                                  background: "transparent",
                                  border: "none",
                                  width: "100%",
                                  cursor: "pointer",
                                  textAlign: "left",
                                }}
                                onClick={() => {
                                  setOpenOrganizationActionId(null);
                                  navigate(`/subscriptions/${organization.organizationId}`);
                                }}
                              >
                                <Eye size={16} />
                                View Details
                              </button>

                              <button
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "12px",
                                  padding: "11px 18px",
                                  fontSize: "14px",
                                  fontWeight: 500,
                                  color: "hsl(var(--foreground))",
                                  background: "transparent",
                                  border: "none",
                                  width: "100%",
                                  cursor: "pointer",
                                  textAlign: "left",
                                }}
                                onClick={() => openOrganizationPlanEditor(organization)}
                              >
                                <Pencil size={16} />
                                Edit Plan
                              </button>

                              {/* <button
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "12px",
                                  padding: "11px 18px",
                                  fontSize: "14px",
                                  fontWeight: 500,
                                  color: "#ef4444",
                                  background: "rgba(239, 68, 68, 0.06)",
                                  border: "none",
                                  width: "100%",
                                  cursor: "pointer",
                                  textAlign: "left",
                                }}
                                onClick={() => void cancelOrganizationPlan(organization)}
                              >
                                <XCircle size={16} />
                                Cancel Plan
                              </button> */}
                            </div>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="sb-table-empty">
                      <div className="sb-empty-inline">
                        <div className="sb-empty-icon-wrap">
                          <Building2 size={18} />
                        </div>
                        <div>
                          <p className="sb-empty-title">
                            No organizations available
                          </p>
                          <p className="sb-empty-copy">
                            Organization subscriptions will appear here once
                            organizations are created.
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {planModalOpen &&
        createPortal(
          <div className="sb-modal-layer" role="presentation">
            <div className="sb-modal-backdrop" onClick={closePlanModal} />
            <div className="sb-modal" role="dialog" aria-modal="true">
              <div className="sb-modal-header">
                <div>
                  <h2>
                    {planForm._id
                      ? `Edit Plan - ${planForm.name}`
                      : "Create Plan"}
                  </h2>
                  <p>
                    Modify plan details. Leave branch limit empty for unlimited.
                  </p>
                </div>
                <button
                  className="sb-icon-btn"
                  onClick={closePlanModal}
                  aria-label="Close modal"
                  title="Close modal"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="sb-modal-grid">
                <div className="add-branch-field add-branch-field-full">
                  <label htmlFor="planName" className="add-branch-label">
                    Plan Name
                  </label>
                  <input
                    id="planName"
                    className="luxury-input"
                    value={planForm.name}
                    onChange={(event) =>
                      setPlanForm((prev) => ({
                        ...prev,
                        name: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="add-branch-field">
                  <label htmlFor="monthlyPrice" className="add-branch-label">
                    Monthly Price
                  </label>
                  <input
                    id="monthlyPrice"
                    type="number"
                    className="luxury-input"
                    value={planForm.monthlyPrice}
                    onChange={(event) =>
                      setPlanForm((prev) => ({
                        ...prev,
                        monthlyPrice: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="add-branch-field">
                  <label htmlFor="yearlyPrice" className="add-branch-label">
                    Yearly Price
                  </label>
                  <input
                    id="yearlyPrice"
                    type="number"
                    className="luxury-input"
                    value={planForm.yearlyPrice}
                    onChange={(event) =>
                      setPlanForm((prev) => ({
                        ...prev,
                        yearlyPrice: event.target.value,
                      }))
                    }
                  />
                  {planFormSavings ? (
                    <p
                      className="add-branch-label"
                      style={{
                        marginTop: "0.5rem",
                        textTransform: "none",
                        letterSpacing: "0.02em",
                        fontSize: "0.8rem",
                      }}
                    >
                      Save {planFormSavings.percentage}%. Effective monthly price:{" "}
                      {formatCurrency(planFormSavings.monthlyEquivalent)}
                    </p>
                  ) : null}
                </div>

                <div className="add-branch-field add-branch-field-full">
                  <label htmlFor="branchLimit" className="add-branch-label">
                    Branch Limit
                  </label>
                  <input
                    id="branchLimit"
                    type="number"
                    className="luxury-input"
                    value={planForm.branchLimit}
                    placeholder="Leave empty for unlimited"
                    onChange={(event) =>
                      setPlanForm((prev) => ({
                        ...prev,
                        branchLimit: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="add-branch-field add-branch-field-full">
                  <label htmlFor="planDescription" className="add-branch-label">
                    Description
                  </label>
                  <textarea
                    id="planDescription"
                    className="luxury-input sb-textarea"
                    value={planForm.description}
                    onChange={(event) =>
                      setPlanForm((prev) => ({
                        ...prev,
                        description: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="add-branch-field">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      marginTop: "10px",
                    }}
                  >
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={planForm.isActive}
                      onChange={(e) =>
                        setPlanForm((prev) => ({
                          ...prev,
                          isActive: e.target.checked,
                        }))
                      }
                      style={{
                        width: "18px",
                        height: "18px",
                        accentColor: "hsl(var(--primary))",
                        cursor: "pointer",
                      }}
                    />
                    <label
                      htmlFor="isActive"
                      className="add-branch-label"
                      style={{ margin: 0, cursor: "pointer" }}
                    >
                      Plan is Active
                    </label>
                  </div>
                </div>

                <div className="add-branch-field">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      marginTop: "10px",
                    }}
                  >
                    <input
                      type="checkbox"
                      id="isPopular"
                      checked={planForm.isPopular}
                      onChange={(e) =>
                        setPlanForm((prev) => ({
                          ...prev,
                          isPopular: e.target.checked,
                        }))
                      }
                      style={{
                        width: "18px",
                        height: "18px",
                        accentColor: "hsl(var(--lux-primary))",
                        cursor: "pointer",
                      }}
                    />
                    <label
                      htmlFor="isPopular"
                      className="add-branch-label"
                      style={{ margin: 0, cursor: "pointer" }}
                    >
                      Plan is Popular
                    </label>
                  </div>
                </div>

                <div className="add-branch-field add-branch-field-full" style={{ marginTop: "1rem" }}>
                  <span className="add-branch-section-pill" style={{ marginBottom: "1rem" }}>Feature Flags (Module Access Control)</span>
                  <div className="sb-feature-flags-grid" style={{ 
                    display: "grid", 
                    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", 
                    gap: "12px",
                    marginTop: "1.25rem",
                    padding: "1.5rem",
                    background: "rgba(0, 0, 0, 0.02)",
                    borderRadius: "12px",
                    border: "1px solid rgba(0, 0, 0, 0.05)"
                  }}>
                    {FEATURE_FLAGS.map((feature) => (
                      <label 
                        key={feature.value} 
                        style={{ 
                          display: "flex", 
                          alignItems: "center", 
                          gap: "10px", 
                          cursor: "pointer",
                          fontSize: "0.9rem",
                          fontWeight: 500,
                          color: "hsl(var(--foreground))"
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={planForm.featureFlags.includes(feature.value)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setPlanForm(prev => ({
                              ...prev,
                              featureFlags: checked 
                                ? [...prev.featureFlags, feature.value]
                                : prev.featureFlags.filter(f => f !== feature.value)
                            }));
                          }}
                          style={{
                            width: "18px",
                            height: "18px",
                            accentColor: "hsl(var(--primary))",
                            cursor: "pointer",
                          }}
                        />
                        {feature.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="add-branch-field add-branch-field-full">
                  <label htmlFor="planFeatures" className="add-branch-label">
                    Features (One per line)
                  </label>
                  <textarea
                    id="planFeatures"
                    className="luxury-input sb-textarea"
                    style={{ minHeight: "120px" }}
                    placeholder="Enter features, one per line..."
                    value={planForm.features}
                    onChange={(event) =>
                      setPlanForm((prev) => ({
                        ...prev,
                        features: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="add-branch-actions">
                <button
                  className="luxury-btn luxury-btn-outline add-branch-cancel-btn"
                  onClick={closePlanModal}
                >
                  Cancel
                </button>
                <button
                  className="luxury-btn luxury-btn-primary add-branch-submit-btn"
                  onClick={savePlan}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {assigningOrganization &&
        createPortal(
          <div className="sb-modal-layer" role="presentation">
            <div
              className="sb-modal-backdrop"
              onClick={() => setAssigningOrganization(null)}
            />
            <div
              className="sb-modal sb-assign-modal"
              role="dialog"
              aria-modal="true"
            >
              <div className="sb-modal-header">
                <div>
                  <h2>Assign Plan</h2>
                  <p>{assigningOrganization.organizationName}</p>
                </div>
                <button
                  className="sb-icon-btn"
                  onClick={() => setAssigningOrganization(null)}
                  aria-label="Close modal"
                  title="Close modal"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="sb-modal-grid">
                <div className="add-branch-field add-branch-field-full">
                  <label htmlFor="assignPlanId" className="add-branch-label">
                    Plan
                  </label>
                  <select
                    id="assignPlanId"
                    className="luxury-input luxury-select"
                    value={assignPlanId}
                    onChange={(event) => setAssignPlanId(event.target.value)}
                  >
                    <option value="">Select Plan</option>
                    {sortedPlans.map((plan) => {
                      const organizationCurrentPlan =
                        sortedPlans.find(
                          (item) =>
                            item.name ===
                            assigningOrganization.subscription.activePlan?.name,
                        ) || null;
                      const comparison = organizationCurrentPlan
                        ? comparePlans(organizationCurrentPlan, plan)
                        : 1;
                      const isDisabledOption = comparison <= 0;
                      const optionLabel =
                        comparison === 0
                          ? `${plan.name} (Current Plan)`
                          : comparison < 0
                            ? `${plan.name} (Downgrade not allowed)`
                            : plan.name;

                      return (
                        <option
                          key={plan._id}
                          value={plan._id}
                          disabled={isDisabledOption}
                        >
                          {optionLabel}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="add-branch-field add-branch-field-full">
                  <label className="add-branch-label">Billing Cycle</label>
                  <div className="sb-billing-toggle">
                    <button
                      className={`sb-toggle-btn ${assignBillingCycle === "monthly" ? "sb-toggle-btn-active" : ""}`}
                      onClick={() => setAssignBillingCycle("monthly")}
                    >
                      Monthly
                    </button>
                    <button
                      className={`sb-toggle-btn ${assignBillingCycle === "yearly" ? "sb-toggle-btn-active" : ""}`}
                      onClick={() => setAssignBillingCycle("yearly")}
                    >
                      Yearly
                    </button>
                  </div>
                </div>
              </div>

              <div className="add-branch-actions">
                <button
                  className="luxury-btn luxury-btn-outline add-branch-cancel-btn"
                  onClick={() => setAssigningOrganization(null)}
                >
                  Cancel
                </button>
                <button
                  className="luxury-btn luxury-btn-primary add-branch-submit-btn"
                  onClick={assignPlan}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Assign Plan"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default SubscriptionPlans;
