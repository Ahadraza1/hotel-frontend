import { Crown, Lock, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AccessDeniedPageProps {
  moduleName?: string;
}

const AccessDeniedPage = ({ moduleName }: AccessDeniedPageProps) => {
  const navigate = useNavigate();

  return (
    <div className="animate-fade-in" style={{ 
      display: "flex", 
      flexDirection: "column", 
      alignItems: "center", 
      justifyContent: "center", 
      minHeight: "70vh",
      padding: "2rem",
      textAlign: "center"
    }}>
      <div className="global-error-state" style={{ maxWidth: "600px" }}>
        <div className="global-error-state__glow" />
        
        <div className="global-error-state__icon-wrap" style={{ background: "hsla(var(--primary), 0.1)", borderColor: "hsla(var(--primary), 0.2)" }}>
          <Lock className="global-error-state__icon" style={{ color: "hsl(var(--primary))" }} />
        </div>

        <div className="global-error-state__copy">
          <span className="global-error-state__eyebrow">Subscription Required</span>
          <h1 className="global-error-state__title">
            {moduleName ? `${moduleName} is Locked` : "Module Locked"}
          </h1>
          <p className="global-error-state__description">
            Your current subscription plan doesn't include access to this feature. 
            Upgrade your plan to unlock {moduleName || "this module"} and provide your team with more tools.
          </p>
          
          {moduleName && (
            <div className="global-error-state__module-pill">
              <Crown size={12} style={{ marginRight: "6px" }} />
              {moduleName} MODULE
            </div>
          )}
        </div>

        <div className="global-error-state__actions" style={{ marginTop: "1rem" }}>
          <button 
            className="luxury-btn luxury-btn-primary" 
            onClick={() => navigate("/subscriptions")}
          >
            <Crown size={16} />
            Upgrade Plan
          </button>
          
          <button 
            className="luxury-btn luxury-btn-ghost" 
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={16} />
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccessDeniedPage;
