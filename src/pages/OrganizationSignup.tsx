import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { City, Country, State } from "country-state-city";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  ChevronRight,
  CircleAlert,
  Crown,
  Globe,
  Globe2,
  LoaderCircle,
  Lock,
  LockKeyhole,
  Mail,
  MapPinned,
  Phone,
  Shield,
  ShieldCheck,
  Sparkles,
  UserRoundCog,
} from "lucide-react";
import api from "@/api/axios";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { useToast } from "@/components/confirm/ConfirmProvider";
import { useTheme } from "@/contexts/ThemeContext";
import MarketingHeader from "@/components/layout/MarketingHeader.tsx";
import "./landing.css";
import {
  clearSignupCheckoutState,
  readSuccessfulSignupCheckout,
  storeSuccessfulSignupCheckout,
  type SignupCheckoutState,
} from "@/lib/signupCheckout";
import {
  validateEmailField,
  validatePhoneField,
} from "@/lib/fieldValidation";

type BillingCycle = "monthly" | "yearly";

type SignupPlan = {
  id?: string | null;
  _id?: string | null;
  code: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  branchLimit: number | null;
  features: string[];
};

const FALLBACK_PLANS: SignupPlan[] = [
  {
    id: null,
    code: "BASIC",
    name: "Basic",
    description:
      "Built for independent hotels starting centralized operations.",
    monthlyPrice: 49,
    yearlyPrice: 490,
    branchLimit: 3,
    features: [
      "Corporate admin workspace",
      "Reservations and room operations",
      "Branch-level visibility",
      "Core reporting",
    ],
  },
  {
    id: null,
    code: "PRO",
    name: "Pro",
    description:
      "Designed for fast-growing hotel groups managing multiple properties.",
    monthlyPrice: 129,
    yearlyPrice: 1290,
    branchLimit: 15,
    features: [
      "Everything in Basic",
      "Advanced analytics",
      "Inventory and housekeeping",
      "Priority support",
    ],
  },
  {
    id: null,
    code: "ENTERPRISE",
    name: "Enterprise",
    description:
      "A premium setup for large chains and enterprise hospitality portfolios.",
    monthlyPrice: 299,
    yearlyPrice: 2990,
    branchLimit: null,
    features: [
      "Everything in Pro",
      "Unlimited branches",
      "Enterprise-ready controls",
      "Dedicated success support",
    ],
  },
];

const BUSINESS_TYPES = [
  "Hotel",
  "Resort",
  "Chain",
  "Boutique Hotel",
  "Serviced Apartment",
  "Villa Group",
];

const COUNTRY_OPTIONS = Country.getAllCountries();

const STEPS = [
  {
    id: 0,
    eyebrow: "Step 1",
    title: "Organization Details",
    subtitle: "Tell us about your hotel business and where it operates.",
  },
  {
    id: 1,
    eyebrow: "Step 2",
    title: "Corporate Admin Details",
    subtitle: "Create the main admin login for your organization.",
  },
  {
    id: 2,
    eyebrow: "Step 3",
    title: "Plan Selection",
    subtitle: "Select the subscription plan for this organization.",
  },
];

const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const OrganizationSignup = () => {
  const { formatCurrency } = useSystemSettings();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [accessLoading, setAccessLoading] = useState(true);
  const [plansLoading, setPlansLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState("");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [plans, setPlans] = useState<SignupPlan[]>(FALLBACK_PLANS);
  const [selectedPlanCode, setSelectedPlanCode] = useState("PRO");
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [paymentSession, setPaymentSession] = useState<SignupCheckoutState | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState({
    organizationName: "",
    businessType: "Hotel",
    numberOfBranches: "",
    country: "",
    state: "",
    city: "",
    fullBusinessAddress: "",
    taxId: "",
    contactPhone: "",
    organizationEmail: "",
    adminFullName: "",
    adminEmail: "",
    adminPhone: "",
    password: "",
    confirmPassword: "",
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
    let active = true;

    const validateCheckoutAccess = async () => {
      const storedCheckout = readSuccessfulSignupCheckout();
      const checkoutReference =
        searchParams.get("checkoutRef") || storedCheckout?.checkoutReference || "";

      if (!checkoutReference) {
        clearSignupCheckoutState();
        toast.error("Please complete payment before accessing signup.");
        navigate("/pricing", { replace: true });
        return;
      }

      try {
        setAccessLoading(true);

        const response = await api.get<{
          data: SignupCheckoutState;
        }>(`/auth/signup/checkout/session/${encodeURIComponent(checkoutReference)}`);

        if (!active) return;

        const checkoutData = response.data.data;

        setPaymentSession(checkoutData);
        storeSuccessfulSignupCheckout(checkoutData);
        setBillingCycle(checkoutData.billingCycle);
        setSelectedPlanId(checkoutData.planId);
        setForm((prev) => ({
          ...prev,
          adminEmail: checkoutData.email,
          adminFullName: prev.adminFullName || checkoutData.name || "",
        }));
      } catch (error) {
        if (!active) return;
        clearSignupCheckoutState();
        toast.error("Successful payment is required before signup.");
        navigate("/pricing", { replace: true });
      } finally {
        if (active) {
          setAccessLoading(false);
        }
      }
    };

    void validateCheckoutAccess();

    return () => {
      active = false;
    };
  }, [navigate, searchParams, toast]);

  const getFieldError = (
    name: string,
    value: string,
  ): string => {
    switch (name) {
      case "country":
        return value ? "" : "Please select a country";
      case "state":
        return value ? "" : "Please select a state";
      case "city":
        return value ? "" : "Please select a city";
      case "contactPhone":
      case "adminPhone":
        return validatePhoneField(value);
      case "organizationEmail":
      case "adminEmail":
        return validateEmailField(value);
      default:
        return "";
    }
  };

  useEffect(() => {
    let active = true;

    const loadPlans = async () => {
      try {
        setPlansLoading(true);
        const response = await api.get<{ data: SignupPlan[] }>(
          "/auth/signup-plans",
        );

        if (!active || !response.data?.data?.length) {
          return;
        }

        setPlans(response.data.data);

        const defaultPlan =
          response.data.data.find((plan) => plan.code === "PRO") ||
          response.data.data[0];

        if (defaultPlan) {
          if (!paymentSession) {
            setSelectedPlanCode(defaultPlan.code);
            setSelectedPlanId(defaultPlan._id || defaultPlan.id || null);
          }
        }
      } catch {
        setPlans(FALLBACK_PLANS);
        if (!paymentSession) {
          setSelectedPlanCode("PRO");
          setSelectedPlanId(null);
        }
      } finally {
        if (active) {
          setPlansLoading(false);
        }
      }
    };

    loadPlans();

    return () => {
      active = false;
    };
  }, [paymentSession]);

  useEffect(() => {
    if (!paymentSession) return;

    setBillingCycle(paymentSession.billingCycle);
    setSelectedPlanId(paymentSession.planId);

    const matchedPlan = plans.find((plan) => {
      const planIdentity = plan._id || plan.id || "";
      return (
        String(planIdentity) === String(paymentSession.planId) ||
        plan.name === paymentSession.planName
      );
    });

    if (matchedPlan) {
      setSelectedPlanCode(matchedPlan.code);
    }
  }, [paymentSession, plans]);

  const selectedPlan = useMemo(
    () =>
      plans.find((plan) => plan.code === selectedPlanCode) ||
      plans.find(
        (plan) =>
          String(plan._id || plan.id || "") === String(paymentSession?.planId || ""),
      ) ||
      (paymentSession
        ? {
            _id: paymentSession.planId,
            code: "PAID_PLAN",
            name: paymentSession.planName,
            description: "",
            monthlyPrice:
              paymentSession.billingCycle === "monthly" ? paymentSession.price : 0,
            yearlyPrice:
              paymentSession.billingCycle === "yearly" ? paymentSession.price : 0,
            branchLimit: null,
            features: [],
          }
        : null) ||
      plans[0] ||
      FALLBACK_PLANS[1],
    [paymentSession, plans, selectedPlanCode],
  );

  const handleChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = event.target;
    const nextForm = {
      ...form,
      [name]: value,
    };

    if (name === "country") {
      nextForm.state = "";
      nextForm.city = "";
    }

    if (name === "state") {
      nextForm.city = "";
    }

    setForm(nextForm);

    setErrors((prev) => {
      const next = { ...prev };
      const nextError = getFieldError(name, value);

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
  };

  const handleBlur = (
    event: React.FocusEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = event.target;

    setTouched((prev) => ({ ...prev, [name]: true }));
    setErrors((prev) => {
      const next = { ...prev };
      const nextError = getFieldError(name, value);

      if (nextError) next[name] = nextError;
      else delete next[name];

      return next;
    });
  };

  const handlePhoneChange = (name: "contactPhone" | "adminPhone", value: string) => {
    const formattedValue = value ? `+${value}` : "";
    const nextForm = {
      ...form,
      [name]: formattedValue,
    };

    setForm(nextForm);
    setErrors((prev) => {
      const next = { ...prev };
      const nextError = getFieldError(name, formattedValue);

      if (nextError && (touched[name] || prev[name])) next[name] = nextError;
      else delete next[name];

      return next;
    });
  };

  const handlePhoneBlur = (name: "contactPhone" | "adminPhone") => {
    setTouched((prev) => ({ ...prev, [name]: true }));
    setErrors((prev) => {
      const next = { ...prev };
      const nextError = getFieldError(name, form[name]);

      if (nextError) next[name] = nextError;
      else delete next[name];

      return next;
    });
  };

  const validateStep = (step: number) => {
    const nextErrors: Record<string, string> = {};

    if (step === 0) {
      if (!form.organizationName.trim())
        nextErrors.organizationName = "Organization name is required";
      if (!form.businessType.trim())
        nextErrors.businessType = "Business type is required";
      if (form.numberOfBranches && Number(form.numberOfBranches) < 1) {
        nextErrors.numberOfBranches = "Branches must be at least 1";
      }
      if (!form.country) nextErrors.country = "Please select a country";
      if (!form.state) nextErrors.state = "Please select a state";
      if (!form.city) nextErrors.city = "Please select a city";
      if (!form.fullBusinessAddress.trim())
        nextErrors.fullBusinessAddress = "Business address is required";
      const contactPhoneError = getFieldError("contactPhone", form.contactPhone);
      if (contactPhoneError) nextErrors.contactPhone = contactPhoneError;

      const organizationEmailError = getFieldError(
        "organizationEmail",
        form.organizationEmail,
      );
      if (organizationEmailError)
        nextErrors.organizationEmail = organizationEmailError;
    }

    if (step === 1) {
      if (!form.adminFullName.trim())
        nextErrors.adminFullName = "Corporate admin name is required";
      const adminEmailError = getFieldError("adminEmail", form.adminEmail);
      if (adminEmailError) nextErrors.adminEmail = adminEmailError;
      const adminPhoneError = getFieldError("adminPhone", form.adminPhone);
      if (adminPhoneError) nextErrors.adminPhone = adminPhoneError;

      if (!form.password) nextErrors.password = "Password is required";
      else if (!passwordRegex.test(form.password)) {
        nextErrors.password = "Use 8+ chars with uppercase, number, and symbol";
      }
      if (!form.confirmPassword)
        nextErrors.confirmPassword = "Please confirm the password";
      else if (form.password !== form.confirmPassword)
        nextErrors.confirmPassword = "Passwords do not match";
    }

    setErrors((prev) => {
      const filteredEntries = Object.entries(prev).filter(([key]) => {
        const organizationFields = [
          "organizationName",
          "businessType",
          "numberOfBranches",
          "country",
          "state",
          "city",
          "fullBusinessAddress",
          "contactPhone",
          "organizationEmail",
        ];
        const adminFields = [
          "adminFullName",
          "adminEmail",
          "adminPhone",
          "password",
          "confirmPassword",
        ];

        if (step === 0) return !organizationFields.includes(key);
        if (step === 1) return !adminFields.includes(key);
        return true;
      });

      return {
        ...Object.fromEntries(filteredEntries),
        ...nextErrors,
      };
    });
    return Object.keys(nextErrors).length === 0;
  };

  const goNext = () => {
    if (!validateStep(currentStep)) return;
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handlePlanSelect = (plan: SignupPlan) => {
    if (paymentSession) return;
    setSelectedPlanCode(plan.code);
    setSelectedPlanId(plan._id || plan.id || null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const organizationValid = validateStep(0);
    const adminValid = validateStep(1);

    if (!organizationValid || !adminValid) {
      setTouched((prev) => ({
        ...prev,
        country: true,
        state: true,
        city: true,
        contactPhone: true,
        organizationEmail: true,
        adminEmail: true,
        adminPhone: true,
      }));
      setCurrentStep(!organizationValid ? 0 : 1);
      return;
    }

    try {
      setLoading(true);

      const response = await api.post<{
        message: string;
        redirect: string;
        data: { adminEmail: string };
      }>("/auth/organization-signup", {
        organizationName: form.organizationName,
        businessType: form.businessType,
        numberOfBranches: form.numberOfBranches,
        country: form.country,
        state: form.state,
        city: form.city,
        fullBusinessAddress: form.fullBusinessAddress,
        taxId: form.taxId,
        contactPhone: form.contactPhone,
        organizationEmail: form.organizationEmail,
        adminFullName: form.adminFullName,
        adminEmail: form.adminEmail,
        adminPhone: form.adminPhone,
        password: form.password,
        selectedPlanId,
        selectedPlanCode,
        billingCycle,
        checkoutReference: paymentSession?.checkoutReference,
      });

      clearSignupCheckoutState();
      setSuccessMessage(
        `${response.data.message}. Redirecting to login for ${response.data.data.adminEmail}...`,
      );

      toast.success("Organization created successfully");

      window.setTimeout(() => {
        navigate(response.data.redirect || "/login");
      }, 1800);
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || "Failed to create organization";

      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const renderFieldError = (field: string) =>
    errors[field] ? (
      <span className="org-signup-error">{errors[field]}</span>
    ) : null;

  const { theme } = useTheme();

  if (accessLoading) {
    return (
      <div className="lnd-root" data-theme={theme}>
        <MarketingHeader />
        <div className="luxury-signup-root">
          <div className="luxury-signup-card">
            <div className="org-signup-success-card">
              <div className="org-signup-success-icon">
                <LoaderCircle className="lnd-spin" />
              </div>
              <h3>Validating payment</h3>
              <p>We’re confirming your successful payment before unlocking signup.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lnd-root" data-theme={theme}>
      <MarketingHeader />
      <div className="luxury-signup-root">
        {/* Subtle radial glow above card */}
        <div className="luxury-signup-glow-top" aria-hidden="true" />

        <div className="luxury-signup-card">
          <div className="luxury-signup-header">
            <div className="lp-form-crown-wrap" style={{ margin: "0 auto 1.5rem" }}>
              <Crown className="lp-form-crown-icon" />
            </div>
            <span className="luxury-signup-eyebrow">Onboarding Process</span>
            <h1 className="luxury-signup-title">Create Your Organization Account</h1>
            <p className="luxury-signup-subtitle">
              Register your hotel business and manage everything in one place with our enterprise-grade command center.
            </p>
          </div>


          {successMessage ? (
            <div className="org-signup-success-card">
              <div className="org-signup-success-icon">
                <BadgeCheck />
              </div>
              <h3>Registration complete</h3>
              <p>{successMessage}</p>
              <Link to="/login" className="org-signup-success-link">
                Continue to login <ArrowRight />
              </Link>
            </div>
          ) : (
            <form className="org-signup-form" onSubmit={handleSubmit}>
              <div className="org-signup-stepper">
                {STEPS.map((step) => (
                  <button
                    key={step.id}
                    type="button"
                    className={`org-signup-step ${currentStep === step.id ? "is-active" : ""} ${
                      currentStep > step.id ? "is-complete" : ""
                    }`}
                    onClick={() => {
                      if (step.id <= currentStep) setCurrentStep(step.id);
                    }}
                  >
                    <span className="org-signup-step-index">
                      {currentStep > step.id ? <Check /> : step.id + 1}
                    </span>
                    <span>
                      <small>{step.eyebrow}</small>
                      <strong>{step.title}</strong>
                    </span>
                    {step.id < STEPS.length - 1 ? (
                      <ChevronRight className="org-signup-step-arrow" />
                    ) : null}
                  </button>
                ))}
              </div>

              <div className="org-signup-section-card">
                <div className="org-signup-section-head">
                  <div className="org-signup-section-icon">
                    {currentStep === 0 ? (
                      <Building2 />
                    ) : currentStep === 1 ? (
                      <UserRoundCog />
                    ) : (
                      <Crown />
                    )}
                  </div>
                  <div>
                    <h3>{STEPS[currentStep].title}</h3>
                    <p>{STEPS[currentStep].subtitle}</p>
                  </div>
                </div>

                {currentStep === 0 ? (
                  <div className="org-signup-grid">
                    <label className="org-signup-field">
                      <span className="org-signup-field-label">Organization Name</span>
                      <div className="org-signup-input-wrap">
                        <Building2 />
                        <input
                          name="organizationName"
                          value={form.organizationName}
                          onChange={handleChange}
                          placeholder="Blue Harbor Hospitality Group"
                        />
                      </div>
                      {renderFieldError("organizationName")}
                    </label>

                    <label className="org-signup-field">
                      <span className="org-signup-field-label">Business Type</span>
                      <div className="org-signup-input-wrap">
                        <Building2 />
                        <select
                          name="businessType"
                          value={form.businessType}
                          onChange={handleChange}
                        >
                          {BUSINESS_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      </div>
                      {renderFieldError("businessType")}
                    </label>

                    <label className="org-signup-field">
                      <span className="org-signup-field-label">Number of Branches (Optional)</span>
                      <div className="org-signup-input-wrap">
                        <MapPinned />
                        <input
                          type="number"
                          min="1"
                          name="numberOfBranches"
                          value={form.numberOfBranches}
                          onChange={handleChange}
                          placeholder="5"
                        />
                      </div>
                      {renderFieldError("numberOfBranches")}
                    </label>

                    <label className="org-signup-field">
                      <span className="org-signup-field-label">Country</span>
                      <div className="org-signup-input-wrap">
                        <Globe2 />
                        <select
                          name="country"
                          value={form.country}
                          onChange={handleChange}
                          onBlur={handleBlur}
                        >
                          <option value="">Select country</option>
                          {COUNTRY_OPTIONS.map((country) => (
                            <option key={country.isoCode} value={country.name}>
                              {country.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      {renderFieldError("country")}
                    </label>

                    <label className="org-signup-field">
                      <span className="org-signup-field-label">State</span>
                      <div className="org-signup-input-wrap">
                        <MapPinned />
                        <select
                          name="state"
                          value={form.state}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          disabled={!selectedCountry}
                        >
                          <option value="">Select state</option>
                          {stateOptions.map((state) => (
                            <option key={`${state.countryCode}-${state.isoCode}`} value={state.name}>
                              {state.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      {renderFieldError("state")}
                    </label>

                    <label className="org-signup-field">
                      <span className="org-signup-field-label">City</span>
                      <div className="org-signup-input-wrap">
                        <MapPinned />
                        <select
                          name="city"
                          value={form.city}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          disabled={!selectedState}
                        >
                          <option value="">Select city</option>
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
                      {renderFieldError("city")}
                    </label>

                    <label className="org-signup-field org-signup-field-full">
                      <span className="org-signup-field-label">Full Business Address</span>
                      <div className="org-signup-input-wrap org-signup-input-wrap-textarea">
                        <MapPinned />
                        <textarea
                          name="fullBusinessAddress"
                          value={form.fullBusinessAddress}
                          onChange={handleChange}
                          placeholder="Corporate office address"
                          rows={4}
                        />
                      </div>
                      {renderFieldError("fullBusinessAddress")}
                    </label>

                    <label className="org-signup-field">
                      <span className="org-signup-field-label">GST / Tax ID (Optional)</span>
                      <div className="org-signup-input-wrap">
                        <ShieldCheck />
                        <input
                          name="taxId"
                          value={form.taxId}
                          onChange={handleChange}
                          placeholder="27ABCDE1234F1Z5"
                        />
                      </div>
                    </label>

                    <label className="org-signup-field">
                      <span className="org-signup-field-label">Contact Phone Number</span>
                      <div className="org-signup-phone-wrap">
                        <PhoneInput
                          country="in"
                          value={form.contactPhone.replace(/^\+/, "")}
                          onChange={(value) => handlePhoneChange("contactPhone", value)}
                          onBlur={() => handlePhoneBlur("contactPhone")}
                          inputProps={{
                            name: "contactPhone",
                            required: true,
                          }}
                          enableSearch
                          disableSearchIcon
                          countryCodeEditable={false}
                          specialLabel=""
                          inputClass="org-signup-phone-input"
                          buttonClass="org-signup-phone-button"
                          dropdownClass="org-signup-phone-dropdown"
                          searchClass="org-signup-phone-search"
                          isValid={(value) =>
                            !value || validatePhoneField(`+${value}`) === ""
                          }
                        />
                      </div>
                      {renderFieldError("contactPhone")}
                    </label>

                    <label className="org-signup-field">
                      <span className="org-signup-field-label">Organization Email</span>
                      <div className="org-signup-input-wrap">
                        <Mail />
                        <input
                          type="email"
                          name="organizationEmail"
                          value={form.organizationEmail}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          placeholder="contact@hotelgroup.com"
                        />
                      </div>
                      {renderFieldError("organizationEmail")}
                    </label>
                  </div>
                ) : null}

                {currentStep === 1 ? (
                  <div className="org-signup-grid">
                    <div className="org-signup-inline-note org-signup-field-full">
                      This creates the main corporate admin account for the
                      organization.
                    </div>
                    {paymentSession ? (
                      <div className="org-signup-inline-note org-signup-field-full">
                        Payment confirmed for {paymentSession.planName}. The corporate admin email is locked to the successful payment email.
                      </div>
                    ) : null}

                    <label className="org-signup-field">
                      <span className="org-signup-field-label">Full Name</span>
                      <div className="org-signup-input-wrap">
                        <UserRoundCog />
                        <input
                          name="adminFullName"
                          value={form.adminFullName}
                          onChange={handleChange}
                          placeholder="Your Name"
                        />
                      </div>
                      {renderFieldError("adminFullName")}
                    </label>

                    <label className="org-signup-field">
                      <span className="org-signup-field-label">Work Email Address</span>
                      <div className="org-signup-input-wrap">
                        <Mail />
                        <input
                          type="email"
                          name="adminEmail"
                          value={form.adminEmail}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          placeholder="Admin email for login"
                          disabled={!!paymentSession}
                        />
                      </div>
                      {renderFieldError("adminEmail")}
                    </label>

                    <label className="org-signup-field">
                      <span className="org-signup-field-label">Phone Number</span>
                      <div className="org-signup-phone-wrap">
                        <PhoneInput
                          country="in"
                          value={form.adminPhone.replace(/^\+/, "")}
                          onChange={(value) => handlePhoneChange("adminPhone", value)}
                          onBlur={() => handlePhoneBlur("adminPhone")}
                          inputProps={{
                            name: "adminPhone",
                            required: true,
                          }}
                          enableSearch
                          disableSearchIcon
                          countryCodeEditable={false}
                          specialLabel=""
                          inputClass="org-signup-phone-input"
                          buttonClass="org-signup-phone-button"
                          dropdownClass="org-signup-phone-dropdown"
                          searchClass="org-signup-phone-search"
                          isValid={(value) =>
                            !value || validatePhoneField(`+${value}`) === ""
                          }
                        />
                      </div>
                      {renderFieldError("adminPhone")}
                    </label>

                    <div className="org-signup-password-panel">
                      <label className="org-signup-field">
                        <span className="org-signup-field-label">Password</span>
                        <div className="org-signup-input-wrap">
                          <LockKeyhole />
                          <input
                            type="password"
                            name="password"
                            value={form.password}
                            onChange={handleChange}
                            placeholder="Create a strong password"
                          />
                        </div>
                        {renderFieldError("password")}
                      </label>

                      <label className="org-signup-field">
                        <span className="org-signup-field-label">Confirm Password</span>
                        <div className="org-signup-input-wrap">
                          <LockKeyhole />
                          <input
                            type="password"
                            name="confirmPassword"
                            value={form.confirmPassword}
                            onChange={handleChange}
                            placeholder="Re-enter password"
                          />
                        </div>
                        {renderFieldError("confirmPassword")}
                      </label>

                      <div className="org-signup-password-rules">
                        <p>Password must include:</p>
                        <ul>
                          <li>Minimum 8 characters</li>
                          <li>At least one uppercase letter</li>
                          <li>At least one number</li>
                          <li>At least one symbol</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : null}

                {currentStep === 2 ? (
                  <div className="org-signup-plan-layout">
                    <div
                      className="org-signup-billing-toggle"
                      aria-label="Billing cycle"
                    >
                      <button
                        type="button"
                        className={
                          billingCycle === "monthly" ? "is-selected" : ""
                        }
                        onClick={() =>
                          paymentSession ? undefined : setBillingCycle("monthly")
                        }
                        disabled={!!paymentSession}
                      >
                        Monthly
                      </button>
                      <button
                        type="button"
                        className={
                          billingCycle === "yearly" ? "is-selected" : ""
                        }
                        onClick={() =>
                          paymentSession ? undefined : setBillingCycle("yearly")
                        }
                        disabled={!!paymentSession}
                      >
                        Yearly
                      </button>
                    </div>

                    <div className="org-signup-plan-grid">
                      {plansLoading
                        ? FALLBACK_PLANS.map((plan) => (
                            <div
                              key={plan.code}
                              className="org-signup-plan-card is-loading"
                            />
                          ))
                        : plans.map((plan) => {
                            const isActive = selectedPlanCode === plan.code;
                            const price =
                              billingCycle === "yearly"
                                ? plan.yearlyPrice
                                : plan.monthlyPrice;

                            return (
                              <button
                                key={plan.code}
                                type="button"
                                className={`org-signup-plan-card ${isActive ? "is-active" : ""} ${
                                  paymentSession ? "is-locked" : ""
                                }`}
                                onClick={() => handlePlanSelect(plan)}
                                disabled={!!paymentSession}
                              >
                                <div className="org-signup-plan-head">
                                  <div>
                                    <p>{plan.name}</p>
                                    <h4>
                                      {formatCurrency(price)}
                                      <span className="org-signup-field-label">
                                        /
                                        {billingCycle === "yearly"
                                          ? "yr"
                                          : "mo"}
                                      </span>
                                    </h4>
                                  </div>
                                  {isActive ? (
                                    <span className="org-signup-plan-badge">
                                      Selected
                                    </span>
                                  ) : null}
                                </div>
                                <p className="org-signup-plan-description">
                                  {plan.description}
                                </p>
                                <div className="org-signup-plan-limit">
                                  Branch limit:{" "}
                                  {plan.branchLimit === null
                                    ? "Unlimited"
                                    : plan.branchLimit}
                                </div>
                                <ul className="org-signup-plan-features">
                                  {plan.features.map((feature) => (
                                    <li key={feature}>
                                      <Check />
                                      <span>{feature}</span>
                                    </li>
                                  ))}
                                </ul>
                              </button>
                            );
                          })}
                    </div>

                    {selectedPlan ? (
                      <div className="org-signup-summary-card">
                        <div>
                          <small>Selected plan</small>
                          <strong>
                            {selectedPlan.name} ({billingCycle})
                          </strong>
                        </div>
                        <span className="org-signup-field-label">
                          {formatCurrency(
                            paymentSession?.price ??
                              (billingCycle === "yearly"
                                ? selectedPlan.yearlyPrice
                                : selectedPlan.monthlyPrice),
                          )}
                        </span>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="org-signup-actions">
                <div className="org-signup-actions-copy">
                  <strong>Corporate Admin is mandatory</strong>
                  <span>
                    This signup creates the organization, creates the corporate
                    admin, and links both together with the paid subscription.
                  </span>
                </div>

                <div className="org-signup-actions-buttons">
                  {currentStep > 0 ? (
                    <button
                      type="button"
                      className="org-signup-btn-secondary"
                      onClick={goBack}
                    >
                      Back
                    </button>
                  ) : null}

                  {currentStep < STEPS.length - 1 ? (
                    <button
                      type="button"
                      className="org-signup-btn-primary"
                      onClick={goNext}
                    >
                      Continue <ArrowRight />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="org-signup-btn-primary"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <LoaderCircle className="org-signup-spinner" />
                          Creating...
                        </>
                      ) : (
                        <>
                          Create Organization <ArrowRight />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              <p className="org-signup-footer-link">
                Already have an account? <Link to="/login">Login</Link>
              </p>
            </form>
          )}
          <div style={{ textAlign: "center", marginTop: "3rem" }}>
            <p className="luxury-login-footer-note">
              Already have an organization?{" "}
              <Link to="/login" className="luxury-login-link">
                Sign in to your dashboard
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizationSignup;
