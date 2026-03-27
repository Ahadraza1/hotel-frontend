import { useEffect, useState } from "react";
import {
  Search,
  Copy,
  History,
  AlertTriangle,
  ShieldCheck,
  Lock,
} from "lucide-react";
import api from "@/api/axios";
import { useToast } from "@/components/confirm/ConfirmProvider";
import { useAuth } from "@/contexts/AuthContext";

interface Role {
  _id: string;
  name: string;
  permissions: { _id: string; name: string; category: string }[];
}

interface PermissionCategory {
  category: string;
  permissions: { _id: string; name: string }[];
}

const toTitleCase = (str: string) =>
  str
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const RolePermissionEditor = () => {
  const { refreshUser } = useAuth();
  const toast = useToast();
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [categories, setCategories] = useState<PermissionCategory[]>([]);
  const [search, setSearch] = useState("");
  const [permissionsState, setPermissionsState] = useState<
    Record<string, boolean>
  >({});

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
      map[permission.name] = true;
    });

    setPermissionsState(map);
  }, [selectedRole]);

  const isSuperAdmin = selectedRole?.name === "SUPER_ADMIN";

  const getCategoryAccessPermission = (cat: PermissionCategory) =>
    cat.permissions.find((permission) => permission.name.startsWith("ACCESS_"));

  const isCategoryEnabled = (cat: PermissionCategory) => {
    const accessPermission = getCategoryAccessPermission(cat);

    if (accessPermission) {
      return !!permissionsState[accessPermission.name];
    }

    return cat.permissions.some((permission) => permissionsState[permission.name]);
  };

  const handleToggle = (permName: string) => {
    if (!selectedRole || isSuperAdmin) return;

    setPermissionsState((prev) => {
      const next = {
        ...prev,
        [permName]: !prev[permName],
      };

      const category = categories.find((item) =>
        item.permissions.some((permission) => permission.name === permName),
      );

      if (!category) {
        return next;
      }

      const accessPermission = getCategoryAccessPermission(category);

      if (!accessPermission || accessPermission.name === permName) {
        return next;
      }

      const hasEnabledSubPermission = category.permissions
        .filter((permission) => permission.name !== accessPermission.name)
        .some((permission) => next[permission.name]);

      next[accessPermission.name] = hasEnabledSubPermission;

      return next;
    });
  };

  const handleToggleCategory = (cat: PermissionCategory) => {
    if (!selectedRole || isSuperAdmin) return;

    const nextValue = !isCategoryEnabled(cat);

    setPermissionsState((prev) => {
      const next = { ...prev };

      cat.permissions.forEach((permission) => {
        next[permission.name] = nextValue;
      });

      return next;
    });
  };

  const handleSave = async () => {
    if (!selectedRole) return;

    const selectedPermNames = Object.keys(permissionsState).filter(
      (permission) => permissionsState[permission],
    );

    try {
      const response = await api.put<{
        status?: boolean;
        message?: string;
      }>(`/roles/${selectedRole._id}/permissions`, {
        permissions: selectedPermNames,
      });

      if (response.data?.status !== true) {
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

  const filteredCategories = categories.filter(
    (category) =>
      category.category.toLowerCase().includes(search.toLowerCase()) ||
      category.permissions.some((permission) =>
        permission.name.toLowerCase().includes(search.toLowerCase()),
      ),
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
            className="luxury-btn luxury-btn-outline rpe-action-btn"
            aria-label="Clone Role"
          >
            <Copy className="rpe-action-icon" />
            <span>Clone Role</span>
          </button>
          <button
            className="luxury-btn luxury-btn-outline rpe-action-btn"
            aria-label="Change History"
          >
            <History className="rpe-action-icon" />
            <span>History</span>
          </button>
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
            <span className="rpe-sidebar-count">{roles.length}</span>
          </div>
          <nav className="rpe-sidebar-nav">
            {roles.map((role) => {
              const isActive = selectedRole?._id === role._id;

              return (
                <button
                  key={role._id}
                  onClick={() => setSelectedRole(role)}
                  className={`rpe-role-btn ${isActive ? "rpe-role-btn-active" : "rpe-role-btn-inactive"}`}
                  aria-pressed={isActive ? "true" : "false"}
                >
                  <span
                    className={`rpe-role-dot ${isActive ? "rpe-role-dot-active" : ""}`}
                  />
                  <span className="rpe-role-name">{toTitleCase(role.name)}</span>
                  {isActive && <Lock className="rpe-role-lock" />}
                </button>
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
                            (permission) => permissionsState[permission.name],
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
                      {category.permissions
                        .filter((permission) =>
                          search
                            ? permission.name
                                .toLowerCase()
                                .includes(search.toLowerCase())
                            : true,
                        )
                        .map((permission) => {
                          const isOn = !!permissionsState[permission.name];

                          return (
                            <label
                              key={permission._id}
                              className={`rpe-perm-row ${isOn ? "rpe-perm-row-on" : ""} ${isSuperAdmin ? "rpe-perm-row-disabled" : ""}`}
                            >
                              <button
                                type="button"
                                role="switch"
                                aria-checked={isOn ? "true" : "false"}
                                onClick={() => handleToggle(permission.name)}
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

                              <span className="rpe-perm-code">{permission.name}</span>
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
    </div>
  );
};

export default RolePermissionEditor;
