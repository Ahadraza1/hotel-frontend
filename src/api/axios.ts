import axios from "axios";

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

export default api;