import { useEffect, useState } from "react";
import { CreditCard, MessageSquare, Mail, MessageCircle, Globe, CheckCircle, XCircle, Settings } from "lucide-react";
import api from "@/api/axios";

interface Integration {
  _id?: string;
  name: string;
  description: string;
  provider: string;
  status: string;
}

const Integrations = () => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIntegrations = async () => {
      try {
        const res = await api.get<{ data: Integration[] }>("/integrations");
        setIntegrations(res.data.data || []);
      } catch (error) {
        console.error("Failed to load integrations", error);
      } finally {
        setLoading(false);
      }
    };

    fetchIntegrations();
  }, []);

  if (loading) {
    return <div className="page-title">Loading integrations...</div>;
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="page-title">Integrations</h1>
        <p className="page-subtitle">Manage third-party service connections</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {integrations.map((int) => (
          <div key={int._id || int.name} className="luxury-card">
            <div className="flex items-center justify-between mb-4">
              <div className="integration-icon-wrap">
                {int.name === "Payment Gateway" && <CreditCard className="integration-icon" aria-hidden="true" />}
                {int.name === "SMS Service" && <MessageSquare className="integration-icon" aria-hidden="true" />}
                {int.name === "Email SMTP" && <Mail className="integration-icon" aria-hidden="true" />}
                {int.name === "WhatsApp API" && <MessageCircle className="integration-icon" aria-hidden="true" />}
                {int.name === "OTA Integration" && <Globe className="integration-icon" aria-hidden="true" />}
              </div>

              <span className={`luxury-badge ${int.status === "connected" ? "badge-active" : "badge-danger"}`}>
                {int.status === "connected"
                  ? <><CheckCircle className="icon-xs" aria-hidden="true" style={{ display: 'inline', marginRight: '0.25rem' }} />Connected</>
                  : <><XCircle className="icon-xs" aria-hidden="true" style={{ display: 'inline', marginRight: '0.25rem' }} />Disconnected</>}
              </span>
            </div>

            <h3 className="user-name integration-name">{int.name}</h3>
            <p className="user-email integration-desc">{int.description}</p>
            <p className="kpi-label integration-provider">Provider: {int.provider}</p>

            <button className="luxury-btn luxury-btn-outline integration-btn">
              <Settings className="icon-md" aria-hidden="true" /> Configure
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Integrations;