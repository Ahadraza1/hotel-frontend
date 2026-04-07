import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "@/api/axios";
import { useAuth } from "@/contexts/AuthContext";
import { useBranchWorkspace } from "@/contexts/BranchWorkspaceContext";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import { useConfirm, useToast } from "@/components/confirm/ConfirmProvider";
import PermissionNotice from "@/components/auth/PermissionNotice";
import { connectSocket } from "@/socket";
import {
  Plus,
  Trash2,
  Pencil,
  CreditCard,
  Banknote,
  Search,
  Clock,
  Users,
  Building,
  ShoppingCart,
  X,
  Utensils,
  Send,
  Smartphone,
  Landmark,
} from "lucide-react";

type OrderMode = "DINE_IN" | "ROOM_SERVICE" | "TAKEAWAY";

interface Category {
  categoryId: string;
  name: string;
}

interface POSItem {
  itemId: string;
  name: string;
  price: number;
  categoryId: string;
  description?: string;
  isSoldOut?: boolean;
}

interface CartItem extends POSItem {
  quantity: number;
}

interface TableOption {
  _id: string;
  name: string;
  tableNumber?: string;
  seats: number;
  status: "AVAILABLE" | "OCCUPIED";
}

interface RoomOption {
  _id: string;
  roomNumber: string;
  currentGuestName?: string;
  currentBookingId?: string;
}

interface LiveOrder {
  _id?: string;
  orderId: string;
  orderCode: string;
  orderType: OrderMode;
  tableNumber?: string | null;
  grandTotal: number;
  orderStatus: string;
  createdAt?: string;
  roomId?: string | { roomNumber?: string } | null;
}

const POS = () => {
  const { branchId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();

  const { user, token, loading: isAuthLoading } = useAuth();
  const { activeBranch } = useBranchWorkspace();
  const { formatCurrency } = useSystemSettings();
  const { canAccess, canView, canCreate, canUpdate, canDelete } =
    useModulePermissions("POS");

  const [categories, setCategories] = useState<Category[]>([]);
  const [menu, setMenu] = useState<POSItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showPayment, setShowPayment] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [search, setSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [amountReceived, setAmountReceived] = useState<string>("0.00");
  const [tables, setTables] = useState<TableOption[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [liveOrders, setLiveOrders] = useState<LiveOrder[]>([]);
  const [orderMode, setOrderMode] = useState<OrderMode>("DINE_IN");
  const [selectedTableId, setSelectedTableId] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [selectedBookingId, setSelectedBookingId] = useState("");
  const [discount, setDiscount] = useState(0);
  const orderItemsListRef = useRef<HTMLDivElement | null>(null);
  const [mobileFocusedItemId, setMobileFocusedItemId] = useState<string | null>(
    null,
  );
  const [isDesktopViewport, setIsDesktopViewport] = useState(false);

  useEffect(() => {
    if (user && !canAccess) {
      navigate("/unauthorized");
    }
  }, [user, canAccess, navigate]);

  const shouldHideContent = !!user && canAccess && !canView;

  useEffect(() => {
    if (isAuthLoading || !branchId || !token || !user) return;

    const socket = connectSocket(token);

    if (!socket) return;

    socket.emit("join-branch", `branch-${branchId}`);
    socket.emit("join-branch", `branch_${branchId}`);

    const handleNewOrder = (order: LiveOrder) => {
      setLiveOrders((prev) => {
        const next = prev.filter((entry) => entry.orderId !== order.orderId);
        return [order, ...next];
      });
    };

    const handleOrderUpdated = (order: LiveOrder) => {
      setLiveOrders((prev) => {
        const found = prev.some((entry) => entry.orderId === order.orderId);
        const next = prev.map((entry) =>
          entry.orderId === order.orderId ? order : entry,
        );
        return found ? next : [order, ...next];
      });
    };

    socket.on("new-order", handleNewOrder);
    socket.on("order-updated", handleOrderUpdated);

    void fetchData();

    if (window.innerWidth > 1024) {
      setShowCart(true);
    }

    return () => {
      socket.off("new-order", handleNewOrder);
      socket.off("order-updated", handleOrderUpdated);
    };
  }, [branchId, isAuthLoading, token, user]);

  useEffect(() => {
    setSelectedTableId("");
    setSelectedRoomId("");
    setSelectedBookingId("");
  }, [orderMode]);

  useEffect(() => {
    const syncViewport = () => {
      setIsDesktopViewport(window.innerWidth > 1024);
    };

    syncViewport();
    window.addEventListener("resize", syncViewport);

    return () => {
      window.removeEventListener("resize", syncViewport);
    };
  }, []);

  useEffect(() => {
    if (
      !showCart ||
      !mobileFocusedItemId ||
      typeof window === "undefined" ||
      window.innerWidth > 1024
    ) {
      return;
    }

    const listElement = orderItemsListRef.current;
    const itemElement = listElement?.querySelector<HTMLElement>(
      `[data-cart-item-id="${mobileFocusedItemId}"]`,
    );

    if (!listElement || !itemElement) {
      return;
    }

    requestAnimationFrame(() => {
      itemElement.scrollIntoView({
        block: "nearest",
        inline: "nearest",
      });
      setMobileFocusedItemId(null);
    });
  }, [cart, mobileFocusedItemId, showCart]);

  const fetchData = async () => {
    const [catRes, itemRes, tableRes, roomRes, orderRes] = await Promise.all([
      api.get<{ data: Category[] }>("/pos/categories"),
      api.get<{ data: POSItem[] }>("/pos/items"),
      api.get<{ data: TableOption[] }>("/pos/tables"),
      api.get<{ data: RoomOption[] }>("/rooms", {
        params: { status: "CHECKED_IN" },
      }),
      api.get<{ data: LiveOrder[] }>("/pos/orders", {
        params: { status: "ACTIVE" },
      }),
    ]);

    setCategories(catRes.data.data);
    setMenu(itemRes.data.data);
    setTables(tableRes.data.data);
    setRooms(roomRes.data.data);
    setLiveOrders(orderRes.data.data);

    if (catRes.data.data.length) {
      setSelectedCategory((current) => current ?? catRes.data.data[0].categoryId);
    }
  };

  const filteredMenu = useMemo(
    () =>
      menu.filter((item) => {
        const matchesCategory =
          selectedCategory === null || item.categoryId === selectedCategory;
        const matchesSearch = item.name
          .toLowerCase()
          .includes(search.toLowerCase());
        return matchesCategory && matchesSearch;
      }),
    [menu, search, selectedCategory],
  );

  const selectedCategoryDetails =
    categories.find((category) => category.categoryId === selectedCategory) ||
    null;

  const getCategoryName = (categoryId: string) =>
    categories.find((category) => category.categoryId === categoryId)?.name ||
    "Menu Item";

  const selectedTable =
    tables.find((table) => table._id === selectedTableId) || null;
  const selectedRoom =
    rooms.find((room) => room._id === selectedRoomId) || null;

  const branchTaxPercentage = Number(
    activeBranch?.financialSettings?.taxPercentage || 0,
  );
  const branchServiceChargePercentage = Number(
    activeBranch?.financialSettings?.serviceChargePercentage || 0,
  );

  const subTotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const discountAmount = subTotal * (discount / 100);
  const taxableBase = Math.max(subTotal - discountAmount, 0);
  const taxAmount = (taxableBase * branchTaxPercentage) / 100;
  const serviceCharge = (taxableBase * branchServiceChargePercentage) / 100;
  const total = subTotal - discountAmount + taxAmount + serviceCharge;
  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const addToCart = (item: POSItem) => {
    if (typeof window !== "undefined" && window.innerWidth <= 1024) {
      setShowCart(true);
      setMobileFocusedItemId(item.itemId);
    }

    const existing = cart.find((entry) => entry.itemId === item.itemId);

    if (existing) {
      setCart((prev) =>
        prev.map((entry) =>
          entry.itemId === item.itemId
            ? { ...entry, quantity: entry.quantity + 1 }
            : entry,
        ),
      );
      return;
    }

    setCart((prev) => [...prev, { ...item, quantity: 1 }]);
  };

  const updateQty = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((entry) =>
          entry.itemId === itemId
            ? { ...entry, quantity: entry.quantity + delta }
            : entry,
        )
        .filter((entry) => entry.quantity > 0),
    );
  };

  const placeOrder = async (selectedPaymentMethod?: string) => {
    if (!cart.length) return;

    if (orderMode === "DINE_IN" && !selectedTable) {
      toast.warning("Please select a table before sending the order");
      return;
    }

    if (orderMode === "ROOM_SERVICE" && !selectedRoom) {
      toast.warning("Please select a checked-in room before sending the order");
      return;
    }

    try {
      const payload: Record<string, unknown> = {
        orderType: orderMode,
        discountPercentage: discount,
        discountAmount,
        items: cart.map((entry) => ({
          itemId: entry.itemId,
          quantity: entry.quantity,
        })),
      };

      if (orderMode === "DINE_IN" && selectedTable) {
        payload.tableId = selectedTable._id;
        payload.tableNumber = selectedTable.tableNumber || selectedTable.name;
      }

      if (orderMode === "ROOM_SERVICE" && selectedRoom) {
        payload.roomId = selectedRoom._id;
        payload.bookingId = selectedBookingId || selectedRoom.currentBookingId;
      }

      const orderRes = await api.post<{ data: { orderId: string } }>(
        "/pos/orders",
        payload,
      );

      if (selectedPaymentMethod) {
        await api.patch(`/pos/orders/${orderRes.data.data.orderId}/pay`, {
          paymentMethod: selectedPaymentMethod,
        });
        await api.patch(`/pos/orders/${orderRes.data.data.orderId}/status`, {
          status: "COMPLETED",
        });
      }

      setCart([]);
      setShowPayment(false);
      setAmountReceived("0.00");

      await fetchData();

      toast.success(
        selectedPaymentMethod
          ? "Order placed, billed, and closed successfully."
          : "Order placed successfully.",
      );
    } catch (error: unknown) {
      console.error("Order create failed", error);
      toast.error("Failed to create order");
    }
  };

  const getCategoryIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes("appetizer") || lower.includes("starter")) return "🍽";
    if (lower.includes("main")) return "🥘";
    if (lower.includes("pasta")) return "🍝";
    if (lower.includes("seafood")) return "🍤";
    if (lower.includes("dessert")) return "🍰";
    if (lower.includes("beverage") || lower.includes("drink")) return "🥤";
    return "🍴";
  };

  const editCategory = () => {
    if (!selectedCategoryDetails) return;

    navigate(
      `/workspace/${branchId}/pos/category/edit/${selectedCategoryDetails.categoryId}`,
    );
  };

  const deleteCategory = async () => {
    if (!selectedCategoryDetails) return;

    const confirmed = await confirm({
      title: "Delete Category",
      itemName: selectedCategoryDetails.name,
      message:
        "Are you sure you want to delete this category? This action cannot be undone.",
      successMessage: "Category deleted successfully.",
      errorMessage: "Failed to delete category.",
      onConfirm: async () => {
        await api.delete(
          `/pos/categories/${selectedCategoryDetails.categoryId}`,
        );
      },
    });

    if (confirmed) {
      await fetchData();
    }
  };

  const editItem = (itemId: string) => {
    navigate(`/workspace/${branchId}/pos/menu/edit/${itemId}`);
  };

  const deleteItem = async (item: POSItem) => {
    const confirmed = await confirm({
      title: "Delete Menu Item",
      itemName: item.name,
      message:
        "Are you sure you want to delete this menu item? This action cannot be undone.",
      successMessage: "Menu item deleted successfully.",
      errorMessage: "Failed to delete menu item.",
      onConfirm: async () => {
        await api.delete(`/pos/items/${item.itemId}`);
      },
    });

    if (confirmed) {
      await fetchData();
    }
  };

  const activeOrders = liveOrders.filter((order) =>
    ["PREPARING", "IN_PROGRESS"].includes(order.orderStatus),
  );

  const getOrderLocationLabel = (order: LiveOrder) => {
    if (order.orderType === "DINE_IN") {
      return order.tableNumber ? `Table ${order.tableNumber}` : "Dine-in";
    }

    if (order.orderType === "ROOM_SERVICE") {
      const roomNumber =
        typeof order.roomId === "object" ? order.roomId?.roomNumber : undefined;
      return roomNumber ? `Room ${roomNumber}` : "Room Service";
    }

    return "Takeaway";
  };

  if (shouldHideContent) {
    return (
      <PermissionNotice message="POS menu data is hidden because VIEW_POS_MENU is disabled for your role." />
    );
  }

  return (
    <div className="pos-layout">
      <div className="pos-menu-section">
        <div className="pos-page-shell">
          <div className="pos-page-hero">
            <div className="pos-page-hero-copy">
              <span className="pos-page-eyebrow">Point Of Sale</span>
              <h1 className="pos-page-title">Menu management workspace</h1>
              <p className="pos-page-subtitle">
                Browse categories, manage menu items, and keep service ready on
                every screen size.
              </p>
            </div>
            <div className="pos-page-stats" aria-label="POS overview">
              <div className="pos-stat-card">
                <span className="pos-stat-label">Categories</span>
                <strong className="pos-stat-value">{categories.length}</strong>
              </div>
              <div className="pos-stat-card">
                <span className="pos-stat-label">Visible Items</span>
                <strong className="pos-stat-value">{filteredMenu.length}</strong>
              </div>
              <div className="pos-stat-card">
                <span className="pos-stat-label">Active Orders</span>
                <strong className="pos-stat-value">{activeOrders.length}</strong>
              </div>
            </div>
          </div>

          <div className="pos-top-bar">
            <div className="pos-top-bar-content">
              <div className="pos-search-wrapper flex-1">
                <Search className="pos-search-icon" size={18} />
                <input
                  type="text"
                  placeholder="Search menu items..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="pos-search-input-refined"
                />
              </div>

              <div className="pos-management-toolbar">
                {canCreate && (
                  <button
                    className="pos-mgmt-btn add"
                    onClick={() =>
                      navigate(`/workspace/${branchId}/pos/category/add`)
                    }
                    title="Add Category"
                  >
                    <Plus size={16} />
                    <span>Category</span>
                  </button>
                )}
                {canCreate && (
                  <button
                    className="pos-mgmt-btn add"
                    onClick={() => navigate(`/workspace/${branchId}/pos/menu/add`)}
                    title="Add Menu Item"
                  >
                    <Utensils size={16} />
                    <span>Menu Item</span>
                  </button>
                )}

                {selectedCategory && (
                  <div className="pos-management-divider">
                    {canUpdate && (
                      <button
                        className="pos-mgmt-btn edit"
                        onClick={editCategory}
                        title="Edit Selected Category"
                      >
                        <Pencil size={15} />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        className="pos-mgmt-btn delete"
                        onClick={deleteCategory}
                        title="Delete Selected Category"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pos-category-container">
            <div className="pos-section-head">
              <div>
                <h2 className="pos-section-title">Categories</h2>
                <p className="pos-section-subtitle">
                  Filter the menu by course or item group.
                </p>
              </div>
              <div className="pos-section-badge">
                {selectedCategoryDetails?.name || "All categories"}
              </div>
            </div>

            <div className="pos-category-scroller scrollbar-hide">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`pos-cat-pill ${selectedCategory === null ? "active" : ""}`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.categoryId}
                  onClick={() => setSelectedCategory(cat.categoryId)}
                  className={`pos-cat-pill ${selectedCategory === cat.categoryId ? "active" : ""}`}
                >
                  <span>{getCategoryIcon(cat.name)}</span>
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div className="pos-menu-grid-container">
            <div className="pos-section-head">
              <div>
                <h2 className="pos-section-title">Menu items</h2>
                <p className="pos-section-subtitle">
                  {filteredMenu.length} item{filteredMenu.length === 1 ? "" : "s"}{" "}
                  available for the current filter.
                </p>
              </div>
              <div className="pos-section-badge">
                Cart {cartItemsCount} item{cartItemsCount === 1 ? "" : "s"}
              </div>
            </div>

            {filteredMenu.length === 0 ? (
              <div className="pos-empty-results">
                <div className="pos-empty-results-icon">
                  <Search size={22} />
                </div>
                <h3>No menu items found</h3>
                <p>Try another search term or switch to a different category.</p>
              </div>
            ) : (
              <div className="pos-menu-grid">
                {filteredMenu.map((item, idx) => (
                  <div
                    key={item.itemId}
                    onClick={() => !item.isSoldOut && addToCart(item)}
                    className={`pos-item-card-refined group ${item.isSoldOut ? "sold-out" : ""}`}
                  >
                    <div
                      className={`pos-item-visual bg-gradient-to-br pos-gradient-${(idx % 6) + 1}`}
                    >
                      <div className="pos-item-visual-inner">
                        <span className="pos-item-category-tag">
                          {selectedCategoryDetails?.name ||
                            getCategoryName(item.categoryId)}
                        </span>
                        <span className="pos-item-visual-mark">
                          {item.name.slice(0, 1).toUpperCase()}
                        </span>
                      </div>

                      {item.isSoldOut && (
                        <span className="pos-unavailable-badge">Unavailable</span>
                      )}
                    </div>
                    <div className="pos-item-content">
                      <div className="pos-item-copy">
                        <h3 className="pos-item-name-refined">{item.name}</h3>
                        {item.description && (
                          <p className="pos-item-description">{item.description}</p>
                        )}
                      </div>
                      <div className="pos-item-meta">
                        <span className="pos-item-price-refined">
                          {formatCurrency(item.price)}
                        </span>
                        <span className="pos-item-time-refined">
                          <Clock size={12} className="inline mr-1 opacity-60" />
                          {Math.floor(Math.random() * 20) + 5}m
                        </span>
                      </div>
                      <div className="pos-item-footer">
                        <span className="pos-item-status">
                          {item.isSoldOut ? "Currently unavailable" : "Tap to add"}
                        </span>
                      </div>
                    </div>

                    <div className="pos-item-actions-refined">
                      {canUpdate && (
                        <button
                          type="button"
                          className="pos-item-action-btn-refined"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            editItem(item.itemId);
                          }}
                          title="Edit Menu Item"
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          className="pos-item-action-btn-refined text-destructive"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            void deleteItem(item);
                          }}
                          title="Delete Menu Item"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* <div className={`pos-order-panel ${showCart ? "active" : ""}`}>
        <div className="pos-order-panel-header p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="pos-panel-title">Current Order</h2>
            {cart.length > 0 && (
              <button className="pos-panel-clear" onClick={() => setCart([])}>
                Clear All
              </button>
            )}
            <button
              className="pos-panel-close"
              onClick={() => setShowCart(false)}
              title="Close cart"
            >
              <X size={20} />
            </button>
          </div>

          <div className="pos-order-tabs">
            <button
              className={`pos-order-tab ${orderMode === "DINE_IN" ? "active" : ""}`}
              onClick={() => setOrderMode("DINE_IN")}
            >
              Dine-in
            </button>
            <button
              className={`pos-order-tab ${orderMode === "ROOM_SERVICE" ? "active" : ""}`}
              onClick={() => setOrderMode("ROOM_SERVICE")}
            >
              Room Service
            </button>
            <button
              className={`pos-order-tab ${orderMode === "TAKEAWAY" ? "active" : ""}`}
              onClick={() => setOrderMode("TAKEAWAY")}
            >
              Takeaway
            </button>
          </div>

          <div className="pos-select-wrap mt-4">
            {orderMode === "ROOM_SERVICE" ? (
              <Building className="pos-select-icon" size={16} />
            ) : (
              <Users className="pos-select-icon" size={16} />
            )}

            {orderMode === "DINE_IN" && (
              <select
                value={selectedTableId}
                onChange={(event) => setSelectedTableId(event.target.value)}
                className="pos-select-input-refined"
                title="Select a table for the order"
              >
                <option value="">Select Table</option>
                {tables.map((table) => (
                  <option
                    key={table._id}
                    value={table._id}
                  >
                    {(table.tableNumber || table.name) +
                      ` (${table.seats} seats) - ${table.status}`}
                  </option>
                ))}
              </select>
            )}

            {orderMode === "ROOM_SERVICE" && (
              <select
                value={selectedRoomId}
                onChange={(event) => {
                  const room = rooms.find(
                    (entry) => entry._id === event.target.value,
                  );
                  setSelectedRoomId(event.target.value);
                  setSelectedBookingId(room?.currentBookingId || "");
                }}
                className="pos-select-input-refined"
                title="Select a checked-in room for the order"
              >
                <option value="">Select Room / Guest</option>
                {rooms.map((room) => (
                  <option key={room._id} value={room._id}>
                    {`Room ${room.roomNumber} - ${room.currentGuestName || "Guest"}`}
                  </option>
                ))}
              </select>
            )}

            {orderMode === "TAKEAWAY" && (
              <select
                value="TAKEAWAY"
                disabled
                className="pos-select-input-refined"
                title="Takeaway orders do not require a table or room"
              >
                <option value="TAKEAWAY">Takeaway - direct billing</option>
              </select>
            )}
          </div>

          {(selectedTable || selectedRoom || orderMode === "TAKEAWAY") && (
            <div className="mt-3 text-sm text-slate-600">
              {orderMode === "DINE_IN" && selectedTable
                ? `Selected table: ${selectedTable.tableNumber || selectedTable.name}`
                : null}
              {orderMode === "ROOM_SERVICE" && selectedRoom
                ? `Selected room: ${selectedRoom.roomNumber} - ${selectedRoom.currentGuestName || "Guest"}`
                : null}
              {orderMode === "TAKEAWAY"
                ? "Takeaway order ready for direct billing"
                : null}
            </div>
          )}
        </div>

        <div
          ref={orderItemsListRef}
          className="pos-order-items-list px-6 scrollbar-custom"
        >
          {cart.length === 0 ? (
            <div className="pos-empty-state">
              <ShoppingCart size={48} strokeWidth={1} className="mb-4 opacity-20" />
              <p>No items in cart</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 py-2">
              {cart.map((item) => (
                <div
                  key={item.itemId}
                  data-cart-item-id={item.itemId}
                  className="pos-order-card-refined"
                >
                  <div className="pos-order-card-main">
                    <span className="pos-order-card-name">{item.name}</span>
                    <span className="pos-order-card-price">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                  <div className="pos-order-card-footer mt-3">
                    <div className="pos-qty-refiner">
                      <button
                        onClick={() => updateQty(item.itemId, -1)}
                        title="Decrease quantity"
                      >
                        -
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        onClick={() => updateQty(item.itemId, 1)}
                        title="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                    <button
                      className="pos-order-remove-refined"
                      onClick={() =>
                        setCart((prev) =>
                          prev.filter((entry) => entry.itemId !== item.itemId),
                        )
                      }
                      title="Remove item from cart"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pos-order-panel-footer p-6">
          <div className="pos-bill-summary mt-6">
            <div className="pos-discount-section mb-4">
              <label className="pos-discount-label">% DISCOUNT</label>
              <div className="pos-discount-chips">
                {[0, 5, 10, 15, 20].map((value) => (
                  <button
                    key={value}
                    className={`pos-discount-chip ${discount === value ? "active" : ""}`}
                    onClick={() => setDiscount(value)}
                  >
                    {value}%
                  </button>
                ))}
              </div>
            </div>

            <div className="pos-bill-row">
              <span className="opacity-70">
                Subtotal ({cart.reduce((sum, item) => sum + item.quantity, 0)} items)
              </span>
              <span>{formatCurrency(subTotal)}</span>
            </div>

            {discount > 0 && (
              <div className="pos-bill-row discount">
                <span>Discount ({discount}%)</span>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
            )}

            <div className="pos-bill-row">
              <span className="opacity-70">Tax ({branchTaxPercentage}%)</span>
              <span>{formatCurrency(taxAmount)}</span>
            </div>

            {branchServiceChargePercentage > 0 && (
              <div className="pos-bill-row">
                <span className="opacity-70">
                  Service Charge ({branchServiceChargePercentage}%)
                </span>
                <span>{formatCurrency(serviceCharge)}</span>
              </div>
            )}

            <div className="pos-bill-row total">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="pos-panel-actions mt-6">
            <button
              className="pos-btn-refined-outline"
              onClick={() => void placeOrder()}
              disabled={
                cart.length === 0 ||
                (orderMode === "DINE_IN" && !selectedTable) ||
                (orderMode === "ROOM_SERVICE" && !selectedRoom)
              }
            >
              <Send size={16} className="rotate-45" /> Send KOT
            </button>
            <button
              className="pos-btn-refined-primary"
              onClick={() => {
                setAmountReceived("0.00");
                setShowPayment(true);
              }}
              disabled={
                cart.length === 0 ||
                (orderMode === "DINE_IN" && !selectedTable) ||
                (orderMode === "ROOM_SERVICE" && !selectedRoom)
              }
            >
              <CreditCard size={18} /> Charge
            </button>
          </div>

        </div>
      </div> */}

      {showPayment && (
        <div className="pos-modal-overlay">
          <div className="pos-payment-modal animate-fade-in">
            <div className="pos-modal-header">
              <h3>Payment</h3>
              <button
                className="pos-modal-close"
                onClick={() => setShowPayment(false)}
                title="Close payment modal"
              >
                <X size={20} />
              </button>
            </div>

            <div className="pos-modal-body p-8">
              <div className="text-center mb-8">
                <p className="pos-due-label">TOTAL DUE</p>
                <h2 className="pos-due-amount">{formatCurrency(total)}</h2>
              </div>

              <div className="pos-payment-methods mb-8">
                <button
                  className={`pos-method-btn ${paymentMethod === "CASH" ? "active" : ""}`}
                  onClick={() => setPaymentMethod("CASH")}
                >
                  <Banknote size={24} />
                  <span>Cash</span>
                </button>
                <button
                  className={`pos-method-btn ${paymentMethod === "CARD" ? "active" : ""}`}
                  onClick={() => setPaymentMethod("CARD")}
                >
                  <CreditCard size={24} />
                  <span>Card</span>
                </button>
                <button
                  className={`pos-method-btn ${paymentMethod === "UPI" ? "active" : ""}`}
                  onClick={() => setPaymentMethod("UPI")}
                >
                  <Smartphone size={24} />
                  <span>UPI</span>
                </button>
                <button
                  className={`pos-method-btn ${paymentMethod === "BANK_TRANSFER" ? "active" : ""}`}
                  onClick={() => setPaymentMethod("BANK_TRANSFER")}
                >
                  <Landmark size={24} />
                  <span>Bank</span>
                </button>
              </div>

              <div className="pos-input-group mb-8">
                <label className="pos-input-label">Amount Received</label>
                <input
                  type="number"
                  step="0.01"
                  className="pos-modal-input"
                  value={amountReceived}
                  onChange={(event) => setAmountReceived(event.target.value)}
                  onFocus={(event) => event.target.select()}
                  title="Enter the amount received from customer"
                  placeholder="0.00"
                />
              </div>

              <button
                className="pos-confirm-payment-btn"
                onClick={() => void placeOrder(paymentMethod)}
              >
                Confirm Payment · {formatCurrency(total)}
              </button>
            </div>
          </div>
        </div>
      )}

      {cart.length > 0 && !showCart && (
        <button className="pos-mobile-cart-btn" onClick={() => setShowCart(true)}>
          <span className="pos-mobile-cart-btn-icon">
            <ShoppingCart size={18} />
          </span>
          <span className="pos-mobile-cart-btn-copy">
            <span className="pos-mobile-cart-btn-count">
              {cart.reduce((sum, item) => sum + item.quantity, 0)} items
            </span>
            <span className="pos-mobile-cart-btn-label">View current order</span>
          </span>
          <span className="pos-mobile-cart-btn-total">{formatCurrency(total)}</span>
        </button>
      )}
    </div>
  );
};

export default POS;
