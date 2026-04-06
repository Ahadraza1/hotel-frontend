import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowRight, BadgeCheck, CreditCard, LoaderCircle, Mail, ShieldCheck, UserRound } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "@/api/axios";
import MarketingHeader from "@/components/layout/MarketingHeader";
import { useToast } from "@/components/confirm/ConfirmProvider";
import { useTheme } from "@/contexts/ThemeContext";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import {
  storeFailedSignupCheckout,
  storeSuccessfulSignupCheckout,
  type SignupCheckoutState,
} from "@/lib/signupCheckout";
import "./landing.css";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, callback: (response: Record<string, unknown>) => void) => void;
    };
  }
}

type OrderResponse = {
  data: {
    paymentRequired: boolean;
    checkoutReference: string;
    key?: string;
    order?: {
      id: string;
      amount: number;
      currency: string;
    };
    amount: number;
    billingCycle: "monthly" | "yearly";
    plan: {
      _id: string;
      name: string;
    };
    email?: string;
    name?: string;
    paymentId?: string | null;
    orderId?: string | null;
    provider?: string | null;
  };
};

const loadRazorpayScript = async () => {
  if (window.Razorpay) return true;

  return new Promise<boolean>((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const FinalizeOrderPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { theme } = useTheme();
  const { formatCurrency } = useSystemSettings();
  const [customerName, setCustomerName] = useState("");
  const [email, setEmail] = useState("");
  const [processing, setProcessing] = useState(false);

  const planId = searchParams.get("planId") || "";
  const planName = searchParams.get("planName") || "Selected Plan";
  const billingCycle =
    searchParams.get("billingCycle") === "yearly" ? "yearly" : "monthly";
  const price = Number(searchParams.get("price") || 0);

  const hasValidPlan = !!planId;

  const orderSummary = useMemo(
    () => ({
      planId,
      planName,
      price,
      billingCycle,
    }),
    [billingCycle, planId, planName, price],
  );

  useEffect(() => {
    if (!hasValidPlan) {
      navigate("/pricing", { replace: true });
    }
  }, [hasValidPlan, navigate]);

  const persistSuccessState = (payload: {
    checkoutReference: string;
    planId: string;
    planName: string;
    price: number;
    billingCycle: "monthly" | "yearly";
    email: string;
    name: string;
    paymentId?: string | null;
    orderId?: string | null;
    provider?: string | null;
  }) => {
    storeSuccessfulSignupCheckout({
      ...payload,
      paymentStatus: "success",
    });

    navigate(`/signup?checkoutRef=${encodeURIComponent(payload.checkoutReference)}`);
  };

  const persistFailedState = async ({
    checkoutReference,
    failureReason,
    orderId,
  }: {
    checkoutReference: string;
    failureReason: string;
    orderId?: string | null;
  }) => {
    try {
      await api.post("/auth/signup/checkout/fail", {
        checkoutReference,
        failureReason,
        orderId,
      });
    } catch (error) {
      console.error("Failed to record checkout failure", error);
    }

    const failureState: SignupCheckoutState = {
      checkoutReference,
      planId: orderSummary.planId,
      planName: orderSummary.planName,
      price: orderSummary.price,
      billingCycle: orderSummary.billingCycle as "yearly" | "monthly",
      email,
      name: customerName,
      paymentStatus: "failed",
      orderId: orderId || null,
      provider: "razorpay",
    };

    storeFailedSignupCheckout(failureState);
    navigate("/payment-failed");
  };

  const handlePayment = async () => {
    if (!hasValidPlan) {
      navigate("/pricing");
      return;
    }

    if (!customerName.trim() || !email.trim()) {
      toast.error("Name and corporate admin email are required.");
      return;
    }

    try {
      setProcessing(true);

      const orderResponse = await api.post<OrderResponse>("/auth/signup/checkout/order", {
        customerName: customerName.trim(),
        userEmail: email.trim(),
        selectedPlanId: orderSummary.planId,
        billingCycle: orderSummary.billingCycle,
      });

      const checkoutData = orderResponse.data.data;
      const resolvedPlanName = checkoutData.plan?.name || orderSummary.planName;

      if (!checkoutData.paymentRequired) {
        persistSuccessState({
          checkoutReference: checkoutData.checkoutReference,
          planId: orderSummary.planId,
          planName: resolvedPlanName,
          price: checkoutData.amount,
          billingCycle: checkoutData.billingCycle,
          email: email.trim().toLowerCase(),
          name: customerName.trim(),
          paymentId: checkoutData.paymentId || null,
          orderId: checkoutData.orderId || null,
          provider: checkoutData.provider || "free",
        });
        return;
      }

      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded || !window.Razorpay || !checkoutData.order || !checkoutData.key) {
        toast.error("Failed to load payment gateway.");
        await persistFailedState({
          checkoutReference: checkoutData.checkoutReference,
          failureReason: "Failed to load payment gateway.",
          orderId: checkoutData.order?.id || null,
        });
        return;
      }

      const razorpay = new window.Razorpay({
        key: checkoutData.key,
        amount: checkoutData.order.amount,
        currency: checkoutData.order.currency,
        name: "HotelOS",
        description: `${resolvedPlanName} ${checkoutData.billingCycle} subscription`,
        order_id: checkoutData.order.id,
        prefill: {
          name: customerName.trim(),
          email: email.trim(),
        },
        theme: {
          color: "#c9a85c",
        },
        handler: async (response: Record<string, unknown>) => {
          try {
            const verifyResponse = await api.post<{
              message: string;
              data: {
                checkoutReference: string;
                planId: string;
                planName: string;
                price: number;
                billingCycle: "monthly" | "yearly";
                email: string;
                name: string;
                paymentId?: string | null;
                orderId?: string | null;
                provider?: string | null;
              };
            }>("/auth/signup/checkout/verify", {
              checkoutReference: checkoutData.checkoutReference,
              customerName: customerName.trim(),
              userEmail: email.trim(),
              selectedPlanId: orderSummary.planId,
              billingCycle: orderSummary.billingCycle,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            const verifiedData = verifyResponse.data.data;

            persistSuccessState({
              checkoutReference: verifiedData.checkoutReference,
              planId: verifiedData.planId,
              planName: verifiedData.planName,
              price: verifiedData.price,
              billingCycle: verifiedData.billingCycle,
              email: verifiedData.email,
              name: verifiedData.name,
              paymentId: verifiedData.paymentId || null,
              orderId: verifiedData.orderId || null,
              provider: verifiedData.provider || "razorpay",
            });
          } catch (error) {
            const message =
              (error as { response?: { data?: { message?: string } } }).response
                ?.data?.message || "Payment verification failed.";
            toast.error(message);
            await persistFailedState({
              checkoutReference: checkoutData.checkoutReference,
              failureReason: message,
              orderId: checkoutData.order?.id || null,
            });
          }
        },
        modal: {
          ondismiss: () => {
            void persistFailedState({
              checkoutReference: checkoutData.checkoutReference,
              failureReason: "Payment was cancelled before completion.",
              orderId: checkoutData.order?.id || null,
            });
          },
        },
      });

      razorpay.on("payment.failed", (response: Record<string, unknown>) => {
        const error = response.error as { description?: string } | undefined;
        void persistFailedState({
          checkoutReference: checkoutData.checkoutReference,
          failureReason: error?.description || "Payment failed.",
          orderId: checkoutData.order?.id || null,
        });
      });

      razorpay.open();
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } } }).response?.data
          ?.message || "Unable to start payment.";
      toast.error(message);
    } finally {
      setProcessing(false);
    }
  };

  if (!hasValidPlan) return null;

  return (
    <div className="lnd-root" data-theme={theme}>
      <MarketingHeader />

      <div className="lnd-pricing-page-shell">
        <div className="lnd-pricing-page-content">
          <section className="lnd-pricing-page-hero">
            <div className="lnd-section-badge">Finalize Order</div>
            <h1 className="lnd-pricing-page-title">
              Complete Your <span className="lnd-gradient-text">Subscription Payment</span>
            </h1>
            <p className="lnd-pricing-page-copy">
              Confirm your plan, pay securely, and continue to organization signup with your subscription already attached.
            </p>
          </section>

          <section className="lnd-checkout-grid">
            <div className="lnd-checkout-card">
              <div className="lnd-checkout-card-head">
                <h2>Corporate Admin Details</h2>
                <p>This email becomes the corporate admin email during signup.</p>
              </div>

              <label className="lnd-checkout-field">
                <span>Name</span>
                <div className="lnd-checkout-input">
                  <UserRound />
                  <input
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    placeholder="Your Name"
                  />
                </div>
              </label>

              <label className="lnd-checkout-field">
                <span>Email</span>
                <div className="lnd-checkout-input">
                  <Mail />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Your Email"
                  />
                </div>
              </label>

              <div className="lnd-checkout-note">
                <ShieldCheck />
                <span>Signup will only be unlocked after a successful payment.</span>
              </div>
            </div>

            <div className="lnd-checkout-card lnd-checkout-summary">
              <div className="lnd-checkout-card-head">
                <h2>Order Summary</h2>
                <p>Your selected subscription will be activated on first login.</p>
              </div>

              <div className="lnd-checkout-summary-row">
                <span>Plan</span>
                <strong>{orderSummary.planName}</strong>
              </div>
              <div className="lnd-checkout-summary-row">
                <span>Billing Cycle</span>
                <strong>{orderSummary.billingCycle === "yearly" ? "Yearly" : "Monthly"}</strong>
              </div>
              <div className="lnd-checkout-summary-row">
                <span>Amount</span>
                <strong>{formatCurrency(orderSummary.price)}</strong>
              </div>

              <div className="lnd-checkout-summary-banner">
                <BadgeCheck />
                <span>After payment, we’ll carry this plan directly into signup.</span>
              </div>

              <button
                type="button"
                className="lnd-plan-cta lnd-btn-primary lnd-checkout-pay"
                onClick={() => void handlePayment()}
                disabled={processing}
              >
                {processing ? (
                  <>
                    <LoaderCircle className="lnd-spin" />
                    Processing
                  </>
                ) : (
                  <>
                    <CreditCard />
                    Pay
                    <ArrowRight />
                  </>
                )}
              </button>

              <div className="lnd-checkout-footnote">
                <AlertCircle />
                <span>If payment fails, you’ll land on a summary page with a quick path back to plans.</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default FinalizeOrderPage;
