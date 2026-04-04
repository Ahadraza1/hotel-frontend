import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/api/axios";
import { Settings, RefreshCcw, Save } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import { useToast } from "@/components/confirm/ConfirmProvider";
import PermissionNotice from "@/components/auth/PermissionNotice";

const tabs = [
  "general",
  "financial",
  "bookingPolicy",
  "roomPolicy",
  "hrPolicy",
  "inventoryPolicy",
  "securityPolicy",
];

const formatTabName = (tab: string) => {
  return tab
    .replace(/Policy$/, " Policy")
    .replace(/^./, (str) => str.toUpperCase());
};

const formatKey = (key: string) => {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase());
};

const BranchSettings = () => {
  const navigate = useNavigate();
  const { branchId } = useParams();
  const toast = useToast();

  const { user } = useAuth();
  const { canAccess, canView, canUpdate } =
    useModulePermissions("BRANCH_SETTINGS");
  if (user && !canAccess) {
    navigate("/unauthorized");
  }

  const shouldHideContent = !!user && canAccess && !canView;

  const [activeTab, setActiveTab] = useState("general");
  const [settings, setSettings] = useState<Record<
    string,
    Record<string, unknown>
  > | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSettings = async () => {
    try {
      const res = await api.get<{
        data: Record<string, Record<string, unknown>>;
      }>(`/branch-settings/${branchId}`);
      setSettings(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateSection = async () => {
    setIsLoading(true);
    try {
      await api.patch(
        `/branch-settings/${branchId}/${activeTab}`,
        settings![activeTab],
      );
      toast.success("Settings updated successfully.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update settings.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetSettings = async () => {
    try {
      await api.delete(`/branch-settings/${branchId}/reset`);
      fetchSettings();
      toast.success("Settings reset successfully.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to reset settings.");
    }
  };

  if (shouldHideContent) {
    return (
      <PermissionNotice message="Branch settings are hidden because VIEW_BRANCH_SETTINGS is disabled for your role." />
    );
  }

  if (!settings) {
    return (
      <div className="animate-fade-in">
        <div className="page-title">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in bs-root">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between mb-6 bs-header">
        <div className="flex items-center gap-3 bs-header-main">
          <div className="add-branch-header-icon-wrap md:flex hidden items-center justify-center">
            <Settings className="add-branch-header-icon" />
          </div>
          <div>
            <h1 className="page-title">Branch Settings</h1>
            <p className="page-subtitle">
              Manage operational, financial, and security policies for this
              branch. Changes apply immediately.
            </p>
          </div>
        </div>

        <button
          onClick={resetSettings}
          className="luxury-btn luxury-btn-outline whitespace-nowrap bs-reset-btn"
          title="Reset to global defaults"
        >
          <RefreshCcw size={16} />
          <span className="md:block hidden">Reset to Default</span>
        </button>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-2 settings-tabs-bar flex-wrap overflow-x-auto bs-tabs-bar">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`luxury-btn settings-tab-btn bs-tab-btn ${
              activeTab === tab
                ? "settings-tab-active"
                : "settings-tab-inactive"
            }`}
          >
            {formatTabName(tab)}
          </button>
        ))}
      </div>

      {/* ── Settings Form Card ── */}
      <div className="luxury-card settings-card bs-card">
        <div className="mb-6">
          <h2 className="text-xl font-bold font-display text-foreground m-0">
            {formatTabName(activeTab)} Settings
          </h2>
          <p className="page-subtitle mt-1">
            Update configurations specific to{" "}
            {formatTabName(activeTab).toLowerCase()}.
          </p>
        </div>

        <div className="flex flex-col gap-6">
          {Object.keys(settings[activeTab] || {}).map((key) => {
            // Internal mongoose properties
            if (
              key === "_id" ||
              key === "createdAt" ||
              key === "updatedAt" ||
              key === "branchId" ||
              key === "__v"
            )
              return null;

            const value = settings[activeTab][key];
            const isBoolean = typeof value === "boolean";

            if (isBoolean) {
              return (
                <div key={key} className="flex items-center gap-3 bs-boolean-row">
                  <label className="kpi-label settings-field-label p-0 min-w-[15rem] mb-0 bs-boolean-label">
                    {formatKey(key)}
                  </label>
                  <button
                    onClick={() =>
                      setSettings({
                        ...settings,
                        [activeTab]: {
                          ...settings[activeTab],
                          [key]: !value,
                        },
                      })
                    }
                    aria-label={`Toggle ${key}`}
                    className={`toggle-track ${
                      value ? "toggle-track-on" : "toggle-track-off"
                    }`}
                  >
                    <span
                      className={`toggle-thumb ${
                        value ? "toggle-thumb-on" : "toggle-thumb-off"
                      }`}
                    />
                  </button>
                </div>
              );
            }

            return (
              <div key={key}>
                <label
                  htmlFor={`setting-${activeTab}-${key}`}
                  className="kpi-label settings-field-label block mb-2"
                >
                  {formatKey(key)}
                </label>
                <input
                  id={`setting-${activeTab}-${key}`}
                  type={typeof value === "number" ? "number" : "text"}
                  value={(value as string | number) || ""}
                  className="luxury-input w-full max-w-full"
                  placeholder={formatKey(key)}
                  onChange={(e) => {
                    const val =
                      typeof value === "number"
                        ? Number(e.target.value)
                        : e.target.value;
                    setSettings({
                      ...settings,
                      [activeTab]: {
                        ...settings[activeTab],
                        [key]: val,
                      },
                    });
                  }}
                />
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between mt-8 pt-6 border-t border-border/60 bs-footer">
          <span className="text-xs text-muted-foreground mr-auto bs-footer-text">
            {settings.updatedAt
              ? `Last Updated: ${new Date(settings.updatedAt as unknown as string).toLocaleString()}`
              : ""}
          </span>
          {canUpdate && (
            <button
              onClick={updateSection}
              disabled={isLoading}
              className="luxury-btn luxury-btn-primary bs-save-btn"
            >
              {isLoading ? (
                <Settings className="icon-md animate-spin" />
              ) : (
                <Save className="icon-md" aria-hidden="true" />
              )}
              {isLoading ? "Saving..." : "Save Changes"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BranchSettings;
