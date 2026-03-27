import { ReactNode, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { useBranchWorkspace } from "@/contexts/BranchWorkspaceContext";

interface AppLayoutProps {
  children: ReactNode;
  onLogout: () => void;
}

const DESKTOP_BREAKPOINT = 1200;

export const AppLayout = ({ children, onLogout }: AppLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setNavigator } = useBranchWorkspace();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window === "undefined"
      ? true
      : window.innerWidth >= DESKTOP_BREAKPOINT,
  );

  useEffect(() => {
    setNavigator(navigate);
  }, [navigate, setNavigator]);

  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= DESKTOP_BREAKPOINT;
      setIsDesktop(desktop);

      if (desktop) {
        setIsMobileOpen(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMobileOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileOpen]);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  const toggleSidebar = () => {
    if (isDesktop) {
      setIsCollapsed((prev) => !prev);
      return;
    }

    setIsMobileOpen((prev) => !prev);
  };

  const isSidebarVisible = isDesktop ? !isCollapsed : isMobileOpen;

  return (
    <div
      className={`layout ${
        isCollapsed ? "sidebar-collapsed" : "sidebar-expanded"
      } ${isMobileOpen ? "sidebar-open" : ""}`}
    >
      {isMobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <AppSidebar
        collapsed={isCollapsed}
        onToggle={toggleSidebar}
        isOpen={isMobileOpen}
        onClose={() => setIsMobileOpen(false)}
      />

      <div className="main-wrapper">
        <AppHeader
          onLogout={onLogout}
          onToggleSidebar={toggleSidebar}
          isSidebarOpen={isSidebarVisible}
          ariaExpanded={isSidebarVisible}
        />

        <main className="main">{children}</main>
      </div>
    </div>
  );
};
