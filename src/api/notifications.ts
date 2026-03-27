import api from "@/api/axios";
import type { NotificationItem } from "@/types/notification";

interface NotificationsResponse {
  data: NotificationItem[];
  meta?: {
    total?: number;
    limit?: number | null;
  };
}

export const fetchNotifications = async (limit?: number) => {
  const response = await api.get<NotificationsResponse>("/notifications", {
    params: limit ? { limit } : undefined,
  });

  return {
    notifications: response.data.data || [],
    total: response.data.meta?.total || 0,
  };
};
