import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Crown, Eye, EyeOff, Shield, Globe, Lock } from "lucide-react";
import api from "@/api/axios";
import { useToast } from "@/components/confirm/ConfirmProvider";
import { useAuth } from "@/contexts/AuthContext"; // ✅ ADDED

interface LoginProps {
  onLogin: () => void;
}

const Login = ({ onLogin }: LoginProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const navigate = useNavigate();
  const toast = useToast();

  const { login } = useAuth(); // ✅ ADDED

  // 🔥 Auto prefill email after invitation accept
  useEffect(() => {
    const savedEmail = sessionStorage.getItem("prefillEmail");

    if (savedEmail) {
      setEmail(savedEmail);
      sessionStorage.removeItem("prefillEmail"); // cleanup after use
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      const response = await api.post<{
        accessToken: string;
        user: {
          id: string;
          name: string;
          email?: string;
          role: string;
          permissions: string[];
          organizationId?: string | null;
          branchId?: string | null;
          isPlatformAdmin?: boolean;
          subscriptionAccess?: {
            hasDashboardAccess: boolean;
          } | null;
        };
      }>("/auth/login", {
        email,
        password,
      });

      const { accessToken, user } = response.data;

      // 🔥 Store in AuthContext
      login(user, accessToken);
      localStorage.setItem("token", accessToken);
      localStorage.setItem("luxury-hms-auth", "true");

      const role = user.role?.toUpperCase();
      const hasDashboardAccess =
        user.subscriptionAccess?.hasDashboardAccess ?? true;

      /*
     BRANCH LEVEL USERS
     */
      if (user.branchId) {
        localStorage.setItem("activeBranchId", user.branchId);
      }

      /*
     ROLE BASED REDIRECT
     */
      const branchRoles = [
        "BRANCH_MANAGER",
        "RECEPTIONIST",
        "CHEF",
        "ACCOUNTANT",
        "HR_MANAGER",
        "HOUSEKEEPING",
        "RESTAURANT_MANAGER",
      ];

      if (role === "SUPER_ADMIN") {
        onLogin();
        navigate("/dashboard");
        return;
      }

      if (!hasDashboardAccess) {
        onLogin();
        navigate("/subscription-access");
        return;
      }

      if (role === "CORPORATE_ADMIN") {
        onLogin();
        navigate("/dashboard");
        return;
      }

      /*
     BRANCH USERS
     */
      if (branchRoles.includes(role) && user.branchId) {
        localStorage.setItem("activeBranchId", user.branchId);

        // reload app with branch context
        window.location.href = `/workspace/${user.branchId}/overview`;
        return;
      }

      /*
     Fallback
     */
      onLogin();
      navigate("/dashboard");
    } catch (error: unknown) {
      toast.error(
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? "Login failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lp-root">
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

          <h2 className="lp-form-title">Welcome Back</h2>
          <p className="lp-form-subtitle">
            Sign in to your executive control panel
          </p>

          <form onSubmit={handleSubmit} className="lp-form">
            {/* Email */}
            <div className="lp-field-group">
              <label htmlFor="lp-email" className="lp-field-label">
                EMAIL ADDRESS
              </label>
              <input
                id="lp-email"
                type="email"
                className="lp-input"
                placeholder="admin@luxuryhms.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div className="lp-field-group">
              <label htmlFor="lp-password" className="lp-field-label">
                PASSWORD
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
                  autoComplete="current-password"
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

            {/* Remember me */}
            <div className="lp-remember-row">
              <label className="lp-remember-label">
                <input
                  type="checkbox"
                  className="lp-checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember me</span>
              </label>
            </div>

            {/* Submit */}
            <button type="submit" className="lp-submit-btn" disabled={loading}>
              {loading ? (
                <>
                  <span className="lp-spinner" aria-hidden="true" />
                  SIGNING IN…
                </>
              ) : (
                "SIGN IN"
              )}
            </button>

            {/* SSL note */}
            <div className="lp-ssl-note">
              <Lock className="lp-ssl-icon" />
              <span>256-bit SSL encrypted connection</span>
            </div>
          </form>
        </div>

        <p className="lp-demo-note">
          Need to register your hotel business?{" "}
          <Link to="/signup" className="org-signup-login-link">
            Create organization
          </Link>
        </p>

        {/* Bottom mode note */}
        <p className="lp-demo-note">
          <span className="lp-demo-bold">Login Mode</span> · Enter your
          credentials to continue
        </p>
      </div>
    </div>
  );
};

export default Login;
