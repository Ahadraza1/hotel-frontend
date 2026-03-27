import { Link, Navigate } from "react-router-dom";
import { AlertTriangle, ArrowRight, CreditCard } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const SubscriptionAccess = () => {
  const { user, subscriptionAccess } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!subscriptionAccess || subscriptionAccess.hasDashboardAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  const isCorporateAdmin = user.role === "CORPORATE_ADMIN";
  const message =
    subscriptionAccess.restrictionReason ||
    "Your subscription is inactive. Please renew your subscription.";

  return (
    <div className="org-signup-page">
      <div className="org-signup-shell">
        <main className="org-signup-main" style={{ width: "100%" }}>
          <div className="org-signup-success-card">
            <div className="org-signup-success-icon">
              <AlertTriangle />
            </div>
            <h3>{message}</h3>
            <p>
              Dashboard access is blocked for all users in your organization
              until the subscription is renewed or upgraded.
            </p>
            {isCorporateAdmin ? (
              <Link to="/subscriptions" className="org-signup-success-link">
                Manage Subscription <ArrowRight />
              </Link>
            ) : (
              <div className="org-signup-inline-note">
                <CreditCard />
                Please contact your corporate admin to renew or upgrade the
                subscription.
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default SubscriptionAccess;
