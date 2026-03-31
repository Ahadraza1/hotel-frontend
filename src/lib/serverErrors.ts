import axios from "axios";

export const APP_SERVER_ERROR_EVENT = "app:server-error";

export interface ServerErrorDetail {
  message: string;
  method?: string;
  pathname: string;
  status?: number;
  timestamp: number;
  url?: string;
}

export const isServerRequestFailure = (error: unknown) => {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  if (!error.response) {
    return true;
  }

  return error.response.status >= 500;
};

export const dispatchServerError = (detail: Omit<ServerErrorDetail, "timestamp">) => {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<ServerErrorDetail>(APP_SERVER_ERROR_EVENT, {
      detail: {
        ...detail,
        timestamp: Date.now(),
      },
    }),
  );
};
