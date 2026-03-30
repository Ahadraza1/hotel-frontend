import { useState, useRef, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Sun,
  Moon,
  LogOut,
  Building2,
  User,
  Bell,
  Settings,
  ChevronDown,
  Hotel,
  MapPin,
} from "lucide-react";
import api from "@/api/axios";
import { useTheme } from "@/contexts/ThemeContext";
import { useBranchWorkspace } from "@/contexts/BranchWorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { useNavigate, useLocation } from "react-router-dom";
import { useConfirm } from "@/components/confirm/ConfirmProvider";

interface AppHeaderProps {
  onLogout: () => void;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  ariaExpanded?: boolean;
}

interface Branch {
  _id: string;
  name: string;
  country: string;
  organization?: string;
  organizationName?: string;
  organizationId?: {
    _id: string;
    name: string;
  };
}

interface HeaderUser {
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

const getPageTitle = (
  pathname: string,
): { title: string; subtitle: string } => {
  const map: Record<string, { title: string; subtitle: string }> = {
    "/dashboard": { title: "Dashboard", subtitle: "Welcome back, Super Admin" },
    "/organizations": {
      title: "Organizations",
      subtitle: "Manage all registered organizations",
    },
    "/branches": {
      title: "Branch Management",
      subtitle: "Oversee all branch operations",
    },
    "/users-roles": {
      title: "Users & Roles",
      subtitle: "Manage access and permissions",
    },
    "/financial-reports": {
      title: "Financial Reports",
      subtitle: "Financial overview and reports",
    },
    "/security": {
      title: "Security & Audit",
      subtitle: "Audit logs and security settings",
    },
    "/integrations": {
      title: "Integrations",
      subtitle: "Third-party connections",
    },
    "/settings": {
      title: "System Settings",
      subtitle: "Configure platform preferences",
    },
    "/profile": {
      title: "My Profile",
      subtitle: "View and manage your account",
    },
    "/update-password": {
      title: "Update Password",
      subtitle: "Change your login credentials",
    },
  };

  if (pathname.includes("/notifications")) {
    return {
      title: "Notifications",
      subtitle: "Relevant updates for your active access scope",
    };
  }

  if (pathname.startsWith("/workspace/"))
    return { title: "Branch Workspace", subtitle: "Active branch session" };

  if (pathname.startsWith("/organizations/")) {
    if (pathname.includes("/edit"))
      return {
        title: "Edit Organization",
        subtitle: "Update organization details",
      };
    return {
      title: "Organization Details",
      subtitle: "View organization profile",
    };
  }

  return (
    map[pathname] ?? {
      title: "Super Admin",
      subtitle: "Hotel Management System",
    }
  );
};

export const AppHeader = ({
  onLogout,
  onToggleSidebar,
  isSidebarOpen,
  ariaExpanded,
}: AppHeaderProps) => {
  const { theme, toggleTheme } = useTheme();
  const { activeBranch, branches, isLoadingBranches } = useBranchWorkspace();
  const { user: authUser, logout } = useAuth();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const location = useLocation();

  const [profileOpen, setProfileOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

  const [user, setUser] = useState<HeaderUser | null>(null);

  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const notifRef = useRef<HTMLDivElement | null>(null);
  const { data: notificationData, isLoading: notificationsLoading } =
    useNotifications(5);
  const canAccessSystemSettings = authUser?.role === "SUPER_ADMIN";

  const { title, subtitle } = getPageTitle(location.pathname);
  const notifications = notificationData?.notifications || [];
  const isWorkspaceContext = location.pathname.startsWith("/workspace/");
  const notificationBranchId = activeBranch?._id || authUser?.branchId || null;
  const notificationsPath =
    (isWorkspaceContext || authUser?.branchId) && notificationBranchId
      ? `/workspace/${notificationBranchId}/notifications`
      : "/notifications";
  const avatarSrc = user?.avatar?.trim() || "";
  const shouldShowAvatarFallback = !avatarSrc || avatarLoadFailed;

  const getInitial = (name?: string) =>
    name ? name.trim().charAt(0).toUpperCase() || "?" : "?";

  const renderAvatarFallback = (size: number, borderRadius: string) => (
    <div
      aria-hidden="true"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        backgroundColor: "hsl(var(--muted))",
        color: "hsl(var(--foreground))",
        border: "1.5px solid hsla(var(--grandeur-gold), 0.25)",
        fontWeight: 700,
        textTransform: "uppercase",
      }}
    >
      {getInitial(user?.name)}
    </div>
  );

  useEffect(() => {
    const fetchHeaderData = async () => {
      try {
        // First get logged-in user
        const userRes = await api.get<{ data: HeaderUser }>("/users/me");
        const userData = userRes.data.data;

        setUser(userData);
      } catch (error) {
        console.error("Header load failed", error);
      }
    };

    fetchHeaderData();
  }, []);

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [avatarSrc]);

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

  const groupedBranches = branches.reduce<Record<string, Branch[]>>(
    (acc, b) => {
      const branch = b as Branch;

      const orgName =
        (branch.organizationName && branch.organizationName.trim()) ||
        (branch.organizationId?.name && branch.organizationId.name.trim()) ||
        (branch.organization && branch.organization.trim()) ||
        "General";

      if (!acc[orgName]) acc[orgName] = [];

      acc[orgName].push(branch);

      return acc;
    },
    {},
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(e.target as Node)
      ) {
        setProfileOpen(false);
      }

      if (
        workspaceRef.current &&
        !workspaceRef.current.contains(e.target as Node)
      ) {
        setWorkspaceOpen(false);
      }

      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="app-header">
      <div className="header-left">
        <button
          type="button"
          onClick={onToggleSidebar}
          className={`grandeur-toggle-btn ${isSidebarOpen ? "is-active" : ""}`}
          aria-label="Toggle Sidebar"
          aria-expanded={isSidebarOpen}
        >
          <div className="hamburger-box">
            <div className="hamburger-inner" />
          </div>
        </button>

        <div className="header-page-title">
          <h1 className="header-title">{title}</h1>
          <p className="header-subtitle">{subtitle}</p>
        </div>
      </div>

      <div className="header-right">
        <div className="workspace-dropdown-wrapper" ref={workspaceRef}>
          <button
            type="button"
            className={`workspace-switch-topbar ${workspaceOpen ? "ws-btn-open" : ""}`}
            onClick={() => setWorkspaceOpen((prev) => !prev)}
            aria-haspopup="listbox"
            aria-expanded={workspaceOpen}
          >
            <Building2 size={15} className="workspace-icon" />
            <span className="workspace-label-text">
              {activeBranch ? activeBranch.name : "Select Branch"}
            </span>
            <ChevronDown
              size={13}
              className={`workspace-chevron ${workspaceOpen ? "ws-chevron-open" : ""}`}
            />
          </button>

          {workspaceOpen && (
            <div className="workspace-dropdown-menu">
              {/* Dropdown header */}
              <div className="ws-dropdown-header">
                <span className="ws-dropdown-title">Switch Workspace</span>
                <span className="ws-dropdown-count">
                  {branches.length} branches
                </span>
              </div>

              {/* Branch list */}
              <div className="ws-dropdown-body" role="listbox" aria-label="Available Workspaces">
                {isLoadingBranches ? (
                  <div className="ws-empty-state">
                    <Building2 className="ws-empty-icon" />
                    <p>Loading branches...</p>
                  </div>
                ) : branches.length === 0 ? (
                  <div className="ws-empty-state">
                    <Building2 className="ws-empty-icon" />
                    <p>No branches available</p>
                  </div>
                ) : (
                  Object.entries(groupedBranches).map(([org, orgBranches]) => (
                    <div
                      key={org}
                      className="workspace-group"
                      role="group"
                      aria-label={org}
                    >
                      <p className="workspace-group-title" aria-hidden="true">
                        {org}
                      </p>

                      {orgBranches.map((branch: Branch) => {
                        const isActive = activeBranch?._id === branch._id;
                        return (
                          <button
                            key={branch._id}
                            className={`workspace-item ${isActive ? "active" : ""}`}
                            onClick={() => {
                              navigate(`/workspace/${branch._id}`);
                              setWorkspaceOpen(false);
                            }}
                            role="option"
                            aria-selected={isActive}
                          >
                            <div className="workspace-item-row">
                              <div className="ws-item-left">
                                <div className="ws-item-icon-wrap">
                                  <Hotel className="ws-item-icon" />
                                </div>
                                <div className="ws-item-info">
                                  <span className="workspace-item-name">
                                    {branch.name}
                                  </span>
                                  <span className="ws-item-location">
                                    <MapPin className="ws-location-icon" />
                                    {branch.country}
                                  </span>
                                </div>
                              </div>
                              {isActive && <span className="ws-active-dot" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="header-divider" />

        <button
          type="button"
          onClick={toggleTheme}
          className="header-icon-btn"
          aria-label={
            theme === "light" ? "Switch to dark mode" : "Switch to light mode"
          }
        >
          {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
        </button>

        <div className="dropdown-container" ref={notifRef}>
          <button
            type="button"
            className="header-icon-btn header-notif-btn"
            aria-label="Notifications"
            aria-haspopup="menu"
            aria-expanded={notifOpen}
            onClick={() => setNotifOpen((prev) => !prev)}
          >
            <Bell size={17} />
            {notifications.length > 0 && <span className="notif-dot" />}
          </button>

          {notifOpen && (
            <div className="dropdown-menu notifications-dropdown">
              <div className="notifications-dropdown-header">
                <div>
                  <p className="notifications-dropdown-title">Notifications</p>
                  <p className="notifications-dropdown-subtitle">
                    Filtered by role, branch, and module access
                  </p>
                </div>
                <button
                  type="button"
                  className="notifications-view-all"
                  onClick={() => {
                    navigate(notificationsPath);
                    setNotifOpen(false);
                  }}
                >
                  View all
                </button>
              </div>

              <div className="notifications-dropdown-body">
                {notificationsLoading ? (
                  <p className="notifications-empty">Loading notifications...</p>
                ) : notifications.length === 0 ? (
                  <p className="notifications-empty">
                    No notifications in your allowed scope.
                  </p>
                ) : (
                  notifications.map((notification) => (
                    <button
                      key={notification._id}
                      type="button"
                      className="notification-item"
                      onClick={() => {
                        navigate(notificationsPath);
                        setNotifOpen(false);
                      }}
                    >
                      <div className="notification-item-top">
                        <span className="notification-item-title">
                          {notification.title}
                        </span>
                        <span className="notification-item-module">
                          {notification.module}
                        </span>
                      </div>
                      <p className="notification-item-message">
                        {notification.message}
                      </p>
                      <span className="notification-item-time">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {canAccessSystemSettings && (
          <button
            type="button"
            className="header-icon-btn"
            onClick={() => navigate("/settings")}
            aria-label="Settings"
          >
            <Settings size={17} />
          </button>
        )}

        <div className="header-divider" />

        <div className="dropdown-container" ref={profileRef}>
          <button
            type="button"
            onClick={() => setProfileOpen((prev) => !prev)}
            className="user-avatar-btn"
            aria-haspopup="menu"
            aria-expanded={profileOpen}
          >
            {shouldShowAvatarFallback ? (
              renderAvatarFallback(32, "50%")
            ) : (
              <img
                src={avatarSrc}
                alt="User"
                className="user-avatar-img"
                onError={() => {
                  setAvatarLoadFailed(true);
                }}
              />
            )}
            <div className="user-avatar-info">
              <span className="user-avatar-name">{user?.name || "User"}</span>
              <span className="user-avatar-role">
                {user?.role || "Administrator"}
              </span>
            </div>
            <span className="user-avatar-chevron">›</span>
          </button>

          {profileOpen && (
            <div className="dropdown-menu profile-dropdown">
              <div className="profile-header-flex">
                <div className="profile-avatar-wrap">
                  {shouldShowAvatarFallback ? (
                    renderAvatarFallback(42, "50%")
                  ) : (
                    <img
                      src={avatarSrc}
                      alt="Profile"
                      onError={() => {
                        setAvatarLoadFailed(true);
                      }}
                    />
                  )}
                  <span className="profile-status-dot" />
                </div>
                <div className="profile-user-info">
                  <p className="profile-name">{user?.name}</p>
                  <p className="profile-email">{user?.email}</p>
                </div>
              </div>

              <div className="dropdown-content">
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    navigate("/profile");
                    setProfileOpen(false);
                  }}
                >
                  <User size={16} />
                  <span>My Profile</span>
                </button>

                {canAccessSystemSettings && (
                  <button
                    type="button"
                    className="dropdown-item"
                    onClick={() => {
                      navigate("/settings");
                      setProfileOpen(false);
                    }}
                  >
                    <Settings size={16} />
                    <span>Settings</span>
                  </button>
                )}

                <button
                  type="button"
                  className="dropdown-item logout"
                  onClick={() => {
                    setProfileOpen(false);
                    void handleDeleteAccount();
                  }}
                >
                  <span>Delete Account</span>
                </button>

                <div className="dropdown-divider" />

                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    onLogout();
                  }}
                  className="dropdown-item logout"
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
