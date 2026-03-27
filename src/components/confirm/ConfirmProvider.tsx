import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  XCircle,
} from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ConfirmOptions {
  title?: string;
  message?: string;
  itemName?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  processingLabel?: string;
  successMessage?: string;
  errorMessage?: string;
  onConfirm?: () => Promise<void> | void;
}

interface ConfirmRequest extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);
const ToastContext = createContext<ToastContextValue | null>(null);

const getErrorMessage = (error: unknown, fallback: string) =>
  (error as { response?: { data?: { message?: string } }; message?: string })
    ?.response?.data?.message ||
  (error as { message?: string })?.message ||
  fallback;

const ConfirmModal = ({
  request,
  isProcessing,
  onCancel,
  onConfirm,
}: {
  request: ConfirmRequest;
  isProcessing: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) => {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  const title = request.title || "Confirm Deletion";
  const baseMessage =
    request.message ||
    "Are you sure you want to delete this item? This action cannot be undone.";
  const dynamicMessage = request.itemName
    ? `Are you sure you want to delete "${request.itemName}"?`
    : null;
  const confirmLabel = request.confirmLabel || "Delete";
  const cancelLabel = request.cancelLabel || "Cancel";
  const processingLabel =
    request.processingLabel ||
    (confirmLabel === "Delete" ? "Deleting..." : "Processing...");

  useEffect(() => {
    const previousActive = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const frame = window.requestAnimationFrame(() => {
      const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );

      firstFocusable?.focus();
    });

    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      previousActive?.focus?.();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isProcessing) {
        event.preventDefault();
        onCancel();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isProcessing, onCancel]);

  const trapFocus = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") {
      return;
    }

    const focusableElements = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );

    if (!focusableElements || focusableElements.length === 0) {
      return;
    }

    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    <div className="confirm-modal-layer" role="presentation">
      <div
        className="confirm-modal-backdrop"
        onClick={() => {
          if (!isProcessing) {
            onCancel();
          }
        }}
      />

      <div
        ref={dialogRef}
        className="confirm-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onKeyDown={trapFocus}
      >
        <div className="confirm-modal-icon-wrap" aria-hidden="true">
          <AlertTriangle className="confirm-modal-icon" />
        </div>

        <div className="confirm-modal-content">
          <h2 id={titleId} className="confirm-modal-title">
            {title}
          </h2>

          <div id={descriptionId} className="confirm-modal-copy">
            <p>{baseMessage}</p>
            {dynamicMessage ? <p>{dynamicMessage}</p> : null}
          </div>
        </div>

        <div className="confirm-modal-actions">
          <button
            type="button"
            className="luxury-btn luxury-btn-outline confirm-modal-cancel"
            onClick={onCancel}
            disabled={isProcessing}
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            className="luxury-btn luxury-btn-destructive confirm-modal-confirm"
            onClick={onConfirm}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="confirm-modal-spinner" />
                {processingLabel}
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

const ToastViewport = ({ toasts }: { toasts: ToastItem[] }) =>
  createPortal(
    <div className="confirm-toast-stack" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`confirm-toast confirm-toast-${toast.type}`}
          role="status"
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="confirm-toast-icon" aria-hidden="true" />
          ) : toast.type === "error" ? (
            <XCircle className="confirm-toast-icon" aria-hidden="true" />
          ) : toast.type === "warning" ? (
            <AlertTriangle className="confirm-toast-icon" aria-hidden="true" />
          ) : (
            <Info className="confirm-toast-icon" aria-hidden="true" />
          )}
          <span>{toast.message}</span>
        </div>
      ))}
    </div>,
    document.body,
  );

export const ConfirmProvider = ({ children }: { children: ReactNode }) => {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = useCallback((type: ToastType, message: string) => {
    const id = Date.now() + Math.random();

    setToasts((prev) => [...prev, { id, type, message }]);

    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3200);
  }, []);

  const closeRequest = useCallback((confirmed: boolean) => {
    setRequest((current) => {
      current?.resolve(confirmed);
      return null;
    });
    setIsProcessing(false);
  }, []);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setRequest({
          ...options,
          resolve,
        });
      }),
    [],
  );

  const handleCancel = useCallback(() => {
    if (!isProcessing) {
      closeRequest(false);
    }
  }, [closeRequest, isProcessing]);

  const handleConfirm = useCallback(async () => {
    if (!request || isProcessing) {
      return;
    }

    if (!request.onConfirm) {
      closeRequest(true);
      return;
    }

    try {
      setIsProcessing(true);
      await request.onConfirm();
      pushToast("success", request.successMessage || "Item deleted successfully.");
      closeRequest(true);
    } catch (error) {
      pushToast(
        "error",
        getErrorMessage(error, request.errorMessage || "Failed to delete item."),
      );
      setIsProcessing(false);
    }
  }, [closeRequest, isProcessing, pushToast, request]);

  const value = useMemo(() => ({ confirm }), [confirm]);
  const toast = useMemo<ToastContextValue>(
    () => ({
      success: (message: string) => pushToast("success", message),
      error: (message: string) => pushToast("error", message),
      warning: (message: string) => pushToast("warning", message),
      info: (message: string) => pushToast("info", message),
    }),
    [pushToast],
  );

  return (
    <ToastContext.Provider value={toast}>
      <ConfirmContext.Provider value={value}>
        {children}
        {request ? (
          <ConfirmModal
            request={request}
            isProcessing={isProcessing}
            onCancel={handleCancel}
            onConfirm={handleConfirm}
          />
        ) : null}
        <ToastViewport toasts={toasts} />
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);

  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }

  return context.confirm;
};

export const useToast = () => {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within a ConfirmProvider");
  }

  return context;
};
