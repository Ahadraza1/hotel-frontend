import { AlertTriangle, ArrowLeft, CreditCard, RefreshCcw } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import MarketingHeader from "@/components/layout/MarketingHeader";
import { useTheme } from "@/contexts/ThemeContext";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { clearSignupCheckoutState, readFailedSignupCheckout } from "@/lib/signupCheckout";
import "./landing.css";

const PaymentFailedPage = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { formatCurrency } = useSystemSettings();
  const failedCheckout = useMemo(() => readFailedSignupCheckout(), []);

  useEffect(() => {
    if (!failedCheckout) {
      navigate("/pricing", { replace: true });
    }
  }, [failedCheckout, navigate]);

  if (!failedCheckout) return null;

  return (
    <div className="lnd-root" data-theme={theme}>
      <MarketingHeader />

      <div className="lnd-pricing-page-shell">
        <div className="lnd-pricing-page-content">
          <section className="lnd-pricing-page-hero">
            <div className="lnd-section-badge">Payment Failed</div>
            <h1 className="lnd-pricing-page-title">
              Your payment could not be <span className="lnd-gradient-text">completed</span>
            </h1>
            <p className="lnd-pricing-page-copy">
              Review the failed order details below, then head back to plans and try again.
            </p>
          </section>

          <section className="lnd-checkout-grid">
            <div className="lnd-checkout-card lnd-checkout-summary">
              <div className="lnd-checkout-status lnd-checkout-status-failed">
                <AlertTriangle />
                <div>
                  <strong>Status: failed</strong>
                  <p>Signup is blocked until payment succeeds.</p>
                </div>
              </div>

              <div className="lnd-checkout-summary-row">
                <span>Plan</span>
                <strong>{failedCheckout.planName}</strong>
              </div>
              <div className="lnd-checkout-summary-row">
                <span>Billing Cycle</span>
                <strong>{failedCheckout.billingCycle === "yearly" ? "Yearly" : "Monthly"}</strong>
              </div>
              <div className="lnd-checkout-summary-row">
                <span>Amount</span>
                <strong>{formatCurrency(failedCheckout.price)}</strong>
              </div>
              <div className="lnd-checkout-summary-row">
                <span>Corporate Admin Email</span>
                <strong>{failedCheckout.email}</strong>
              </div>

              <div className="lnd-checkout-actions">
                <button
                  type="button"
                  className="lnd-plan-cta lnd-btn-outline"
                  onClick={() => {
                    clearSignupCheckoutState();
                    navigate("/pricing");
                  }}
                >
                  <ArrowLeft />
                  Back to Plans
                </button>
                <button
                  type="button"
                  className="lnd-plan-cta lnd-btn-primary"
                  onClick={() =>
                    navigate(
                      `/finalize-order?planId=${encodeURIComponent(failedCheckout.planId)}&planName=${encodeURIComponent(
                        failedCheckout.planName,
                      )}&price=${encodeURIComponent(String(failedCheckout.price))}&billingCycle=${encodeURIComponent(
                        failedCheckout.billingCycle,
                      )}`,
                    )
                  }
                >
                  <RefreshCcw />
                  Try Payment Again
                </button>
              </div>
            </div>

            <div className="lnd-checkout-card">
              <div className="lnd-checkout-card-head">
                <h2>What happens next</h2>
                <p>Choose the same or a different plan and restart the payment flow.</p>
              </div>

              <div className="lnd-checkout-note">
                <CreditCard />
                <span>We only unlock signup after a successful payment confirmation.</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailedPage;
