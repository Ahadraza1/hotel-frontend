import { Suspense, lazy, useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import {
  BedDouble,
  CalendarRange,
  Download,
  Martini,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useBranchWorkspace } from "@/contexts/BranchWorkspaceContext";
import { LockedFeatureCard, ReportLoader } from "@/components/reports/ReportsShared";

const RoomsAnalytics = lazy(() => import("@/components/reports/RoomsAnalytics"));
const RestaurantAnalytics = lazy(() => import("@/components/reports/RestaurantAnalytics"));
const HousekeepingAnalytics = lazy(() => import("@/components/reports/HousekeepingAnalytics"));
const CRMAnalytics = lazy(() => import("@/components/reports/CRMAnalytics"));

type ReportCategory = "rooms" | "restaurant" | "housekeeping" | "crm";
type DatePreset = "today" | "last7" | "last30" | "custom";

const categoryConfig: Record<
  ReportCategory,
  {
    title: string;
    description: string;
    icon: typeof BedDouble;
    featureKey: string;
  }
> = {
  rooms: {
    title: "Rooms Analytics",
    description: "Occupancy, revenue, ADR, RevPAR, and booking performance.",
    icon: BedDouble,
    featureKey: "reports_rooms",
  },
  restaurant: {
    title: "Restaurant Analytics",
    description: "Daily sales, order mix, top items, and peak dining hours.",
    icon: Martini,
    featureKey: "reports_restaurant",
  },
  housekeeping: {
    title: "Housekeeping Analytics",
    description: "Cleaning completion, workload balance, and team productivity.",
    icon: ShieldCheck,
    featureKey: "reports_housekeeping",
  },
  crm: {
    title: "CRM Analytics",
    description: "Customer retention, booking frequency, and top guest insights.",
    icon: UsersRound,
    featureKey: "reports_crm",
  },
};

const resolveDateRange = (
  preset: DatePreset,
  customRange: { startDate: string; endDate: string },
) => {
  const now = new Date();

  if (preset === "today") {
    const today = format(now, "yyyy-MM-dd");
    return { startDate: today, endDate: today };
  }

  if (preset === "last30") {
    return {
      startDate: format(subDays(now, 29), "yyyy-MM-dd"),
      endDate: format(now, "yyyy-MM-dd"),
    };
  }

  if (preset === "custom") {
    return customRange;
  }

  return {
    startDate: format(subDays(now, 6), "yyyy-MM-dd"),
    endDate: format(now, "yyyy-MM-dd"),
  };
};

const Reports = () => {
  const { branchId: routeBranchId } = useParams();
  const { activeBranch } = useBranchWorkspace();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory>("rooms");
  const [datePreset, setDatePreset] = useState<DatePreset>("last7");
  const [customRange, setCustomRange] = useState({
    startDate: format(subDays(new Date(), 6), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
  });
  const [exportOpen, setExportOpen] = useState(false);

  const resolvedBranchId = activeBranch?._id || routeBranchId || "";
  const range = useMemo(() => resolveDateRange(datePreset, customRange), [customRange, datePreset]);
  const enabledFeatures = useMemo(
    () =>
      new Set(
        user?.role === "SUPER_ADMIN" || user?.isPlatformAdmin
          ? Object.values(categoryConfig).map((item) => item.featureKey)
          : (user?.subscriptionAccess?.activePlan?.features || [])
              .map((feature) => String(feature || "").trim().toLowerCase())
              .filter(Boolean),
      ),
    [user],
  );

  const renderModule = () => {
    const props = {
      branchId: resolvedBranchId,
      startDate: range.startDate,
      endDate: range.endDate,
    };

    if (!enabledFeatures.has(categoryConfig[selectedCategory].featureKey)) {
      return (
        <LockedFeatureCard
          title={`${categoryConfig[selectedCategory].title} Locked`}
          description="This reports module is not included in the current subscription plan for this organization."
        />
      );
    }

    switch (selectedCategory) {
      case "restaurant":
        return <RestaurantAnalytics {...props} />;
      case "housekeeping":
        return <HousekeepingAnalytics {...props} />;
      case "crm":
        return <CRMAnalytics {...props} />;
      default:
        return <RoomsAnalytics {...props} />;
    }
  };

  return (
    <div className="reports-root animate-fade-in">
      <div className="add-branch-header">
        <div className="add-branch-header-icon-wrap">
          <CalendarRange className="add-branch-header-icon" />
        </div>
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">
            Branch analytics for {activeBranch?.name || "the selected branch"} filtered by date range.
          </p>
        </div>
      </div>

      <div className="luxury-card reports-filter-bar">
        <div className="reports-filter-group">
          <span className="reports-filter-label">Date Range</span>
          <div className="reports-chip-row">
            {[
              { key: "today", label: "Today" },
              { key: "last7", label: "Last 7 Days" },
              { key: "last30", label: "Last 30 Days" },
              { key: "custom", label: "Custom Range" },
            ].map((option) => (
              <button
                key={option.key}
                type="button"
                className={`reports-chip ${datePreset === option.key ? "active" : ""}`}
                onClick={() => setDatePreset(option.key as DatePreset)}
              >
                {option.label}
              </button>
            ))}
          </div>
          {datePreset === "custom" ? (
            <div className="reports-custom-range">
              <input
                type="date"
                className="luxury-input"
                value={customRange.startDate}
                onChange={(event) =>
                  setCustomRange((current) => ({
                    ...current,
                    startDate: event.target.value,
                  }))
                }
              />
              <input
                type="date"
                className="luxury-input"
                value={customRange.endDate}
                onChange={(event) =>
                  setCustomRange((current) => ({
                    ...current,
                    endDate: event.target.value,
                  }))
                }
              />
            </div>
          ) : null}
        </div>

        <div className="reports-export-wrap">
          <button type="button" className="luxury-btn luxury-btn-secondary" onClick={() => setExportOpen((open) => !open)}>
            <Download size={16} />
            Export
          </button>
          {exportOpen ? (
            <div className="reports-export-menu">
              <button type="button" className="reports-export-item">
                PDF
              </button>
              <button type="button" className="reports-export-item">
                Excel
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="reports-category-grid">
        {(Object.entries(categoryConfig) as [ReportCategory, (typeof categoryConfig)[ReportCategory]][]).map(
          ([key, category]) => {
            const Icon = category.icon;
            const isLocked = !enabledFeatures.has(category.featureKey);
            return (
              <button
                key={key}
                type="button"
                className={`luxury-card reports-category-card ${selectedCategory === key ? "active" : ""}`}
                onClick={() => setSelectedCategory(key)}
              >
                <div className="reports-category-icon">
                  <Icon size={20} />
                </div>
                <div className="reports-category-copy">
                  <div className="reports-category-title-row">
                    <h3>{category.title}</h3>
                    {isLocked ? <span className="luxury-badge badge-warning">Locked</span> : null}
                  </div>
                  <p>{category.description}</p>
                </div>
              </button>
            );
          },
        )}
      </div>

      {!resolvedBranchId ? (
        <ReportLoader label="Loading branch context…" />
      ) : (
        <Suspense fallback={<ReportLoader label="Loading report module…" />}>{renderModule()}</Suspense>
      )}
    </div>
  );
};

export default Reports;
