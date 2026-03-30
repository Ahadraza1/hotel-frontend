import { useAuth } from "@/contexts/AuthContext";

interface ModulePermissions {
  canAccess: boolean;
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

const normalizeModule = (module: string) => module.toUpperCase();

export const useModulePermissions = (moduleName: string): ModulePermissions => {
  const { hasPermission, user } = useAuth();

  const module = normalizeModule(moduleName);

  const moduleConfig: Record<
    string,
    {
      access: string;
      view: string;
      actions: string;
    }
  > = {
    ROOMS: { access: "ACCESS_ROOMS", view: "VIEW_ROOM", actions: "ROOM" },
    BOOKINGS: {
      access: "ACCESS_BOOKINGS",
      view: "VIEW_BOOKING",
      actions: "BOOKING",
    },
    CRM: { access: "ACCESS_CRM", view: "VIEW_GUEST", actions: "GUEST" },
    HOUSEKEEPING: {
      access: "ACCESS_HOUSEKEEPING",
      view: "VIEW_TASK",
      actions: "TASK",
    },
    POS: { access: "ACCESS_POS", view: "VIEW_POS_MENU", actions: "POS_ORDER" },
    INVENTORY: {
      access: "ACCESS_INVENTORY",
      view: "VIEW_INVENTORY_ITEM",
      actions: "INVENTORY_ITEM",
    },
    HR: { access: "ACCESS_HR", view: "VIEW_EMPLOYEE", actions: "EMPLOYEE" },
    FINANCE: {
      access: "ACCESS_FINANCE",
      view: "VIEW_EXPENSE",
      actions: "INVOICE",
    },
    BRANCH_SETTINGS: {
      access: "ACCESS_BRANCH_SETTINGS",
      view: "VIEW_BRANCH_SETTINGS",
      actions: "BRANCH_SETTINGS",
    },
  };

  const config = moduleConfig[module] || {
    access: `ACCESS_${module}`,
    view: `VIEW_${module}`,
    actions: module,
  };

  const createKey = `CREATE_${config.actions}`;
  const updateKey = `UPDATE_${config.actions}`;
  const deleteKey = `DELETE_${config.actions}`;

  const canAccess = !!user && hasPermission(config.access);
  const canView = !!user && hasPermission(config.view);
  const canCreate = !!user && hasPermission(createKey);
  const canUpdate = !!user && hasPermission(updateKey);
  const canDelete = !!user && hasPermission(deleteKey);

  return {
    canAccess,
    canView,
    canCreate,
    canUpdate,
    canDelete,
  };
};
