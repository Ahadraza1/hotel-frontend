import { useState, useEffect } from "react";
import { Save } from "lucide-react";
import api from "@/api/axios";
import { useToast } from "@/components/confirm/ConfirmProvider";

const settingsTabs = [
  "General",
  "Tax",
  "Currency",
  "Notifications",
];

interface Settings {
  platformName: string;
  supportEmail: string;
  maxBranches: number;
  defaultLanguage: string;
  taxRate: number;
  taxId: string;
  taxOnCommission: boolean;
  baseCurrency: string;
  autoCurrency: boolean;
}

const SystemSettings = () => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState("General");
  const [loading, setLoading] = useState(true);

  const [settings, setSettings] = useState<Settings>({
    platformName: "",
    supportEmail: "",
    maxBranches: 0,
    defaultLanguage: "English",
    taxRate: 0,
    taxId: "",
    taxOnCommission: false,
    baseCurrency: "",
    autoCurrency: false,
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get<{ data: Settings }>("/system-settings");
        setSettings(res.data.data ?? {
          platformName: "",
          supportEmail: "",
          maxBranches: 0,
          defaultLanguage: "English",
          taxRate: 0,
          taxId: "",
          taxOnCommission: false,
          baseCurrency: "",
          autoCurrency: false,
        });
      } catch (error) {
        console.error("Failed to load settings", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { id, value } = e.target;
    setSettings((prev: Settings) => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleToggle = (key: string) => {
    setSettings((prev: Settings) => ({
      ...prev,
      [key]: !prev[key as keyof Settings],
    }));
  };

  const handleSave = async () => {
    try {
      await api.put("/system-settings", settings);
      toast.success("Settings updated successfully");
    } catch (error) {
      toast.error("Failed to update settings");
    }
  };

  if (loading) {
    return <div className="page-title">Loading settings...</div>;
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">System Settings</h1>
          <p className="page-subtitle">
            Configure global platform parameters
          </p>
        </div>
        <button
          onClick={handleSave}
          className="luxury-btn luxury-btn-primary"
        >
          <Save className="icon-md" aria-hidden="true" /> Save Changes
        </button>
      </div>

      <div className="flex gap-2 overflow-auto settings-tabs-bar">
        {settingsTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`luxury-btn settings-tab-btn ${
              activeTab === tab
                ? "settings-tab-active"
                : "settings-tab-inactive"
            }`}
            aria-pressed={activeTab === tab ? true : undefined}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="luxury-card settings-card">
        {activeTab === "General" && (
          <div className="flex flex-col gap-5">
            <div>
              <label className="kpi-label settings-field-label">
                Platform Name
              </label>
              <input
                id="platformName"
                className="luxury-input"
                value={settings.platformName}
                onChange={handleChange}
                placeholder="Platform Name"
              />
            </div>
            <div>
              <label className="kpi-label settings-field-label">
                Support Email
              </label>
              <input
                id="supportEmail"
                className="luxury-input"
                value={settings.supportEmail}
                onChange={handleChange}
                placeholder="support@example.com"
              />
            </div>
            <div>
              <label htmlFor="maxBranches" className="kpi-label settings-field-label">
                Max Branches per Organization
              </label>
              <input
                id="maxBranches"
                className="luxury-input"
                type="number"
                value={settings.maxBranches}
                onChange={handleChange}
                placeholder="e.g. 10"
              />
            </div>
            <div>
              <label htmlFor="defaultLanguage" className="kpi-label settings-field-label">
                Default Language
              </label>
              <select
                id="defaultLanguage"
                className="luxury-input luxury-select"
                value={settings.defaultLanguage}
                onChange={handleChange}
                aria-label="Select default language"
              >
                <option>English</option>
                <option>French</option>
                <option>Arabic</option>
                <option>Japanese</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === "Tax" && (
          <div className="flex flex-col gap-5">
            <div>
              <label htmlFor="taxRate" className="kpi-label settings-field-label">
                Default Tax Rate (%)
              </label>
              <input
                id="taxRate"
                className="luxury-input"
                type="number"
                value={settings.taxRate}
                onChange={handleChange}
                placeholder="e.g. 15"
              />
            </div>
            <div>
              <label htmlFor="taxId" className="kpi-label settings-field-label">
                Tax Identification
              </label>
              <input
                id="taxId"
                className="luxury-input"
                value={settings.taxId}
                onChange={handleChange}
                placeholder="e.g. TAX-123456"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="kpi-label">
                Enable Tax on Commissions
              </label>
              <button
                onClick={() => handleToggle("taxOnCommission")}
                aria-label="Toggle tax on commissions"
                className={`toggle-track ${
                  settings.taxOnCommission
                    ? "toggle-track-on"
                    : "toggle-track-off"
                }`}
              >
                <span
                  className={`toggle-thumb ${
                    settings.taxOnCommission
                      ? "toggle-thumb-on"
                      : "toggle-thumb-off"
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {activeTab === "Currency" && (
          <div className="flex flex-col gap-5">
            <div>
              <label htmlFor="baseCurrency" className="kpi-label settings-field-label">
                Base Currency
              </label>
              <select
                id="baseCurrency"
                className="luxury-input luxury-select"
                value={settings.baseCurrency}
                onChange={handleChange}
                aria-label="Select base currency"
              >
                <option value="INR">INR - Indian Rupee</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <label className="kpi-label">
                Auto Currency Conversion
              </label>
              <button
                onClick={() => handleToggle("autoCurrency")}
                aria-label="Toggle auto currency conversion"
                className={`toggle-track ${
                  settings.autoCurrency
                    ? "toggle-track-on"
                    : "toggle-track-off"
                }`}
              >
                <span
                  className={`toggle-thumb ${
                    settings.autoCurrency
                      ? "toggle-thumb-on"
                      : "toggle-thumb-off"
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {activeTab !== "General" &&
          activeTab !== "Tax" &&
          activeTab !== "Currency" && (
            <div className="settings-placeholder">
              <p className="user-email settings-placeholder-title">
                Configure {activeTab} settings
              </p>
              <p className="user-email settings-placeholder-sub">
                Settings panel for {activeTab} configuration
              </p>
            </div>
          )}
      </div>
    </div>
  );
};

export default SystemSettings;
