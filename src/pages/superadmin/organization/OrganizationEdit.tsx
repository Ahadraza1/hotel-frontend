import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import api from "@/api/axios";
import { X, Building2, Shield, GitBranch, Users, Save } from "lucide-react";
import "@/pages/superadmin/organization/organization.css";
import { useToast } from "@/components/confirm/ConfirmProvider";

interface Organization {
  _id: string;
  name: string;
  serviceTier: string;
  branches: number;
  users: number;
}

const OrganizationEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);

  // 🔥 Fetch organization by ID
  useEffect(() => {
    const fetchOrganization = async () => {
      try {
        setFetchLoading(true);
        const response = await api.get<{ data: Organization }>(`/organizations/${id}`);
        setForm(response.data.data);
      } catch (error) {
        console.error("Failed to fetch organization", error);
      } finally {
        setFetchLoading(false);
      }
    };

    if (id) fetchOrganization();
  }, [id]);

  const handleSave = async () => {
    if (!form) return;

    try {
      setLoading(true);

      await api.put(`/organizations/${id}`, {
        name: form.name,
        serviceTier: form.serviceTier,
        branches: form.branches,
        users: form.users,
      });

      toast.success("Organization updated successfully.");
      navigate("/organizations");
    } catch (error: unknown) {
      const axiosError = error as unknown as { response?: { data?: { message?: string } } };
      const msg = axiosError?.response?.data?.message ?? "Failed to update organization";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <div className="detail-overlay">
        <div className="detail-panel">
          <div className="detail-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="add-branch-spinner" />
          </div>
        </div>
      </div>
    );
  }

  if (!form) return null;

  return (
    <div className="detail-overlay" onClick={() => navigate(-1)}>
      <div className="detail-panel" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="detail-header">
          <div className="detail-header-top">
            <div className="detail-org-icon">
              <Building2 size={24} strokeWidth={1.5} />
            </div>
            <button
              onClick={() => navigate(-1)}
              className="detail-close-btn"
              aria-label="Close edit panel"
            >
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>

          <h2 className="detail-title">Edit Organization</h2>
          <p className="detail-subtitle">Update core details for {form.name}</p>
        </div>

        {/* Body */}
        <div className="detail-body">
          <div className="edit-form-grid">
            
            <div className="edit-field-group">
              <label htmlFor="org-name" className="edit-field-label">Organization Name</label>
              <div className="add-branch-input-wrap">
                <Building2 className="add-branch-field-icon" size={16} />
                <input
                  id="org-name"
                  className="luxury-input add-branch-input-with-icon"
                  placeholder="Enter organization name"
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="edit-field-group">
              <label htmlFor="org-tier" className="edit-field-label">Service Tier</label>
              <div className="add-branch-input-wrap">
                <Shield className="add-branch-field-icon" size={16} />
                <select
                  id="org-tier"
                  className="luxury-input luxury-select add-branch-input-with-icon"
                  value={form.serviceTier}
                  onChange={(e) =>
                    setForm({ ...form, serviceTier: e.target.value })
                  }
                >
                  <option value="STARTER">Starter</option>
                  <option value="PROFESSIONAL">Professional</option>
                  <option value="ENTERPRISE">Enterprise</option>
                </select>
              </div>
            </div>

            <div className="edit-field-row">
              <div className="edit-field-group">
                <label htmlFor="org-branches" className="edit-field-label">Branches</label>
                <div className="add-branch-input-wrap">
                  <GitBranch className="add-branch-field-icon" size={16} />
                  <input
                    id="org-branches"
                    type="number"
                    className="luxury-input add-branch-input-with-icon"
                    placeholder="Branches"
                    value={form.branches}
                    onChange={(e) =>
                      setForm({ ...form, branches: Number(e.target.value) })
                    }
                  />
                </div>
              </div>

              <div className="edit-field-group">
                <label htmlFor="org-users" className="edit-field-label">Max Users</label>
                <div className="add-branch-input-wrap">
                  <Users className="add-branch-field-icon" size={16} />
                  <input
                    id="org-users"
                    type="number"
                    className="luxury-input add-branch-input-with-icon"
                    placeholder="Users"
                    value={form.users}
                    onChange={(e) =>
                      setForm({ ...form, users: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="detail-footer">
          <button 
            className="luxury-btn luxury-btn-ghost detail-footer-btn" 
            onClick={() => navigate(-1)}
          >
            Cancel
          </button>
          <button
            className="luxury-btn luxury-btn-primary detail-footer-btn save-btn"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="add-branch-spinner" />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Changes
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default OrganizationEdit;
