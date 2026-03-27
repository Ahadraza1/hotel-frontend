import { useState, useEffect, useMemo, useRef } from "react";
import { useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Clock, ChefHat, CheckSquare } from "lucide-react";
import api from "@/api/axios";
import { useConfirmModal } from "@/hooks/useConfirmModal";
import { io, Socket } from "socket.io-client";

type FilterType = "all" | "pending" | "preparing" | "ready";

interface OrderItem {
  itemId: string;
  nameSnapshot: string;
  quantity: number;
  kitchenStatus: string;
}

interface Order {
  _id: string;
  orderId: string;
  orderNumber?: number;
  tableNumber?: string;
  branchId: string;
  createdAt: string;
  items: OrderItem[];
}

function formatElapsed(date: Date, now: Date): string {
  const diffMs = now.getTime() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  const secs = Math.floor((diffMs % 60000) / 1000);

  if (mins < 1) return `${secs} sec`;
  return `${mins} min`;
}

const updateItemStatus = async (
  orderId: string,
  itemId: string,
  currentStatus: string,
) => {
  let nextStatus = "PREPARING";

  if (currentStatus === "PENDING") nextStatus = "PREPARING";
  else if (currentStatus === "PREPARING") nextStatus = "READY";
  else if (currentStatus === "READY") nextStatus = "SERVED";

  try {
    await api.patch(`/pos/orders/${orderId}/items/${itemId}/status`, {
      status: nextStatus,
    });
  } catch (err) {
    console.error("Status update failed", err);
  }
};

const Kitchen = () => {
  const { branchId } = useParams();

  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [now, setNow] = useState(new Date());
  const { openConfirmModal } = useConfirmModal();

  const socketRef = useRef<Socket | null>(null);

  /*
  FETCH KITCHEN ORDERS
  */
  const fetchOrders = async (branchId: string) => {
    try {
      const res = await api.get<{ data: Order[] }>("/pos/kitchen", {
        headers: {
          "x-branch-id": branchId,
        },
      });

      setOrders(res.data.data || []);
    } catch (err) {
      console.error("Kitchen fetch error", err);
    }
  };

  /*
  SOCKET + API LOAD
  */
  useEffect(() => {
    if (!branchId) return;

    fetchOrders(branchId);

    socketRef.current = io(import.meta.env.VITE_API_URL);

    socketRef.current.emit("join-branch", branchId);

    socketRef.current.on("new-order", (order: Order) => {
      setOrders((prev) => [order, ...prev]);
    });

    socketRef.current.on("order-updated", (updated: Order) => {
      setOrders((prev) =>
        prev.map((o) => (o.orderId === updated.orderId ? updated : o)),
      );
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [branchId]);

  /*
  TIMER UPDATE
  */
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  /*
  UPDATE STATUS
  */
  const updateStatus = async (
    orderId: string,
    itemId: string,
    status: string,
  ) => {
    await api.patch(`/pos/orders/${orderId}/items/${itemId}/status`, {
      status,
    });
  };

  const markAllPreparing = (orderId: string) => {
    const order = orders.find((o) => o.orderId === orderId);

    order?.items.forEach((item) => {
      if (item.kitchenStatus === "PENDING") {
        updateStatus(orderId, item.itemId, "PREPARING");
      }
    });
  };

  const markAllReady = (orderId: string) => {
    const order = orders.find((o) => o.orderId === orderId);

    order?.items.forEach((item) => {
      if (item.kitchenStatus === "PREPARING") {
        updateStatus(orderId, item.itemId, "READY");
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

  /*
  FILTER
  */
  const filteredOrders = useMemo(() => {
    let filtered = orders.filter((o) => o.branchId === branchId);

    if (filter !== "all") {
      filtered = filtered.filter((o) =>
        o.items.some((i) => i.kitchenStatus.toLowerCase() === filter),
      );
    }

    return filtered;
  }, [filter, orders, branchId]);

  const activeCount = filteredOrders.length;

  return (
    <div className="kt-root animate-fade-in">
      {/* ── Page Header ── */}
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

      {/* ── Toolbar (Filters) ── */}
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

      {/* ── Orders Grid ── */}
      <div className="kt-grid">
        {filteredOrders.length === 0 ? (
          <div className="text-muted-foreground p-4">No active orders</div>
        ) : (
          filteredOrders.map((order) => {
            const elapsed = formatElapsed(new Date(order.createdAt), now);

            return (
              <div key={order.orderId} className="kt-card">
                <div className="kt-card-header">
                  <div className="kt-order-title">
                    <span className="kt-order-text">Order </span>
                    <span className="kt-order-number">#{String(order.orderNumber).padStart(3, "0")}</span>
                  </div>
                  <span className="kt-order-time">
                    <Clock size={14} />
                    {elapsed}
                  </span>
                </div>

                <div className="kt-items-list">
                  {order.items.map((item) => {
                    return (
                      <div key={item.itemId} className="kt-item">
                        <span className="kt-item-name">
                          <span className="kt-item-qty">{item.quantity}×</span>
                          {item.nameSnapshot}
                        </span>
                        <button
                          onClick={() =>
                            updateItemStatus(
                              order._id,
                              item.itemId,
                              item.kitchenStatus,
                            )
                          }
                          className="kt-item-badge hover:bg-muted/50 cursor-pointer transition-colors"
                        >
                          {item.kitchenStatus}
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="kt-card-actions">
                  <button
                    className="kt-action-btn kt-btn-start"
                    onClick={() => markAllPreparing(order.orderId)}
                  >
                    Start All
                  </button>
                  <button
                    className="kt-action-btn kt-btn-ready"
                    onClick={() => markAllReady(order.orderId)}
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
          })
        )}
      </div>
    </div>
  );
};

export default Kitchen;
