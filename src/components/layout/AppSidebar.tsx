import { useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Hotel,
  Users,
  Shield,
  DollarSign,
  BarChart3,
  Lock,
  Plug,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  Crown,
  AlertTriangle,
  Home,
} from "lucide-react";
import { useBranchWorkspace } from "@/contexts/BranchWorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { LucideIcon } from "lucide-react";

interface MenuItem {
  title: string;
  path?: string;
  route?: string;
  icon: LucideIcon;
  roles?: string[];
  permission?: string | null;
  permissionKey?: string | null;
}

interface MenuGroup {
  title: string;
  items: MenuItem[];
}

const globalMenuItems = [
  {
    title: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
    roles: ["SUPER_ADMIN", "CORPORATE_ADMIN"], // ✅ Only Super Admin and Corporate Admin
    permission: null,
  },

  // {
  //   title: "Corporate Dashboard",
  //   path: "/corporate-dashboard",
  //   icon: BarChart3,
  //   roles: ["SUPER_ADMIN", "CORPORATE_ADMIN"],
  //   permission: "VIEW_ANALYTICS",
  // },

  {
    title: "Organizations",
    path: "/organizations",
    icon: Building2,
    roles: ["SUPER_ADMIN"], // ❗ Corporate Admin removed
    permission: "ACCESS_ORGANIZATION",
  },

  {
    title: "Subscriptions",
    path: "/subscriptions",
    icon: Crown,
    roles: ["SUPER_ADMIN", "CORPORATE_ADMIN"],
    permission: null,
  },

  {
    title: "Branch Management",
    path: "/branches",
    icon: Hotel,
    roles: ["SUPER_ADMIN", "CORPORATE_ADMIN"],
    permission: "ACCESS_BRANCH",
  },

  {
    title: "Users & Roles",
    path: "/users",
    icon: Users,
    roles: ["SUPER_ADMIN", "CORPORATE_ADMIN"],
    permission: "ACCESS_USERS",
  },

  {
    title: "Role Permissions",
    path: "/permissions",
    icon: Shield,
    roles: ["SUPER_ADMIN", "CORPORATE_ADMIN"],
    permission: "ACCESS_ROLE_PERMISSIONS_PAGE",
  },

  {
    title: "Financial Reports",
    path: "/financial-reports",
    icon: DollarSign,
    roles: ["SUPER_ADMIN", "ACCOUNTANT"],
    permission: "ACCESS_REPORTS",
  },

  {
    title: "Analytics",
    path: "/analytics",
    icon: BarChart3,
    roles: ["SUPER_ADMIN", "CORPORATE_ADMIN"],
    permission: "VIEW_ANALYTICS",
  },

  {
    title: "System Settings",
    path: "/settings",
    icon: Settings,
    roles: ["SUPER_ADMIN"], // ❗ Corporate Admin removed
    permission: "ACCESS_SETTINGS",
  },
];

// ================= WORKSPACE MENU =================
const workspaceMenuGroups: MenuGroup[] = [
  {
    title: "Main",
    items: [{ title: "Branch Overview", route: "", icon: Home, permissionKey: null }],
  },
  {
    title: "Rooms Management",
    items: [
      {
        title: "Rooms",
        route: "rooms",
        icon: Hotel,
        permissionKey: "ACCESS_ROOMS",
      },
      {
        title: "Room Price",
        route: "room-price",
        icon: DollarSign,
        permissionKey: "ACCESS_ROOMS",
      },
      {
        title: "Bookings",
        route: "bookings",
        icon: LayoutDashboard,
        permissionKey: "ACCESS_BOOKINGS",
      },
      {
        title: "Guests (CRM)",
        route: "crm",
        icon: Building2,
        permissionKey: "ACCESS_CRM",
      },
    ],
  },
  {
    title: "Restaurant",
    items: [
      { title: "Menu", route: "pos", icon: Plug, permissionKey: "ACCESS_POS" },
      {
        title: "Order Sessions",
        route: "order-sessions",
        icon: LayoutDashboard,
        permissionKey: "ACCESS_POS",
      },
      {
        title: "Kitchen Display",
        route: "kitchen",
        icon: AlertTriangle,
        permissionKey: "ACCESS_POS",
      },
    ],
  },
  {
    title: "Housekeeping",
    items: [
      {
        title: "Housekeeping",
        route: "housekeeping",
        icon: Shield,
        permissionKey: "ACCESS_HOUSEKEEPING",
      },
    ],
  },
  {
    title: "HR",
    items: [{ title: "HR", route: "hr", icon: Users, permissionKey: "ACCESS_HR" }],
  },
  {
    title: "Inventory",
    items: [
      {
        title: "Inventory",
        route: "inventory",
        icon: Plug,
        permissionKey: "ACCESS_INVENTORY",
      },
    ],
  },
  {
    title: "Analytics",
    items: [
      {
        title: "Reports",
        route: "reports",
        icon: BarChart3,
        permissionKey: null,
      },
    ],
  },
  {
    title: "Invoices",
    items: [
      {
        title: "Finance",
        route: "finance",
        icon: DollarSign,
        permissionKey: "ACCESS_FINANCE",
      },
    ],
  },
  {
    title: "Settings",
    items: [
      {
        title: "Branch Settings",
        route: "settings",
        icon: Settings,
        permissionKey: "ACCESS_BRANCH_SETTINGS",
      },
    ],
  },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export const AppSidebar = ({
  collapsed,
  onToggle,
  isOpen,
  onClose,
}: AppSidebarProps) => {
  const location = useLocation();

  const { isWorkspaceMode, activeBranch, exitWorkspace } = useBranchWorkspace();

  const { hasRole, hasPermission, user } = useAuth();

  const menuItems: MenuItem[] = isWorkspaceMode ? [] : (globalMenuItems as MenuItem[]);

  const canViewGlobalItem = (item: MenuItem) => {
    if (item.path === "/settings" && user?.role !== "SUPER_ADMIN") {
      return false;
    }

    if (item.roles && !hasRole(item.roles)) return false;
    if (item.permission && !hasPermission(item.permission)) return false;
    return true;
  };

  return (
    <aside
      className={`app-sidebar ${collapsed ? "sidebar-collapsed" : "sidebar-expanded"} ${isOpen ? "sidebar-open" : ""}`}
    >
      <div className="sidebar-brand">
        <Crown className="sidebar-logo" />
        <span className="sidebar-brand-name">Hotel Desk</span>

        <button
          className="desktop-toggle-btn"
          onClick={onToggle}
          aria-label={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        <button
          className="mobile-close-btn"
          onClick={onClose}
          aria-label="Close Sidebar"
        >
          <X size={20} />
        </button>
      </div>

      {isWorkspaceMode && (
        <div className="workspace-indicator">
          <p className="workspace-label">Branch Workspace</p>
          <p className="workspace-name">{activeBranch?.name}</p>

          {hasRole(["SUPER_ADMIN", "CORPORATE_ADMIN"]) && (
            <button onClick={exitWorkspace} className="workspace-exit">
              ← Exit Workspace
            </button>
          )}
        </div>
      )}

      <div className="sidebar-section-label">
        {isWorkspaceMode ? "Branch Modules" : "Navigation"}
      </div>

      <nav className="sidebar-nav">
        {isWorkspaceMode
          ? workspaceMenuGroups.map((group: MenuGroup) => {
              const visibleItems = group.items.filter(
                (item) => !item.permissionKey || hasPermission(item.permissionKey),
              );

              if (visibleItems.length === 0) return null;

              return (
                <div key={group.title} className="sidebar-group">
                  <div className="sidebar-group-title">{group.title}</div>

                  {visibleItems.map((item: MenuItem, index: number) => {
                    const itemPath = item.route
                      ? `/workspace/${activeBranch?._id}/${item.route}`
                      : `/workspace/${activeBranch?._id}`;

                    const isActive = location.pathname === itemPath;

                    return (
                      <Link
                        key={`${group.title}-${item.title}-${index}`}
                        to={itemPath}
                        className={`sidebar-item ${isActive ? "active" : ""}`}
                        onClick={() => {
                          if (isOpen) {
                            onClose();
                          }
                        }}
                      >
                        <item.icon className="sidebar-item-icon" />
                        <span className="sidebar-item-text">{item.title}</span>
                      </Link>
                    );
                  })}
                </div>
              );
            })
          : menuItems.map((item: MenuItem, index: number) => {
              if (!canViewGlobalItem(item)) return null;

              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={`${item.title}-${index}`}
                  to={item.path!}
                  className={`sidebar-item ${isActive ? "active" : ""}`}
                  onClick={() => {
                    if (isOpen) {
                      onClose();
                    }
                  }}
                >
                  <item.icon className="sidebar-item-icon" />
                  <span className="sidebar-item-text">{item.title}</span>
                </Link>
              );
            })}
      </nav>

      <div className="sidebar-footer">
        <p className="footer-copyright">© 2026 Grandeur Hotels</p>
      </div>
    </aside>
  );
};
