import { useConfirm } from "@/components/confirm/ConfirmProvider";

interface OpenConfirmModalOptions {
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  successMessage?: string;
  errorMessage?: string;
  onConfirm?: () => Promise<void> | void;
  type?: "warning" | "danger" | "info";
}

export const useConfirmModal = () => {
  const confirm = useConfirm();

  return {
    openConfirmModal: (options: OpenConfirmModalOptions) =>
      confirm({
        title: options.title,
        message: options.message,
        confirmLabel: options.confirmLabel,
        cancelLabel: options.cancelLabel,
        processingLabel:
          options.confirmLabel === "Complete Order"
            ? "Completing..."
            : undefined,
        successMessage: options.successMessage,
        errorMessage: options.errorMessage,
        onConfirm: options.onConfirm,
      }),
  };
};
