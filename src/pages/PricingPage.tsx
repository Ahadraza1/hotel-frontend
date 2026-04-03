import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import api from "@/api/axios";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
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
};

const formatBranchLabel = (maxBranches: number | null) =>
  maxBranches === null ? "Unlimited Branches" : `Up to ${maxBranches} Branches`;

const PricingPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { formatCurrency, currencySymbol } = useSystemSettings();
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAuthenticated = !!user;

  useEffect(() => {
    let active = true;

    const loadPlans = async () => {
      try {
        const response = await api.get<PricingPlan[]>(
          "/public/subscription-plans",
        );
        if (!active) return;
        setPlans(Array.isArray(response.data) ? response.data : []);
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

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="lnd-root" data-theme={theme}>
      <nav className="lnd-nav lnd-nav-scrolled lnd-contact-nav">
        <div className="lnd-nav-inner">
          <div className="lnd-logo" onClick={() => navigate("/")}>
            <span className="lnd-logo-icon">🏨</span>
            <span className="lnd-logo-text">HotelOS</span>
          </div>

          <div className="lnd-nav-links">
            <button onClick={() => (window.location.href = "/#features")}>
              Features
            </button>
            <button onClick={() => (window.location.href = "/#analytics")}>
              Analytics
            </button>
            <button className="lnd-contact-nav-active">Pricing</button>
            <button onClick={() => (window.location.href = "/#testimonials")}>
              Reviews
            </button>
            <button onClick={() => navigate("/contact")}>Contact</button>
          </div>

          <div className="lnd-nav-cta">
            <button
              className="lnd-theme-toggle"
              onClick={toggleTheme}
              aria-label={
                theme === "light"
                  ? "Switch to dark mode"
                  : "Switch to light mode"
              }
              title={
                theme === "light"
                  ? "Switch to dark mode"
                  : "Switch to light mode"
              }
            >
              {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
            </button>
            <button
              className="lnd-btn-ghost lnd-desktop-only"
              onClick={() =>
                isAuthenticated ? handleLogout() : navigate("/login")
              }
            >
              {isAuthenticated ? "Sign Out" : "Sign In"}
            </button>
            <button
              className="lnd-btn-primary lnd-desktop-only"
              onClick={() =>
                isAuthenticated ? navigate("/dashboard") : navigate("/signup")
              }
            >
              {isAuthenticated ? "Dashboard" : "Start Free Trial"}
            </button>

            {/* Hamburger — mobile only */}
            <button
              className="lnd-hamburger"
              onClick={() => setMobileMenuOpen((o) => !o)}
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              <span className={mobileMenuOpen ? "open" : ""} />
              <span className={mobileMenuOpen ? "open" : ""} />
              <span className={mobileMenuOpen ? "open" : ""} />
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="lnd-mobile-menu">
            <button
              onClick={() => {
                window.location.href = "/#features";
                setMobileMenuOpen(false);
              }}
            >
              Features
            </button>
            <button
              onClick={() => {
                window.location.href = "/#analytics";
                setMobileMenuOpen(false);
              }}
            >
              Analytics
            </button>
            <button
              className="lnd-contact-nav-active"
              onClick={() => setMobileMenuOpen(false)}
            >
              Pricing
            </button>
            <button
              onClick={() => {
                window.location.href = "/#testimonials";
                setMobileMenuOpen(false);
              }}
            >
              Reviews
            </button>
            <button
              onClick={() => {
                navigate("/contact");
                setMobileMenuOpen(false);
              }}
            >
              Contact
            </button>
            <div className="lnd-mobile-menu-cta">
              <button
                className="lnd-btn-ghost"
                onClick={() => {
                  if (isAuthenticated) {
                    handleLogout();
                    return;
                  }
                  navigate("/login");
                  setMobileMenuOpen(false);
                }}
              >
                {isAuthenticated ? "Sign Out" : "Sign In"}
              </button>
              <button
                className="lnd-btn-primary"
                onClick={() => {
                  navigate(isAuthenticated ? "/dashboard" : "/signup");
                  setMobileMenuOpen(false);
                }}
              >
                {isAuthenticated ? "Dashboard" : "Start Free Trial"}
              </button>
            </div>
          </div>
        )}
      </nav>

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
                <span className="lnd-save-badge-pill">Save 20%</span>
              </button>
            </div>
          </section>

          <section className="lnd-pricing-page-plans">
            <div className="lnd-pricing-grid">
              {plans.map((plan) => (
                <div
                  key={plan._id}
                  className={`lnd-pricing-card ${plan.isPopular ? "lnd-pricing-popular" : ""}`}
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
                    className={`lnd-plan-cta ${plan.isPopular ? "lnd-btn-primary" : "lnd-btn-outline"}`}
                    onClick={() =>
                      navigate(isAuthenticated ? "/dashboard" : "/signup")
                    }
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
