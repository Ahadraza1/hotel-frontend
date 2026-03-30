import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Globe,
  BedDouble,
  Settings2,
  CheckCircle2,
  User,
  Mail,
  Phone,
} from "lucide-react";
import api from "@/api/axios";
import { useToast } from "@/components/confirm/ConfirmProvider";
import {
  validateCountryField,
  validateEmailField,
  validatePhoneField,
} from "@/lib/fieldValidation";

interface Organization {
  _id: string;
  organizationId?: string;
  name: string;
}

interface Branch {
  _id: string;
  name: string;
  organization: string;
  country: string;
  rooms: number;
  status: "active" | "inactive" | "maintenance";
  managerName: string;
  managerEmail: string;
  managerPhone: string;
}

const EditBranch = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [form, setForm] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const getFieldError = (name: string, value: string) => {
    switch (name) {
      case "country":
        return validateCountryField(value);
      case "managerEmail":
        return value.trim() ? validateEmailField(value) : "";
      case "managerPhone":
        return value.trim() ? validatePhoneField(value) : "";
      default:
        return "";
    }
  };

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const res = await api.get<{ data: Organization[] }>("/organizations");
        setOrganizations(res.data.data || []);
      } catch (err) {
        console.error("Failed to fetch organizations", err);
      }
    };

    fetchOrganizations();
  }, []);

  useEffect(() => {
    const fetchBranch = async () => {
      try {
        const res = await api.get(`/branches/${id}`);

        console.log("API RESPONSE:", res.data);

        const branch = res.data.data ? res.data.data : res.data;

        if (!branch) {
          throw new Error("Invalid branch response");
        }

        setForm({
          _id: branch._id,
          name: branch.name,
          organization:
            typeof branch.organization === "string"
              ? branch.organization
              : branch.organization?._id ||
                branch.organizationId ||
                "",
          country: branch.country,
          rooms: branch.rooms,
          status: branch.status,
          managerName: branch.branchManager?.name || "",
          managerEmail: branch.branchManager?.email || "",
          managerPhone: branch.branchManager?.phone || "",
        });
      } catch (err) {
        console.error("Failed to fetch branch", err);
      } finally {
        setInitialLoading(false);
      }
    };

    if (id) fetchBranch();
  }, [id]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    if (!form) return;

    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev!,
      [name]: name === "rooms" ? Number(value) : value,
    }));

    if (["country", "managerEmail", "managerPhone"].includes(name)) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        const nextError = getFieldError(name, value);

        if (nextError) next[name] = nextError;
        else delete next[name];

        return next;
      });
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (!["country", "managerEmail", "managerPhone"].includes(e.target.name)) {
      return;
    }

    setFieldErrors((prev) => {
      const next = { ...prev };
      const nextError = getFieldError(e.target.name, e.target.value);

      if (nextError) next[e.target.name] = nextError;
      else delete next[e.target.name];

      return next;
    });
  };

  const handleSubmit = async () => {
    if (!form) return;

    const nextErrors: Record<string, string> = {};
    const countryError = getFieldError("country", form.country);
    if (countryError) nextErrors.country = countryError;

    const managerEmailError = getFieldError("managerEmail", form.managerEmail);
    if (managerEmailError) nextErrors.managerEmail = managerEmailError;

    const managerPhoneError = getFieldError("managerPhone", form.managerPhone);
    if (managerPhoneError) nextErrors.managerPhone = managerPhoneError;

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      setLoading(true);

      await api.put(`/branches/${id}`, {
        name: form.name,
        organization: form.organization,
        country: form.country,
        rooms: form.rooms,
        status: form.status,
        manager: {
          name: form.managerName,
          email: form.managerEmail,
          phone: form.managerPhone,
        },
      });

      toast.success("Branch updated successfully.");
      navigate("/branches");
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? "Failed to update branch";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading || !form) {
    return (
      <div className="animate-fade-in add-branch-root">
        <div className="eb-loading">
          <span className="eb-loading-spinner" />
          <span>Loading branch details...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in add-branch-root">
      <button
        onClick={() => navigate(-1)}
        className="add-branch-back-btn"
        aria-label="Back to Branches"
      >
        <span className="add-branch-back-icon-wrap">
          <ArrowLeft className="add-branch-back-icon" />
        </span>
        <span className="add-branch-back-label">Back to Branches</span>
      </button>

      <div className="add-branch-header">
        <div className="add-branch-header-icon-wrap">
          <Settings2 className="add-branch-header-icon" />
        </div>
        <div>
          <h1 className="page-title">Edit Branch</h1>
          <p className="page-subtitle">
            Update branch details and operational settings
          </p>
        </div>
      </div>

      <div className="luxury-card add-branch-card">
        <div className="add-branch-section-label">
          <span className="add-branch-section-pill">Branch Details</span>
        </div>

        <div className="add-branch-grid">
          <div className="add-branch-field add-branch-field-full">
            <label htmlFor="branch-name" className="add-branch-label">
              Branch Name
            </label>
            <div className="add-branch-input-wrap">
              <Building2 className="add-branch-field-icon" />
              <input
                id="branch-name"
                name="name"
                value={form.name}
                onChange={handleChange}
                className="luxury-input add-branch-input-with-icon"
                placeholder="e.g. The Grand Palace - Dubai"
              />
            </div>
          </div>

          <div className="add-branch-field add-branch-field-full">
            <label htmlFor="branch-org" className="add-branch-label">
              Organization
            </label>
            <div className="add-branch-input-wrap">
              <Building2 className="add-branch-field-icon" />
              <select
                id="branch-org"
                name="organization"
                value={form.organization}
                onChange={handleChange}
                className="luxury-input luxury-select add-branch-input-with-icon"
                aria-label="Select organization"
              >
                <option value="">Select Organization</option>
                {organizations.map((org) => (
                  <option
                    key={org._id}
                    value={org.organizationId || org._id}
                  >
                    {org.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="add-branch-field">
            <label htmlFor="branch-country" className="add-branch-label">
              Country
            </label>
            <div className="add-branch-input-wrap">
              <Globe className="add-branch-field-icon" />
              <input
                id="branch-country"
                name="country"
                value={form.country}
                onChange={handleChange}
                onBlur={handleBlur}
                className="luxury-input add-branch-input-with-icon"
                placeholder="e.g. United Arab Emirates"
              />
            </div>
            {fieldErrors.country ? (
              <span
                style={{
                  color: "#dc2626",
                  display: "block",
                  fontSize: "0.875rem",
                  marginTop: "0.35rem",
                }}
              >
                {fieldErrors.country}
              </span>
            ) : null}
          </div>

          <div className="add-branch-field">
            <label htmlFor="branch-rooms" className="add-branch-label">
              Add Rooms
            </label>
            <div className="add-branch-input-wrap">
              <BedDouble className="add-branch-field-icon" />
              <input
                id="branch-rooms"
                type="number"
                name="rooms"
                value={form.rooms}
                onChange={handleChange}
                className="luxury-input add-branch-input-with-icon"
                placeholder="e.g. 120"
                min={0}
              />
            </div>
          </div>

          <div className="add-branch-field add-branch-field-full">
            <label htmlFor="branch-status" className="add-branch-label">
              Status
            </label>
            <div className="add-branch-input-wrap">
              <CheckCircle2 className="add-branch-field-icon" />
              <select
                id="branch-status"
                name="status"
                value={form.status}
                onChange={handleChange}
                className="luxury-input luxury-select add-branch-input-with-icon"
                aria-label="Select branch status"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
          </div>
        </div>

        <div className="add-branch-divider" />

        <div className="add-branch-section-label">
          <span className="add-branch-section-pill">
            Branch Manager Details
          </span>
        </div>

        <div className="add-branch-grid">
          <div className="add-branch-field add-branch-field-full">
            <label htmlFor="manager-name" className="add-branch-label">
              Manager Name
            </label>
            <div className="add-branch-input-wrap">
              <User className="add-branch-field-icon" />
              <input
                id="manager-name"
                name="managerName"
                value={form.managerName}
                onChange={handleChange}
                className="luxury-input add-branch-input-with-icon"
                placeholder="e.g. Ahmed Al-Rashidi"
              />
            </div>
          </div>

          <div className="add-branch-field">
            <label htmlFor="manager-email" className="add-branch-label">
              Manager Email
            </label>
            <div className="add-branch-input-wrap">
              <Mail className="add-branch-field-icon" />
              <input
                id="manager-email"
                name="managerEmail"
                value={form.managerEmail}
                onChange={handleChange}
                onBlur={handleBlur}
                type="email"
                className="luxury-input add-branch-input-with-icon"
                placeholder="manager@hotel.com"
              />
            </div>
            {fieldErrors.managerEmail ? (
              <span
                style={{
                  color: "#dc2626",
                  display: "block",
                  fontSize: "0.875rem",
                  marginTop: "0.35rem",
                }}
              >
                {fieldErrors.managerEmail}
              </span>
            ) : null}
          </div>

          <div className="add-branch-field">
            <label htmlFor="manager-phone" className="add-branch-label">
              Manager Phone
            </label>
            <div className="add-branch-input-wrap">
              <Phone className="add-branch-field-icon" />
              <input
                id="manager-phone"
                name="managerPhone"
                value={form.managerPhone}
                onChange={handleChange}
                onBlur={handleBlur}
                className="luxury-input add-branch-input-with-icon"
                placeholder="+91 99999 00000"
              />
            </div>
            {fieldErrors.managerPhone ? (
              <span
                style={{
                  color: "#dc2626",
                  display: "block",
                  fontSize: "0.875rem",
                  marginTop: "0.35rem",
                }}
              >
                {fieldErrors.managerPhone}
              </span>
            ) : null}
          </div>
        </div>

        <div className="add-branch-actions">
          <button
            onClick={() => navigate(-1)}
            className="luxury-btn luxury-btn-outline add-branch-cancel-btn"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            className="luxury-btn luxury-btn-primary add-branch-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="add-branch-spinner" />
                Updating...
              </>
            ) : (
              <>
                <Settings2 className="add-branch-submit-icon" />
                Update Branch
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditBranch;
