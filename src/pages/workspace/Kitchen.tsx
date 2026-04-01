import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Clock, ChefHat, CheckSquare } from "lucide-react";
import api from "@/api/axios";
import { useConfirmModal } from "@/hooks/useConfirmModal";
import socket from "@/socket";

type FilterType = "all" | "pending" | "preparing" | "ready";

interface OrderItem {
  itemId: string;
  nameSnapshot: string;
  quantity: number;
  kitchenStatus: string;
}

interface KitchenOrder {
  _id: string;
  orderId: string;
  orderNumber?: number;
  createdAt: string;
  status: string;
  items: OrderItem[];
  sessionId: string;
  session: {
    type: "DINE_IN" | "ROOM_SERVICE";
    tableNo?: string | null;
    roomNo?: string | null;
  };
}

interface KitchenGroup {
  groupType: "TABLE" | "ROOM" | "TAKEAWAY";
  groupLabel: string;
  sessionId: string;
  branchId: string;
  createdAt: string;
  session: {
    type: "DINE_IN" | "ROOM_SERVICE";
    tableNo?: string | null;
    roomNo?: string | null;
  };
  orders: KitchenOrder[];
}

const ACTIVE_KITCHEN_STATUSES = new Set(["PENDING", "PREPARING", "READY"]);

const normalizeKitchenOrder = (order: KitchenOrder): KitchenOrder | null => {
  const activeItems = (order.items || []).filter((item) =>
    ACTIVE_KITCHEN_STATUSES.has(String(item.kitchenStatus || "").toUpperCase()),
  );

  if (activeItems.length === 0) {
    return null;
  }

  return {
    ...order,
    items: activeItems,
  };
};

const normalizeKitchenGroup = (group: KitchenGroup): KitchenGroup | null => {
  const normalizedOrders = (group.orders || [])
    .map(normalizeKitchenOrder)
    .filter((order): order is KitchenOrder => order !== null);

  if (!normalizedOrders.length) {
    return null;
  }

  return {
    ...group,
    orders: normalizedOrders,
  };
};

function formatElapsed(date: Date, now: Date): string {
  const diffMs = now.getTime() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  const secs = Math.floor((diffMs % 60000) / 1000);

  if (mins < 1) return `${secs} sec`;
  return `${mins} min`;
}

const Kitchen = () => {
  const { branchId } = useParams();

  const [groups, setGroups] = useState<KitchenGroup[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [now, setNow] = useState(new Date());
  const { openConfirmModal } = useConfirmModal();

  const fetchGroups = async (activeBranchId: string) => {
    try {
      const res = await api.get<{ data: KitchenGroup[] }>("/pos/kitchen", {
        headers: {
          "x-branch-id": activeBranchId,
        },
      });

      setGroups(
        (res.data.data || [])
          .map(normalizeKitchenGroup)
          .filter((group): group is KitchenGroup => group !== null),
      );
    } catch (err) {
      console.error("Kitchen fetch error", err);
    }
  };

  useEffect(() => {
    if (!branchId) return;

    void fetchGroups(branchId);

    socket.emit("join-branch", branchId);

    const refreshGroups = () => {
      void fetchGroups(branchId);
    };

    socket.on("new-order", refreshGroups);
    socket.on("order-updated", refreshGroups);
    socket.on("ORDER_CREATED", refreshGroups);
    socket.on("ORDER_UPDATED", refreshGroups);

    return () => {
      socket.off("new-order", refreshGroups);
      socket.off("order-updated", refreshGroups);
      socket.off("ORDER_CREATED", refreshGroups);
      socket.off("ORDER_UPDATED", refreshGroups);
    };
  }, [branchId]);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const updateStatus = async (
    orderId: string,
    itemId: string,
    status: string,
  ) => {
    await api.patch(`/pos/orders/${orderId}/items/${itemId}/status`, {
      status,
    });
  };

  const markAllPreparing = (order: KitchenOrder) => {
    order.items.forEach((item) => {
      if (item.kitchenStatus === "PENDING") {
        void updateStatus(order.orderId, item.itemId, "PREPARING");
      }
    });
  };

  const markAllReady = (order: KitchenOrder) => {
    order.items.forEach((item) => {
      if (item.kitchenStatus === "PREPARING") {
        void updateStatus(order.orderId, item.itemId, "READY");
      }
    });
  };

  const completeOrder = async (orderId: string) => {
    openConfirmModal({
      title: "Confirm Completion",
      message: "Are you sure you want to complete this order and remove it from the display?",
      type: "warning",
      confirmLabel: "Complete Order",
      onConfirm: async () => {
        await api.patch(`/pos/orders/${orderId}/complete`);
      },
    });
  };

  const filteredGroups = useMemo(() => {
    let nextGroups = groups.filter((group) => group.branchId === branchId);

    if (filter !== "all") {
      nextGroups = nextGroups
        .map((group) => ({
          ...group,
          orders: group.orders.filter((order) =>
            order.items.some(
              (item) => String(item.kitchenStatus || "").toLowerCase() === filter,
            ),
          ),
        }))
        .filter((group) => group.orders.length > 0);
    }

    return nextGroups;
  }, [branchId, filter, groups]);

  const activeCount = filteredGroups.length;

  return (
    <div className="kt-root animate-fade-in">
      <div className="kt-page-header">
        <div className="kt-title-group">
          <div className="add-branch-header-icon-wrap">
            <ChefHat className="add-branch-header-icon" />
          </div>
          <div>
            <h1 className="page-title">Kitchen Display</h1>
            <p className="page-subtitle">
              Manage incoming orders and kitchen workflows • {activeCount}{" "}
              active orders
            </p>
          </div>
        </div>
      </div>

      <div className="kt-toolbar">
        <div className="kt-filter-group">
          {(["all", "pending", "preparing", "ready"] as FilterType[]).map(
            (f) => (
              <button
                key={f}
                className={`kt-filter-btn ${filter === f ? "active" : ""}`}
                onClick={() => setFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ),
          )}
        </div>
      </div>

      <div className="kt-grid">
        {filteredGroups.length === 0 ? (
          <div className="text-muted-foreground p-4">No active orders</div>
        ) : (
          filteredGroups.map((group) => {
            const groupElapsed = formatElapsed(new Date(group.createdAt), now);

            return (
              <div key={`${group.groupType}-${group.sessionId}`} className="kt-card">
                <div className="kt-card-header">
                  <div className="kt-order-title">
                    <span className="kt-order-number">{group.groupLabel}</span>
                  </div>
                  <span className="kt-order-time">
                    <Clock size={14} />
                    {groupElapsed}
                  </span>
                </div>

                <div className="kt-items-list">
                  {group.orders.map((order) => {
                    const orderElapsed = formatElapsed(new Date(order.createdAt), now);

                    return (
                      <div key={order.orderId}>
                        <div className="kt-card-header">
                          <div className="kt-order-title">
                            <span className="kt-order-text">Order </span>
                            <span className="kt-order-number">
                              {order.orderNumber
                                ? `#${String(order.orderNumber).padStart(3, "0")}`
                                : order.orderId}
                            </span>
                          </div>
                          <span className="kt-order-time">
                            <Clock size={14} />
                            {orderElapsed}
                          </span>
                        </div>

                        <div className="kt-items-list">
                          {order.items.map((item) => (
                            <div key={`${order.orderId}-${item.itemId}`} className="kt-item">
                              <span className="kt-item-name">
                                <span className="kt-item-qty">{item.quantity}×</span>
                                {item.nameSnapshot}
                              </span>
                              <button
                                onClick={() =>
                                  void updateStatus(
                                    order.orderId,
                                    item.itemId,
                                    item.kitchenStatus,
                                  )
                                }
                                className="kt-item-badge hover:bg-muted/50 cursor-pointer transition-colors"
                              >
                                {item.kitchenStatus}
                              </button>
                            </div>
                          ))}
                        </div>

                        <div className="kt-card-actions">
                          <button
                            className="kt-action-btn kt-btn-start"
                            onClick={() => markAllPreparing(order)}
                          >
                            Start All
                          </button>
                          <button
                            className="kt-action-btn kt-btn-ready"
                            onClick={() => markAllReady(order)}
                          >
                            Set Ready
                          </button>
                          <button
                            className="kt-action-btn kt-btn-complete"
                            onClick={() => completeOrder(order.orderId)}
                          >
                            <CheckSquare size={13} />
                            Complete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Kitchen;
