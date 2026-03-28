import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/api/axios";
import "@/pages/superadmin/profile/profile.css";
import { useConfirm, useToast } from "@/components/confirm/ConfirmProvider";
import { validateEmailField, validatePhoneField } from "@/lib/fieldValidation";
import { useAuth } from "@/contexts/AuthContext";

const Profile = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState<"profile" | "security">("profile");
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    avatar: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // ✅ Fetch profile on load
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get<{
          data: {
            name: string;
            email: string;
            phone?: string;
            avatar?: string;
          };
        }>("/users/me");
        const data = res.data.data;

        setForm({
          name: data.name,
          email: data.email,
          phone: data.phone || "",
          avatar: data.avatar || "",
        });
      } catch (error) {
        console.error("Failed to load profile", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const getFieldError = (name: string, value: string) => {
    switch (name) {
      case "email":
        return validateEmailField(value);
      case "phone":
        return validatePhoneField(value);
      default:
        return "";
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("avatar", file); // must match multer field name

    try {
      const res = await api.patch<{ data: { avatar: string } }>(
        "/users/me/avatar",
        formData,
        // ❌ DO NOT manually set Content-Type
      );

      setForm((prev) => ({
        ...prev,
        avatar: res.data.data.avatar,
      }));
    } catch (error) {
      console.error("Avatar upload failed", error);
      toast.error("Failed to upload image");
    }
  };

  const removeImage = async () => {
    try {
      const formData = new FormData();
      formData.append("avatar", ""); // send empty to clear

      await api.patch("/users/me/avatar", formData);

      setForm((prev) => ({ ...prev, avatar: "" }));
      toast.success("Profile photo removed successfully.");
    } catch (error) {
      console.error("Failed to remove avatar", error);
      toast.error("Failed to remove avatar");
    }
  };

  const handleSave = async () => {
    const nextErrors: Record<string, string> = {};
    const emailError = getFieldError("email", form.email);
    if (emailError) nextErrors.email = emailError;
    const phoneError = getFieldError("phone", form.phone);
    if (phoneError) nextErrors.phone = phoneError;

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      await api.put("/users/me", {
        name: form.name,
        email: form.email,
        phone: form.phone,
      });

      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Profile update failed", error);
      toast.error("Failed to update profile");
    }
  };

  const handlePasswordUpdate = async () => {
    if (
      !passwordForm.currentPassword ||
      !passwordForm.newPassword ||
      !passwordForm.confirmPassword
    ) {
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }

    try {
      setPasswordSaving(true);

      const response = await api.put<{ message?: string }>(
        "/users/update-password",
        {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        },
      );

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      toast.success(response.data?.message || "Password updated successfully");
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || "Failed to update password";

      toast.error(message);
    } finally {
      setPasswordSaving(false);
    }
  };

  const isPasswordSubmitDisabled =
    passwordSaving ||
    !passwordForm.currentPassword ||
    !passwordForm.newPassword ||
    !passwordForm.confirmPassword;

  const handleDeleteAccount = async () => {
    const confirmed = await confirm({
      title: "Delete Account",
      message: "Are you sure you want to delete your account? This action cannot be undone.",
      confirmLabel: "Delete Account",
      processingLabel: "Deleting...",
      successMessage: "Account deleted successfully.",
      errorMessage: "Failed to delete account.",
      onConfirm: async () => {
        await api.delete("/users/me");
      },
    });

    if (confirmed) {
      logout();
      navigate("/login", { replace: true });
    }
  };

  if (loading) {
    return <div className="page-title">Loading profile...</div>;
  }

  return (
    <div className="profile-container">
      <div className="profile-card">
        <div className="profile-header">
          <h2>My Profile</h2>
        </div>
        <div className="profile-tabs" role="tablist" aria-label="Profile sections">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "profile"}
            className={`luxury-btn settings-tab-btn ${
              activeTab === "profile"
                ? "settings-tab-active"
                : "settings-tab-inactive"
            }`}
            onClick={() => setActiveTab("profile")}
          >
            Profile
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "security"}
            className={`luxury-btn settings-tab-btn ${
              activeTab === "security"
                ? "settings-tab-active"
                : "settings-tab-inactive"
            }`}
            onClick={() => setActiveTab("security")}
          >
            Security
          </button>
        </div>

        {activeTab === "profile" && (
          <>
            <div className="profile-body-edit">
              <div className="profile-avatar-section">
                <div className="profile-avatar-large">
                  {form.avatar ? (
                    <img src={form.avatar} alt="Profile" />
                  ) : (
                    <div className="avatar-placeholder">
                      {form.name?.charAt(0) || "U"}
                    </div>
                  )}
                </div>

                <div className="avatar-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Upload Photo
                  </button>

                  {form.avatar && (
                    <button
                      type="button"
                      className="btn-danger"
                      onClick={removeImage}
                    >
                      Remove
                    </button>
                  )}
                </div>

                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  aria-label="Upload profile photo"
                  ref={fileInputRef}
                  className="input-hidden"
                  onChange={handleImageUpload}
                />
              </div>

              <div className="profile-form">
                <div className="form-group">
                  <label htmlFor="profile-name">Full Name</label>
                  <input
                    id="profile-name"
                    type="text"
                    placeholder="Enter your full name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="profile-email">Email Address</label>
                  <input
                    id="profile-email"
                    type="email"
                    placeholder="Enter your email address"
                    value={form.email}
                    onChange={(e) => {
                      const value = e.target.value;
                      setForm({ ...form, email: value });
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        const nextError = getFieldError("email", value);
                        if (nextError) next.email = nextError;
                        else delete next.email;
                        return next;
                      });
                    }}
                    onBlur={(e) => {
                      const nextError = getFieldError("email", e.target.value);
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        if (nextError) next.email = nextError;
                        else delete next.email;
                        return next;
                      });
                    }}
                  />
                  {fieldErrors.email ? (
                    <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>
                      {fieldErrors.email}
                    </span>
                  ) : null}
                </div>

                <div className="form-group">
                  <label htmlFor="profile-phone">Phone Number</label>
                  <input
                    id="profile-phone"
                    type="text"
                    placeholder="Enter your phone number"
                    value={form.phone}
                    onChange={(e) => {
                      const value = e.target.value;
                      setForm({ ...form, phone: value });
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        const nextError = getFieldError("phone", value);
                        if (nextError) next.phone = nextError;
                        else delete next.phone;
                        return next;
                      });
                    }}
                    onBlur={(e) => {
                      const nextError = getFieldError("phone", e.target.value);
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        if (nextError) next.phone = nextError;
                        else delete next.phone;
                        return next;
                      });
                    }}
                  />
                  {fieldErrors.phone ? (
                    <span style={{ color: "#dc2626", display: "block", fontSize: "0.875rem", marginTop: "0.35rem" }}>
                      {fieldErrors.phone}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="profile-footer">
              <button className="btn-primary" onClick={handleSave}>
                Save Changes
              </button>
              <button className="btn-danger" onClick={() => void handleDeleteAccount()}>
                Delete Account
              </button>
            </div>
          </>
        )}

        {activeTab === "security" && (
          <>
            <div className="profile-body-security">
              <div className="profile-security-intro">
                <h3>Security Settings</h3>
                <p>Manage your password and account security</p>
              </div>

              <div className="profile-form">
                <div className="form-group">
                  <label htmlFor="current-password">Current Password</label>
                  <input
                    id="current-password"
                    type="password"
                    placeholder="Enter current password"
                    value={passwordForm.currentPassword}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        currentPassword: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="new-password">New Password</label>
                  <input
                    id="new-password"
                    type="password"
                    placeholder="Enter new password"
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        newPassword: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="confirm-new-password">
                    Confirm New Password
                  </label>
                  <input
                    id="confirm-new-password"
                    type="password"
                    placeholder="Re-enter new password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        confirmPassword: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="profile-footer">
              <button
                className="btn-primary"
                onClick={handlePasswordUpdate}
                disabled={isPasswordSubmitDisabled}
              >
                {passwordSaving ? "Updating..." : "Update Password"}
              </button>
              <button className="btn-danger" onClick={() => void handleDeleteAccount()}>
                Delete Account
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Profile;
