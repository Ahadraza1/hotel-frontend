import axios from "axios";
import { dispatchServerError, isServerRequestFailure } from "@/lib/serverErrors";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  /*
  Branch id fallback system
  */
  let branchId = localStorage.getItem("activeBranchId");

  /*
  If workspace not initialized yet,
  try userBranchId (set at login)
  */
  if (!branchId) {
    branchId = localStorage.getItem("userBranchId");
  }

  config.headers = config.headers || {};

  /*
  AUTH TOKEN
  */
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  /*
  BRANCH HEADER
  */
  if (branchId) {
    config.headers["x-branch-id"] = branchId;
  }

  console.log("🚀 API Request:", {
    url: config.url,
    branch: branchId,
  });

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (isServerRequestFailure(error)) {
      dispatchServerError({
        message: error.message || "A server error occurred.",
        method: error.config?.method?.toUpperCase(),
        pathname:
          typeof window === "undefined" ? "" : window.location.pathname,
        status: error.response?.status,
        url: error.config?.url,
      });
    }

    return Promise.reject(error);
  },
);

export default api;
