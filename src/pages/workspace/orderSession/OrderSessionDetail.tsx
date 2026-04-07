import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRightLeft, BedDouble, Plus, ReceiptText, Search, User, UtensilsCrossed } from "lucide-react";
import api from "@/api/axios";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { useToast } from "@/components/confirm/ConfirmProvider";
import { useBranchWorkspace } from "@/contexts/BranchWorkspaceContext";
import "./OrderSessionDetail.css"; // Import the CSS file for styling

type SessionType = "DINE_IN" | "ROOM_SERVICE" | "TAKEAWAY";
type OrderStatus = "PLACED" | "PREPARING" | "READY" | "SERVED" | "CANCELLED";

interface Category {
  categoryId: string;
  name: string;
}

interface MenuItem {
  itemId: string;
  name: string;
  price: number;
  categoryId: string;
}

interface TableOption {
  _id: string;
  name: string;
  tableNumber?: string;
  status: "AVAILABLE" | "OCCUPIED";
}

interface RoomOption {
  _id: string;
  roomNumber: string;
  currentGuestName?: string;
  currentBookingId?: string;
}

interface SessionOrderItem {
  itemId: string;
  nameSnapshot: string;
  quantity: number;
  totalItemAmount: number;
}

interface SessionOrder {
  orderId: string;
  orderNumber?: number;
  createdAt: string;
  orderStatus: OrderStatus;
  subTotal: number;
  items: SessionOrderItem[];
}

interface SessionDetail {
  sessionId: string;
  type: SessionType;
  status: string;
  tableNo?: string | null;
  roomNo?: string | null;
  guestName?: string;
  runningTotal: number;
  invoice?: {
    invoiceId: string;
    status: string;
    totalAmount?: number;
    taxAmount?: number;
    serviceChargeAmount?: number;
    discountAmount?: number;
    finalAmount?: number;
    dueAmount?: number;
  } | null;
  orders: SessionOrder[];
}

interface CartEntry extends MenuItem {
  quantity: number;
}

const ALL_CATEGORY_ID = "ALL";

const OrderSessionDetail = () => {
  const { branchId, sessionId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { formatCurrency } = useSystemSettings();
  const { activeBranch } = useBranchWorkspace();

  const isCreating = !sessionId || sessionId === "new";

  const [sessionType, setSessionType] = useState<SessionType>("DINE_IN");
  const [guestName, setGuestName] = useState("");
  const [selectedTableId, setSelectedTableId] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [selectedBookingId, setSelectedBookingId] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL_CATEGORY_ID);
  const [itemSearch, setItemSearch] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<TableOption[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [cart, setCart] = useState<CartEntry[]>([]);
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [paymentMode, setPaymentMode] = useState<"CASH" | "CARD" | "UPI">("CASH");
  const [isEditingGuest, setIsEditingGuest] = useState(false);
  const [editGuestNameInput, setEditGuestNameInput] = useState("");
  const [discount, setDiscount] = useState(0);

  const fetchLookupData = useCallback(async () => {
    const [categoryRes, itemRes, tableRes, roomRes] = await Promise.all([
      api.get<{ data: Category[] }>("/pos/categories"),
      api.get<{ data: MenuItem[] }>("/pos/items"),
      api.get<{ data: TableOption[] }>("/pos/tables"),
      api.get<{ data: RoomOption[] }>("/rooms", { params: { status: "CHECKED_IN" } }),
    ]);

    setCategories(categoryRes.data.data || []);
    setItems(itemRes.data.data || []);
    setTables(tableRes.data.data || []);
    setRooms(roomRes.data.data || []);
    setSelectedCategory((current) => current || ALL_CATEGORY_ID);
  }, []);

  const fetchSession = useCallback(async () => {
    if (!sessionId || sessionId === "new") return;
    const response = await api.get<{ data: SessionDetail }>(`/pos/sessions/${sessionId}`);
    setSession(response.data.data);
    setGuestName(response.data.data.guestName || "");
  }, [sessionId]);

  useEffect(() => {
    void fetchLookupData();
    void fetchSession();
  }, [fetchLookupData, fetchSession]);

  useEffect(() => {
    if (!session?.invoice?.invoiceId) {
      return;
    }

    const invoiceSubtotal = Number(session.invoice.totalAmount || 0);
    const invoiceDiscount = Number(session.invoice.discountAmount || 0);

    if (invoiceSubtotal > 0 && invoiceDiscount >= 0) {
      setDiscount(Math.round((invoiceDiscount / invoiceSubtotal) * 100));
    }
  }, [session?.invoice]);

  const categoriesWithAll = useMemo(
    () => [{ categoryId: ALL_CATEGORY_ID, name: "All" }, ...categories],
    [categories],
  );

  const filteredItems = useMemo(
    () => {
      const query = itemSearch.trim().toLowerCase();

      return items.filter((item) => {
        const matchesCategory =
          selectedCategory === ALL_CATEGORY_ID || item.categoryId === selectedCategory;
        const matchesSearch = !query || item.name.toLowerCase().includes(query);

        return matchesCategory && matchesSearch;
      });
    },
    [itemSearch, items, selectedCategory],
  );

  const allOrdersServed =
    !!session?.orders.length &&
    session.orders.every((order) => order.orderStatus === "SERVED");

  const canPay =
    !!session &&
    (session.status === "BILL_REQUESTED" || (session.status === "OPEN" && allOrdersServed));
  const branchTaxPercentage = Number(
    activeBranch?.financialSettings?.taxPercentage || 0,
  );
  const branchServiceChargePercentage = Number(
    activeBranch?.financialSettings?.serviceChargePercentage || 0,
  );
  const billableOrders = session?.orders.filter(
    (order) => order.orderStatus !== "CANCELLED",
  ) || [];
  const billingSubtotal = billableOrders.reduce(
    (sum, order) => sum + Number(order.subTotal || 0),
    0,
  );
  const billingDiscountAmount = session?.invoice?.invoiceId
    ? Number(session.invoice.discountAmount || 0)
    : (billingSubtotal * discount) / 100;
  const billingTaxableBase = Math.max(billingSubtotal - billingDiscountAmount, 0);
  const billingTaxAmount = session?.invoice?.invoiceId
    ? Number(session.invoice.taxAmount || 0)
    : (billingTaxableBase * branchTaxPercentage) / 100;
  const billingServiceChargeAmount = session?.invoice?.invoiceId
    ? Number(session.invoice.serviceChargeAmount || 0)
    : (billingTaxableBase * branchServiceChargePercentage) / 100;
  const billingTotal = session?.invoice?.invoiceId
    ? Number(session.invoice.finalAmount || session.invoice.dueAmount || session.runningTotal || 0)
    : billingTaxableBase + billingTaxAmount + billingServiceChargeAmount;

  const addItem = (item: MenuItem) => {
    setCart((current) => {
      const existing = current.find((entry) => entry.itemId === item.itemId);

      if (existing) {
        return current.map((entry) =>
          entry.itemId === item.itemId
            ? { ...entry, quantity: entry.quantity + 1 }
            : entry,
        );
      }

      return [...current, { ...item, quantity: 1 }];
    });
  };

  const updateCartQty = (itemId: string, delta: number) => {
    setCart((current) =>
      current
        .map((entry) =>
          entry.itemId === itemId
            ? { ...entry, quantity: entry.quantity + delta }
            : entry,
        )
        .filter((entry) => entry.quantity > 0),
    );
  };

  const openSession = async () => {
    const payload: Record<string, unknown> = {
      type: sessionType,
      guestName,
    };

    if (sessionType === "DINE_IN") {
      payload.tableId = selectedTableId;
    }

    if (sessionType === "ROOM_SERVICE") {
      payload.roomId = selectedRoomId;
      payload.bookingId = selectedBookingId;
    }

    const response = await api.post<{ data: SessionDetail }>("/pos/sessions", payload);
    navigate(`/workspace/${branchId}/order-sessions/${response.data.data.sessionId}`);
  };

  const placeOrder = async () => {
    if (!session || cart.length === 0) return;

    await api.post("/pos/orders", {
      sessionId: session.sessionId,
      orderType: session.type,
      items: cart.map((entry) => ({
        itemId: entry.itemId,
        quantity: entry.quantity,
      })),
    });

    setCart([]);
    await fetchSession();
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    await api.patch(`/pos/orders/${orderId}/status`, { status });
    await fetchSession();
  };

  const openGuestNameEdit = () => {
    if (!session) return;
    setEditGuestNameInput(session.guestName || "");
    setIsEditingGuest(true);
  };

  const submitGuestName = async () => {
    if (!session) return;
    try {
      await api.patch(`/pos/sessions/${session.sessionId}/guest`, {
        guestName: editGuestNameInput,
      });
      setIsEditingGuest(false);
      await fetchSession();
      toast.success("Guest name updated");
    } catch (e) {
      toast.error("Failed to update guest name");
    }
  };

  const transferSession = async () => {
    if (!session) return;

    if (session.type === "DINE_IN" && selectedTableId) {
      await api.patch(`/pos/sessions/${session.sessionId}/transfer`, {
        tableId: selectedTableId,
      });
    }

    if (session.type === "ROOM_SERVICE" && selectedRoomId) {
      await api.patch(`/pos/sessions/${session.sessionId}/transfer`, {
        roomId: selectedRoomId,
        bookingId: selectedBookingId,
      });
    }

    await fetchSession();
  };

  const handlePayment = async () => {
    if (!session) return;

    if (!session.invoice?.invoiceId) {
      await api.post(`/pos/sessions/${session.sessionId}/generate-bill`, {
        discountPercentage: discount,
      });
    }

    await api.patch(`/pos/sessions/${session.sessionId}/pay`, {
      paymentMethod: paymentMode,
    });

    await fetchSession();
    toast.success("Invoice paid and session closed.");
  };

  const openInvoice = async () => {
    if (!session?.invoice?.invoiceId) return;

    const response = await api.get(`/invoices/${session.invoice.invoiceId}/pdf`, {
      responseType: "blob",
    });

    const file = new Blob([response.data as BlobPart], { type: "application/pdf" });
    window.open(URL.createObjectURL(file));
  };

  const locationTitle = session
    ? session.type === "DINE_IN"
      ? `Table ${session.tableNo || "-"}`
      : session.type === "ROOM_SERVICE"
        ? `Room ${session.roomNo || "-"}`
        : session.guestName?.trim() || "Takeaway"
    : "New Session";

  const sessionOrders = session ? [...session.orders].reverse() : [];
  const sessionTypeLabel = session
    ? session.type === "DINE_IN"
      ? "Table"
      : session.type === "ROOM_SERVICE"
        ? "Room"
        : "Takeaway"
    : "";
  const sessionLocationTitle = session
    ? session.type === "DINE_IN"
      ? "Table No"
      : session.type === "ROOM_SERVICE"
        ? "Room No"
        : "Order Type"
    : "";
  const sessionLocationValue = session
    ? session.type === "DINE_IN"
      ? session.tableNo || "-"
      : session.type === "ROOM_SERVICE"
        ? session.roomNo || "-"
        : "Pickup Order"
    : "";
  const sessionGuestLabel = session?.guestName?.trim() || "Walk-in Guest";

  const sessionTypeOptions: Array<{
    value: SessionType;
    label: string;
    description: string;
    icon: typeof UtensilsCrossed;
  }> = [
    {
      value: "DINE_IN",
      label: "Dine-In",
      description: "Open a table-based dining session.",
      icon: UtensilsCrossed,
    },
    {
      value: "ROOM_SERVICE",
      label: "Room Service",
      description: "Create an in-room dining order.",
      icon: BedDouble,
    },
    {
      value: "TAKEAWAY",
      label: "Takeaway",
      description: "Prepare an order for pickup.",
      icon: ReceiptText,
    },
  ];

  return (
    <div className="flex flex-col gap-8 animate-fade-in pb-12">
      {/*  Page Header  */}
      {!isCreating && (
        <div className="bk-page-header">
          <div className="bk-title-group">
            <button
              className="add-branch-header-icon-wrap hover:bg-[hsl(var(--grandeur-gold)/0.25)] transition-colors"
              onClick={() => navigate(`/workspace/${branchId}/order-sessions`)}
              aria-label="Back to sessions"
            >
              <ArrowLeft className="add-branch-header-icon" />
            </button>
            <div>
              <h1 className="page-title">{locationTitle}</h1>
              <p className="page-subtitle">
                {session
                  ? `${session.status.replace("_", " ")} ID: ${session.sessionId}`
                  : "Open a dine-in, room service, or takeaway session"}
              </p>
            </div>
          </div>

          {session && (
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground mr-1">
                Running Total
              </span>
              <div className="text-3xl font-black tracking-[-0.04em] text-[hsl(var(--grandeur-gold))]">
                {formatCurrency(session.runningTotal)}
              </div>
            </div>
          )}
        </div>
      )}

      {isCreating ? (
        <div className="osd-new-container">
          <div className="osd-header">
            <button
              className="osd-back-btn"
              onClick={() => navigate(`/workspace/${branchId}/order-sessions`)}
              aria-label="Back to sessions"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="osd-header-text">
              <h1 className="osd-title">New Session</h1>
              <p className="osd-subtitle">Open a dine-in or room service session</p>
            </div>
          </div>

          <div className="osd-card">
            <h2 className="osd-card-title">Session Details</h2>

            <div className="osd-form-group">
              <label className="osd-label">Session Type</label>
              <div className="osd-radio-group">
                {sessionTypeOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <label key={option.value} className={`osd-radio-option ${sessionType === option.value ? "selected" : ""}`}>
                      <input
                        type="radio"
                        className="osd-radio-input"
                        name="sessionType"
                        value={option.value}
                        checked={sessionType === option.value}
                        onChange={() => setSessionType(option.value)}
                      />
                      <div className="osd-radio-circle"></div>
                      <Icon size={16} />
                      <span>{option.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>



            {sessionType === "DINE_IN" && (
              <div className="osd-form-group">
                <label className="osd-label">Table Number</label>
                <div className="osd-tables-grid">
                  {tables.map((table) => (
                    <button
                      key={table._id}
                      type="button"
                      className={`osd-table-btn ${selectedTableId === table._id ? "selected" : ""}`}
                      disabled={table.status === "OCCUPIED"}
                      onClick={() => setSelectedTableId(table._id)}
                      title={table.status === "OCCUPIED" ? "Currently Occupied" : "Select Table"}
                    >
                      {(table.tableNumber || table.name).replace(/Table\s+/i, "")}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {sessionType === "ROOM_SERVICE" && (
              <div className="osd-form-group">
                <label className="osd-label">Room Number</label>
                <div className="osd-tables-grid">
                  {rooms.map((room) => (
                    <button
                      key={room._id}
                      type="button"
                      className={`osd-table-btn ${selectedRoomId === room._id ? "selected" : ""}`}
                      onClick={() => {
                        setSelectedRoomId(room._id);
                        setSelectedBookingId(room.currentBookingId || "");
                        if (!guestName) setGuestName(room.currentGuestName || "");
                      }}
                    >
                      {room.roomNumber}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="osd-form-group">
              <label className="osd-label">Guest Name (optional)</label>
              <input
                type="text"
                className="osd-input"
                placeholder="Walk-in guest"
                value={guestName}
                onChange={(event) => setGuestName(event.target.value)}
              />
            </div>

            <button
              className="osd-submit-btn"
              disabled={
                (sessionType === "DINE_IN" && !selectedTableId) ||
                (sessionType === "ROOM_SERVICE" && !selectedRoomId)
              }
              onClick={() => void openSession()}
            >
              Open Session
            </button>
          </div>
        </div>
      ) : session ? (
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-8">
            {/* â”€â”€ Order Submission â”€â”€ */}
            <div className="osd-menu-wrapper">
              <div className="osd-menu-header">
                <div className="osd-menu-title-wrap">
                  <div className="osd-menu-icon-box">
                    <Plus size={18} strokeWidth={3} />
                  </div>
                  <h2 className="osd-menu-title">New Order Entry</h2>
                </div>
                {cart.length > 0 && (
                  <div className="osd-sel-count">
                    {cart.reduce((sum, entry) => sum + entry.quantity, 0)} Items Selected
                  </div>
                )}
              </div>

              <div className="osd-search-box">
                <div className="osd-search-icon">
                  <Search size={16} />
                </div>
                <input
                  className="osd-search-input"
                  placeholder="Search menu items..."
                  value={itemSearch}
                  onChange={(event) => setItemSearch(event.target.value)}
                />
              </div>

              {/* Category Nav */}
              <div className="osd-category-nav">
                {categoriesWithAll.map((category) => (
                  <button
                    key={category.categoryId}
                    className={`osd-cat-btn ${
                      selectedCategory === category.categoryId
                        ? "osd-cat-btn-active"
                        : "osd-cat-btn-inactive"
                    }`}
                    onClick={() => setSelectedCategory(category.categoryId)}
                  >
                    {category.name}
                  </button>
                ))}
              </div>

              {/* Menu Items Grid */}
              <div className="osd-menu-grid">
                {filteredItems.map((item) => {
                  const cartItem = cart.find((entry) => entry.itemId === item.itemId);

                  return (
                    <div
                      key={item.itemId}
                      className={`osd-item-card ${cartItem ? 'in-cart' : ''}`}
                    >
                      <div className="osd-item-info">
                        <h3 className="osd-item-name" title={item.name}>
                          {item.name}
                        </h3>
                        <p className="osd-item-price">
                          {formatCurrency(item.price)}
                        </p>
                      </div>
                      
                      <div className="osd-item-actions">
                        {cartItem ? (
                          <div className="osd-qty-control">
                            <button
                              className="osd-qty-btn"
                              onClick={() => updateCartQty(item.itemId, -1)}
                            >
                              -
                            </button>
                            <span className="osd-qty-val">
                              {cartItem.quantity}
                            </span>
                            <button
                              className="osd-qty-btn"
                              onClick={() => updateCartQty(item.itemId, 1)}
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            className="osd-add-btn"
                            onClick={() => addItem(item)}
                            title="Add item to cart"
                            aria-label={`Add ${item.name} to cart`}
                          >
                            <Plus size={18} strokeWidth={2.5} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredItems.length === 0 && (
                <div className="mt-4 rounded-2xl border border-dashed border-[hsl(var(--grandeur-gold)/0.16)] bg-[hsl(var(--grandeur-gold)/0.03)] px-6 py-10 text-center">
                  <p className="text-sm font-semibold text-foreground">No items found</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Try another category or a different search term.
                  </p>
                </div>
              )}

              {cart.length > 0 && (
                <div className="osd-order-footer">
                  <div className="flex flex-col">
                    <span className="osd-order-tot-label">Order Total</span>
                    <span className="osd-order-tot-val">
                      {formatCurrency(cart.reduce((sum, entry) => sum + entry.quantity * entry.price, 0))}
                    </span>
                  </div>
                  <button
                    className="osd-place-btn"
                    onClick={() => void placeOrder()}
                  >
                    Place Active Order
                  </button>
                </div>
              )}
            </div>

            {/* â”€â”€ Order History â”€â”€ */}
            <div className="osd-history-wrapper">
              <div className="osd-history-header">
                <div className="osd-history-icon-box">
                  <UtensilsCrossed size={18} strokeWidth={2.5} />
                </div>
                <h2 className="osd-history-title">Session Orders</h2>
              </div>
              
              {session.orders.length === 0 ? (
                <div className="osd-empty-state">
                  <div className="osd-empty-icon">
                    <UtensilsCrossed size={32} />
                  </div>
                  <p className="osd-empty-text">Waiting for first order...</p>
                </div>
              ) : (
                <div className="osd-order-card">
                  <div className="osd-order-session-header">
                    <div className="osd-order-session-info">
                      <div>
                        <span className="osd-order-num-label">Session Type</span>
                        <h3 className="osd-order-num-val">{sessionTypeLabel}</h3>
                      </div>
                      <div>
                        <span className="osd-order-time-label">{sessionLocationTitle}</span>
                        <span className="osd-order-time-val">{sessionLocationValue}</span>
                      </div>
                      <div>
                        <span className="osd-order-time-label">Guest Name</span>
                        <span className="osd-order-time-val">{sessionGuestLabel}</span>
                      </div>
                    </div>
                    <div className="osd-order-meta">
                      <div className="osd-order-time-wrap">
                        <span className="osd-order-time-label">Running Total</span>
                        <span className="osd-order-time-val">
                          {formatCurrency(session.runningTotal)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="osd-session-orders-container">
                    {sessionOrders.map((order) => (
                      <div key={order.orderId} className="osd-session-order-block">
                    <div className="osd-order-card-header">
                      <div>
                        <span className="osd-order-num-label">
                          Order Number
                        </span>
                        <h3 className="osd-order-num-val">
                          #{order.orderNumber || order.orderId.slice(-4).toUpperCase()}
                        </h3>
                      </div>
                      <div className="osd-order-meta">
                        <div className="osd-order-time-wrap">
                          <span className="osd-order-time-label">Placed At</span>
                          <span className="osd-order-time-val">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <span className={`luxury-badge rounded-lg px-4 py-1.5 ${
                          order.orderStatus === 'SERVED' ? 'badge-paid' : 
                          order.orderStatus === 'CANCELLED' ? 'badge-warning' : 'badge-info'
                        }`}>
                          {order.orderStatus}
                        </span>
                      </div>
                    </div>

                    <div className="osd-order-body">
                      <div className="osd-items-list">
                        {order.items.map((item) => (
                          <div key={`${order.orderId}-${item.itemId}`} className="osd-order-item-row flex justify-between items-center">
                            <div className="osd-item-row-left">
                              <span className="osd-item-qty-badge">
                                {item.quantity}
                              </span>
                              <span className="osd-item-row-name">{item.nameSnapshot}</span>
                            </div>
                            <span className="osd-item-row-price">
                              {formatCurrency(item.totalItemAmount)}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="osd-order-subtotal-row">
                        <span className="osd-subtotal-label">Order Subtotal</span>
                        <span className="osd-subtotal-val">{formatCurrency(order.subTotal)}</span>
                      </div>

                      {order.orderStatus !== "SERVED" && order.orderStatus !== "CANCELLED" && (
                        <div className="osd-order-actions">
                          {order.orderStatus === "PLACED" && (
                            <>
                              <button 
                                className="osd-action-btn osd-btn-prepare" 
                                onClick={() => void updateOrderStatus(order.orderId, "PREPARING")}
                              >
                                Start Preparing
                              </button>
                              <button 
                                className="osd-action-btn osd-btn-cancel"
                                onClick={() => void updateOrderStatus(order.orderId, "CANCELLED")}
                              >
                                Cancel Order
                              </button>
                            </>
                          )}
                          {order.orderStatus === "PREPARING" && (
                            <button 
                              className="osd-action-btn osd-btn-ready"
                              onClick={() => void updateOrderStatus(order.orderId, "READY")}
                            >
                              Dispatch Ready
                            </button>
                          )}
                          {order.orderStatus === "READY" && (
                            <button 
                              className="osd-action-btn osd-btn-serve"
                              onClick={() => void updateOrderStatus(order.orderId, "SERVED")}
                            >
                              Final Service
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* â”€â”€ Sidebar Actions â”€â”€ */}
          <div className="flex flex-col gap-8">
            <div className="luxury-card osd-actions-card sticky top-6">
              <div className="osd-actions-header">
                <span className="osd-actions-kicker">Session Controls</span>
                <h2 className="osd-actions-title">Actions</h2>
              </div>

              <div className="osd-actions-sections">
                <section className="osd-actions-section">
                  <div className="osd-actions-section-head">
                    <div className="osd-actions-icon-wrap">
                      <ArrowRightLeft size={16} />
                    </div>
                    <div>
                      <p className="osd-actions-section-title">
                        {session.type === "DINE_IN" ? "Table Transfer" : "Room Transfer"}
                      </p>
                      <p className="osd-actions-section-subtitle">
                        {session.type === "DINE_IN" ? "Select new table:" : "Select new room:"}
                      </p>
                    </div>
                  </div>

                  {session.type === "DINE_IN" && (
                    <div className="osd-transfer-block">
                      <div className="osd-transfer-grid" role="group" aria-label="Select new table">
                        {tables.map((table) => (
                          <button
                            key={table._id}
                            type="button"
                            className={`osd-transfer-option ${selectedTableId === table._id ? "is-selected" : ""}`}
                            disabled={table.status === "OCCUPIED"}
                            onClick={() => setSelectedTableId(table._id)}
                            title={table.status === "OCCUPIED" ? "Currently Occupied" : "Select Table"}
                          >
                            {(table.tableNumber || table.name).replace(/Table\s+/i, "")}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        className="osd-transfer-cancel"
                        onClick={() => setSelectedTableId("")}
                        disabled={!selectedTableId}
                      >
                        Cancel
                      </button>
                      <button
                        className="luxury-btn luxury-btn-outline osd-section-btn"
                        disabled={!selectedTableId}
                        onClick={() => void transferSession()}
                      >
                        Confirm Table Transfer
                      </button>
                    </div>
                  )}

                  {session.type === "ROOM_SERVICE" && (
                    <div className="osd-transfer-block">
                      <div className="osd-transfer-grid" role="group" aria-label="Select new room">
                        {rooms.map((room) => (
                          <button
                            key={room._id}
                            type="button"
                            className={`osd-transfer-option ${selectedRoomId === room._id ? "is-selected" : ""}`}
                            onClick={() => {
                              setSelectedRoomId(room._id);
                              setSelectedBookingId(room.currentBookingId || "");
                            }}
                            title={room.currentGuestName ? `${room.roomNumber} - ${room.currentGuestName}` : room.roomNumber}
                          >
                            {room.roomNumber}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        className="osd-transfer-cancel"
                        onClick={() => {
                          setSelectedRoomId("");
                          setSelectedBookingId("");
                        }}
                        disabled={!selectedRoomId}
                      >
                        Cancel
                      </button>
                      <button
                        className="luxury-btn luxury-btn-outline osd-section-btn"
                        disabled={!selectedRoomId}
                        onClick={() => void transferSession()}
                      >
                        Confirm Room Transfer
                      </button>
                    </div>
                  )}
                </section>

                <section className="osd-actions-section">
                  <div className="osd-actions-section-head">
                    <div className="osd-actions-icon-wrap">
                      <User size={16} />
                    </div>
                    <div>
                      <p className="osd-actions-section-title">Guest Action</p>
                      <p className="osd-actions-section-subtitle">
                        Keep the session guest details accurate.
                      </p>
                    </div>
                  </div>

                  <button
                    className="luxury-btn luxury-btn-outline osd-section-btn osd-section-btn-subtle"
                    onClick={openGuestNameEdit}
                  >
                    <User size={16} />
                    <span>Update Guest Name</span>
                  </button>
                </section>

                <section className="osd-actions-section">
                  <div className="osd-actions-section-head">
                    <div className="osd-actions-icon-wrap">
                      <ReceiptText size={16} />
                    </div>
                    <div>
                      <p className="osd-actions-section-title">Billing</p>
                      <p className="osd-actions-section-subtitle">
                        Generate the bill, settle payment, or reopen the invoice.
                      </p>
                    </div>
                  </div>

                  {allOrdersServed && !session.invoice?.invoiceId && (
                    <>
                      <div className="osd-discount-block">
                        <span className="osd-discount-label">% Discount</span>
                        <div className="osd-discount-chips">
                          {[0, 5, 10, 15, 20].map((value) => (
                            <button
                              key={value}
                              type="button"
                              className={`osd-discount-chip ${discount === value ? "is-active" : ""}`}
                              onClick={() => setDiscount(value)}
                            >
                              {value}%
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="osd-billing-summary">
                        <div className="osd-billing-row">
                          <span>Subtotal ({billableOrders.length} items)</span>
                          <span>{formatCurrency(billingSubtotal)}</span>
                        </div>
                        {billingDiscountAmount > 0 && (
                          <div className="osd-billing-row osd-billing-row-discount">
                            <span>Discount ({discount}%)</span>
                            <span>-{formatCurrency(billingDiscountAmount)}</span>
                          </div>
                        )}
                        <div className="osd-billing-row">
                          <span>Tax ({branchTaxPercentage}%)</span>
                          <span>{formatCurrency(billingTaxAmount)}</span>
                        </div>
                        {branchServiceChargePercentage > 0 && (
                          <div className="osd-billing-row">
                            <span>Service Charge ({branchServiceChargePercentage}%)</span>
                            <span>{formatCurrency(billingServiceChargeAmount)}</span>
                          </div>
                        )}
                        <div className="osd-billing-row osd-billing-row-total">
                          <span>Total</span>
                          <span>{formatCurrency(billingTotal)}</span>
                        </div>
                      </div>

                      <button
                        className="luxury-btn luxury-btn-primary osd-section-btn osd-billing-btn"
                        onClick={() =>
                          void api.post(`/pos/sessions/${session.sessionId}/generate-bill`, {
                            discountPercentage: discount,
                          }).then(fetchSession)
                        }
                      >
                        <ReceiptText size={18} />
                        <span>Generate Bill</span>
                      </button>
                    </>
                  )}

                  {canPay && (
                    <div className="osd-payment-block">
                      <div className="osd-billing-summary">
                        <div className="osd-billing-row">
                          <span>Subtotal</span>
                          <span>{formatCurrency(Number(session.invoice?.totalAmount || billingSubtotal))}</span>
                        </div>
                        {billingDiscountAmount > 0 && (
                          <div className="osd-billing-row osd-billing-row-discount">
                            <span>Discount</span>
                            <span>-{formatCurrency(billingDiscountAmount)}</span>
                          </div>
                        )}
                        <div className="osd-billing-row">
                          <span>Tax</span>
                          <span>{formatCurrency(billingTaxAmount)}</span>
                        </div>
                        <div className="osd-billing-row">
                          <span>Service Charge</span>
                          <span>{formatCurrency(billingServiceChargeAmount)}</span>
                        </div>
                      </div>
                      <div className="osd-payment-summary">
                        <div>
                          <span className="osd-payment-label">Amount Due</span>
                          <p className="osd-payment-help">Select a payment method to complete settlement.</p>
                        </div>
                        <span className="osd-payment-amount">{formatCurrency(Number(session.invoice?.dueAmount || billingTotal))}</span>
                      </div>
                      <select
                        className="luxury-input osd-payment-select"
                        value={paymentMode}
                        onChange={(e) => setPaymentMode(e.target.value as "CASH" | "CARD" | "UPI")}
                        title="Select Payment Method"
                      >
                        <option value="CASH">Cash Settlement</option>
                        <option value="CARD">Debit / Credit Card</option>
                        <option value="UPI">UPI / Digital Payment</option>
                      </select>
                      <button
                        className="luxury-btn luxury-btn-primary osd-section-btn"
                        onClick={() => void handlePayment()}
                      >
                        Proceed to Payment
                      </button>
                    </div>
                  )}

                  {session.invoice?.invoiceId && session.invoice.status === "PAID" && (
                    <button
                      className="luxury-btn luxury-btn-outline osd-section-btn osd-section-btn-subtle"
                      onClick={() => void openInvoice()}
                    >
                      <ReceiptText size={16} />
                      <span>View Final Invoice</span>
                    </button>
                  )}
                </section>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Guest Name Modal */}
      {isEditingGuest && (
        <div className="confirm-modal-layer" role="presentation" style={{ zIndex: 100 }}>
          <div className="confirm-modal-backdrop" onClick={() => setIsEditingGuest(false)} />
          <div className="confirm-modal luxury-card" style={{ maxWidth: "400px", width: "100%", padding: "1.5rem" }}>
            <h3 className="text-xl font-serif font-bold text-foreground mb-4">Update Guest Name</h3>
            <input
              type="text"
              autoFocus
              className="luxury-input w-full h-12 text-sm font-bold mb-6"
              placeholder="Enter guest name"
              value={editGuestNameInput}
              onChange={(e) => setEditGuestNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void submitGuestName();
                if (e.key === "Escape") setIsEditingGuest(false);
              }}
            />
            <div className="confirm-modal-actions mt-2">
              <button
                className="luxury-btn luxury-btn-outline confirm-modal-cancel"
                onClick={() => setIsEditingGuest(false)}
              >
                Cancel
              </button>
              <button 
                className="luxury-btn luxury-btn-primary confirm-modal-confirm"
                onClick={() => void submitGuestName()}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderSessionDetail;
