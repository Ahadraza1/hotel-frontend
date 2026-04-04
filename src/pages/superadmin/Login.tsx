import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Crown, Eye, EyeOff, Shield, Globe, Lock } from "lucide-react";
import api from "@/api/axios";
import { useToast } from "@/components/confirm/ConfirmProvider";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import MarketingHeader from "@/components/layout/MarketingHeader.tsx";
import "@/pages/landing.css";

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
            status: "active" | "expired" | "trial" | "cancelled";
            subscriptionStatus: "active" | "expired" | "trial" | "cancelled";
            restrictionReason: string | null;
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

      const isDashboardRole =
        role === "SUPER_ADMIN" || role === "CORPORATE_ADMIN";

      if (role === "SUPER_ADMIN") {
        onLogin();
        navigate("/");
        return;
      }

      if (!hasDashboardAccess) {
        onLogin();
        navigate("/subscription-access");
        return;
      }

      if (role === "CORPORATE_ADMIN") {
        onLogin();
        navigate("/");
        return;
      }

      /*
     BRANCH USERS
     */
      if (!isDashboardRole && user.branchId) {
        localStorage.setItem("activeBranchId", user.branchId);
        onLogin();
        navigate("/");
        return;
      }

      /*
      Fallback
      */
      onLogin();
      navigate("/");
    } catch (error: unknown) {
      toast.error(
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? "Login failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const { theme } = useTheme();

  return (
    <div className="lnd-root" data-theme={theme}>
      <MarketingHeader />
      <div className="luxury-login-root">
        {/* Subtle radial glow behind card */}
        <div className="luxury-login-glow" aria-hidden="true" />

        <div className="luxury-login-card">
          {/* Crown logo */}
          <div className="luxury-login-crown-wrap">
            <Crown className="luxury-login-crown-icon" />
          </div>

          <h2 className="luxury-login-title">Welcome Back</h2>
          <p className="luxury-login-subtitle">
            Sign in to your executive control panel
          </p>

          <form onSubmit={handleSubmit} className="luxury-login-form">
            {/* Email */}
            <div className="luxury-login-field">
              <label htmlFor="lp-email" className="luxury-login-label">
                EMAIL ADDRESS
              </label>
              <input
                id="lp-email"
                type="email"
                className="luxury-login-input"
                placeholder="Your Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div className="luxury-login-field">
              <label htmlFor="lp-password" className="luxury-login-label">
                PASSWORD
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
                  autoComplete="current-password"
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

            {/* Remember me */}
            <div className="luxury-login-remember">
              <label className="luxury-login-remember-label">
                <input
                  type="checkbox"
                  className="luxury-login-checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember me</span>
              </label>
            </div>

            {/* Submit */}
            <button type="submit" className="luxury-login-btn" disabled={loading}>
              {loading ? (
                <>
                  <span className="luxury-login-spinner" aria-hidden="true" />
                  SIGNING IN…
                </>
              ) : (
                "SIGN IN"
              )}
            </button>

            {/* SSL note */}
            <div className="luxury-login-ssl">
              <Lock className="luxury-login-ssl-icon" />
              <span>256-bit SSL encrypted connection</span>
            </div>
          </form>
        </div>

        <p className="luxury-login-footer-note">
          Need to register your hotel business?{" "}
          <Link to="/pricing" className="luxury-login-link">
            Create organization
          </Link>
        </p>

        {/* Bottom mode note */}
        <p className="luxury-login-bottom-note">
          <span className="luxury-login-bold">Login Mode</span> · Enter your
          credentials to continue
        </p>
      </div>
    </div>
  );
};

export default Login;
