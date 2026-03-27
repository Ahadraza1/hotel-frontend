import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  ArrowLeft,
  Shield,
  Globe,
  DollarSign,
  UserCog,
  Mail,
  Phone,
  MapPin,
  Hash,
  CheckCircle2,
} from "lucide-react";
import api from "@/api/axios";
import { useToast } from "@/components/confirm/ConfirmProvider";
import {
  validateEmailField,
  validatePhoneField,
} from "@/lib/fieldValidation";

const TIERS = [
  {
    name: "Starter",
    desc: "Essential features for small operations",
    badge: "Basic",
  },
  {
    name: "Professional",
    desc: "Advanced tools for growing businesses",
    badge: "Popular",
  },
  {
    name: "Enterprise",
    desc: "Complete suite for large organizations",
    badge: "Full",
  },
];

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
    serviceTier: "Professional",
  });

  const [corporateAdmin, setCorporateAdmin] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
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
    if (organizationEmailError) nextErrors.organizationEmail = organizationEmailError;

    const adminEmailError = getFieldError("email", corporateAdmin.email);
    if (adminEmailError) nextErrors.adminEmail = adminEmailError;

    const adminPhoneError = getFieldError("phone", corporateAdmin.phone);
    if (adminPhoneError) nextErrors.adminPhone = adminPhoneError;

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      setLoading(true);

      // ✅ Extract proper currency code
      const currencyCode = formState.primaryCurrency.split(" - ")[0];

      // ✅ Extract timezone value only
      const timezoneValue = formState.globalTimezone;

      const payload = {
        name: formState.organizationName.trim(),
        systemIdentifier: formState.systemIdentifier.trim().toUpperCase(),
        headquartersAddress: formState.headquartersAddress.trim(),
        currency: currencyCode,
        timezone: timezoneValue,
        serviceTier: formState.serviceTier.toUpperCase(),
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

      {/* ── Back Button ── */}
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

      {/* ── Page Header ── */}
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

      {/* ── Main Grid ── */}
      <div className="ao-grid">

        {/* ══ LEFT COLUMN ══ */}
        <div className="ao-left-col">

          {/* Core Details */}
          <div className="luxury-card ao-section-card">
            <div className="ao-section-header">
              <div className="ao-section-icon-wrap">
                <Building2 className="ao-section-icon" />
              </div>
              <div>
                <h3 className="ao-section-title">Core Details</h3>
                <p className="ao-section-subtitle">Basic organization information</p>
              </div>
            </div>

            <div className="ao-fields">
              <div className="ao-field-row">
                {/* Organization Name */}
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

                {/* System Identifier */}
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

              {/* Organization Email */}
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
                  <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>
                    {fieldErrors.organizationEmail}
                  </span>
                ) : null}
              </div>

              {/* HQ Address */}
              <div className="ao-field">
                <label htmlFor="headquartersAddress" className="add-branch-label">
                  Headquarters Address
                </label>
                <div className="add-branch-input-wrap ao-textarea-wrap">
                  <MapPin className="add-branch-field-icon ao-textarea-icon" />
                  <textarea
                    id="headquartersAddress"
                    name="headquartersAddress"
                    placeholder="Enter full corporate address…"
                    className="luxury-input add-branch-input-with-icon ao-textarea"
                    rows={3}
                    value={formState.headquartersAddress}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Corporate Admin Details */}
          <div className="luxury-card ao-section-card">
            <div className="ao-section-header">
              <div className="ao-section-icon-wrap">
                <UserCog className="ao-section-icon" />
              </div>
              <div>
                <h3 className="ao-section-title">Corporate Admin Details</h3>
                <p className="ao-section-subtitle">Primary administrator account</p>
              </div>
            </div>

            <div className="ao-fields">
              <div className="ao-field-row">
                {/* Admin Name */}
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

                {/* Admin Email */}
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
                      placeholder="e.g. admin@royalhospitality.com"
                      className="luxury-input add-branch-input-with-icon"
                      value={corporateAdmin.email}
                      onChange={handleAdminChange}
                      onBlur={handleBlur}
                      required
                    />
                  </div>
                  {fieldErrors.adminEmail ? (
                    <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>
                      {fieldErrors.adminEmail}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Admin Phone */}
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
                  <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>
                    {fieldErrors.adminPhone}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Regional Policy */}
          <div className="luxury-card ao-section-card">
            <div className="ao-section-header">
              <div className="ao-section-icon-wrap">
                <Globe className="ao-section-icon" />
              </div>
              <div>
                <h3 className="ao-section-title">Regional Policy</h3>
                <p className="ao-section-subtitle">Currency &amp; timezone settings</p>
              </div>
            </div>

            <div className="ao-fields">
              <div className="ao-field-row">
                {/* Currency */}
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

                {/* Timezone */}
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

        {/* ══ RIGHT COLUMN ══ */}
        <div className="ao-right-col">

          {/* Service Tier */}
          <div className="luxury-card ao-tier-card">
            <div className="ao-section-header">
              <div className="ao-section-icon-wrap ao-section-icon-primary">
                <Shield className="ao-section-icon ao-section-icon-white" />
              </div>
              <div>
                <h3 className="ao-section-title">Service Tier</h3>
                <p className="ao-section-subtitle">Choose a subscription plan</p>
              </div>
            </div>

            <div className="ao-tier-list">
              {TIERS.map((tier) => {
                const isSelected = formState.serviceTier === tier.name;
                return (
                  <label
                    key={tier.name}
                    className={`ao-tier-row ${isSelected ? "ao-tier-row-active" : ""}`}
                  >
                    <input
                      type="radio"
                      name="serviceTier"
                      value={tier.name}
                      className="ao-tier-radio"
                      checked={isSelected}
                      onChange={handleChange}
                    />
                    <div className="ao-tier-info">
                      <div className="ao-tier-name-row">
                        <span className="ao-tier-name">{tier.name}</span>
                        <span className={`ao-tier-badge ${isSelected ? "ao-tier-badge-active" : ""}`}>
                          {tier.badge}
                        </span>
                      </div>
                      <span className="ao-tier-desc">{tier.desc}</span>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="ao-tier-check" />
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="luxury-card ao-actions-card">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="luxury-btn luxury-btn-primary ao-submit-btn"
            >
              {loading ? (
                <>
                  <span className="add-branch-spinner" />
                  Registering…
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

          {/* Billing notice */}
          <div className="ao-billing-notice">
            <div className="ao-billing-icon-wrap">
              <DollarSign className="ao-billing-icon" />
            </div>
            <p className="ao-billing-text">
              New registrations are billed pro-rata based on the remaining days
              of the current billing cycle.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddOrganization;
