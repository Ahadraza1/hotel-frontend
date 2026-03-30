import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  permission?: string; // âœ… NEW
}

const ProtectedRoute = ({
  children,
  allowedRoles,
  permission,
}: ProtectedRouteProps) => {
  const { user, hasRole, hasPermission, loading, subscriptionAccess } =
    useAuth();
  const location = useLocation();

  /*
  Wait for auth
  */
  if (loading) {
    return null;
  }

  /*
  Not logged in
  */
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

  /*
  BRANCH USERS â†’ Always workspace
  */
  const branchRoles = [
    "BRANCH_MANAGER",
    "RECEPTIONIST",
    "CHEF",
    "ACCOUNTANT",
    "HR_MANAGER",
    "HOUSEKEEPING",
    "RESTAURANT_MANAGER",
  ];

  if (
    branchRoles.includes(role) &&
    user.branchId &&
    !location.pathname.startsWith("/workspace")
  ) {
    return <Navigate to={`/workspace/${user.branchId}/overview`} replace />;
  }

  /*
  ROLE BASED ACCESS
  */
  if (allowedRoles && allowedRoles.length > 0) {
    const isAllowed = hasRole(allowedRoles);

    if (!isAllowed) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  /*
  PERMISSION BASED ACCESS
  */
  if (permission) {
    const isAllowed = hasPermission(permission);

    if (!isAllowed) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
