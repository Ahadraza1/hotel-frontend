import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import api from "@/api/axios";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import MarketingHeader from "@/components/layout/MarketingHeader.tsx";
import "./landing.css";



/* ─────────────────────────────────────────────
   DATA
───────────────────────────────────────────── */
const features = [
  {
    icon: "🏨",
    title: "Multi-Branch Management",
    desc: "Oversee unlimited hotel properties from a single, unified command center. Real-time sync across all locations.",
  },
  {
    icon: "📅",
    title: "Booking & Reservation System",
    desc: "Smart booking engine with conflict detection, auto-confirmations, and seamless channel management.",
  },
  {
    icon: "👤",
    title: "CRM & Guest Management",
    desc: "Build lasting guest relationships with rich profiles, preferences, loyalty tiers, and personalized experiences.",
  },
  {
    icon: "👥",
    title: "HR & Payroll Management",
    desc: "Manage your entire workforce—from hiring to payroll—with full compliance and automated calculations.",
  },
  {
    icon: "📊",
    title: "Advanced Analytics & Reports",
    desc: "Actionable insights with beautiful dashboards, revenue forecasting, and exportable performance reports.",
  },
  {
    icon: "🔐",
    title: "Role-Based Access Control",
    desc: "Granular permissions per role, per branch. Control exactly who sees and does what across your empire.",
  },
];

const steps = [
  {
    num: "01",
    icon: "🏗️",
    title: "Add Your Hotels",
    desc: "Onboard each property in minutes. Set up rooms, rates, amenities, and staff structure instantly.",
  },
  {
    num: "02",
    icon: "⚙️",
    title: "Manage Bookings & Staff",
    desc: "Handle reservations, housekeeping, HR, POS, and inventory — all from one dashboard.",
  },
  {
    num: "03",
    icon: "📈",
    title: "Track Growth & Revenue",
    desc: "Watch occupancy rates and revenue climb with real-time analytics and intelligent reports.",
  },
];

const testimonials = [
  {
    name: "Arjun Mehta",
    role: "Hotel Chain Owner · 12 Properties",
    avatar: "AM",
    variant: "gold",
    review:
      "HotelOS completely transformed how we operate. Managing 12 hotels used to require 3 different tools. Now everything is in one place — bookings, staff, finances. Revenue is up 28% in 6 months.",
  },
  {
    name: "Sofia Reyes",
    role: "General Manager · Grand Palace Group",
    avatar: "SR",
    variant: "grandeur",
    review:
      "The analytics alone are worth every rupee. I get a live view of occupancy, revenue, and staff performance across all our branches before my morning coffee. Game changer.",
  },
  {
    name: "James Okafor",
    role: "Property Manager · Oceanic Resorts",
    avatar: "JO",
    variant: "gold-dark",
    review:
      "Role-based access means my branch managers only see what they need. The HR and payroll module saved us 40 hours a month. I can't imagine going back.",
  },
  {
    name: "Priya Nair",
    role: "Director of Operations · Heritage Hotels",
    avatar: "PN",
    variant: "gold-light",
    review:
      "Setup took less than a day. The CRM has helped us identify our top guests and offer personalized upgrades. Guest satisfaction scores have never been higher.",
  },
];



/* ─────────────────────────────────────────────
   ANIMATED COUNTER
───────────────────────────────────────────── */
function useCountUp(target: number, duration = 1800, isVisible: boolean) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!isVisible) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setValue(target);
        clearInterval(timer);
      } else {
        setValue(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration, isVisible]);
  return value;
}

function KpiCard({
  label,
  value,
  prefix,
  suffix,
  sub,
  variant,
  isVisible,
}: {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  sub: string;
  variant: "gold" | "gold-light" | "grandeur" | "gold-dark";
  isVisible: boolean;
}) {
  const count = useCountUp(value, 1800, isVisible);
  return (
    <div className={`lnd-kpi-card lnd-kpi-card-themed lnd-kpi-${variant}`}>
      <div className="lnd-kpi-icon">
        <span className="lnd-kpi-glow" />
      </div>
      <div className="lnd-kpi-value">
        {prefix}
        {count.toLocaleString()}
        {suffix}
      </div>
      <div className="lnd-kpi-label">{label}</div>
      <div className="lnd-kpi-sub">{sub}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MINI CHART (pure CSS/SVG sparkline)
───────────────────────────────────────────── */
function SparklineChart({ color }: { color: string }) {
  const points = [20, 45, 30, 60, 42, 75, 58, 88, 70, 95, 80, 100];
  const maxY = 100;
  const w = 300,
    h = 80;
  const pts = points
    .map((p, i) => `${(i / (points.length - 1)) * w},${h - (p / maxY) * h}`)
    .join(" ");
  const gradId = `sg-${color.replace("#", "")}`;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="lnd-sparkline"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill={`url(#${gradId})`} />
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ─────────────────────────────────────────────
   DASHBOARD MOCKUP
───────────────────────────────────────────── */
function DashboardMockup() {
  const { formatCompactCurrency } = useSystemSettings();
  return (
    <div className="lnd-mockup-shell">
      {/* Top bar */}
      <div className="lnd-mock-topbar">
        <div className="lnd-mock-dots">
          <span className="lnd-bg-dot-red" />
          <span className="lnd-bg-dot-yellow" />
          <span className="lnd-bg-dot-green" />
        </div>
        <div className="lnd-mock-breadcrumb">
          HotelOS · Grand Palace · Dashboard
        </div>
        <div className="lnd-mock-avatar">SA</div>
      </div>

      {/* Sidebar + content */}
      <div className="lnd-mock-body">
        {/* Mini sidebar */}
        <div className="lnd-mock-sidebar">
          {["🏠", "📅", "👤", "📊", "⚙️"].map((ic, i) => (
            <div
              key={i}
              className={`lnd-mock-nav-item ${i === 0 ? "active" : ""}`}
            >
              {ic}
            </div>
          ))}
        </div>

        {/* Main area */}
        <div className="lnd-mock-main">
          {/* KPIs row */}
          <div className="lnd-mock-kpi-row">
            {[
              {
                label: "Revenue",
                value: formatCompactCurrency(124000),
                color: "#C9A85C",
                trend: "+18%",
              },
              {
                label: "Bookings",
                value: "847",
                color: "#DFC48A",
                trend: "+12%",
              },
              {
                label: "Occupancy",
                value: "91%",
                color: "#B08D57",
                trend: "+5%",
              },
              {
                label: "Guests",
                value: "1,203",
                color: "#A07830",
                trend: "+8%",
              },
            ].map((k) => (
              <div key={k.label} className="lnd-mock-kpi">
                <div className="lnd-mock-kpi-label">{k.label}</div>
                <div
                  className={`lnd-mock-kpi-val lnd-color-${k.label.toLowerCase() === "revenue" ? "gold" : k.label.toLowerCase() === "bookings" ? "gold-light" : "grandeur"}`}
                >
                  {k.value}
                </div>
                <div className="lnd-mock-kpi-trend lnd-color-green">
                  ↑ {k.trend}
                </div>
              </div>
            ))}
          </div>

          {/* Chart area */}
          <div className="lnd-mock-chart-area">
            <div className="lnd-mock-chart-header">
              <span>Revenue Trend</span>
              <div className="lnd-mock-chart-tabs">
                <span className="active">Monthly</span>
                <span>Weekly</span>
              </div>
            </div>
            <SparklineChart color="#C9A85C" />
          </div>

          {/* Bottom row */}
          <div className="lnd-mock-bottom">
            <div className="lnd-mock-bookings-list">
              <div className="lnd-mock-list-header">Recent Bookings</div>
              {[
                { name: "Arjun M.", room: "Suite 501", status: "Check-in" },
                { name: "Sofia R.", room: "Deluxe 203", status: "Confirmed" },
                { name: "James O.", room: "Standard 118", status: "Checkout" },
              ].map((b) => (
                <div key={b.name} className="lnd-mock-booking-row">
                  <div className="lnd-mock-booking-avatar">
                    {b.name.charAt(0)}
                  </div>
                  <div className="lnd-mock-booking-info">
                    <span>{b.name}</span>
                    <span className="lnd-mock-booking-room">{b.room}</span>
                  </div>
                  <div
                    className={`lnd-mock-booking-status lnd-status-${b.status.toLowerCase().replace("-", "")}`}
                  >
                    {b.status}
                  </div>
                </div>
              ))}
            </div>

            <div className="lnd-mock-occupancy">
              <div className="lnd-mock-list-header">Occupancy</div>
              <div className="lnd-mock-donut-wrap">
                <svg viewBox="0 0 80 80" className="lnd-mock-donut">
                  <circle
                    cx="40"
                    cy="40"
                    r="30"
                    fill="none"
                    stroke="rgba(201,168,92,0.12)"
                    strokeWidth="10"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="30"
                    fill="none"
                    stroke="#C9A85C"
                    strokeWidth="10"
                    strokeDasharray="170 188"
                    strokeDashoffset="47"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="lnd-mock-donut-label">91%</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN LANDING PAGE
───────────────────────────────────────────── */
const LandingPage = () => {
  const { formatCompactCurrency, formatCurrency, currencySymbol } =
    useSystemSettings();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const kpiRef = useRef<HTMLDivElement>(null);
  const [kpiVisible, setKpiVisible] = useState(false);
  const isAuthenticated = !!user;

  const handleLogout = () => {
    logout();
    navigate("/");
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
      setMobileMenuOpen(false);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setKpiVisible(true);
      },
      { threshold: 0.3 },
    );
    if (kpiRef.current) observer.observe(kpiRef.current);
    return () => observer.disconnect();
  }, []);



  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    setTimeout(
      () => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }),
      100,
    );
  };

  return (
    <div className="lnd-root" data-theme={theme}>
      <MarketingHeader />

      {/* ── HERO ── */}
      <section className="lnd-hero" id="hero">
        {/* Background orbs */}
        <div className="lnd-orb lnd-orb-1" />
        <div className="lnd-orb lnd-orb-2" />
        <div className="lnd-orb lnd-orb-3" />
        <div className="lnd-grid-overlay" />

        <div className="lnd-hero-inner">
          <div className="lnd-hero-left">
            <div className="lnd-hero-badge">
              <span className="lnd-badge-dot" />
              All-in-One Hotel Operating System
            </div>
            <h1 className="lnd-hero-headline">
              Manage Multiple Hotels from One{" "}
              <span className="lnd-gradient-text">Powerful Dashboard</span>
            </h1>
            <p className="lnd-hero-sub">
              All-in-one platform to manage bookings, staff, revenue, and
              operations across all your properties. Trusted by 500+ hotel
              chains worldwide.
            </p>
            <div className="lnd-hero-stats">
              <div className="lnd-hero-stat">
                <span>500+</span>
                <small>Hotels</small>
              </div>
              <div className="lnd-hero-stat-divider" />
              <div className="lnd-hero-stat">
                <span>98%</span>
                <small>Uptime</small>
              </div>
              <div className="lnd-hero-stat-divider" />
              <div className="lnd-hero-stat">
                <span>40+</span>
                <small>Countries</small>
              </div>
            </div>
            <div className="lnd-hero-actions">
              <button
                className="lnd-btn-primary lnd-btn-lg"
                onClick={() => navigate("/pricing?plan=free")}
              >
                Start Free Trial
                <span className="lnd-btn-arrow">→</span>
              </button>
              <button
                className="lnd-btn-outline lnd-btn-lg"
                onClick={() => scrollTo("how-it-works")}
              >
                Book Demo
              </button>
            </div>
            <p className="lnd-hero-disclaimer">
              No credit card required · 14-day free trial · Cancel anytime
            </p>
          </div>

          <div className="lnd-hero-right">
            <div className="lnd-mockup-wrapper">
              <DashboardMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST LOGOS ── */}
      <section className="lnd-trust">
        <p className="lnd-trust-label">TRUSTED BY LEADING HOSPITALITY BRANDS</p>
        <div className="lnd-trust-logos">
          {[
            "Grand Palace",
            "Oceanic Resorts",
            "Heritage Hotels",
            "Summit Group",
            "Azure Stays",
            "Pinnacle Hotels",
          ].map((b) => (
            <div key={b} className="lnd-trust-logo">
              {b}
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="lnd-section" id="features">
        <div className="lnd-section-inner">
          <div className="lnd-section-header">
            <div className="lnd-section-badge">Features</div>
            <h2 className="lnd-section-title">
              Everything You Need to Run a{" "}
              <span className="lnd-gradient-text">5-Star Operation</span>
            </h2>
            <p className="lnd-section-sub">
              From bookings to payroll, HotelOS covers every inch of your
              hospitality business so you can focus on guest experience.
            </p>
          </div>

          <div className="lnd-features-grid">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="lnd-feature-card"
                style={{ animationDelay: `${i * 80}ms` } as React.CSSProperties}
              >
                <div className="lnd-feature-icon">{f.icon}</div>
                <h3 className="lnd-feature-title">{f.title}</h3>
                <p className="lnd-feature-desc">{f.desc}</p>
                <div className="lnd-feature-arrow">→</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ANALYTICS / KPI ── */}
      <section
        className="lnd-section lnd-analytics-section"
        id="analytics"
        ref={kpiRef}
      >
        <div className="lnd-orb lnd-orb-analytics-1" />
        <div className="lnd-orb lnd-orb-analytics-2" />
        <div className="lnd-section-inner">
          <div className="lnd-section-header">
            <div className="lnd-section-badge">Analytics</div>
            <h2 className="lnd-section-title">
              Real-Time Insights Across{" "}
              <span className="lnd-gradient-text">All Properties</span>
            </h2>
            <p className="lnd-section-sub">
              Make data-driven decisions with live KPIs, revenue trends, and
              occupancy tracking — all in one beautiful dashboard.
            </p>
          </div>

          <div className="lnd-kpi-grid">
            <KpiCard
              label="Total Revenue"
              value={2840000}
              prefix="₹"
              sub="across all branches this year"
              variant="gold"
              isVisible={kpiVisible}
            />
            <KpiCard
              label="Today's Revenue"
              value={18450}
              prefix="₹"
              sub="live bookings + restaurant POS"
              variant="gold-light"
              isVisible={kpiVisible}
            />
            <KpiCard
              label="Active Bookings"
              value={847}
              sub="confirmed reservations right now"
              variant="grandeur"
              isVisible={kpiVisible}
            />
            <KpiCard
              label="Occupancy Rate"
              value={91}
              suffix="%"
              sub="average across all properties"
              variant="gold-dark"
              isVisible={kpiVisible}
            />
          </div>

          {/* Revenue chart showcase */}
          <div className="lnd-chart-showcase">
            <div className="lnd-chart-showcase-header">
              <div>
                <h3>Revenue Trend</h3>
                <p>Monthly performance across all hotel properties</p>
              </div>
              <div className="lnd-chart-showcase-tabs">
                <span className="active">2025</span>
                <span>2024</span>
              </div>
            </div>
            <div className="lnd-chart-showcase-body">
              <div className="lnd-bar-chart">
                {[65, 80, 55, 90, 70, 95, 85, 100, 78, 92, 88, 96].map(
                  (h, i) => (
                    <div key={i} className="lnd-bar-wrapper">
                      <div
                        className="lnd-bar"
                        style={{ height: `${h}%` } as React.CSSProperties}
                      >
                        <div
                          className={`lnd-bar-fill ${h === 100 ? "lnd-bg-gold-dark" : "lnd-bg-gold"}`}
                        />
                      </div>
                      <span className="lnd-bar-label">
                        {
                          [
                            "J",
                            "F",
                            "M",
                            "A",
                            "M",
                            "J",
                            "J",
                            "A",
                            "S",
                            "O",
                            "N",
                            "D",
                          ][i]
                        }
                      </span>
                    </div>
                  ),
                )}
              </div>
              <div className="lnd-chart-legend">
                <span>
                  <i className="lnd-bg-grandeur" /> Room Revenue
                </span>
                <span>
                  <i className="lnd-bg-gold" /> POS Revenue
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="lnd-section" id="how-it-works">
        <div className="lnd-section-inner">
          <div className="lnd-section-header">
            <div className="lnd-section-badge">How It Works</div>
            <h2 className="lnd-section-title">
              Up and Running in{" "}
              <span className="lnd-gradient-text">Under an Hour</span>
            </h2>
            <p className="lnd-section-sub">
              No complicated setup. No IT team required. Just three steps to
              bring your entire hotel empire online.
            </p>
          </div>

          <div className="lnd-steps-row">
            {steps.map((s, i) => (
              <div key={s.num} className="lnd-step-card">
                <div className="lnd-step-num">{s.num}</div>
                <div className="lnd-step-icon">{s.icon}</div>
                <h3 className="lnd-step-title">{s.title}</h3>
                <p className="lnd-step-desc">{s.desc}</p>
                {i < steps.length - 1 && (
                  <div className="lnd-step-connector">
                    <span />
                    <span />
                    <span />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>



      {/* ── TESTIMONIALS ── */}
      <section className="lnd-section" id="testimonials">
        <div className="lnd-section-inner">
          <div className="lnd-section-header">
            <div className="lnd-section-badge">Reviews</div>
            <h2 className="lnd-section-title">
              Loved by Hotel Owners{" "}
              <span className="lnd-gradient-text">Worldwide</span>
            </h2>
            <p className="lnd-section-sub">
              Don't take our word for it — hear directly from the hoteliers
              who've transformed their operations with HotelOS.
            </p>
          </div>

          <div className="lnd-testimonials-grid">
            {testimonials.map((t) => (
              <div key={t.name} className="lnd-testimonial-card">
                <div className="lnd-testimonial-stars">★★★★★</div>
                <p className="lnd-testimonial-review">"{t.review}"</p>
                <div className="lnd-testimonial-author">
                  <div
                    className={`lnd-testimonial-avatar lnd-testimonial-avatar-themed lnd-t-${t.variant}`}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <div className="lnd-testimonial-name">{t.name}</div>
                    <div className="lnd-testimonial-role">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="lnd-cta-section" id="cta">
        <div className="lnd-orb lnd-orb-cta-1" />
        <div className="lnd-orb lnd-orb-cta-2" />
        <div className="lnd-cta-inner">
          <div className="lnd-cta-badge">Join 500+ Hotel Groups</div>
          <h2 className="lnd-cta-headline">
            Start Managing Your Hotels{" "}
            <span className="lnd-gradient-text">Smarter Today</span>
          </h2>
          <p className="lnd-cta-sub">
            Set up your first property in minutes. No contracts, no hidden fees.
            Scale from 1 hotel to 1,000 on a single platform.
          </p>
          <div className="lnd-cta-actions">
            <button
              className="lnd-btn-primary lnd-btn-xl"
              onClick={() => navigate("/login")}
              id="final-cta-btn"
            >
              Get Started Now
              <span className="lnd-btn-arrow">→</span>
            </button>

          </div>
          <p className="lnd-cta-disclaimer">
            14-day free trial · No credit card required · Cancel anytime
          </p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lnd-footer">
        <div className="lnd-footer-inner">
          <div className="lnd-footer-brand">
            <div className="lnd-logo">
              <span className="lnd-logo-icon">🏨</span>
              <span className="lnd-logo-text">HotelOS</span>
            </div>
            <p className="lnd-footer-tagline">
              The all-in-one hotel management platform for modern hospitality
              businesses.
            </p>
            <div className="lnd-footer-social">
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="lnd-social-icon"
                aria-label="Twitter"
              >
                𝕏
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="lnd-social-icon"
                aria-label="LinkedIn"
              >
                in
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="lnd-social-icon"
                aria-label="Facebook"
              >
                f
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="lnd-social-icon"
                aria-label="YouTube"
              >
                ▶
              </a>
            </div>
          </div>

          <div className="lnd-footer-links">
            <div className="lnd-footer-col">
              <h4>Product</h4>
              <button
                  type="button"
                  className="lnd-footer-link-button"
                  onClick={() => scrollTo("features")}
                >
                  Features
                </button>
              <button
                  type="button"
                  className="lnd-footer-link-button"
                  onClick={() => navigate("/pricing")}
                >
                  Pricing
                </button>

              <a href="#analytics">Analytics</a>
              <a href="#how-it-works">How It Works</a>
            </div>
            <div className="lnd-footer-col">
              <h4>Company</h4>
              <a href="#">About</a>
                <button
                  type="button"
                  className="lnd-footer-link-button"
                  onClick={() => navigate("/contact")}
                >
                  Contact
                </button>
            </div>
            <div className="lnd-footer-col">
              <h4>Legal</h4>
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
            </div>
          </div>
        </div>

        <div className="lnd-footer-bottom">
          <span>© 2026 HotelOS · All rights reserved</span>
          <span>Built for the global hospitality industry</span>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
