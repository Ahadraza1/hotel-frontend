import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/api/axios";
import { useToast } from "@/components/confirm/ConfirmProvider";
import "@/pages/superadmin/profile/profile.css";

const UpdatePassword = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const handleSave = async () => {
    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (form.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }

    try {
      setSaving(true);

      const response = await api.put<{ message?: string }>("/users/update-password", {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });

      setForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      toast.success(response.data?.message || "Password updated successfully");
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to update password";

      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const isSubmitDisabled =
    saving ||
    !form.currentPassword ||
    !form.newPassword ||
    !form.confirmPassword;

  return (
    <div className="profile-container">

      <div className="profile-card">

        <div className="profile-header">
          <h2>Update Password</h2>
        </div>

        <div className="profile-body vertical">

          <div className="form-field">
            <label htmlFor="current-password">Current Password</label>
            <input
              id="current-password"
              type="password"
              placeholder="Enter current password"
              value={form.currentPassword}
              onChange={(e) =>
                setForm({ ...form, currentPassword: e.target.value })
              }
            />
          </div>

          <div className="form-field">
            <label htmlFor="new-password">New Password</label>
            <input
              id="new-password"
              type="password"
              placeholder="Enter new password"
              value={form.newPassword}
              onChange={(e) =>
                setForm({ ...form, newPassword: e.target.value })
              }
            />
          </div>

          <div className="form-field">
            <label htmlFor="confirm-password">Confirm Password</label>
            <input
              id="confirm-password"
              type="password"
              placeholder="Re-enter new password"
              value={form.confirmPassword}
              onChange={(e) =>
                setForm({ ...form, confirmPassword: e.target.value })
              }
            />
          </div>

        </div>

        <div className="profile-footer">
          <button className="btn-secondary" onClick={() => navigate(-1)}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={isSubmitDisabled}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>

      </div>

    </div>
  );
};

export default UpdatePassword;
