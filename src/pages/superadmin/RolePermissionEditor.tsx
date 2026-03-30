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
  description?: string;
  type?: "SYSTEM" | "CUSTOM";
  permissions: Permission[];
}

interface PermissionCategory {
  category: string;
  permissions: Permission[];
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

const toTitleCase = (str: string) =>
  str
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const toPermissionKey = (value: string) =>
  value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

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
  const { refreshUser } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [categories, setCategories] = useState<PermissionCategory[]>([]);
  const [search, setSearch] = useState("");
  const [permissionsState, setPermissionsState] = useState<
    Record<string, boolean>
  >({});
  const [isAddRoleOpen, setIsAddRoleOpen] = useState(false);
  const [isAddPermissionOpen, setIsAddPermissionOpen] = useState(false);
  const [roleForm, setRoleForm] = useState({ name: "", description: "" });
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

  const loadEditorData = async (preferredRoleId?: string) => {
    const [rolesRes, permsRes] = await Promise.all([
      api.get<{ data: Role[] }>("/roles"),
      api.get<{ data: PermissionCategory[] }>("/permissions"),
    ]);

    const rolesData = rolesRes.data.data || [];
    const permsData = permsRes.data.data || [];

    setRoles(rolesData);
    setCategories(permsData);
    setSelectedRole(
      rolesData.find((role) => role._id === preferredRoleId) || rolesData[0] || null,
    );
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        await loadEditorData();
      } catch (err: unknown) {
        console.error("Failed to load roles/permissions", err);
      }
    };

    fetchData();
  }, []);

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
    if (!selectedRole || isSuperAdmin) return;

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
    if (!selectedRole || isSuperAdmin) return;

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
    if (!selectedRole) return;

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
      });

      const createdRole = response.data.data;
      const nextRoles = [...roles, createdRole].sort((a, b) =>
        a.name.localeCompare(b.name),
      );

      setRoles(nextRoles);
      setSelectedRole(createdRole);
      setRoleForm({ name: "", description: "" });
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
          >
            Save Changes
          </button>
        </div>
      </div>

      <div className="rpe-layout">
        <aside className="luxury-card rpe-sidebar">
          <div className="rpe-sidebar-header">
            <p className="rpe-sidebar-title">Roles</p>
            <div className="rpe-sidebar-header-actions">
              <span className="rpe-sidebar-count">{roles.length}</span>
              <button
                type="button"
                className="luxury-btn luxury-btn-outline rpe-inline-action-btn"
                onClick={() => setIsAddRoleOpen(true)}
              >
                <Plus className="rpe-action-icon" />
                Add Role
              </button>
            </div>
          </div>
          <nav className="rpe-sidebar-nav">
            {roles.map((role) => {
              const isActive = selectedRole?._id === role._id;
              const isDeleteRestricted =
                role.normalizedName === "SUPER_ADMIN" || role.type === "SYSTEM";

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
                    <span className="rpe-role-name">{toTitleCase(role.name)}</span>
                    {isActive && <Lock className="rpe-role-lock" />}
                  </button>

                  <button
                    type="button"
                    className="rpe-role-delete"
                    aria-label={`Delete ${role.name}`}
                    title={
                      isDeleteRestricted ? "This role cannot be deleted" : "Delete role"
                    }
                    disabled={isDeleteRestricted || deletingRoleId === role._id}
                    onClick={() => handleDeleteRole(role)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </nav>
        </aside>

        <div className="luxury-card rpe-matrix">
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

              <button
                type="button"
                className="luxury-btn luxury-btn-outline rpe-inline-action-btn"
                onClick={() => setIsAddPermissionOpen(true)}
              >
                <Plus className="rpe-action-icon" />
                Add Permission
              </button>
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
                          disabled={isSuperAdmin}
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
                            className={`rpe-perm-row ${isOn ? "rpe-perm-row-on" : ""} ${isSuperAdmin ? "rpe-perm-row-disabled" : ""}`}
                          >
                            <button
                              type="button"
                              role="switch"
                              aria-checked={isOn ? "true" : "false"}
                              onClick={() => handleToggle(permissionKey)}
                              disabled={isSuperAdmin}
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

      {isAddRoleOpen && (
        <EditorModal
          title="Add Role"
          subtitle="Create a new role without affecting the existing editor behavior."
          onClose={() => {
            if (!isSubmittingRole) {
              setIsAddRoleOpen(false);
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
                onClick={() => setIsAddRoleOpen(false)}
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
      )}

      {isAddPermissionOpen && (
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
      )}
    </div>
  );
};

export default RolePermissionEditor;
