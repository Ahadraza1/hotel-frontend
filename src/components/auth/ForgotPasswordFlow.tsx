import { type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "@/api/axios";
import { useToast } from "@/components/confirm/ConfirmProvider";

type ForgotPasswordStep = "email" | "otp" | "reset";

interface ForgotPasswordFlowProps {
  open?: boolean;
  onClose?: () => void;
  initialEmail?: string;
  onPasswordResetSuccess?: () => void | Promise<void>;
  mode?: "modal" | "page";
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_REGEX = /^\d{4}$|^\d{6}$/;

const ForgotPasswordFlow = ({
  open = true,
  onClose,
  initialEmail = "",
  onPasswordResetSuccess,
  mode = "modal",
}: ForgotPasswordFlowProps) => {
  const navigate = useNavigate();
  const toast = useToast();
  const isModal = mode === "modal";
  const firstInputRef = useRef<HTMLInputElement | null>(null);
  const [step, setStep] = useState<ForgotPasswordStep>("email");
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    setStep("email");
    setEmail(initialEmail);
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setFeedback("");

    const previousOverflow = document.body.style.overflow;
    if (isModal) {
      document.body.style.overflow = "hidden";
    }

    const frame = window.requestAnimationFrame(() => {
      firstInputRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(frame);
      if (isModal) {
        document.body.style.overflow = previousOverflow;
      }
    };
  }, [initialEmail, isModal, open]);

  useEffect(() => {
    if (!open || !isModal) {
      return undefined;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting && onClose) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isModal, onClose, open, submitting]);

  if (!open) {
    return null;
  }

  const handleSendOtp = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setFeedback("Your email is not correct");
      return;
    }

    try {
      setSubmitting(true);
      setFeedback("");
      await api.post("/auth/send-otp", { email: normalizedEmail });
      setEmail(normalizedEmail);
      setStep("otp");
    } catch (error: unknown) {
      setFeedback(
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to send OTP",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!OTP_REGEX.test(otp.trim())) {
      setFeedback("Invalid OTP");
      return;
    }

    try {
      setSubmitting(true);
      setFeedback("");
      await api.post("/auth/verify-otp", {
        email,
        otp: otp.trim(),
      });
      setStep("reset");
    } catch (error: unknown) {
      setFeedback(
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Invalid OTP",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword !== confirmPassword) {
      setFeedback("Passwords do not match");
      return;
    }

    try {
      setSubmitting(true);
      setFeedback("");
      const response = await api.post<{ message?: string }>("/auth/reset-password", {
        email,
        newPassword,
      });

      toast.success(response.data?.message || "Password updated successfully");

      if (onPasswordResetSuccess) {
        await onPasswordResetSuccess();
      }

      if (isModal && onClose) {
        onClose();
      }

      navigate("/signin", { replace: true });
    } catch (error: unknown) {
      setFeedback(
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to reset password",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const stepTitle =
    step === "email"
      ? "Forgot Password"
      : step === "otp"
        ? "Verify OTP"
        : "Reset Password";

  const stepDescription =
    step === "email"
      ? "Enter your email to receive a one-time password."
      : step === "otp"
        ? `Enter the OTP sent to ${email}.`
        : "Choose a new password for your account.";

  const content: ReactNode = (
    <div
      className={isModal ? "forgot-password-layer" : "forgot-password-page-shell"}
      role="presentation"
    >
      {isModal ? (
        <div
          className="forgot-password-backdrop"
          onClick={() => {
            if (!submitting && onClose) {
              onClose();
            }
          }}
        />
      ) : null}

      <div
        className={
          isModal
            ? "forgot-password-modal"
            : "forgot-password-modal forgot-password-page-card"
        }
        role={isModal ? "dialog" : undefined}
        aria-modal={isModal ? "true" : undefined}
        aria-labelledby="forgot-password-title"
      >
        <div className="forgot-password-header">
          <div>
            <h2 id="forgot-password-title" className="forgot-password-title">
              {stepTitle}
            </h2>
            <p className="forgot-password-description">{stepDescription}</p>
          </div>

          {isModal && onClose ? (
            <button
              type="button"
              className="forgot-password-close"
              onClick={onClose}
              disabled={submitting}
              aria-label="Close forgot password dialog"
            >
              <X size={18} />
            </button>
          ) : null}
        </div>

        <div className="forgot-password-steps" aria-hidden="true">
          <span className={step === "email" ? "is-active" : ""}>1</span>
          <span className={step === "otp" ? "is-active" : ""}>2</span>
          <span className={step === "reset" ? "is-active" : ""}>3</span>
        </div>

        <div className="forgot-password-body">
          {step === "email" ? (
            <label className="forgot-password-field">
              <span>Email Address</span>
              <input
                ref={firstInputRef}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your email"
                autoComplete="email"
              />
            </label>
          ) : null}

          {step === "otp" ? (
            <label className="forgot-password-field">
              <span>Enter OTP</span>
              <input
                ref={firstInputRef}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(event) =>
                  setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="Enter OTP"
                autoComplete="one-time-code"
              />
            </label>
          ) : null}

          {step === "reset" ? (
            <>
              <label className="forgot-password-field">
                <span>New Password</span>
                <input
                  ref={firstInputRef}
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="Enter new password"
                  autoComplete="new-password"
                />
              </label>

              <label className="forgot-password-field">
                <span>Confirm Password</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                />
              </label>
            </>
          ) : null}

          {feedback ? <p className="forgot-password-feedback">{feedback}</p> : null}
        </div>

        <div className="forgot-password-actions">
          {step !== "email" ? (
            <button
              type="button"
              className="luxury-btn luxury-btn-outline"
              disabled={submitting}
              onClick={() => {
                setFeedback("");
                setStep(step === "reset" ? "otp" : "email");
              }}
            >
              Back
            </button>
          ) : isModal ? (
            <span />
          ) : (
            <button
              type="button"
              className="luxury-btn luxury-btn-outline"
              disabled={submitting}
              onClick={() => navigate("/signin")}
            >
              Back To Sign In
            </button>
          )}

          <button
            type="button"
            className="luxury-btn luxury-btn-primary"
            disabled={submitting}
            onClick={() => {
              if (step === "email") {
                void handleSendOtp();
                return;
              }

              if (step === "otp") {
                void handleVerifyOtp();
                return;
              }

              void handleResetPassword();
            }}
          >
            {submitting ? (
              <>
                <Loader2 className="forgot-password-spinner" />
                Processing...
              </>
            ) : step === "email" ? (
              "Send OTP"
            ) : step === "otp" ? (
              "Verify OTP"
            ) : (
              "Update Password"
            )}
          </button>
        </div>
      </div>
    </div>
  );

  if (!isModal) {
    return content;
  }

  return createPortal(content, document.body);
};

export default ForgotPasswordFlow;
