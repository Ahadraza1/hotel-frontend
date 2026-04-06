import { Link } from "react-router-dom";
import ForgotPasswordFlow from "@/components/auth/ForgotPasswordFlow";
import "@/components/auth/forgot-password.css";
import MarketingHeader from "@/components/layout/MarketingHeader";
import { useTheme } from "@/contexts/ThemeContext";
import "@/pages/landing.css";

const ForgotPasswordPage = () => {
  const { theme } = useTheme();

  return (
    <div className="lnd-root" data-theme={theme}>
      <MarketingHeader />
      <div className="forgot-password-page">
        <div className="luxury-login-glow forgot-password-page-glow" aria-hidden="true" />
        <ForgotPasswordFlow mode="page" />
        <p className="luxury-login-footer-note">
          Remembered your password?{" "}
          <Link to="/signin" className="luxury-login-link">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
