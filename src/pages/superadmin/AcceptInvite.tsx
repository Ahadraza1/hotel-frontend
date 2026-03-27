import { useSearchParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Crown, Eye, EyeOff, Shield, Globe } from "lucide-react";
import api from "@/api/axios";
import { useToast } from "@/components/confirm/ConfirmProvider";

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

  if (!token) {
    return (
      <div className="lp-root">
        <div className="flex items-center justify-center w-full min-h-screen relative p-6">
          <div className="lp-form-card" style={{ maxWidth: 460 }}>
            <h2 className="lp-form-title text-center text-[hsl(var(--danger))]">
              Invalid Invitation Link
            </h2>
            <p className="lp-form-subtitle text-center">
              The invitation link you clicked is missing or has expired. Please
              request a new invitation from your administrator.
            </p>
            <button
              onClick={() => navigate("/login")}
              className="lp-submit-btn cursor-pointer"
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

      const response = await api.post<{ email?: string }>(
        "/auth/accept-invite",
        {
          token,
          password,
        },
      );

      // ✅ Save email from backend response
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
    <div className="lp-root animate-fade-in">
      {/* ── Left Panel ── */}
      <div className="lp-left">
        {/* Decorative grid overlay */}
        <div className="lp-left-grid" aria-hidden="true" />
        {/* Corner ornaments */}
        <div className="lp-corner lp-corner-tl" aria-hidden="true" />
        <div className="lp-corner lp-corner-br" aria-hidden="true" />

        <div className="lp-left-inner">
          {/* Crown logo */}
          <div className="lp-crown-wrap">
            <Crown className="lp-crown-icon" />
          </div>

          {/* Brand */}
          <p className="lp-enterprise-label">ENTERPRISE PLATFORM</p>
          <h1 className="lp-brand-title">LUXURY HMS</h1>
          <div className="lp-divider" />
          <p className="lp-brand-tagline">Global Hospitality Command Center</p>
          <p className="lp-brand-desc">
            Enterprise-grade property management for the world's most{" "}
            <span className="lp-brand-desc-highlight">
              distinguished hotel collections
            </span>
            . Trusted by leading luxury hospitality groups across six
            continents.
          </p>

          {/* Stats */}
          <div className="lp-stats-row">
            <div className="lp-stat">
              <span className="lp-stat-value">248</span>
              <span className="lp-stat-label">PROPERTIES</span>
            </div>
            <div className="lp-stat-divider" />
            <div className="lp-stat">
              <span className="lp-stat-value">42</span>
              <span className="lp-stat-label">COUNTRIES</span>
            </div>
            <div className="lp-stat-divider" />
            <div className="lp-stat">
              <span className="lp-stat-value">7★</span>
              <span className="lp-stat-label">STANDARD</span>
            </div>
          </div>

          {/* Compliance badges */}
          <div className="lp-compliance-row">
            <div className="lp-compliance-badge">
              <Shield className="lp-compliance-icon" />
              <span>SOC 2 CERTIFIED</span>
            </div>
            <div className="lp-compliance-badge">
              <Globe className="lp-compliance-icon" />
              <span>GDPR COMPLIANT</span>
            </div>
          </div>

          {/* Footer */}
          <p className="lp-left-footer">
            © 2026 Luxury HMS · All Rights Reserved
          </p>
        </div>
      </div>

      {/* ── Right Panel ── */}
      <div className="lp-right">
        {/* Subtle radial glow behind card */}
        <div className="lp-right-glow" aria-hidden="true" />

        <div className="lp-form-card">
          {/* Crown logo */}
          <div className="lp-form-crown-wrap">
            <Crown className="lp-form-crown-icon" />
          </div>

          <h2 className="lp-form-title">Set Your Password</h2>
          <p className="lp-form-subtitle">
            Welcome to the team! Secure your new account.
          </p>

          <form onSubmit={handleSubmit} className="lp-form">
            {/* Password */}
            <div className="lp-field-group">
              <label htmlFor="lp-password" className="lp-field-label">
                NEW PASSWORD
              </label>
              <div className="lp-password-wrap">
                <input
                  id="lp-password"
                  type={showPassword ? "text" : "password"}
                  className="lp-input lp-input-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="lp-eye-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="lp-eye-icon" />
                  ) : (
                    <Eye className="lp-eye-icon" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="lp-field-group">
              <label htmlFor="lp-confirm-password" className="lp-field-label">
                CONFIRM PASSWORD
              </label>
              <div className="lp-password-wrap">
                <input
                  id="lp-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  className="lp-input lp-input-password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="lp-eye-btn"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={
                    showConfirmPassword ? "Hide password" : "Show password"
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff className="lp-eye-icon" />
                  ) : (
                    <Eye className="lp-eye-icon" />
                  )}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="lp-submit-btn">
              {loading ? (
                <>
                  <span className="lp-spinner" aria-hidden="true" />
                  PROCESSING…
                </>
              ) : (
                "SET PASSWORD"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AcceptInvite;
