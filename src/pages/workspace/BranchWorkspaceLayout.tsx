import { Outlet, useParams, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useBranchWorkspace } from "@/contexts/BranchWorkspaceContext";

const BranchWorkspaceLayout = () => {
  const { branchId } = useParams();
  const navigate = useNavigate();

  const {
    activeBranch,
    enterWorkspace,
    isLoadingWorkspace,
    setNavigator,
  } = useBranchWorkspace();

  // ✅ Register navigator once
  useEffect(() => {
    setNavigator(navigate);
  }, [navigate, setNavigator]);

  // ✅ Only enter workspace if not already active
  useEffect(() => {
    if (
      branchId &&
      (!activeBranch || activeBranch._id !== branchId)
    ) {
      enterWorkspace(branchId, { navigate: false });
    }
  }, [branchId, activeBranch, enterWorkspace]);

  // ✅ Proper loading guard
  if (isLoadingWorkspace || !activeBranch) {
    return <div className="page-title">Loading branch...</div>;
  }

  return (
    <div className="workspace-layout">
      <Outlet />
    </div>
  );
};

export default BranchWorkspaceLayout;
