export interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  type: string;
  organizationId: string | null;
  branchId: string | null;
  module: string;
  createdAt: string;
}
