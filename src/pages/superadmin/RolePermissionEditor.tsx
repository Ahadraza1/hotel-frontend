import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  AlertTriangle,
  ShieldCheck,
  Lock,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import api from "@/api/axios";
import {
  useConfirm,
  useToast,
} from "@/components/confirm/ConfirmProvider";
import { useAuth } from "@/contexts/AuthContext";

interface Permission {
  _id: string;
  name: string;
  key: string;
  module: string;
  description?: string;
}

interface Role {
  _id: string;
  name: string;
  normalizedName?: string;
  category?: "MAIN" | "ORGANIZATION" | "BRANCH";
  description?: string;
  type?: "SYSTEM" | "CUSTOM";
  organizationId?: string | null;
  branchId?: string | null;
  permissions: Permission[];
}

interface PermissionCategory {
  category: string;
  permissions: Permission[];
}

interface OrganizationOption {
  _id: string;
  organizationId?: string | null;
  name: string;
}

interface BranchOption {
  _id: string;
  organizationId?: string | null;
  name: string;
}

interface RoleFormState {
  name: string;
  description: string;
  category: "ORGANIZATION" | "BRANCH";
}

const DEFAULT_MODULES = [
  "CRM",
  "BOOKING",
  "INVENTORY",
  "HR",
  "FINANCE",
  "ROOM",
  "HOUSEKEEPING",
  "POS",
  "BRANCH",
  "ORGANIZATION",
  "SYSTEM",
];
const ROLE_CATEGORY_ORDER = ["MAIN", "ORGANIZATION", "BRANCH"] as const;
const ROLE_CATEGORY_LABELS: Record<(typeof ROLE_CATEGORY_ORDER)[number], string> = {
  MAIN: "Main",
  ORGANIZATION: "Organization",
  BRANCH: "Branch",
};
const INITIAL_ROLE_FORM: RoleFormState = {
  name: "",
  description: "",
  category: "BRANCH",
};

const toTitleCase = (str: string) =>
  str
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const toPermissionKey = (value: string) => value.trim().toUpperCase();
const normalizeIdValue = (value?: string | null) => String(value || "").trim();
const getOrganizationFilterValue = (
  organization?: Pick<OrganizationOption, "_id" | "organizationId"> | null,
) => normalizeIdValue(organization?.organizationId || organization?._id || "");
const getRoleOrganizationId = (
  role?: Pick<Role, "organizationId"> | null,
) => normalizeIdValue(role?.organizationId);
const getRoleBranchId = (role?: Pick<Role, "branchId"> | null) =>
  normalizeIdValue(role?.branchId);
const getBranchOrganizationId = (
  branch?: Pick<BranchOption, "organizationId"> | null,
) => normalizeIdValue(branch?.organizationId);
const getNormalizedRoleName = (role?: Pick<Role, "name" | "normalizedName"> | null) =>
  String(role?.normalizedName || role?.name || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");

const getRoleCategory = (
  role?: Pick<Role, "name" | "normalizedName" | "category"> | null,
): (typeof ROLE_CATEGORY_ORDER)[number] => {
  const normalizedName = getNormalizedRoleName(role);

  if (normalizedName === "SUPER_ADMIN") {
    return "MAIN";
  }

  if (normalizedName === "CORPORATE_ADMIN") {
    return "ORGANIZATION";
  }

  return role?.category || "BRANCH";
};

const EditorModal = ({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  onClose: () => void;
}) => {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return createPortal(
    <div className="rpe-modal-layer" role="presentation">
      <button
        type="button"
        className="rpe-modal-backdrop"
        aria-label="Close modal"
        onClick={onClose}
      />

      <div className="rpe-modal" role="dialog" aria-modal="true">
        <div className="rpe-modal-header">
          <div>
            <h2 className="rpe-modal-title">{title}</h2>
            <p className="rpe-modal-subtitle">{subtitle}</p>
          </div>

          <button
            type="button"
            className="rpe-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        <div className="rpe-modal-body">{children}</div>
      </div>
    </div>,
    document.body,
  );
};

const RolePermissionEditor = () => {
  const { user, refreshUser, hasPermission } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [categories, setCategories] = useState<PermissionCategory[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [selectedOrg, setSelectedOrg] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [search, setSearch] = useState("");
  const [permissionsState, setPermissionsState] = useState<
    Record<string, boolean>
  >({});
  const [isAddRoleOpen, setIsAddRoleOpen] = useState(false);
  const [isAddPermissionOpen, setIsAddPermissionOpen] = useState(false);
  const [roleForm, setRoleForm] = useState<RoleFormState>(INITIAL_ROLE_FORM);
  const [permissionForm, setPermissionForm] = useState({
    name: "",
    key: "",
    module: "CRM",
  });
  const [isSubmittingRole, setIsSubmittingRole] = useState(false);
  const [isSubmittingPermission, setIsSubmittingPermission] = useState(false);
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);
  const [deletingPermissionId, setDeletingPermissionId] = useState<string | null>(
    null,
  );

  const canAccessRolePermissionsPage = hasPermission(
    "ACCESS_ROLE_PERMISSIONS_PAGE",
  );
  const canViewRoles = hasPermission("ACCESS_ROLES");
  const canViewPermissions = hasPermission("ACCESS_PERMISSIONS");
  const canAddRole = hasPermission("ADD_ROLE");
  const canAddPermission = hasPermission("ADD_PERMISSION");
  const canTogglePermissions = hasPermission("TOGGLE_PERMISSION");
  const isViewerSuperAdmin = user?.role === "SUPER_ADMIN";
  const isCorporateAdmin = user?.role === "CORPORATE_ADMIN";
  const showWorkspaceFilters = isViewerSuperAdmin || isCorporateAdmin;

  useEffect(() => {
    if (isCorporateAdmin) {
      setSelectedOrg(normalizeIdValue(user?.organizationId));
    }
  }, [isCorporateAdmin, user?.organizationId]);

  useEffect(() => {
    setSelectedBranch("");
  }, [selectedOrg]);

  const loadEditorData = async (preferredRoleId?: string) => {
    const rolesRes = await api.get<{ data: Role[] }>("/roles");
    const permsData = canViewPermissions
      ? (
          await api.get<{ data: PermissionCategory[] }>("/permissions")
        ).data.data || []
      : [];

    const rolesData = rolesRes.data.data || [];

    setRoles(rolesData);
    setCategories(permsData);
    setSelectedRole(
      rolesData.find((role) => role._id === preferredRoleId) || rolesData[0] || null,
    );
  };

  const loadFilterOptions = async () => {
    const [organizationsRes, branchesRes] = await Promise.all([
      api.get<{ data: OrganizationOption[] }>("/organizations"),
      api.get<{ data: BranchOption[] }>("/branches"),
    ]);

    setOrganizations(organizationsRes.data.data || []);
    setBranches(branchesRes.data.data || []);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        await Promise.all([
          loadEditorData(),
          showWorkspaceFilters ? loadFilterOptions() : Promise.resolve(),
        ]);
      } catch (err: unknown) {
        console.error("Failed to load roles/permissions", err);
      }
    };

    if (canAccessRolePermissionsPage) {
      fetchData();
    }
  }, [canAccessRolePermissionsPage, canViewPermissions, showWorkspaceFilters]);

  useEffect(() => {
    if (!selectedRole) return;

    const map: Record<string, boolean> = {};
    selectedRole.permissions.forEach((permission) => {
      map[permission.key || permission.name] = true;
    });

    setPermissionsState(map);
  }, [selectedRole]);

  const selectedRoleName = selectedRole?.normalizedName || selectedRole?.name;
  const isSuperAdmin = selectedRoleName === "SUPER_ADMIN";

  const availableModules = useMemo(() => {
    const modules = new Set(DEFAULT_MODULES);
    categories.forEach((category) => modules.add(category.category));
    return Array.from(modules);
  }, [categories]);

  const organizationOptions = useMemo(
    () =>
      organizations
        .map((organization) => ({
          label: organization.name,
          value: getOrganizationFilterValue(organization),
          key: organization._id || getOrganizationFilterValue(organization),
        }))
        .filter((organization) => organization.value)
        .sort((a, b) => a.label.localeCompare(b.label)),
    [organizations],
  );

  const branchOptions = useMemo(
    () =>
      branches
        .filter(
          (branch) =>
            !selectedOrg || getBranchOrganizationId(branch) === selectedOrg,
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    [branches, selectedOrg],
  );

  const visibleRoles = useMemo(
    () =>
      roles.filter((role) => {
        const roleCategory = getRoleCategory(role);

        if (!isViewerSuperAdmin && roleCategory === "MAIN") {
          return false;
        }

        if (selectedOrg) {
          if (roleCategory === "MAIN") {
            return false;
          }

          const roleOrganizationId = getRoleOrganizationId(role);
          if (roleOrganizationId && roleOrganizationId !== selectedOrg) {
            return false;
          }
        }

        if (selectedBranch) {
          const roleBranchId = getRoleBranchId(role);
          if (roleBranchId && roleBranchId !== selectedBranch) {
            return false;
          }
        }

        return true;
      }),
    [isViewerSuperAdmin, roles, selectedBranch, selectedOrg],
  );

  const groupedRoles = useMemo(
    () =>
      ROLE_CATEGORY_ORDER.reduce(
        (acc, category) => {
          acc[category] = [...visibleRoles]
            .filter((role) => getRoleCategory(role) === category)
            .sort((a, b) => a.name.localeCompare(b.name));
          return acc;
        },
        {} as Record<(typeof ROLE_CATEGORY_ORDER)[number], Role[]>,
      ),
    [visibleRoles],
  );

  const roleSections = useMemo(
    () =>
      ROLE_CATEGORY_ORDER.filter(
        (category) => category !== "MAIN" || isViewerSuperAdmin,
      )
        .map((category) => ({
          category,
          label: ROLE_CATEGORY_LABELS[category],
          roles: groupedRoles[category],
        }))
        .filter((section) => section.roles.length > 0),
    [groupedRoles, isViewerSuperAdmin],
  );

  useEffect(() => {
    if (selectedRole && visibleRoles.some((role) => role._id === selectedRole._id)) {
      return;
    }

    if (visibleRoles.length > 0) {
      setSelectedRole(visibleRoles[0]);
      return;
    }

    if (selectedRole) {
      setSelectedRole(null);
    }
  }, [selectedRole, visibleRoles]);

  const getCategoryAccessPermission = (cat: PermissionCategory) =>
    cat.permissions.find((permission) =>
      (permission.key || permission.name).startsWith("ACCESS_"),
    );

  const isCategoryEnabled = (cat: PermissionCategory) => {
    const accessPermission = getCategoryAccessPermission(cat);

    if (accessPermission) {
      return !!permissionsState[accessPermission.key || accessPermission.name];
    }

    return cat.permissions.some(
      (permission) => permissionsState[permission.key || permission.name],
    );
  };

  const handleToggle = (permKey: string) => {
    if (!selectedRole || isSuperAdmin || !canTogglePermissions) return;

    setPermissionsState((prev) => {
      const next = {
        ...prev,
        [permKey]: !prev[permKey],
      };

      const category = categories.find((item) =>
        item.permissions.some(
          (permission) => (permission.key || permission.name) === permKey,
        ),
      );

      if (!category) {
        return next;
      }

      const accessPermission = getCategoryAccessPermission(category);

      if (
        !accessPermission ||
        (accessPermission.key || accessPermission.name) === permKey
      ) {
        return next;
      }

      const hasEnabledSubPermission = category.permissions
        .filter(
          (permission) =>
            (permission.key || permission.name) !==
            (accessPermission.key || accessPermission.name),
        )
        .some((permission) => next[permission.key || permission.name]);

      next[accessPermission.key || accessPermission.name] = hasEnabledSubPermission;

      return next;
    });
  };

  const handleToggleCategory = (cat: PermissionCategory) => {
    if (!selectedRole || isSuperAdmin || !canTogglePermissions) return;

    const nextValue = !isCategoryEnabled(cat);

    setPermissionsState((prev) => {
      const next = { ...prev };

      cat.permissions.forEach((permission) => {
        next[permission.key || permission.name] = nextValue;
      });

      return next;
    });
  };

  const handleSave = async () => {
    if (!selectedRole || !canViewPermissions || !canTogglePermissions) return;

    const selectedPermKeys = Object.keys(permissionsState).filter(
      (permission) => permissionsState[permission],
    );

    try {
      const response = await api.put<{
        status?: boolean;
        success?: boolean;
        message?: string;
      }>(`/roles/${selectedRole._id}/permissions`, {
        permissions: selectedPermKeys,
      });

      if (response.data?.status !== true && response.data?.success !== true) {
        throw new Error(
          response.data?.message || "Failed to update permissions",
        );
      }

      await loadEditorData(selectedRole._id);

      try {
        await refreshUser();
      } catch (refreshError) {
        console.error(
          "Failed to refresh auth state after permission update",
          refreshError,
        );
      }

      toast.success(response.data?.message || "Permissions updated successfully");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } }; message?: string })
          ?.response?.data?.message ||
        (err as { message?: string })?.message ||
        "Failed to update permissions";

      toast.error(message);
    }
  };

  const handleCreateRole = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canAddRole) {
      return;
    }

    if (!roleForm.name.trim()) {
      toast.error("Role name is required");
      return;
    }

    setIsSubmittingRole(true);

    try {
      const response = await api.post<{
        data: Role;
        message?: string;
      }>("/roles", {
        name: roleForm.name,
        description: roleForm.description,
        category: roleForm.category,
      });

      const createdRole = response.data.data;
      const nextRoles = [...roles, createdRole].sort((a, b) =>
        a.name.localeCompare(b.name),
      );

      setRoles(nextRoles);
      setSelectedRole(createdRole);
      setRoleForm(INITIAL_ROLE_FORM);
      setIsAddRoleOpen(false);
      toast.success(response.data.message || "Role created successfully");
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } }; message?: string })
          ?.response?.data?.message ||
        "Failed to create role";
      toast.error(message);
    } finally {
      setIsSubmittingRole(false);
    }
  };

  const handleCreatePermission = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canAddPermission) {
      return;
    }

    const payload = {
      name: permissionForm.name.trim(),
      key: toPermissionKey(permissionForm.key || permissionForm.name),
      module: permissionForm.module,
    };

    if (!payload.name || !payload.key || !payload.module) {
      toast.error("Permission name, key, and module are required");
      return;
    }

    setIsSubmittingPermission(true);

    try {
      const response = await api.post<{
        data: Permission;
        message?: string;
      }>("/permissions", payload);

      const createdPermission = response.data.data;

      setCategories((prev) => {
        const existingCategory = prev.find(
          (category) => category.category === createdPermission.module,
        );

        if (existingCategory) {
          return prev.map((category) =>
            category.category === createdPermission.module
              ? {
                  ...category,
                  permissions: [...category.permissions, createdPermission].sort(
                    (a, b) => (a.key || a.name).localeCompare(b.key || b.name),
                  ),
                }
              : category,
          );
        }

        return [
          ...prev,
          {
            category: createdPermission.module,
            permissions: [createdPermission],
          },
        ].sort((a, b) => a.category.localeCompare(b.category));
      });

      setPermissionsState((prev) => ({
        ...prev,
        [createdPermission.key || createdPermission.name]: false,
      }));
      setPermissionForm({ name: "", key: "", module: permissionForm.module });
      setIsAddPermissionOpen(false);
      toast.success(response.data.message || "Permission created successfully");
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } }; message?: string })
          ?.response?.data?.message ||
        "Failed to create permission";
      toast.error(message);
    } finally {
      setIsSubmittingPermission(false);
    }
  };

  const handleDeleteRole = async (role: Role) => {
    if (role.normalizedName === "SUPER_ADMIN" || role.type === "SYSTEM") {
      return;
    }

    setDeletingRoleId(role._id);

    const confirmed = await confirm({
      title: "Delete Role",
      message: "Are you sure you want to delete this role?",
      confirmLabel: "Delete",
      processingLabel: "Deleting...",
      successMessage: "Role deleted successfully",
      errorMessage: "Failed to delete role",
      onConfirm: async () => {
        await api.delete(`/roles/${role._id}`);

        setRoles((prev) => {
          const nextRoles = prev.filter((item) => item._id !== role._id);
          const nextSelected =
            selectedRole?._id === role._id
              ? nextRoles[0] || null
              : nextRoles.find((item) => item._id === selectedRole?._id) ||
                nextRoles[0] ||
                null;

          setSelectedRole(nextSelected);
          return nextRoles;
        });
      },
    });

    if (!confirmed) {
      setDeletingRoleId(null);
      return;
    }

    setDeletingRoleId(null);
  };

  const handleDeletePermission = async (permission: Permission) => {
    setDeletingPermissionId(permission._id);

    const confirmed = await confirm({
      title: "Delete Permission",
      message: `Are you sure you want to delete ${permission.key || permission.name}?`,
      confirmLabel: "Delete",
      processingLabel: "Deleting...",
      successMessage: "Permission deleted successfully",
      errorMessage: "Failed to delete permission",
      onConfirm: async () => {
        await api.delete(`/permissions/${permission._id}`);

        setCategories((prev) =>
          prev
            .map((category) => ({
              ...category,
              permissions: category.permissions.filter(
                (item) => item._id !== permission._id,
              ),
            }))
            .filter((category) => category.permissions.length > 0),
        );

        setPermissionsState((prev) => {
          const next = { ...prev };
          delete next[permission.key || permission.name];
          return next;
        });

        if (selectedRole) {
          await loadEditorData(selectedRole._id);
        }
      },
    });

    if (!confirmed) {
      setDeletingPermissionId(null);
      return;
    }

    setDeletingPermissionId(null);
  };

  const filteredCategories = categories
    .map((category) => ({
      ...category,
      permissions: category.permissions.filter((permission) => {
        const query = search.toLowerCase();
        return !query
          ? true
          : permission.name.toLowerCase().includes(query) ||
              (permission.key || permission.name).toLowerCase().includes(query) ||
              category.category.toLowerCase().includes(query);
      }),
    }))
    .filter(
      (category) =>
        category.permissions.length > 0 ||
        category.category.toLowerCase().includes(search.toLowerCase()),
    );

  const enabledCount = Object.values(permissionsState).filter(Boolean).length;
  const totalCount = categories.reduce(
    (sum, category) => sum + category.permissions.length,
    0,
  );
  const arePermissionTogglesDisabled =
    isSuperAdmin || !selectedRole || !canTogglePermissions;

  return (
    <div className="animate-fade-in rpe-root">
      <div className="rpe-page-header">
        <div className="rpe-page-header-left">
          <div className="rpe-header-icon-wrap">
            <ShieldCheck className="rpe-header-icon" />
          </div>
          <div>
            <h1 className="page-title">Role Permission Editor</h1>
            <p className="page-subtitle">
              Configure granular permissions for each role
            </p>
          </div>
        </div>

        <div className="rpe-header-actions">
          <button
            onClick={handleSave}
            className="luxury-btn luxury-btn-primary rpe-save-btn"
            aria-label="Save Changes"
            disabled={
              !canViewPermissions ||
              !canTogglePermissions ||
              !selectedRole ||
              isSuperAdmin
            }
          >
            Save Changes
          </button>
        </div>
      </div>

      <div className="rpe-layout">
        <aside
          className="luxury-card rpe-sidebar"
          style={{ display: canViewRoles ? undefined : "none" }}
        >
          <div className="rpe-sidebar-header">
            <p className="rpe-sidebar-title">Roles</p>
            <div className="rpe-sidebar-header-actions">
              <span className="rpe-sidebar-count">{visibleRoles.length}</span>
              {canAddRole ? (
                <button
                  type="button"
                  className="luxury-btn luxury-btn-outline rpe-inline-action-btn"
                  onClick={() => setIsAddRoleOpen(true)}
                >
                  <Plus className="rpe-action-icon" />
                  Add Role
                </button>
              ) : null}
            </div>
          </div>
          <nav className="rpe-sidebar-nav">
            {roleSections.map((section, sectionIndex) => (
              <div key={section.category}>
                <div
                  className={`px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70 ${
                    sectionIndex === 0 ? "pt-0" : "pt-4"
                  }`}
                >
                  {section.label}
                </div>

                {section.roles.map((role) => {
                  const isActive = selectedRole?._id === role._id;
                  const isDeleteRestricted =
                    getRoleCategory(role) === "MAIN" ||
                    getNormalizedRoleName(role) === "SUPER_ADMIN" ||
                    role.type === "SYSTEM";

                  return (
                    <div
                      key={role._id}
                      className={`rpe-role-btn ${isActive ? "rpe-role-btn-active" : "rpe-role-btn-inactive"}`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedRole(role)}
                        className="rpe-role-main"
                        aria-pressed={isActive ? "true" : "false"}
                      >
                        <span
                          className={`rpe-role-dot ${isActive ? "rpe-role-dot-active" : ""}`}
                        />
                        <span className="rpe-role-name">
                          {toTitleCase(role.name)}
                        </span>
                        {isActive && <Lock className="rpe-role-lock" />}
                      </button>

                      <button
                        type="button"
                        className="rpe-role-delete"
                        aria-label={`Delete ${role.name}`}
                        title={
                          isDeleteRestricted
                            ? "This role cannot be deleted"
                            : "Delete role"
                        }
                        disabled={isDeleteRestricted || deletingRoleId === role._id}
                        onClick={() => handleDeleteRole(role)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </nav>
        </aside>

        <div
          className="luxury-card rpe-matrix"
          style={{ display: canViewPermissions ? undefined : "none" }}
        >
          <div className="rpe-matrix-header flex-col items-start gap-4">
            <div className="w-full flex justify-between items-start flex-wrap gap-4">
              <div className="rpe-matrix-header-left">
                <div>
                  <h3 className="rpe-matrix-title">
                    Permissions for{" "}
                    <span className="rpe-matrix-title-role">
                      {selectedRole ? toTitleCase(selectedRole.name) : "-"}
                    </span>
                  </h3>
                  {isSuperAdmin && (
                    <div className="rpe-superadmin-note">
                      <AlertTriangle className="rpe-superadmin-icon" />
                      Super Admin has all permissions by default
                    </div>
                  )}
                </div>
              </div>

              <div className="rpe-stats-pill">
                <span className="rpe-stats-count">{enabledCount}</span>
                <span className="rpe-stats-sep">/</span>
                <span className="rpe-stats-total">{totalCount}</span>
                <span className="rpe-stats-label">active</span>
              </div>
            </div>

            <div className="rpe-toolbar-row">
              <div className="flex flex-1 flex-wrap items-center gap-3">
                <div className="rpe-search-wrap w-full max-w-[24rem]">
                  <Search className="rpe-search-icon" />
                  <input
                    id="perm-search"
                    className="luxury-input rpe-search-input !bg-transparent w-full"
                    placeholder="Search permissions..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    autoComplete="off"
                  />
                  {search && (
                    <button
                      className="rpe-search-clear"
                      onClick={() => setSearch("")}
                      aria-label="Clear search"
                    >
                      x
                    </button>
                  )}
                </div>

                {showWorkspaceFilters ? (
                  <>
                    <select
                      className="luxury-input luxury-select w-full sm:w-[13rem]"
                      value={selectedOrg}
                      onChange={(e) => setSelectedOrg(e.target.value)}
                      disabled={!isViewerSuperAdmin}
                      aria-label="Filter roles by organization"
                    >
                      <option value="">Select Organization</option>
                      {organizationOptions.map((organization) => (
                        <option key={organization.key} value={organization.value}>
                          {organization.label}
                        </option>
                      ))}
                    </select>

                    <select
                      className="luxury-input luxury-select w-full sm:w-[12rem]"
                      value={selectedBranch}
                      onChange={(e) => setSelectedBranch(e.target.value)}
                      disabled={!selectedOrg}
                      aria-label="Filter roles by branch"
                    >
                      <option value="">Select Branch</option>
                      {branchOptions.map((branch) => (
                        <option key={branch._id} value={branch._id}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                  </>
                ) : null}
              </div>

              {canAddPermission ? (
                <button
                  type="button"
                  className="luxury-btn luxury-btn-outline rpe-inline-action-btn"
                  onClick={() => setIsAddPermissionOpen(true)}
                >
                  <Plus className="rpe-action-icon" />
                  Add Permission
                </button>
              ) : null}
            </div>
          </div>

          <div className="rpe-categories">
            {filteredCategories.length === 0 ? (
              <div className="rpe-empty">
                <Search className="rpe-empty-icon" />
                <p>
                  No permissions match "<strong>{search}</strong>"
                </p>
              </div>
            ) : (
              filteredCategories.map((category) => {
                const categoryEnabled = isCategoryEnabled(category);

                return (
                  <div key={category.category} className="rpe-category">
                    <div className="rpe-category-header">
                      <span className="rpe-category-pill">
                        {toTitleCase(category.category)}
                      </span>
                      <div className="rpe-category-line" />
                      <span className="rpe-category-count">
                        {
                          category.permissions.filter(
                            (permission) =>
                              permissionsState[permission.key || permission.name],
                          ).length
                        }
                        /{category.permissions.length}
                      </span>
                      <div className="ml-2 flex items-center">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={categoryEnabled ? "true" : "false"}
                          aria-label={`Toggle ${toTitleCase(category.category)} permissions`}
                          title={`Toggle ${toTitleCase(category.category)} permissions`}
                          onClick={() => handleToggleCategory(category)}
                          disabled={arePermissionTogglesDisabled}
                          className={`rpe-toggle ${
                            categoryEnabled ? "rpe-toggle-on" : "rpe-toggle-off"
                          } scale-[0.85] origin-right opacity-90 transition-opacity hover:opacity-100 disabled:opacity-50`}
                        >
                          <span
                            className={`rpe-toggle-thumb ${
                              categoryEnabled
                                ? "rpe-toggle-thumb-on"
                                : "rpe-toggle-thumb-off"
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    <div className="rpe-perm-list">
                      {category.permissions.map((permission) => {
                        const permissionKey = permission.key || permission.name;
                        const isOn = !!permissionsState[permissionKey];

                        return (
                          <label
                            key={permission._id}
                            className={`rpe-perm-row ${isOn ? "rpe-perm-row-on" : ""} ${arePermissionTogglesDisabled ? "rpe-perm-row-disabled" : ""}`}
                          >
                            <button
                              type="button"
                              role="switch"
                              aria-checked={isOn ? "true" : "false"}
                              onClick={() => handleToggle(permissionKey)}
                              disabled={arePermissionTogglesDisabled}
                              className={`rpe-toggle ${isOn ? "rpe-toggle-on" : "rpe-toggle-off"}`}
                              aria-label={`Toggle ${toTitleCase(permission.name)}`}
                              title={`Toggle ${toTitleCase(permission.name)}`}
                            >
                              <span
                                className={`rpe-toggle-thumb ${isOn ? "rpe-toggle-thumb-on" : "rpe-toggle-thumb-off"}`}
                              />
                            </button>

                            <span
                              className={`rpe-perm-name ${isOn ? "rpe-perm-name-on" : "rpe-perm-name-off"}`}
                            >
                              {toTitleCase(permission.name)}
                            </span>

                            <span className="rpe-perm-code">{permissionKey}</span>

                            <button
                              type="button"
                              className="rpe-perm-delete"
                              aria-label={`Delete ${permissionKey}`}
                              title={`Delete ${permissionKey}`}
                              disabled={deletingPermissionId === permission._id}
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                handleDeletePermission(permission);
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {isAddRoleOpen && canAddRole ? (
        <EditorModal
          title="Add Role"
          subtitle="Create a new role without affecting the existing editor behavior."
          onClose={() => {
            if (!isSubmittingRole) {
              setIsAddRoleOpen(false);
              setRoleForm(INITIAL_ROLE_FORM);
            }
          }}
        >
          <form className="rpe-modal-form" onSubmit={handleCreateRole}>
            <label className="rpe-modal-field">
              <span className="rpe-modal-label">Role Name</span>
              <input
                className="luxury-input"
                value={roleForm.name}
                onChange={(e) =>
                  setRoleForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g. Reservation Lead"
                autoFocus
              />
            </label>

            <label className="rpe-modal-field">
              <span className="rpe-modal-label">Category</span>
              <select
                className="luxury-input"
                value={roleForm.category}
                onChange={(e) =>
                  setRoleForm((prev) => ({
                    ...prev,
                    category: e.target.value as RoleFormState["category"],
                  }))
                }
              >
                <option value="ORGANIZATION">Organization Role</option>
                <option value="BRANCH">Branch Role</option>
              </select>
            </label>

            <label className="rpe-modal-field">
              <span className="rpe-modal-label">Description</span>
              <textarea
                className="luxury-input rpe-modal-textarea"
                value={roleForm.description}
                onChange={(e) =>
                  setRoleForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Optional role description"
                rows={4}
              />
            </label>

            <div className="rpe-modal-actions">
              <button
                type="button"
                className="luxury-btn luxury-btn-outline"
                onClick={() => {
                  setIsAddRoleOpen(false);
                  setRoleForm(INITIAL_ROLE_FORM);
                }}
                disabled={isSubmittingRole}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="luxury-btn luxury-btn-primary"
                disabled={isSubmittingRole}
              >
                {isSubmittingRole ? "Creating..." : "Submit"}
              </button>
            </div>
          </form>
        </EditorModal>
      ) : null}

      {isAddPermissionOpen && canAddPermission ? (
        <EditorModal
          title="Add Permission"
          subtitle="Create a permission key and immediately expose it in the current editor."
          onClose={() => {
            if (!isSubmittingPermission) {
              setIsAddPermissionOpen(false);
            }
          }}
        >
          <form className="rpe-modal-form" onSubmit={handleCreatePermission}>
            <label className="rpe-modal-field">
              <span className="rpe-modal-label">Permission Name</span>
              <input
                className="luxury-input"
                value={permissionForm.name}
                onChange={(e) =>
                  setPermissionForm((prev) => ({
                    ...prev,
                    name: e.target.value,
                    key: prev.key ? prev.key : toPermissionKey(e.target.value),
                  }))
                }
                placeholder="e.g. Edit Booking"
                autoFocus
              />
            </label>

            <label className="rpe-modal-field">
              <span className="rpe-modal-label">Permission Key</span>
              <input
                className="luxury-input"
                value={permissionForm.key}
                onChange={(e) =>
                  setPermissionForm((prev) => ({
                    ...prev,
                    key: toPermissionKey(e.target.value),
                  }))
                }
                placeholder="e.g. EDIT_BOOKING"
              />
            </label>

            <label className="rpe-modal-field">
              <span className="rpe-modal-label">Module / Category</span>
              <select
                className="luxury-input"
                value={permissionForm.module}
                onChange={(e) =>
                  setPermissionForm((prev) => ({
                    ...prev,
                    module: e.target.value,
                  }))
                }
              >
                {availableModules.map((module) => (
                  <option key={module} value={module}>
                    {toTitleCase(module)}
                  </option>
                ))}
              </select>
            </label>

            <div className="rpe-modal-actions">
              <button
                type="button"
                className="luxury-btn luxury-btn-outline"
                onClick={() => setIsAddPermissionOpen(false)}
                disabled={isSubmittingPermission}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="luxury-btn luxury-btn-primary"
                disabled={isSubmittingPermission}
              >
                {isSubmittingPermission ? "Creating..." : "Submit"}
              </button>
            </div>
          </form>
        </EditorModal>
      ) : null}
    </div>
  );
};

export default RolePermissionEditor;
