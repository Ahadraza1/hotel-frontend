import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { City, Country, State } from "country-state-city";
import {
  ArrowLeft,
  Building2,
  Globe,
  BedDouble,
  DollarSign,
  Clock,
  User,
  Mail,
  Phone,
} from "lucide-react";
import api from "@/api/axios";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/confirm/ConfirmProvider";
import {
  validateCountryField,
  validateCityField,
  validateEmailField,
  validatePhoneField,
  validateStateField,
} from "@/lib/fieldValidation";

interface Organization {
  _id: string;
  organizationId: string; // ✅ ADD THIS
  name: string;
}

const COUNTRY_OPTIONS = Country.getAllCountries();

const AddBranch = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [eligibilityLoading, setEligibilityLoading] = useState(true);
  const [branchRestricted, setBranchRestricted] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { user } = useAuth();

  const [form, setForm] = useState({
    name: "",
    organizationId: "",
    country: "",
    state: "",
    city: "",
    rooms: 0,
    floors: 1,
    status: "active",
    timezone: "Asia/Kolkata",
    currency: "INR",

    managerName: "",
    managerEmail: "",
    managerPhone: "",
  });
  const selectedCountry = useMemo(
    () =>
      COUNTRY_OPTIONS.find((country) => country.name === form.country) || null,
    [form.country],
  );

  const stateOptions = useMemo(
    () =>
      selectedCountry ? State.getStatesOfCountry(selectedCountry.isoCode) : [],
    [selectedCountry],
  );

  const selectedState = useMemo(
    () => stateOptions.find((state) => state.name === form.state) || null,
    [form.state, stateOptions],
  );

  const cityOptions = useMemo(
    () =>
      selectedCountry && selectedState
        ? City.getCitiesOfState(selectedCountry.isoCode, selectedState.isoCode)
        : [],
    [selectedCountry, selectedState],
  );

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        if (user?.role === "SUPER_ADMIN") {
          const res = await api.get<{ data: Organization[] }>("/organizations");
          setOrganizations(res.data.data || []);
        }

        if (user?.role === "CORPORATE_ADMIN") {
          setForm((prev) => ({
            ...prev,
            organizationId: user.organizationId || "",
          }));
        }
      } catch (err) {
        console.error("Failed to fetch organizations", err);
      }
    };

    if (user) {
      fetchOrganizations();
    }
  }, [user]);

  useEffect(() => {
    const verifyEligibility = async () => {
      if (user?.role !== "CORPORATE_ADMIN") {
        setEligibilityLoading(false);
        return;
      }

      try {
        const response = await api.get<{
          data: { canAddBranch: boolean; restrictionReason: string | null };
        }>("/subscriptions/branch-eligibility");

        if (!response.data.data.canAddBranch) {
          const message =
            response.data.data.restrictionReason ||
            "Branch creation is currently restricted.";
          setBranchRestricted(message);
          toast.error(message);
          navigate("/subscriptions");
          return;
        }
      } catch (error: unknown) {
        const message =
          (error as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || "Failed to validate branch eligibility";
        setBranchRestricted(message);
        toast.error(message);
        navigate("/subscriptions");
        return;
      } finally {
        setEligibilityLoading(false);
      }
    };

    verifyEligibility();
  }, [navigate, toast, user]);

  const getFieldError = (name: string, value: string) => {
    switch (name) {
      case "country":
        return validateCountryField(value);
      case "state":
        return value ? validateStateField(form.country, value) : "";
      case "city":
        return value ? validateCityField(form.country, form.state, value) : "";
      case "managerEmail":
        return value.trim() ? validateEmailField(value) : "";
      case "managerPhone":
        return value.trim() ? validatePhoneField(value) : "";
      default:
        return "";
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    const nextValue = name === "rooms" || name === "floors" ? Number(value) : value;

    setForm((prev) => {
      const nextForm = {
        ...prev,
        [name]: nextValue,
      };

      if (name === "country") {
        nextForm.state = "";
        nextForm.city = "";
      }

      if (name === "state") {
        nextForm.city = "";
      }

      return nextForm;
    });

    if (typeof nextValue === "string") {
      setFieldErrors((prev) => {
        const next = { ...prev };
        const nextError = getFieldError(name, nextValue);

        if (nextError) next[name] = nextError;
        else delete next[name];

        if (name === "country") {
          delete next.state;
          delete next.city;
        }

        if (name === "state") {
          delete next.city;
        }

        return next;
      });
    }
  };

  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;

    setFieldErrors((prev) => {
      const next = { ...prev };
      const nextError = getFieldError(name, value);

      if (nextError) next[name] = nextError;
      else delete next[name];

      return next;
    });
  };

  const handleSubmit = async () => {
    if (branchRestricted) {
      toast.error(branchRestricted);
      navigate("/subscriptions");
      return;
    }

    const nextErrors: Record<string, string> = {};
    const countryError = getFieldError("country", form.country);
    if (countryError) nextErrors.country = countryError;

    const stateError = getFieldError("state", form.state);
    if (stateError) nextErrors.state = stateError;

    const cityError = getFieldError("city", form.city);
    if (cityError) nextErrors.city = cityError;

    const managerEmailError = getFieldError("managerEmail", form.managerEmail);
    if (managerEmailError) nextErrors.managerEmail = managerEmailError;

    const managerPhoneError = getFieldError("managerPhone", form.managerPhone);
    if (managerPhoneError) nextErrors.managerPhone = managerPhoneError;

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      setLoading(true);

      await api.post("/branches", {
        name: form.name,
        organizationId: form.organizationId,
        country: form.country,
        state: form.state,
        city: form.city,
        rooms: form.rooms,
        floors: form.floors,
        status: form.status,
        timezone: form.timezone,
        currency: form.currency,

        manager: {
          name: form.managerName,
          email: form.managerEmail,
          phone: form.managerPhone,
        },
      });

      toast.success("Branch created successfully.");
      navigate("/branches");
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? "Failed to create branch";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in add-branch-root">
      {/* ── Back Button ── */}
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

      {/* ── Page Header ── */}
      <div className="add-branch-header">
        <div className="add-branch-header-icon-wrap">
          <Building2 className="add-branch-header-icon" />
        </div>
        <div>
          <h1 className="page-title">Register New Branch</h1>
          <p className="page-subtitle">
            Add a new hotel branch under an organization
          </p>
        </div>
      </div>

      {/* ── Form Card ── */}
      <div className="luxury-card add-branch-card">
        {/* Section: Branch Details */}
        <div className="add-branch-section-label">
          <span className="add-branch-section-pill">Branch Details</span>
        </div>

        <div className="add-branch-grid">
          {/* Branch Name */}
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
                placeholder="e.g. The Grand Palace – Dubai"
              />
            </div>
          </div>

          {/* Organization */}
          <div className="add-branch-field add-branch-field-full">
            <label htmlFor="branch-org" className="add-branch-label">
              Organization
            </label>
            <div className="add-branch-input-wrap">
              <Building2 className="add-branch-field-icon" />
              <select
                id="branch-org"
                name="organizationId"
                value={form.organizationId}
                onChange={handleChange}
                disabled={user?.role === "CORPORATE_ADMIN"}
                className="luxury-input luxury-select add-branch-input-with-icon"
              >
                <option value="">Select Organization</option>
                {organizations.map((org) => (
                  <option key={org.organizationId} value={org.organizationId}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Country */}
          <div className="add-branch-field">
            <label htmlFor="branch-country" className="add-branch-label">
              Country
            </label>
            <div className="add-branch-input-wrap">
              <Globe className="add-branch-field-icon" />
              <select
                id="branch-country"
                name="country"
                value={form.country}
                onChange={handleChange}
                onBlur={handleBlur}
                className="luxury-input luxury-select add-branch-input-with-icon"
              >
                <option value="">Select Country</option>
                {COUNTRY_OPTIONS.map((country) => (
                  <option key={country.isoCode} value={country.name}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>
            {fieldErrors.country ? (
              <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>
                {fieldErrors.country}
              </span>
            ) : null}
          </div>

          <div className="add-branch-field">
            <label htmlFor="branch-state" className="add-branch-label">
              State
            </label>
            <div className="add-branch-input-wrap">
              <Building2 className="add-branch-field-icon" />
              <select
                id="branch-state"
                name="state"
                value={form.state}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={!form.country}
                className="luxury-input luxury-select add-branch-input-with-icon"
              >
                <option value="">Select State</option>
                {stateOptions.map((state) => (
                  <option key={`${state.countryCode}-${state.isoCode}`} value={state.name}>
                    {state.name}
                  </option>
                ))}
              </select>
            </div>
            {fieldErrors.state ? (
              <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>
                {fieldErrors.state}
              </span>
            ) : null}
          </div>

          <div className="add-branch-field">
            <label htmlFor="branch-city" className="add-branch-label">
              City
            </label>
            <div className="add-branch-input-wrap">
              <Building2 className="add-branch-field-icon" />
              <select
                id="branch-city"
                name="city"
                value={form.city}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={!form.country || !form.state}
                className="luxury-input luxury-select add-branch-input-with-icon"
              >
                <option value="">Select City</option>
                {cityOptions.map((city) => (
                  <option
                    key={`${city.countryCode}-${city.stateCode}-${city.name}`}
                    value={city.name}
                  >
                    {city.name}
                  </option>
                ))}
              </select>
            </div>
            {fieldErrors.city ? (
              <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>
                {fieldErrors.city}
              </span>
            ) : null}
          </div>

          {/* Total Rooms */}
          <div className="add-branch-field">
            <label htmlFor="branch-rooms" className="add-branch-label">
              Create Rooms
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

          {/* Floors */}
          <div className="add-branch-field">
            <label htmlFor="branch-floors" className="add-branch-label">
              Floors
            </label>

            <div className="add-branch-input-wrap">
              <Building2 className="add-branch-field-icon" />

              <input
                id="branch-floors"
                type="number"
                name="floors"
                value={form.floors}
                onChange={handleChange}
                className="luxury-input add-branch-input-with-icon"
                placeholder="e.g. 3"
                min={1}
              />
            </div>
          </div>

          {/* Currency */}
          <div className="add-branch-field">
            <label htmlFor="branch-currency" className="add-branch-label">
              Currency
            </label>
            <div className="add-branch-input-wrap">
              <DollarSign className="add-branch-field-icon" />
              <input
                id="branch-currency"
                name="currency"
                value={form.currency}
                onChange={handleChange}
                className="luxury-input add-branch-input-with-icon"
                placeholder="e.g. INR, USD, AED"
              />
            </div>
          </div>

          {/* Timezone */}
          <div className="add-branch-field">
            <label htmlFor="branch-timezone" className="add-branch-label">
              Timezone
            </label>
            <div className="add-branch-input-wrap">
              <Clock className="add-branch-field-icon" />
              <input
                id="branch-timezone"
                name="timezone"
                value={form.timezone}
                onChange={handleChange}
                className="luxury-input add-branch-input-with-icon"
                placeholder="e.g. Asia/Kolkata"
              />
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="add-branch-divider" />

        {/* Section: Branch Manager Details */}
        <div className="add-branch-section-label">
          <span className="add-branch-section-pill">
            Branch Manager Details
          </span>
        </div>

        <div className="add-branch-grid">
          {/* Manager Name */}
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

          {/* Manager Email */}
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
              <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>
                {fieldErrors.managerEmail}
              </span>
            ) : null}
          </div>

          {/* Manager Phone */}
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
              <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>
                {fieldErrors.managerPhone}
              </span>
            ) : null}
          </div>
        </div>

        {/* ── Action Buttons ── */}
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
            disabled={loading || eligibilityLoading || !!branchRestricted}
          >
            {loading ? (
              <>
                <span className="add-branch-spinner" />
                Creating…
              </>
            ) : (
              <>
                <Building2 className="add-branch-submit-icon" />
                Create Branch
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddBranch;
