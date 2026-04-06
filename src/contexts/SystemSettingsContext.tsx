import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import api from "@/api/axios";
import { useAuth } from "@/contexts/AuthContext";
import {
  DEFAULT_CURRENCY,
  formatCompactCurrency as formatCompactCurrencyValue,
  formatCurrency as formatCurrencyValue,
  getCurrencySymbol,
  normalizeCurrency,
} from "@/lib/currency";

interface SystemSettingsData {
  baseCurrency?: string;
}

interface SystemSettingsContextValue {
  systemSettings: SystemSettingsData;
  baseCurrency: string;
  currencySymbol: string;
  loading: boolean;
  formatCurrency: (amount: number | string | null | undefined) => string;
  formatCompactCurrency: (amount: number | string | null | undefined) => string;
}

const SystemSettingsContext = createContext<SystemSettingsContextValue | null>(
  null,
);

export const SystemSettingsProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const { user, token, loading: isAuthLoading } = useAuth();
  const [systemSettings, setSystemSettings] = useState<SystemSettingsData>({
    baseCurrency: DEFAULT_CURRENCY,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchSystemSettings = async () => {
      if (isAuthLoading) {
        return;
      }

      if (!token || !user) {
        if (isMounted) {
          setSystemSettings({ baseCurrency: DEFAULT_CURRENCY });
          setLoading(false);
        }
        return;
      }

      if (isMounted) {
        setLoading(true);
      }

      try {
        const response = await api.get<{ data: SystemSettingsData }>(
          "/system-settings",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!isMounted) return;

        setSystemSettings(response.data.data || { baseCurrency: DEFAULT_CURRENCY });
      } catch (error) {
        console.error("Failed to load system settings", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchSystemSettings();

    return () => {
      isMounted = false;
    };
  }, [isAuthLoading, token, user]);

  const baseCurrency = normalizeCurrency(systemSettings.baseCurrency);

  const value = useMemo<SystemSettingsContextValue>(
    () => ({
      systemSettings,
      baseCurrency,
      currencySymbol: getCurrencySymbol(baseCurrency),
      loading,
      formatCurrency: (amount) => formatCurrencyValue(amount, baseCurrency),
      formatCompactCurrency: (amount) =>
        formatCompactCurrencyValue(amount, baseCurrency),
    }),
    [baseCurrency, loading, systemSettings],
  );

  return (
    <SystemSettingsContext.Provider value={value}>
      {children}
    </SystemSettingsContext.Provider>
  );
};

export const useSystemSettings = () => {
  const context = useContext(SystemSettingsContext);

  if (!context) {
    throw new Error(
      "useSystemSettings must be used within a SystemSettingsProvider",
    );
  }

  return context;
};
