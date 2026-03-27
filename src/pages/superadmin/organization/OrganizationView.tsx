import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "@/api/axios";
import { X, Building2, UserRound, Mail } from "lucide-react";
import "@/pages/superadmin/organization/organization.css";
import { useToast } from "@/components/confirm/ConfirmProvider";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";

interface Organization {
  _id: string;
  name: string;
  admins: string[];
  serviceTier: string;
  status: string;
  revenue: number;
  branches: number;
  users: number;
}

const OrganizationView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { formatCurrency } = useSystemSettings();

  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ NEW STATE (Invite)
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");

  useEffect(() => {
    const fetchOrganization = async () => {
      try {
        const response = await api.get<{ data: Organization }>(
          `/organizations/${id}`
        );
        setOrg(response.data.data);
      } catch (error) {
        console.error("Failed to fetch organization", error);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchOrganization();
  }, [id]);

  if (loading || !org) return null;

  const getInitials = (name: string) => {
    if (!name) return "";
    return name.charAt(0).toUpperCase();
  };

  // ✅ NEW FUNCTION (Invite Branch Manager)
  const handleInviteBranchManager = async () => {
    try {
      await api.post("/invitations", {
        name: inviteName,
        email: inviteEmail,
        role: "BRANCH_MANAGER",
        organizationId: org._id, // important
      });

      toast.success("Branch Manager invited successfully.");
      setInviteName("");
      setInviteEmail("");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Error");
    }
  };

  return (
    <div className="detail-overlay" onClick={() => navigate(-1)}>
      <div
        className="detail-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="detail-header">
          <div className="detail-header-top">
            <div className="detail-org-icon">
              <Building2 size={24} strokeWidth={1.5} />
            </div>
            <button
              onClick={() => navigate(-1)}
              className="detail-close-btn"
              aria-label="Close dossier panel"
            >
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>

          <h2 className="detail-title">{org.name}</h2>
          <span className="detail-status-badge">{org.status}</span>
        </div>

        {/* Body */}
        <div className="detail-body">

          {/* Key-Value List */}
          <div className="detail-list">
            <div className="detail-list-item">
              <span className="detail-list-label">Plan</span>
              <span className="detail-list-value">{org.serviceTier}</span>
            </div>
            <div className="detail-list-item">
              <span className="detail-list-label">Branches</span>
              <span className="detail-list-value">{org.branches}</span>
            </div>
            <div className="detail-list-item">
              <span className="detail-list-label">Revenue</span>
              <span className="detail-list-value">
                {formatCurrency(org.revenue || 0)}
              </span>
            </div>
          </div>

          {/* Admins Section */}
          <div>
            <h4 className="detail-section-title">Admins</h4>

            <div className="detail-admins">
              {org.admins && org.admins.length > 0 ? (
                org.admins.map((admin, idx) => (
                  <div key={idx} className="detail-admin-item">
                    <div className="detail-admin-avatar">
                      {getInitials(admin)}
                    </div>
                    <span className="detail-admin-name">{admin}</span>
                  </div>
                ))
              ) : (
                <span className="detail-empty">No admin assigned</span>
              )}
            </div>
          </div>

          {/* ✅ NEW SECTION — Invite Branch Manager */}
          <div className="detail-invite-section">
            <h4 className="detail-section-title">
              Invite Branch Manager
            </h4>

            <div className="detail-invite-form">
              <div className="add-branch-input-wrap">
                <UserRound className="add-branch-field-icon" size={15}/>
                <input
                  type="text"
                  placeholder="Manager Name"
                  className="luxury-input add-branch-input-with-icon"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                />
              </div>

              <div className="add-branch-input-wrap">
                <Mail className="add-branch-field-icon" size={15}/>
                <input
                  type="email"
                  placeholder="Manager Email Address"
                  className="luxury-input add-branch-input-with-icon"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>

              <button 
                className="luxury-btn luxury-btn-primary detail-invite-btn"
                onClick={handleInviteBranchManager}
              >
                Send Invitation
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default OrganizationView;
