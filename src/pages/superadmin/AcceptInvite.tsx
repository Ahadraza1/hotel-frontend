import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import { Crown, Eye, EyeOff, Lock } from "lucide-react";
import api from "@/api/axios";
import { useToast } from "@/components/confirm/ConfirmProvider";
import { useTheme } from "@/contexts/ThemeContext";
import MarketingHeader from "@/components/layout/MarketingHeader";
import "@/pages/landing.css";

const AcceptInvite = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const { theme } = useTheme();

  if (!token) {
    return (
      <div className="lnd-root" data-theme={theme}>
        <MarketingHeader />
        <div className="luxury-login-root">
          <div className="luxury-login-glow" aria-hidden="true" />

          <div className="luxury-login-card">
            <div className="luxury-login-crown-wrap">
              <Crown className="luxury-login-crown-icon" />
            </div>

            <h2 className="luxury-login-title text-center text-[hsl(var(--danger))]">
              Invalid Invitation Link
            </h2>
            <p className="luxury-login-subtitle text-center">
              The invitation link you clicked is missing or has expired. Please
              request a new invitation from your administrator.
            </p>
            <button
              onClick={() => navigate("/login")}
              className="luxury-login-btn cursor-pointer"
            >
              Return to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!password || !confirmPassword) {
      toast.warning("All fields are required");
      return;
    }

    if (password !== confirmPassword) {
      toast.warning("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      toast.warning("Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post<{ email?: string }>("/auth/accept-invite", {
        token,
        password,
      });

      if (response.data?.email) {
        sessionStorage.setItem("prefillEmail", response.data.email);
      }

      toast.success("Password set successfully! Please login.");
      navigate("/login");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lnd-root" data-theme={theme}>
      <MarketingHeader />
      <div className="luxury-login-root">
        <div className="luxury-login-glow" aria-hidden="true" />

        <div className="luxury-login-card">
          <div className="luxury-login-crown-wrap">
            <Crown className="luxury-login-crown-icon" />
          </div>

          <h2 className="luxury-login-title">Set Your Password</h2>
          <p className="luxury-login-subtitle">
            Welcome to the team! Secure your new account.
          </p>

          <form onSubmit={handleSubmit} className="luxury-login-form">
            <div className="luxury-login-field">
              <label htmlFor="lp-password" className="luxury-login-label">
                NEW PASSWORD
              </label>
              <div className="luxury-login-password-wrap">
                <input
                  id="lp-password"
                  type={showPassword ? "text" : "password"}
                  className="luxury-login-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="luxury-login-eye"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="luxury-login-eye-icon" />
                  ) : (
                    <Eye className="luxury-login-eye-icon" />
                  )}
                </button>
              </div>
            </div>

            <div className="luxury-login-field">
              <label
                htmlFor="lp-confirm-password"
                className="luxury-login-label"
              >
                CONFIRM PASSWORD
              </label>
              <div className="luxury-login-password-wrap">
                <input
                  id="lp-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  className="luxury-login-input"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="luxury-login-eye"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={
                    showConfirmPassword ? "Hide password" : "Show password"
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff className="luxury-login-eye-icon" />
                  ) : (
                    <Eye className="luxury-login-eye-icon" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="luxury-login-btn"
            >
              {loading ? (
                <>
                  <span className="luxury-login-spinner" aria-hidden="true" />
                  PROCESSING…
                </>
              ) : (
                "SET PASSWORD"
              )}
            </button>

            <div className="luxury-login-ssl">
              <Lock className="luxury-login-ssl-icon" />
              <span>256-bit SSL encrypted connection</span>
            </div>
          </form>
        </div>

        <p className="luxury-login-footer-note">
          Back to sign in?{" "}
          <Link to="/login" className="luxury-login-link">
            Return to login
          </Link>
        </p>

        <p className="luxury-login-bottom-note">
          <span className="luxury-login-bold">Account Setup</span> · Create your
          password to continue
        </p>
      </div>
    </div>
  );
};

export default AcceptInvite;
