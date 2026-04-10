import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  DollarSign,
  Globe,
  Hash,
  Mail,
  MapPin,
  Phone,
  Shield,
  UserCog,
} from "lucide-react";
import api from "@/api/axios";
import { useToast } from "@/components/confirm/ConfirmProvider";
import {
  validateEmailField,
  validatePhoneField,
} from "@/lib/fieldValidation";

interface SubscriptionPlan {
  _id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  branchLimit: number | null;
  features: string[];
  isActive: boolean;
}

const formatPriceLabel = (amount: number) =>
  amount === 0 ? "Free" : `$${amount.toLocaleString()}`;

const getPlanBadge = (plan: SubscriptionPlan, index: number) => {
  if (plan.monthlyPrice === 0 && plan.yearlyPrice === 0) return "Trial";
  if (index === 1) return "Popular";
  if (plan.branchLimit === null) return "Unlimited";
  return "Active";
};

const AddOrganization = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [formState, setFormState] = useState({
    organizationName: "",
    systemIdentifier: "",
    headquartersAddress: "",
    organizationEmail: "",
    primaryCurrency: "USD - United States Dollar",
    globalTimezone: "(GMT+00:00) UTC",
    selectedPlanId: "",
    billingCycle: "monthly",
  });

  const [corporateAdmin, setCorporateAdmin] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setPlansLoading(true);
        const response = await api.get<{ data: SubscriptionPlan[] }>(
          "/subscriptions/plans",
        );
        const activePlans = (response.data.data || []).filter(
          (plan) => plan.isActive,
        );

        setPlans(activePlans);
        setFormState((prev) => ({
          ...prev,
          selectedPlanId:
            prev.selectedPlanId || activePlans[0]?._id || prev.selectedPlanId,
        }));
      } catch (error) {
        console.error("Failed to load subscription plans", error);
        toast.error("Failed to load subscription plans");
      } finally {
        setPlansLoading(false);
      }
    };

    fetchPlans();
  }, [toast]);

  const getFieldError = (name: string, value: string) => {
    switch (name) {
      case "organizationEmail":
      case "email":
        return validateEmailField(value);
      case "phone":
        return validatePhoneField(value);
      default:
        return "";
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));

    if (name === "organizationEmail") {
      setFieldErrors((prev) => {
        const next = { ...prev };
        const nextError = getFieldError(name, value);

        if (nextError) next.organizationEmail = nextError;
        else delete next.organizationEmail;

        return next;
      });
    }

    if (name === "selectedPlanId") {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.selectedPlanId;
        return next;
      });
    }
  };

  const handleAdminChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCorporateAdmin((prev) => ({ ...prev, [name]: value }));

    if (name === "email" || name === "phone") {
      setFieldErrors((prev) => {
        const next = { ...prev };
        const key = name === "email" ? "adminEmail" : "adminPhone";
        const nextError = getFieldError(name, value);

        if (nextError) next[key] = nextError;
        else delete next[key];

        return next;
      });
    }
  };

  const handleBlur = (
    e: React.FocusEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;

    if (
      name !== "organizationEmail" &&
      name !== "email" &&
      name !== "phone"
    ) {
      return;
    }

    setFieldErrors((prev) => {
      const next = { ...prev };
      const key =
        name === "organizationEmail"
          ? "organizationEmail"
          : name === "email"
            ? "adminEmail"
            : "adminPhone";
      const nextError = getFieldError(name, value);

      if (nextError) next[key] = nextError;
      else delete next[key];

      return next;
    });
  };

  const handleSubmit = async () => {
    const nextErrors: Record<string, string> = {};
    const organizationEmailError = getFieldError(
      "organizationEmail",
      formState.organizationEmail,
    );
    if (organizationEmailError) {
      nextErrors.organizationEmail = organizationEmailError;
    }

    const adminEmailError = getFieldError("email", corporateAdmin.email);
    if (adminEmailError) nextErrors.adminEmail = adminEmailError;

    const adminPhoneError = getFieldError("phone", corporateAdmin.phone);
    if (adminPhoneError) nextErrors.adminPhone = adminPhoneError;

    if (!formState.selectedPlanId) {
      nextErrors.selectedPlanId = "Please choose a subscription plan";
    }

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      setLoading(true);

      const currencyCode = formState.primaryCurrency.split(" - ")[0];
      const timezoneValue = formState.globalTimezone;

      const payload = {
        name: formState.organizationName.trim(),
        systemIdentifier: formState.systemIdentifier.trim().toUpperCase(),
        headquartersAddress: formState.headquartersAddress.trim(),
        currency: currencyCode,
        timezone: timezoneValue,
        planId: formState.selectedPlanId,
        billingCycle: formState.billingCycle,
        corporateAdmin,
      };

      await api.post("/organizations", payload);

      toast.success("Organization created successfully.");
      navigate("/organizations");
    } catch (error: unknown) {
      const axiosError = error as {
        response?: { data?: { message?: string } };
      };
      toast.error(
        axiosError?.response?.data?.message || "Failed to create organization",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in ao-root">
      <button
        onClick={() => navigate(-1)}
        className="add-branch-back-btn"
        aria-label="Back to Organizations"
      >
        <span className="add-branch-back-icon-wrap">
          <ArrowLeft className="add-branch-back-icon" />
        </span>
        <span className="add-branch-back-label">Back to Organizations</span>
      </button>

      <div className="add-branch-header">
        <div className="add-branch-header-icon-wrap">
          <Building2 className="add-branch-header-icon" />
        </div>
        <div>
          <h1 className="page-title">Register New Organization</h1>
          <p className="page-subtitle">
            Onboard a new hospitality group into the LUXURY HMS ecosystem.
          </p>
        </div>
      </div>

      <div className="ao-grid">
        <div className="ao-left-col">
          <div className="luxury-card ao-section-card">
            <div className="ao-section-header">
              <div className="ao-section-icon-wrap">
                <Building2 className="ao-section-icon" />
              </div>
              <div>
                <h3 className="ao-section-title">Core Details</h3>
                <p className="ao-section-subtitle">
                  Basic organization information
                </p>
              </div>
            </div>

            <div className="ao-fields">
              <div className="ao-field-row">
                <div className="ao-field">
                  <label htmlFor="organizationName" className="add-branch-label">
                    Organization Name
                  </label>
                  <div className="add-branch-input-wrap">
                    <Building2 className="add-branch-field-icon" />
                    <input
                      id="organizationName"
                      type="text"
                      name="organizationName"
                      placeholder="e.g. Royal Hospitality Group"
                      className="luxury-input add-branch-input-with-icon"
                      value={formState.organizationName}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="ao-field">
                  <label htmlFor="systemIdentifier" className="add-branch-label">
                    System Identifier
                  </label>
                  <div className="add-branch-input-wrap">
                    <Hash className="add-branch-field-icon" />
                    <input
                      id="systemIdentifier"
                      type="text"
                      name="systemIdentifier"
                      placeholder="e.g. RHG-INT"
                      className="luxury-input add-branch-input-with-icon"
                      value={formState.systemIdentifier}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="ao-field">
                <label htmlFor="organizationEmail" className="add-branch-label">
                  Organization Email
                </label>
                <div className="add-branch-input-wrap">
                  <Mail className="add-branch-field-icon" />
                  <input
                    id="organizationEmail"
                    type="email"
                    name="organizationEmail"
                    placeholder="e.g. contact@royalhospitality.com"
                    className="luxury-input add-branch-input-with-icon"
                    value={formState.organizationEmail}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required
                  />
                </div>
                {fieldErrors.organizationEmail ? (
                  <span
                    style={{
                      color: "#dc2626",
                      display: "block",
                      fontSize: "0.875rem",
                      marginTop: "0.35rem",
                    }}
                  >
                    {fieldErrors.organizationEmail}
                  </span>
                ) : null}
              </div>

              <div className="ao-field">
                <label
                  htmlFor="headquartersAddress"
                  className="add-branch-label"
                >
                  Headquarters Address
                </label>
                <div className="add-branch-input-wrap ao-textarea-wrap">
                  <MapPin className="add-branch-field-icon ao-textarea-icon" />
                  <textarea
                    id="headquartersAddress"
                    name="headquartersAddress"
                    placeholder="Enter full corporate address..."
                    className="luxury-input add-branch-input-with-icon ao-textarea"
                    rows={3}
                    value={formState.headquartersAddress}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="luxury-card ao-section-card">
            <div className="ao-section-header">
              <div className="ao-section-icon-wrap">
                <UserCog className="ao-section-icon" />
              </div>
              <div>
                <h3 className="ao-section-title">Corporate Admin Details</h3>
                <p className="ao-section-subtitle">
                  Primary administrator account
                </p>
              </div>
            </div>

            <div className="ao-fields">
              <div className="ao-field-row">
                <div className="ao-field">
                  <label htmlFor="adminName" className="add-branch-label">
                    Full Name
                  </label>
                  <div className="add-branch-input-wrap">
                    <UserCog className="add-branch-field-icon" />
                    <input
                      id="adminName"
                      type="text"
                      name="name"
                      placeholder="e.g. Jonathan Clarke"
                      className="luxury-input add-branch-input-with-icon"
                      value={corporateAdmin.name}
                      onChange={handleAdminChange}
                      required
                    />
                  </div>
                </div>

                <div className="ao-field">
                  <label htmlFor="adminEmail" className="add-branch-label">
                    Email Address
                  </label>
                  <div className="add-branch-input-wrap">
                    <Mail className="add-branch-field-icon" />
                    <input
                      id="adminEmail"
                      type="email"
                      name="email"
                      placeholder="Admin email for login"
                      className="luxury-input add-branch-input-with-icon"
                      value={corporateAdmin.email}
                      onChange={handleAdminChange}
                      onBlur={handleBlur}
                      required
                    />
                  </div>
                  {fieldErrors.adminEmail ? (
                    <span
                      style={{
                        color: "#dc2626",
                        display: "block",
                        fontSize: "0.875rem",
                        marginTop: "0.35rem",
                      }}
                    >
                      {fieldErrors.adminEmail}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="ao-field">
                <label htmlFor="adminPhone" className="add-branch-label">
                  Phone Number
                </label>
                <div className="add-branch-input-wrap">
                  <Phone className="add-branch-field-icon" />
                  <input
                    id="adminPhone"
                    type="text"
                    name="phone"
                    placeholder="e.g. +1 (555) 000-0000"
                    className="luxury-input add-branch-input-with-icon"
                    value={corporateAdmin.phone}
                    onChange={handleAdminChange}
                    onBlur={handleBlur}
                  />
                </div>
                {fieldErrors.adminPhone ? (
                  <span
                    style={{
                      color: "#dc2626",
                      display: "block",
                      fontSize: "0.875rem",
                      marginTop: "0.35rem",
                    }}
                  >
                    {fieldErrors.adminPhone}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="luxury-card ao-section-card">
            <div className="ao-section-header">
              <div className="ao-section-icon-wrap">
                <Globe className="ao-section-icon" />
              </div>
              <div>
                <h3 className="ao-section-title">Regional Policy</h3>
                <p className="ao-section-subtitle">
                  Currency &amp; timezone settings
                </p>
              </div>
            </div>

            <div className="ao-fields">
              <div className="ao-field-row">
                <div className="ao-field">
                  <label htmlFor="primaryCurrency" className="add-branch-label">
                    Primary Currency
                  </label>
                  <div className="add-branch-input-wrap">
                    <DollarSign className="add-branch-field-icon" />
                    <select
                      id="primaryCurrency"
                      name="primaryCurrency"
                      aria-label="Primary Currency"
                      className="luxury-input luxury-select add-branch-input-with-icon"
                      value={formState.primaryCurrency}
                      onChange={handleChange}
                    >
                      <option>USD - United States Dollar</option>
                      <option>EUR - Euro</option>
                      <option>GBP - British Pound</option>
                      <option>JPY - Japanese Yen</option>
                      <option>INR - Indian Rupee</option>
                      <option>AED - UAE Dirham</option>
                    </select>
                  </div>
                </div>

                <div className="ao-field">
                  <label htmlFor="globalTimezone" className="add-branch-label">
                    Global Timezone
                  </label>
                  <div className="add-branch-input-wrap">
                    <Globe className="add-branch-field-icon" />
                    <select
                      id="globalTimezone"
                      name="globalTimezone"
                      aria-label="Global Timezone"
                      className="luxury-input luxury-select add-branch-input-with-icon"
                      value={formState.globalTimezone}
                      onChange={handleChange}
                    >
                      <option>(GMT+00:00) UTC</option>
                      <option>(GMT+05:30) Mumbai</option>
                      <option>(GMT-05:00) New York</option>
                      <option>(GMT+04:00) Dubai</option>
                      <option>(GMT+09:00) Tokyo</option>
                      <option>(GMT+08:00) Singapore</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="ao-right-col">
          <div className="luxury-card ao-tier-card">
            <div className="ao-section-header">
              <div className="ao-section-icon-wrap ao-section-icon-primary">
                <Shield className="ao-section-icon ao-section-icon-white" />
              </div>
              <div>
                <h3 className="ao-section-title">Service Tier</h3>
                <p className="ao-section-subtitle">
                  Choose a subscription plan
                </p>
              </div>
            </div>

            <div className="ao-fields" style={{ marginBottom: "1rem" }}>
              <div className="ao-field">
                <label htmlFor="billingCycle" className="add-branch-label">
                  Billing Cycle
                </label>
                <div className="add-branch-input-wrap">
                  <DollarSign className="add-branch-field-icon" />
                  <select
                    id="billingCycle"
                    name="billingCycle"
                    className="luxury-input luxury-select add-branch-input-with-icon"
                    value={formState.billingCycle}
                    onChange={handleChange}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="ao-tier-list">
              {plansLoading ? (
                <div className="ao-tier-row">
                  <div className="ao-tier-info">
                    <span className="ao-tier-name">Loading plans...</span>
                    <span className="ao-tier-desc">
                      Fetching subscription plans created by super admin.
                    </span>
                  </div>
                </div>
              ) : plans.length === 0 ? (
                <div className="ao-tier-row">
                  <div className="ao-tier-info">
                    <span className="ao-tier-name">No active plans found</span>
                    <span className="ao-tier-desc">
                      Create a plan in the subscription page before registering
                      a new organization.
                    </span>
                  </div>
                </div>
              ) : (
                plans.map((plan, index) => {
                  const isSelected = formState.selectedPlanId === plan._id;
                  const price =
                    formState.billingCycle === "yearly"
                      ? plan.yearlyPrice
                      : plan.monthlyPrice;

                  return (
                    <label
                      key={plan._id}
                      className={`ao-tier-row ${isSelected ? "ao-tier-row-active" : ""}`}
                    >
                      <input
                        type="radio"
                        name="selectedPlanId"
                        value={plan._id}
                        className="ao-tier-radio"
                        checked={isSelected}
                        onChange={handleChange}
                      />
                      <div className="ao-tier-info">
                        <div className="ao-tier-name-row">
                          <span className="ao-tier-name">{plan.name}</span>
                          <span
                            className={`ao-tier-badge ${isSelected ? "ao-tier-badge-active" : ""}`}
                          >
                            {getPlanBadge(plan, index)}
                          </span>
                        </div>
                        <span className="ao-tier-desc">
                          {plan.description || "No description added for this plan."}
                        </span>
                        <span
                          className="ao-tier-desc"
                          style={{ marginTop: "0.45rem", display: "block" }}
                        >
                          {formatPriceLabel(price)} / {formState.billingCycle}
                          {plan.branchLimit === null
                            ? " - Unlimited branches"
                            : ` - ${plan.branchLimit} branches`}
                        </span>
                      </div>
                      {isSelected ? <CheckCircle2 className="ao-tier-check" /> : null}
                    </label>
                  );
                })
              )}
            </div>

            {fieldErrors.selectedPlanId ? (
              <span
                style={{
                  color: "#dc2626",
                  display: "block",
                  fontSize: "0.875rem",
                  marginTop: "0.75rem",
                }}
              >
                {fieldErrors.selectedPlanId}
              </span>
            ) : null}
          </div>

          <div className="luxury-card ao-actions-card">
            <button
              onClick={handleSubmit}
              disabled={loading || plansLoading || plans.length === 0}
              className="luxury-btn luxury-btn-primary ao-submit-btn"
            >
              {loading ? (
                <>
                  <span className="add-branch-spinner" />
                  Registering...
                </>
              ) : (
                <>
                  <CheckCircle2 className="ao-submit-icon" />
                  Confirm Registration
                </>
              )}
            </button>
            <button
              onClick={() => navigate(-1)}
              className="luxury-btn luxury-btn-ghost ao-cancel-btn"
            >
              Cancel &amp; Go Back
            </button>
          </div>

          <div className="ao-billing-notice">
            <div className="ao-billing-icon-wrap">
              <DollarSign className="ao-billing-icon" />
            </div>
            <p className="ao-billing-text">
              The selected plan will be attached to the organization as soon as
              registration is completed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddOrganization;
