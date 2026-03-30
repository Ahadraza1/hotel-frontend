import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import api from "@/api/axios";
import { useAuth } from "@/contexts/AuthContext";

interface Branch {
  _id: string;
  name: string;
  country: string;
  status: string;
  rooms: number;
  occupancy: number;
  financialSettings?: {
    taxPercentage: number;
    serviceChargePercentage: number;
  };

  organization?: string;
  organizationName?: string;

  organizationId?: {
    _id: string;
    name: string;
  };
}

interface BranchWorkspaceContextType {
  activeBranch: Branch | null;
  branches: Branch[];
  isLoadingBranches: boolean;
  isWorkspaceMode: boolean;
  isLoadingWorkspace: boolean;
  enterWorkspace: (branchId: string, options?: { navigate?: boolean }) => Promise<void>;
  exitWorkspace: () => void;
  isSidebarItemRestricted: (permissionKey: string) => boolean;
  activeBranchPermissions: string[];
  setNavigator: (nav: (path: string) => void) => void;
}

const BranchWorkspaceContext = createContext<BranchWorkspaceContextType>({
  activeBranch: null,
  branches: [],
  isLoadingBranches: false,
  isWorkspaceMode: false,
  isLoadingWorkspace: false,
  enterWorkspace: async () => {},
  exitWorkspace: () => {},
  isSidebarItemRestricted: () => false,
  activeBranchPermissions: [],
  setNavigator: () => {},
});

export const useBranchWorkspace = () => useContext(BranchWorkspaceContext);

export const BranchWorkspaceProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const { user, loading: isAuthLoading } = useAuth();

  const [activeBranch, setActiveBranch] = useState<Branch | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(false);
  const [navigator, setNavigatorState] = useState<
    ((path: string) => void) | null
  >(null);
  const permissions = user?.permissions || [];

  const setNavigator = useCallback((nav: (path: string) => void) => {
    setNavigatorState(() => nav);
  }, []);

  const getExitWorkspaceRedirectPath = useCallback(() => {
    const role = user?.role?.toUpperCase();

    if (role === "SUPER_ADMIN") {
      return "/dashboard";
    }

    if (role === "CORPORATE_ADMIN") {
      return "/dashboard";
    }

    if (user?.branchId) {
      return `/workspace/${user.branchId}/overview`;
    }

    return "/dashboard";
  }, [user]);

  /*
  LOAD BRANCHES FOR WORKSPACE DROPDOWN
  */
  const loadBranches = useCallback(async () => {
    if (isAuthLoading) return;

    if (!user) {
      setBranches([]);
      setIsLoadingBranches(false);
      return;
    }

    try {
      setIsLoadingBranches(true);

      const res: any = await api.get("/branches");
      const list = res?.data?.data || res?.data || [];

      setBranches(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Failed to load branches", err);
      setBranches([]);
    } finally {
      setIsLoadingBranches(false);
    }
  }, [isAuthLoading, user]);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  /*
  ENTER WORKSPACE
  */
  const enterWorkspace = useCallback(
    async (id: string, options?: { navigate?: boolean }) => {
      if (!id || !user) return;

      try {
        setIsLoadingWorkspace(true);

        localStorage.setItem("activeBranchId", id);

        const response: any = await api.get(`/branches/${id}`);
        const branchData = response?.data?.data || response?.data;

        if (!branchData || !branchData._id) {
          throw new Error("Invalid branch response");
        }

        const normalizedBranch: Branch = {
          _id: branchData._id,
          name: branchData.name,
          financialSettings: branchData.financialSettings || {
            taxPercentage: 0,
            serviceChargePercentage: 0,
          },

          organization:
            branchData.organizationName || branchData.organization || "General",
          organizationName:
            branchData.organizationName ||
            branchData.organizationId?.name ||
            "General",
          organizationId: branchData.organizationId,

          country: branchData.country,
          status: branchData.status,
          rooms: branchData.rooms || 0,
          occupancy: branchData.occupancy || 0,
        };

        setActiveBranch(normalizedBranch);

        if (options?.navigate !== false) {
          navigator?.(`/workspace/${normalizedBranch._id}/overview`);
        }
      } catch (error) {
        console.error("Failed to enter workspace", error);

        localStorage.removeItem("activeBranchId");
        navigator?.("/");
      } finally {
        setIsLoadingWorkspace(false);
      }
    },
    [navigator, user],
  );

  /*
  EXIT WORKSPACE
  */
  const exitWorkspace = useCallback(() => {
    setActiveBranch(null);
    localStorage.removeItem("activeBranchId");
    navigator?.(getExitWorkspaceRedirectPath());
  }, [getExitWorkspaceRedirectPath, navigator]);

  /*
  SIDEBAR PERMISSION CHECK
  */
  const isSidebarItemRestricted = useCallback(
    (permissionKey: string) => {
      if (!activeBranch) return false;

      if (!permissions || permissions.length === 0) {
        return true;
      }

      return !permissions.includes(permissionKey);
    },
    [activeBranch, permissions],
  );

  return (
    <BranchWorkspaceContext.Provider
      value={{
        activeBranch,
        branches,
        isLoadingBranches,
        isWorkspaceMode: !!activeBranch,
        isLoadingWorkspace,
        enterWorkspace,
        exitWorkspace,
        isSidebarItemRestricted,
        activeBranchPermissions: permissions,
        setNavigator,
      }}
    >
      {children}
    </BranchWorkspaceContext.Provider>
  );
};
