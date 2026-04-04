import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

const MarketingHeader: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAuthenticated = !!user;

  // Handle scroll logic (only for landing page)
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
      setMobileMenuOpen(false);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
    setMobileMenuOpen(false);
  };

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    if (location.pathname !== "/") {
      window.location.href = `/#${id}`;
      return;
    }
    const elem = document.getElementById(id);
    if (elem) elem.scrollIntoView({ behavior: "smooth" });
  };

  // Determine navbar classes based on current route
  const isLanding = location.pathname === "/";
  const navClass = `lnd-nav ${isLanding && scrolled ? "lnd-nav-scrolled" : ""} ${!isLanding ? "lnd-nav-scrolled lnd-contact-nav" : ""}`;

  return (
    <nav className={navClass}>
      <div className="lnd-nav-inner">
        <div className="lnd-logo" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
          <span className="lnd-logo-icon">🏨</span>
          <span className="lnd-logo-text">HotelOS</span>
        </div>

        <div className="lnd-nav-links">
          <button onClick={() => scrollTo("features")}>Features</button>
          <button onClick={() => scrollTo("analytics")}>Analytics</button>
          <button 
            onClick={() => navigate("/pricing")}
            className={location.pathname === "/pricing" ? "lnd-contact-nav-active" : ""}
          >
            Pricing
          </button>
          <button onClick={() => scrollTo("testimonials")}>Reviews</button>
          <button 
            onClick={() => navigate("/contact")}
            className={location.pathname === "/contact" ? "lnd-contact-nav-active" : ""}
          >
            Contact
          </button>
        </div>

        <div className="lnd-nav-cta">
          <button
            className="lnd-theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          >
            {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          <button
            className="lnd-btn-ghost lnd-desktop-only"
            onClick={() => isAuthenticated ? handleLogout() : navigate("/login")}
          >
            {(isAuthenticated && location.pathname !== "/login") ? "Sign Out" : "Sign In"}
          </button>

          <button
            className="lnd-btn-primary lnd-desktop-only"
            onClick={() =>
              isAuthenticated ? navigate("/dashboard") : navigate("/pricing?plan=free")
            }
          >
            {isAuthenticated ? "Dashboard" : "Start Free Trial"}
          </button>
          
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

      {mobileMenuOpen && (
        <div className="lnd-mobile-menu">
          <button onClick={() => scrollTo("features")}>Features</button>
          <button onClick={() => scrollTo("analytics")}>Analytics</button>
          <button onClick={() => navigate("/pricing")} className={location.pathname === "/pricing" ? "lnd-contact-nav-active" : ""}>Pricing</button>
          <button onClick={() => scrollTo("testimonials")}>Reviews</button>
          <button onClick={() => navigate("/contact")} className={location.pathname === "/contact" ? "lnd-contact-nav-active" : ""}>Contact</button>
          <div className="lnd-mobile-menu-divider" />
          <button onClick={() => isAuthenticated ? handleLogout() : navigate("/login")}>
            {isAuthenticated ? "Sign Out" : "Sign In"}
          </button>
          <button 
            className="lnd-btn-primary" 
            onClick={() =>
              isAuthenticated ? navigate("/dashboard") : navigate("/pricing?plan=free")
            }
          >
            {isAuthenticated ? "Dashboard" : "Start Free Trial"}
          </button>
        </div>
      )}
    </nav>
  );
};

export default MarketingHeader;
