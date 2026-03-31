import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  permission?: string;
}

const ProtectedRoute = ({
  children,
  allowedRoles,
  permission,
}: ProtectedRouteProps) => {
  const { user, hasRole, hasPermission, loading, subscriptionAccess } =
    useAuth();
  const location = useLocation();

  if (loading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (
    subscriptionAccess &&
    !subscriptionAccess.hasDashboardAccess &&
    location.pathname !== "/subscription-access" &&
    location.pathname !== "/subscriptions"
  ) {
    return <Navigate to="/subscription-access" replace />;
  }

  const role = user.role?.toUpperCase();
  const isDashboardRole =
    role === "SUPER_ADMIN" || role === "CORPORATE_ADMIN";

  if (user.branchId && !isDashboardRole && !location.pathname.startsWith("/workspace")) {
    return <Navigate to={`/workspace/${user.branchId}/overview`} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const isAllowed = hasRole(allowedRoles);

    if (!isAllowed) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  if (permission) {
    const isAllowed = hasPermission(permission);

    if (!isAllowed) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
