import { createContext, useContext, useEffect, useState } from "react";
import api from "@/api/axios";
import { disconnectSocket } from "@/socket";

interface User {
  id?: string;
  _id?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role: string;
  permissions: string[];
  organizationId?: string | null;
  branchId?: string | null;
  isPlatformAdmin?: boolean;
  featureFlags?: string[];
  organization?: {
    id: string;
    organizationId: string;
    name: string;
    featureFlags: string[];
  } | null;
  subscriptionAccess?: SubscriptionAccess | null;
}

interface SubscriptionAccess {
  status: "active" | "expired" | "trial" | "cancelled";
  subscriptionStatus: "active" | "expired" | "trial" | "cancelled";
  hasDashboardAccess: boolean;
  restrictionReason: string | null;
  activePlan?: {
    name: string;
    isFreeTrialPlan?: boolean;
    features?: string[];
  } | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: string | null;
  permissions: string[];
  loading: boolean;
  subscriptionAccess: SubscriptionAccess | null;
  login: (userData: User, token: string) => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  hasRole: (allowedRoles: string[]) => boolean;
  getUserDisplayName: () => string;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const normalizePermissions = (perms?: string[]) =>
    [...new Set(perms?.map((p) => p.trim().toUpperCase()) || [])];

  const persistBranchContext = (branchId?: string | null) => {
    if (branchId) {
      localStorage.setItem("activeBranchId", branchId);
      localStorage.setItem("userBranchId", branchId);
      return;
    }

    localStorage.removeItem("activeBranchId");
    localStorage.removeItem("userBranchId");
  };

  useEffect(() => {
    const bootstrapAuth = async () => {
      const token = localStorage.getItem("token");
      const storedUser = localStorage.getItem("auth_user");

      if (!token) {
        setToken(null);
        localStorage.removeItem("auth_user");
        localStorage.removeItem("activeBranchId");
        localStorage.removeItem("userBranchId");
        disconnectSocket();
        setUser(null);
        setLoading(false);
        return;
      }

      setToken(token);

      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);

          if (parsedUser.role) {
            parsedUser.role = parsedUser.role
              .toUpperCase()
              .replace(/\s+/g, "_");
          }

          parsedUser.permissions = normalizePermissions(
            parsedUser.permissions || [],
          );

          persistBranchContext(parsedUser.branchId);

          setUser(parsedUser);
        } catch (error) {
          console.error("Failed to parse stored auth user", error);
          localStorage.removeItem("auth_user");
        }
      }

      try {
        const res = await api.get<User>("/auth/me");

        const normalizedUser = {
          ...res.data,
          role: res.data.role
            ? res.data.role.toUpperCase().replace(/\s+/g, "_")
            : res.data.role,
        permissions: normalizePermissions(res.data.permissions || []),
      };
      console.log(res.data);

        localStorage.setItem("auth_user", JSON.stringify(normalizedUser));


        persistBranchContext(normalizedUser.branchId);

        setUser(normalizedUser);
      } catch (error) {
        setToken(null);
        localStorage.removeItem("token");
        localStorage.removeItem("auth_user");
        localStorage.removeItem("activeBranchId");
        localStorage.removeItem("userBranchId");
        disconnectSocket();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    bootstrapAuth();
  }, []);

  const login = (userData: User, token: string) => {
    const normalizedUser = {
      ...userData,
      role: userData.role
        ? userData.role.toUpperCase().replace(/\s+/g, "_")
        : userData.role,
        permissions: normalizePermissions(userData.permissions || []),
      };

    localStorage.setItem("token", token);
    localStorage.setItem("auth_user", JSON.stringify(normalizedUser));

    persistBranchContext(normalizedUser.branchId);

    setToken(token);
    setUser(normalizedUser);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("auth_user");
    localStorage.removeItem("activeBranchId");
    localStorage.removeItem("userBranchId");
    setToken(null);
    disconnectSocket();
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await api.get<User>("/auth/me");
      const updatedUser = res.data;

      const normalizedUser = {
        ...updatedUser,
        role: updatedUser.role
          ? updatedUser.role.toUpperCase().replace(/\s+/g, "_")
          : updatedUser.role,
        permissions: normalizePermissions(updatedUser.permissions || []),
      };

      localStorage.setItem("auth_user", JSON.stringify(normalizedUser));

      persistBranchContext(normalizedUser.branchId);

      setUser(normalizedUser);
    } catch (err) {
      console.error("User refresh failed", err);
    }
  };

  const hasPermission = (permission: string) => {
    if (!user) return false;

    if (user.role === "SUPER_ADMIN") return true;

    const userPerms = normalizePermissions(user.permissions || []);
    return userPerms.includes(permission.toUpperCase());
  };

  const hasAnyPermission = (permissions: string[]) => {
    if (!user) return false;

    if (user.role === "SUPER_ADMIN") return true;

    const userPerms = normalizePermissions(user.permissions || []);
    return permissions.some((perm) => userPerms.includes(perm.toUpperCase()));
  };

  const hasAllPermissions = (permissions: string[]) => {
    if (!user) return false;

    if (user.role === "SUPER_ADMIN") return true;

    const userPerms = normalizePermissions(user.permissions || []);
    return permissions.every((perm) => userPerms.includes(perm.toUpperCase()));
  };

  const hasRole = (allowedRoles: string[]) => {
    if (!user) return false;
    if (user.isPlatformAdmin) return true;
    return allowedRoles.includes(user.role);
  };

  const getUserDisplayName = () => {
    if (!user) return "User";

    if (user.name) return user.name;

    if (user.firstName || user.lastName) {
      return `${user.firstName || ""} ${user.lastName || ""}`.trim();
    }

    if (user.email) return user.email;

    return "User";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role: user?.role || null,
        permissions: user?.permissions || [],
        loading,
        subscriptionAccess: user?.subscriptionAccess || null,
        login,
        logout,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        hasRole,
        getUserDisplayName,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
