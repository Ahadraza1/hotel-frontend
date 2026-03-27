import { useAuth } from "@/contexts/AuthContext";

interface ModulePermissions {
  canAccess: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

const normalizeModule = (module: string) => module.toUpperCase();

export const useModulePermissions = (moduleName: string): ModulePermissions => {
  const { hasPermission, user } = useAuth();

  const module = normalizeModule(moduleName);

  const moduleMap: Record<string, string> = {
    ROOMS: "ROOM",
    BOOKINGS: "BOOKING",
    CRM: "GUEST",
    POS: "POS_ORDER",
    INVENTORY: "INVENTORY_ITEM",
    HR: "EMPLOYEE",
    FINANCE: "INVOICE",
  };

  const base = moduleMap[module] || module;

  const accessKey = `ACCESS_${module}`;
  const createKey = `CREATE_${base}`;
  const updateKey = `UPDATE_${base}`;
  const deleteKey = `DELETE_${base}`;

  const isAdmin = user?.role === "SUPER_ADMIN";

  const canAccess = isAdmin || hasPermission(accessKey);
  const canCreate = isAdmin || hasPermission(createKey);
  const canUpdate = isAdmin || hasPermission(updateKey);
  const canDelete = isAdmin || hasPermission(deleteKey);

  return {
    canAccess,
    canCreate,
    canUpdate,
    canDelete,
  };
};