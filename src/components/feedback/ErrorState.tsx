import { AlertTriangle, ArrowLeft, RefreshCcw } from "lucide-react";

interface ErrorStateProps {
  description?: string;
  moduleName: string;
  onBack?: () => void;
  onRetry?: () => void;
  title?: string;
}

const ErrorState = ({
  description = "There was a problem loading this section. Please try again.",
  moduleName,
  onBack,
  onRetry,
  title,
}: ErrorStateProps) => {
  return (
    <section className="global-error-state luxury-card" role="alert" aria-live="assertive">
      <div className="global-error-state__glow" aria-hidden="true" />

      <div className="global-error-state__icon-wrap">
        <AlertTriangle className="global-error-state__icon" />
      </div>

      <div className="global-error-state__copy">
        <span className="global-error-state__eyebrow">Server Error</span>
        <h1 className="global-error-state__title">
          {title || `Failed to load ${moduleName}`}
        </h1>
        <p className="global-error-state__description">{description}</p>
        <div className="global-error-state__module-pill">{moduleName}</div>
      </div>

      <div className="global-error-state__actions">
        <button
          type="button"
          className="luxury-btn luxury-btn-primary"
          onClick={onRetry}
        >
          <RefreshCcw size={16} />
          TRY AGAIN
        </button>
        <button
          type="button"
          className="luxury-btn luxury-btn-secondary"
          onClick={onBack}
        >
          <ArrowLeft size={16} />
          Go Back
        </button>
      </div>
    </section>
  );
};

export default ErrorState;
