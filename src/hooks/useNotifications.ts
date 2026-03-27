import { useQuery } from "@tanstack/react-query";
import { fetchNotifications } from "@/api/notifications";

export const useNotifications = (limit?: number) =>
  useQuery({
    queryKey: ["notifications", limit ?? "all"],
    queryFn: () => fetchNotifications(limit),
    refetchInterval: 30000,
  });
