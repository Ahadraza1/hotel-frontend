import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, UserPlus, Save, Mail, Phone, UserRound, Calendar } from "lucide-react";
import api from "@/api/axios";
import { useToast } from "@/components/confirm/ConfirmProvider";
import { validateEmailField, validatePhoneField } from "@/lib/fieldValidation";

const AddGuest = () => {
  const { branchId, guestId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const isEditMode = Boolean(guestId);

  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    loyaltyDate: "",
  });

  useEffect(() => {
    const loadGuest = async () => {
      if (!guestId || !branchId) return;

      try {
        const res = await api.get<{
          data: Array<{
            guestId: string;
            firstName: string;
            lastName?: string;
            email?: string;
            phone?: string;
          }>;
        }>("/crm/guests", {
          params: { branchId },
        });

        const guest = (res.data.data || []).find((item) => item.guestId === guestId);

        if (!guest) {
          toast.error("Guest not found.");
          navigate(`/workspace/${branchId}/crm`);
          return;
        }

        setForm({
          firstName: guest.firstName || "",
          lastName: guest.lastName || "",
          email: guest.email || "",
          phone: guest.phone || "",
          loyaltyDate: "",
        });
      } catch (err) {
        const error = err as { response?: { data?: { message?: string } } };
        toast.error(error.response?.data?.message || "Failed to load guest.");
        navigate(`/workspace/${branchId}/crm`);
      }
    };

    loadGuest();
  }, [branchId, guestId, navigate, toast]);

  const getFieldError = (name: string, value: string) => {
    if (!value.trim()) return "This field is required";
    if (name === "email") return validateEmailField(value);
    if (name === "phone") return validatePhoneField(value);
    return "";
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setForm({ ...form, [name]: value });
    setFieldErrors((prev) => {
      const next = { ...prev };
      const nextError = getFieldError(name, value);
      if (nextError) next[name] = nextError;
      else delete next[name];
      return next;
    });
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFieldErrors((prev) => {
      const next = { ...prev };
      const nextError = getFieldError(name, value);

      if (nextError) next[name] = nextError;
      else delete next[name];

      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    const fieldsToValidate = isEditMode
      ? (["firstName", "lastName", "email", "phone"] as const)
      : (["firstName", "lastName", "email", "phone", "loyaltyDate"] as const);

    fieldsToValidate.forEach((field) => {
      const nextError = getFieldError(field, form[field]);
      if (nextError) nextErrors[field] = nextError;
    });

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    
    try {
      setSaving(true);
      const payload = {
        branchId,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        loyaltyDate: form.loyaltyDate || undefined,
      };

      if (isEditMode) {
        await api.put(`/crm/guests/${guestId}`, payload);
      } else {
        await api.post("/crm/guests", payload);
      }

      toast.success(
        isEditMode ? "Guest updated successfully." : "Guest added successfully.",
      );
      navigate(`/workspace/${branchId}/crm`);
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(
        error.response?.data?.message ||
          `Failed to ${isEditMode ? "update" : "add"} guest. Please try again.`,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ag-root animate-fade-in">
      {/* ── Page Header ── */}
      <div className="add-branch-header">
        <div className="ag-header-left">
          <button
            onClick={() => navigate(`/workspace/${branchId}/crm`)}
            className="ag-back-btn"
            aria-label="Back to CRM"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="add-branch-header-icon-wrap">
            <UserPlus className="add-branch-header-icon" />
          </div>
          <div>
            <h1 className="page-title">
              {isEditMode ? "Edit Guest Profile" : "New Guest Profile"}
            </h1>
            <p className="page-subtitle">
              {isEditMode
                ? "Update guest details in the CRM"
                : "Register a new guest into the CRM"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Form ── */}
      <form onSubmit={handleSubmit} className="ag-form-layout" noValidate>
        {/* Left column — primary fields */}
        <div className="ag-form-main">
          {/* Identity */}
          <div className="luxury-card ag-section">
            <div className="ag-section-header">
              <h2 className="ag-section-title">Identity Details</h2>
              <p className="ag-section-sub">Personal identity for reservations</p>
            </div>

            <div className="ag-grid-2">
              <div className="ag-field">
                <label htmlFor="ag-first" className="ag-label">
                  First Name <span className="ag-required">*</span>
                </label>
                <div className="add-branch-input-wrap">
                  <UserRound className="add-branch-field-icon" size={15}/>
                  <input
                    id="ag-first"
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className="luxury-input add-branch-input-with-icon"
                    style={fieldErrors.firstName ? { borderColor: "#dc2626" } : undefined}
                    placeholder="e.g. John"
                    required
                  />
                </div>
                {fieldErrors.firstName ? (
                  <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>
                    {fieldErrors.firstName}
                  </span>
                ) : null}
              </div>

              <div className="ag-field">
                <label htmlFor="ag-last" className="ag-label">
                  Last Name <span className="ag-required">*</span>
                </label>
                <div className="add-branch-input-wrap">
                  <UserRound className="add-branch-field-icon" size={15}/>
                  <input
                    id="ag-last"
                    name="lastName"
                    value={form.lastName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className="luxury-input add-branch-input-with-icon"
                    style={fieldErrors.lastName ? { borderColor: "#dc2626" } : undefined}
                    placeholder="e.g. Doe"
                    required
                  />
                </div>
                {fieldErrors.lastName ? (
                  <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>
                    {fieldErrors.lastName}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="luxury-card ag-section">
            <div className="ag-section-header">
              <h2 className="ag-section-title">Contact Verification</h2>
              <p className="ag-section-sub">Communication points</p>
            </div>

            <div className="ag-grid-2">
              <div className="ag-field">
                <label htmlFor="ag-email" className="ag-label">
                  Email Address <span className="ag-required">*</span>
                </label>
                <div className="add-branch-input-wrap">
                  <Mail className="add-branch-field-icon" size={15}/>
                  <input
                    id="ag-email"
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className="luxury-input add-branch-input-with-icon"
                    style={fieldErrors.email ? { borderColor: "#dc2626" } : undefined}
                    placeholder="e.g. guest@example.com"
                    required
                  />
                </div>
                {fieldErrors.email ? (
                  <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>
                    {fieldErrors.email}
                  </span>
                ) : null}
              </div>

              <div className="ag-field">
                <label htmlFor="ag-phone" className="ag-label">
                  Phone Number <span className="ag-required">*</span>
                </label>
                <div className="add-branch-input-wrap">
                  <Phone className="add-branch-field-icon" size={15}/>
                  <input
                    id="ag-phone"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className="luxury-input add-branch-input-with-icon"
                    style={fieldErrors.phone ? { borderColor: "#dc2626" } : undefined}
                    placeholder="e.g. +1 555 123 4567"
                    required
                  />
                </div>
                {fieldErrors.phone ? (
                  <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>
                    {fieldErrors.phone}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Loyalty */}
          <div className="luxury-card ag-section">
            <div className="ag-section-header">
              <h2 className="ag-section-title">Loyalty Details</h2>
              <p className="ag-section-sub">Club membership & joining dates</p>
            </div>

            <div className="ag-grid-2">
              <div className="ag-field">
                <label htmlFor="ag-date" className="ag-label">
                  Joining Date <span className="ag-required">*</span>
                </label>
                <div className="add-branch-input-wrap">
                  <Calendar className="add-branch-field-icon" size={15}/>
                  <input
                    id="ag-date"
                    type="date"
                    name="loyaltyDate"
                    value={form.loyaltyDate}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className="luxury-input add-branch-input-with-icon"
                    style={fieldErrors.loyaltyDate ? { borderColor: "#dc2626" } : undefined}
                    required
                  />
                </div>
                {fieldErrors.loyaltyDate ? (
                  <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>
                    {fieldErrors.loyaltyDate}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* Right column — summary + submit */}
        <div className="ag-form-side">
          <div className="luxury-card ag-summary-card">
            <h3 className="ag-summary-title">Profile Preview</h3>

            <div>
              <div className="ag-summary-row">
                <span className="ag-summary-key">First Name</span>
                <span className="ag-summary-val truncate max-w-[140px]">
                  {form.firstName || <span className="ag-empty">—</span>}
                </span>
              </div>
              <div className="ag-summary-row">
                <span className="ag-summary-key">Last Name</span>
                <span className="ag-summary-val truncate max-w-[140px]">
                  {form.lastName || <span className="ag-empty">—</span>}
                </span>
              </div>
              <div className="ag-summary-row">
                <span className="ag-summary-key">Email</span>
                <span className="ag-summary-val truncate max-w-[140px]">
                  {form.email || <span className="ag-empty">—</span>}
                </span>
              </div>
              <div className="ag-summary-row">
                <span className="ag-summary-key">Phone</span>
                <span className="ag-summary-val truncate max-w-[140px]">
                  {form.phone || <span className="ag-empty">—</span>}
                </span>
              </div>
              <div className="ag-summary-row">
                <span className="ag-summary-key">Joined</span>
                <span className="ag-summary-val truncate max-w-[140px]">
                  {form.loyaltyDate ? new Date(form.loyaltyDate).toLocaleDateString() : <span className="ag-empty">—</span>}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="luxury-btn luxury-btn-primary ag-submit-btn"
            >
              {saving ? (
                <>
                  <span className="eb-loading-spinner mr-2" />
                  Saving…
                </>
              ) : (
                <>
                  <Save size={15} className="mr-2" />
                  {isEditMode ? "Update Profile" : "Create Profile"}
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate(`/workspace/${branchId}/crm`)}
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

export default AddGuest;
