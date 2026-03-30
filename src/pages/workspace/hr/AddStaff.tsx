import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, UserPlus, Save } from "lucide-react";
import api from "@/api/axios";
import { useToast } from "@/components/confirm/ConfirmProvider";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";

const AddStaff = () => {
  const { branchId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { formatCurrency } = useSystemSettings();

  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    department: "",
    designation: "",
    salary: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /* ── Submit ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim()) { toast.warning("First Name is required."); return; }
    if (!form.lastName.trim()) { toast.warning("Last Name is required."); return; }

    const salaryValue =
      form.salary.trim() === "" ? 0 : Number(form.salary);

    if (!Number.isFinite(salaryValue) || salaryValue < 0) {
      toast.warning("Please enter a valid salary."); return;
    }

    try {
      setSaving(true);
      await api.post("/hr/staff", {
        branchId,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        department: form.department.trim() || undefined,
        designation: form.designation.trim() || undefined,
        salary: salaryValue,
      });
      toast.success("Staff member added successfully.");
      navigate(`/workspace/${branchId}/hr`);
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to add staff member. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="as-root animate-fade-in">

      {/* ── Page Header ── */}
      <div className="add-branch-header">
        <div className="as-header-left">
          <button
            onClick={() => navigate(`/workspace/${branchId}/hr`)}
            className="as-back-btn"
            aria-label="Back to HR"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="add-branch-header-icon-wrap">
            <UserPlus className="add-branch-header-icon" />
          </div>
          <div>
            <h1 className="page-title">Onboard New Staff</h1>
            <p className="page-subtitle">Register a team member into organizational payroll</p>
          </div>
        </div>
      </div>

      {/* ── Form ── */}
      <form onSubmit={handleSubmit} className="as-form-layout" noValidate>

        {/* Left column — primary fields */}
        <div className="as-form-main">

          {/* Personal Identity */}
          <div className="luxury-card as-section">
            <div className="as-section-header">
              <h2 className="as-section-title">Personal Information</h2>
              <p className="as-section-sub">Basic identity details for the employee</p>
            </div>

            <div className="as-grid-2">
              <div className="as-field">
                <label htmlFor="as-first" className="as-label">
                  First Name <span className="as-required">*</span>
                </label>
                <input
                  id="as-first"
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                  className="luxury-input"
                  placeholder="e.g. John"
                  required
                />
              </div>

              <div className="as-field">
                <label htmlFor="as-last" className="as-label">
                  Last Name <span className="as-required">*</span>
                </label>
                <input
                  id="as-last"
                  name="lastName"
                  value={form.lastName}
                  onChange={handleChange}
                  className="luxury-input"
                  placeholder="e.g. Doe"
                  required
                />
              </div>
            </div>
          </div>

          {/* Organizational Mapping */}
          <div className="luxury-card as-section">
            <div className="as-section-header">
              <h2 className="as-section-title">Organizational Role</h2>
              <p className="as-section-sub">Assign departments, titles, and base compensation</p>
            </div>

            <div className="as-grid-2">
              <div className="as-field">
                <label htmlFor="as-dept" className="as-label">Department</label>
                <input
                  id="as-dept"
                  name="department"
                  value={form.department}
                  onChange={handleChange}
                  className="luxury-input"
                  placeholder="e.g. Reception, Housekeeping"
                />
              </div>

              <div className="as-field">
                <label htmlFor="as-desig" className="as-label">Designation / Title</label>
                <input
                  id="as-desig"
                  name="designation"
                  value={form.designation}
                  onChange={handleChange}
                  className="luxury-input"
                  placeholder="e.g. Front Desk Agent"
                />
              </div>

              <div className="as-field as-field-full">
                <label htmlFor="as-salary" className="as-label">
                  Base Salary ($/mo) <span className="as-required">*</span>
                </label>
                <input
                  id="as-salary"
                  type="number"
                  name="salary"
                  value={form.salary}
                  onChange={handleChange}
                  className="luxury-input"
                  placeholder="e.g. 4500"
                  min="1"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right column — summary + submit */}
        <div className="as-form-side">
          <div className="luxury-card as-summary-card">
            <h3 className="as-summary-title">Onboarding Summary</h3>

            <div className="as-summary-rows">
              <div className="as-summary-row">
                <span className="as-summary-key">First Name</span>
                <span className="as-summary-val truncate max-w-[140px]">
                  {form.firstName || <span className="as-empty">—</span>}
                </span>
              </div>
              <div className="as-summary-row">
                <span className="as-summary-key">Last Name</span>
                <span className="as-summary-val truncate max-w-[140px]">
                  {form.lastName || <span className="as-empty">—</span>}
                </span>
              </div>
              <div className="as-summary-row">
                <span className="as-summary-key">Department</span>
                <span className="as-summary-val">
                  {form.department || <span className="as-empty">—</span>}
                </span>
              </div>
              <div className="as-summary-row">
                <span className="as-summary-key">Title</span>
                <span className="as-summary-val">
                  {form.designation || <span className="as-empty">—</span>}
                </span>
              </div>
              
              <div className="as-summary-row as-summary-salary">
                <span className="as-summary-key">Monthly Base</span>
                <span>
                  {form.salary ? formatCurrency(Number(form.salary)) : <span className="as-empty">—</span>}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="luxury-btn luxury-btn-primary as-submit-btn"
            >
              {saving ? (
                <>
                  <span className="eb-loading-spinner as-btn-spinner" />
                  Saving…
                </>
              ) : (
                <>
                  <Save size={15} />
                  Complete Onboarding
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate(`/workspace/${branchId}/hr`)}
              className="luxury-btn luxury-btn-outline as-cancel-btn"
            >
              Cancel
            </button>
          </div>
        </div>

      </form>
    </div>
  );
};

export default AddStaff;
