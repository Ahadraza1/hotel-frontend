import { Fragment, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ErrorState from "@/components/feedback/ErrorState";
import {
  APP_SERVER_ERROR_EVENT,
  type ServerErrorDetail,
} from "@/lib/serverErrors";

interface ModuleErrorBoundaryProps {
  children: ReactNode;
  moduleName: string;
}

const ModuleErrorBoundary = ({
  children,
  moduleName,
}: ModuleErrorBoundaryProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeError, setActiveError] = useState<ServerErrorDetail | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    setActiveError(null);
  }, [location.pathname, moduleName]);

  useEffect(() => {
    const handleServerError = (event: Event) => {
      const detail = (event as CustomEvent<ServerErrorDetail>).detail;

      if (!detail || detail.pathname !== location.pathname) {
        return;
      }

      setActiveError(detail);
    };

    window.addEventListener(APP_SERVER_ERROR_EVENT, handleServerError as EventListener);

    return () => {
      window.removeEventListener(
        APP_SERVER_ERROR_EVENT,
        handleServerError as EventListener,
      );
    };
  }, [location.pathname]);

  if (activeError) {
    return (
      <ErrorState
        moduleName={moduleName}
        title={`Failed to load ${moduleName}`}
        description="There was a problem loading this section. Please try again."
        onRetry={() => {
          setActiveError(null);
          setRetryKey((current) => current + 1);
        }}
        onBack={() => navigate(-1)}
      />
    );
  }

  return <Fragment key={retryKey}>{children}</Fragment>;
};

export default ModuleErrorBoundary;
