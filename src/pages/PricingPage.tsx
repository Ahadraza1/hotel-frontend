import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import api from "@/api/axios";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import MarketingHeader from "@/components/layout/MarketingHeader.tsx";
import "./landing.css";

type PricingPlan = {
  _id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  maxBranches: number | null;
  isPopular: boolean;
  isActive: boolean;
};

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

const formatBranchLabel = (maxBranches: number | null) =>
  maxBranches === null ? "Unlimited Branches" : `Up to ${maxBranches} Branches`;

const PricingPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { formatCurrency, currencySymbol } = useSystemSettings();
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const isAuthenticated = !!user;

  useEffect(() => {
    let active = true;

    const loadPlans = async () => {
      try {
        const response = await api.get<PricingPlan[]>(
          "/public/subscription-plans",
        );
        if (!active) return;
        const allPlans = Array.isArray(response.data) ? response.data : [];
        setPlans(allPlans.filter(p => p.isActive !== false));
      } catch (error) {
        if (!active) return;
        console.error("Failed to load pricing plans", error);
        setPlans([]);
      }
    };

    loadPlans();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!plans.length) return;

    const requestedPlan = searchParams.get("plan")?.trim().toLowerCase();

    if (requestedPlan !== "free") return;

    const freePlan =
      plans.find(
        (plan) =>
          plan.name.trim().toLowerCase() === "free" ||
          Number(plan.monthlyPrice) === 0 ||
          Number(plan.yearlyPrice) === 0,
      ) || null;

    if (freePlan) {
      setSelectedPlanId(freePlan._id);
    }
  }, [plans, searchParams]);

  const yearlySavingsPercentage = useMemo(() => {
    const savingsValues = plans
      .map((plan) =>
        calculateSavingsPercentage(
          Number(plan.monthlyPrice || 0),
          Number(plan.yearlyPrice || 0),
        ),
      )
      .filter((value): value is number => value !== null);

    if (!savingsValues.length) return null;

    return Math.max(...savingsValues);
  }, [plans]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="lnd-root" data-theme={theme}>
      <MarketingHeader />

      <div className="lnd-pricing-page-shell">
        <div className="lnd-pricing-page-content">
          <section className="lnd-pricing-page-hero">
            <div className="lnd-section-badge">Pricing</div>
            <h1 className="lnd-pricing-page-title">
              Transparent Pricing, <span className="lnd-gradient-text">No Surprises</span>
            </h1>
            <p className="lnd-pricing-page-copy">
              Choose the plan that fits your portfolio. Scale up anytime and
              keep your data, settings, and team workflows moving with you.
            </p>
            <div className="lnd-pricing-page-note">No credit card required</div>

            <div className="lnd-billing-toggle-pill">
              <button
                className={`lnd-toggle-option ${billing === "monthly" ? "active" : ""}`}
                onClick={() => setBilling("monthly")}
              >
                Monthly
              </button>
              <button
                className={`lnd-toggle-option ${billing === "yearly" ? "active" : ""}`}
                onClick={() => setBilling("yearly")}
              >
                Yearly
                {/* {yearlySavingsPercentage !== null ? (
                  <span className="lnd-save-badge-pill">
                    Save {yearlySavingsPercentage}%
                  </span>
                ) : null} */}
              </button>
            </div>
          </section>

          <section className="lnd-pricing-page-plans">
            <div className="lnd-pricing-grid">
              {plans.map((plan) => (
                <div
                  key={plan._id}
                  className={`lnd-pricing-card ${plan.isPopular ? "lnd-pricing-popular" : ""} ${
                    selectedPlanId === plan._id ? "lnd-pricing-selected" : ""
                  }`}
                >
                  {plan.isPopular && (
                    <div className="lnd-popular-badge">⭐ Most Popular</div>
                  )}

                  <div className="lnd-pricing-header">
                    <h3 className="lnd-plan-name">{plan.name}</h3>
                    <p className="lnd-plan-desc">{plan.description}</p>
                    <div className="lnd-plan-price">
                      <span className="lnd-plan-currency">{currencySymbol}</span>
                      <span className="lnd-plan-amount">
                        {formatCurrency(
                          billing === "monthly"
                            ? plan.monthlyPrice
                            : plan.yearlyPrice,
                        ).replace(currencySymbol, "")}
                      </span>
                      <span className="lnd-plan-period">
                        /{billing === "monthly" ? "mo" : "yr"}
                      </span>
                    </div>
                    <div className="lnd-plan-branches">
                      {formatBranchLabel(plan.maxBranches)}
                    </div>
                  </div>

                  <ul className="lnd-plan-features">
                    {plan.features.map((feature) => (
                      <li key={`${plan._id}-${feature}`}>
                        <span className="lnd-check">✓</span> {feature}
                      </li>
                    ))}
                  </ul>

                  <button
                    className={`lnd-plan-cta ${
                      plan.isPopular || selectedPlanId === plan._id
                        ? "lnd-btn-primary"
                        : "lnd-btn-outline"
                    }`}
                    onClick={() => {
                      setSelectedPlanId(plan._id);
                      navigate(
                        isAuthenticated
                          ? "/dashboard"
                          : `/finalize-order?planId=${encodeURIComponent(
                              plan._id,
                            )}&planName=${encodeURIComponent(
                              plan.name,
                            )}&price=${encodeURIComponent(
                              String(
                                billing === "monthly"
                                  ? plan.monthlyPrice
                                  : plan.yearlyPrice,
                              ),
                            )}&billingCycle=${encodeURIComponent(billing)}`,
                      )
                    }}
                  >
                    Get Started
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
