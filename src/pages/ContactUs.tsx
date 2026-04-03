import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Loader2,
  Mail,
  MapPin,
  Moon,
  Phone,
  Sun,
  UserRound,
  X,
} from "lucide-react";
import api from "@/api/axios";
import { useToast } from "@/components/confirm/ConfirmProvider";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import "./landing.css";

type ContactFormState = {
  name: string;
  email: string;
  phone: string;
  message: string;
};

type ContactDetailsResponse = {
  email: string;
};

const emptyContactForm: ContactFormState = {
  name: "",
  email: "",
  phone: "",
  message: "",
};

const ContactUs = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactEmail, setContactEmail] = useState("");
  const [contactForm, setContactForm] =
    useState<ContactFormState>(emptyContactForm);
  const [contactErrors, setContactErrors] = useState<
    Partial<Record<keyof ContactFormState, string>>
  >({});
  const isAuthenticated = !!user;

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  useEffect(() => {
    let active = true;

    const loadContactDetails = async () => {
      try {
        const response = await api.get<ContactDetailsResponse>(
          "/contact/public-details",
        );

        if (!active) return;
        setContactEmail(response.data?.email || "");
      } catch (error) {
        if (!active) return;
        console.error("Failed to load public contact details", error);
        setContactEmail("");
      }
    };

    loadContactDetails();

    return () => {
      active = false;
    };
  }, []);

  const validateContactForm = (form: ContactFormState) => {
    const errors: Partial<Record<keyof ContactFormState, string>> = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!form.name.trim()) errors.name = "Full name is required";
    if (!form.email.trim()) errors.email = "Email address is required";
    else if (!emailRegex.test(form.email.trim())) {
      errors.email = "Please enter a valid email address";
    }

    if (!form.phone.trim()) errors.phone = "Phone number is required";
    else if (!/^\d+$/.test(form.phone.trim())) {
      errors.phone = "Phone number must contain digits only";
    }

    if (!form.message.trim()) errors.message = "Message is required";

    return errors;
  };

  const handleContactChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    const nextValue = name === "phone" ? value.replace(/[^\d]/g, "") : value;

    setContactForm((current) => ({
      ...current,
      [name]: nextValue,
    }));

    setContactErrors((current) => {
      if (!current[name as keyof ContactFormState]) return current;
      const next = { ...current };
      delete next[name as keyof ContactFormState];
      return next;
    });
  };

  const handleContactSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const nextErrors = validateContactForm(contactForm);
    setContactErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      setContactSubmitting(true);
      const response = await api.post<{ message: string }>("/contact", {
        name: contactForm.name.trim(),
        email: contactForm.email.trim(),
        phone: contactForm.phone.trim(),
        message: contactForm.message.trim(),
      });

      setContactForm(emptyContactForm);
      setContactErrors({});
      toast.success(response.data?.message || "Message sent successfully");
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || "Failed to send your message";
      toast.error(message);
    } finally {
      setContactSubmitting(false);
    }
  };

  return (
    <div className="lnd-root" data-theme={theme}>
      <nav className="lnd-nav lnd-nav-scrolled lnd-contact-nav">
        <div className="lnd-nav-inner">
          <div className="lnd-logo" onClick={() => navigate("/")}>
            <span className="lnd-logo-icon">🏨</span>
            <span className="lnd-logo-text">HotelOS</span>
          </div>

          <div className="lnd-nav-links">
            <button onClick={() => (window.location.href = "/#features")}>
              Features
            </button>
            <button onClick={() => (window.location.href = "/#analytics")}>
              Analytics
            </button>
            <button onClick={() => (window.location.href = "/#pricing")}>
              Pricing
            </button>
            <button onClick={() => (window.location.href = "/#testimonials")}>
              Reviews
            </button>
            <button className="lnd-contact-nav-active">Contact</button>
          </div>

          <div className="lnd-nav-cta">
            <button
              className="lnd-theme-toggle"
              onClick={toggleTheme}
              aria-label={
                theme === "light"
                  ? "Switch to dark mode"
                  : "Switch to light mode"
              }
              title={
                theme === "light"
                  ? "Switch to dark mode"
                  : "Switch to light mode"
              }
            >
              {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
            </button>
            <button
              className="lnd-btn-ghost lnd-desktop-only"
              onClick={() =>
                isAuthenticated ? handleLogout() : navigate("/login")
              }
            >
              {isAuthenticated ? "Sign Out" : "Sign In"}
            </button>
            <button
              className="lnd-btn-primary lnd-desktop-only"
              onClick={() =>
                isAuthenticated ? navigate("/dashboard") : navigate("/signup")
              }
            >
              {isAuthenticated ? "Dashboard" : "Start Free Trial"}
            </button>
          </div>
        </div>
      </nav>

      <div className="lnd-contact-page-shell">
        <div className="lnd-contact-page-content">
          <section className="lnd-contact-hero">
            <div className="lnd-contact-showcase-badge">Get in Touch</div>
            <h1 className="lnd-contact-showcase-title">Let's Connect</h1>
            <h2 className="lnd-contact-showcase-accent">
              We'd love to hear from you
            </h2>
            <p className="lnd-contact-showcase-copy">
              Reach our team for demos, onboarding help, enterprise questions,
              or product guidance. Everything here follows the same HotelOS
              visual system.
            </p>
          </section>

          <div className="lnd-contact-page-grid">
            <section className="lnd-contact-showcase">
              <div className="lnd-contact-info-stack">
                <div className="lnd-contact-info-card">
                  <div className="lnd-contact-info-icon">
                    <Mail size={18} />
                  </div>
                  <div>
                    <span className="lnd-contact-info-label">Email Us</span>
                    <a
                      href={contactEmail ? `mailto:${contactEmail}` : undefined}
                      className="lnd-contact-info-value"
                    >
                      {contactEmail || "Not configured"}
                    </a>
                  </div>
                </div>

                <div className="lnd-contact-info-card">
                  <div className="lnd-contact-info-icon">
                    <Phone size={18} />
                  </div>
                  <div>
                    <span className="lnd-contact-info-label">Call Us</span>
                    <span className="lnd-contact-info-value">
                      Response via submitted contact details
                    </span>
                  </div>
                </div>

                <div className="lnd-contact-info-card">
                  <div className="lnd-contact-info-icon">
                    <MapPin size={18} />
                  </div>
                  <div>
                    <span className="lnd-contact-info-label">
                      Support Window
                    </span>
                    <span className="lnd-contact-info-value">
                      Hospitality onboarding and product assistance
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <section className="lnd-contact-form-card">
              <button
                type="button"
                className="lnd-contact-close"
                onClick={() => navigate("/")}
                aria-label="Close contact form"
                disabled={contactSubmitting}
              >
                <X size={18} />
              </button>

              <div className="lnd-contact-header">
                <div className="lnd-contact-badge">Premium Support</div>
                <h2 className="lnd-contact-title">Contact Us</h2>
                <p className="lnd-contact-sub">
                  Share your requirements and our team will get back to you with
                  a tailored response.
                </p>
              </div>

              <form className="lnd-contact-form" onSubmit={handleContactSubmit}>
                <label className="lnd-contact-field">
                  <span>Full Name</span>
                  <div className="lnd-contact-input-wrap">
                    <UserRound size={16} />
                    <input
                      type="text"
                      name="name"
                      value={contactForm.name}
                      onChange={handleContactChange}
                      placeholder="John Doe"
                      autoComplete="name"
                    />
                  </div>
                  {contactErrors.name ? (
                    <small className="lnd-contact-error">
                      {contactErrors.name}
                    </small>
                  ) : null}
                </label>

                <div className="lnd-contact-grid">
                  <label className="lnd-contact-field">
                    <span>Email Address</span>
                    <div className="lnd-contact-input-wrap">
                      <Mail size={16} />
                      <input
                        type="email"
                        name="email"
                        value={contactForm.email}
                        onChange={handleContactChange}
                        placeholder="john@example.com"
                        autoComplete="email"
                      />
                    </div>
                    {contactErrors.email ? (
                      <small className="lnd-contact-error">
                        {contactErrors.email}
                      </small>
                    ) : null}
                  </label>

                  <label className="lnd-contact-field">
                    <span>Phone Number</span>
                    <div className="lnd-contact-input-wrap">
                      <Phone size={16} />
                      <input
                        type="tel"
                        name="phone"
                        inputMode="numeric"
                        value={contactForm.phone}
                        onChange={handleContactChange}
                        placeholder="9876543210"
                        autoComplete="tel"
                      />
                    </div>
                    {contactErrors.phone ? (
                      <small className="lnd-contact-error">
                        {contactErrors.phone}
                      </small>
                    ) : null}
                  </label>
                </div>

                <label className="lnd-contact-field">
                  <span>Message / Description</span>
                  <div className="lnd-contact-input-wrap lnd-contact-textarea-wrap">
                    <textarea
                      name="message"
                      value={contactForm.message}
                      onChange={handleContactChange}
                      placeholder="Tell us about your hotel group, team size, or what you need help with."
                      rows={6}
                    />
                  </div>
                  {contactErrors.message ? (
                    <small className="lnd-contact-error">
                      {contactErrors.message}
                    </small>
                  ) : null}
                </label>

                <div className="lnd-contact-actions">
                  <button
                    type="submit"
                    className="lnd-btn-primary lnd-contact-submit"
                    disabled={contactSubmitting}
                  >
                    {contactSubmitting ? (
                      <>
                        <Loader2 size={16} className="lnd-contact-spinner" />
                        Sending...
                      </>
                    ) : (
                      <>
                        Submit
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactUs;
