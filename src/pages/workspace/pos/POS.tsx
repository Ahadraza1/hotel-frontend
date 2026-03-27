import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import socket from "@/socket";
import api from "@/api/axios";
import { useAuth } from "@/contexts/AuthContext";
import { useBranchWorkspace } from "@/contexts/BranchWorkspaceContext";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import { useConfirm, useToast } from "@/components/confirm/ConfirmProvider";
import {
  Plus,
  Minus,
  Trash2,
  Pencil,
  CreditCard,
  Banknote,
  Search,
  Clock,
  Printer,
  Users,
  UtensilsCrossed,
  ConciergeBell,
  Coffee,
  Wine,
  Cake,
  Building,
  ChevronDown,
  ShoppingCart,
  X,
  Utensils,
  Send,
} from "lucide-react";

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

const POS = () => {
  const { branchId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();

  const { user } = useAuth();
  const { activeBranch } = useBranchWorkspace();
  const { formatCurrency } = useSystemSettings();
  const { canAccess, canCreate, canUpdate, canDelete } =
    useModulePermissions("POS");

  if (user && !canAccess) {
    navigate("/unauthorized");
  }

  const [categories, setCategories] = useState<Category[]>([]);
  const [menu, setMenu] = useState<POSItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showPayment, setShowPayment] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [search, setSearch] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  interface LiveOrder {
    orderId: string;
    tableNumber?: string;
    items?: { itemId: string; quantity: number }[];
    orderStatus: string;
  }

  interface Table {
    name: string;
    seats: number;
  }

  const [tables, setTables] = useState<Table[]>([]);

  const [liveOrders, setLiveOrders] = useState<LiveOrder[]>([]);

  useEffect(() => {
    if (branchId) {
      socket.emit("join-branch", `branch-${branchId}`);
    }

    socket.on("new-order", (order) => {
      setLiveOrders((prev) => [order, ...prev]);
    });

    socket.on("order-updated", (order) => {
      setLiveOrders((prev) =>
        prev.map((o) => (o.orderId === order.orderId ? order : o)),
      );
    });

    fetchData();
    if (window.innerWidth > 1024) {
      setShowCart(true);
    }

    return () => {
      socket.off("new-order");
      socket.off("order-updated");
    };
  }, [branchId]);

  const fetchData = async () => {
    const catRes = await api.get<{ data: Category[] }>("/pos/categories");
    const itemRes = await api.get<{ data: POSItem[] }>("/pos/items");
    const tableRes = await api.get<{ data: Table[] }>("/pos/tables");

    setCategories(catRes.data.data);
    setMenu(itemRes.data.data);
    setTables(tableRes.data.data);

    if (catRes.data.data.length) {
      setSelectedCategory(catRes.data.data[0].categoryId);
    }
  };

  const filteredMenu = menu.filter(
    (item) =>
      item.categoryId === selectedCategory &&
      item.name.toLowerCase().includes(search.toLowerCase()),
  );

  const selectedCategoryDetails =
    categories.find((category) => category.categoryId === selectedCategory) ||
    null;

  const addToCart = (item: POSItem) => {
    const existing = cart.find((c) => c.itemId === item.itemId);

    if (existing) {
      setCart(
        cart.map((c) =>
          c.itemId === item.itemId ? { ...c, quantity: c.quantity + 1 } : c,
        ),
      );
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  };

  const updateQty = (itemId: string, delta: number) => {
    setCart(
      cart
        .map((c) =>
          c.itemId === itemId ? { ...c, quantity: c.quantity + delta } : c,
        )
        .filter((c) => c.quantity > 0),
    );
  };

  const [discount, setDiscount] = useState(0);
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
  const serviceCharge =
    (taxableBase * branchServiceChargePercentage) / 100;
  const total = subTotal - discountAmount + taxAmount + serviceCharge;

 const placeOrder = async (paymentMethod?: string) => {

  if (!cart.length) return;

  /* 🔴 TABLE REQUIRED VALIDATION */
  if (!tableNumber) {
    toast.warning("Please select a table before sending the order");
    return;
  }

  try {

    const orderRes = await api.post<{ data: { orderId: string } }>(
      "/pos/orders",
      {
        orderType: "DINE_IN",
        tableNumber,
        discountPercentage: discount,
        discountAmount,
        items: cart.map((c) => ({
          itemId: c.itemId,
          quantity: c.quantity,
        })),
      },
    );

    if (paymentMethod) {
      await api.patch(`/pos/orders/${orderRes.data.data.orderId}/pay`, {
        paymentMethod,
      });
    }

    setCart([]);
    setShowPayment(false);
    toast.success(
      paymentMethod ? "Order placed and payment recorded." : "Order placed successfully.",
    );

  } catch (error) {

    console.error("Order create failed", error);
    toast.error("Failed to create order");

  }
};

  const getCategoryIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes("starter")) return <UtensilsCrossed size={16} />;
    if (lower.includes("main")) return <ConciergeBell size={16} />;
    if (lower.includes("beverage")) return <Coffee size={16} />;
    if (lower.includes("wine") || lower.includes("spirit"))
      return <Wine size={16} />;
    if (lower.includes("dessert")) return <Cake size={16} />;
    return <UtensilsCrossed size={16} />;
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

  return (
    <div className="pos-layout">
      {/* LEFT SIDE: MENU SECTION */}
      <div className="pos-menu-section p-6">
        {/* HEADER */}
        <div className="rm-page-header mb-8">
          <div className="rm-title-group">
            <div className="add-branch-header-icon-wrap bg-[hsl(var(--primary)/0.1)]">
              <UtensilsCrossed className="add-branch-header-icon text-[hsl(var(--primary))]" />
            </div>
            <div>
              <h1 className="page-title text-2xl font-bold tracking-tight">Restaurant POS</h1>
              <p className="page-subtitle text-muted-foreground text-sm">Global Point of Sale Terminal</p>
            </div>
          </div>
          <div className="rm-header-actions">
            {(canCreate || canUpdate || canDelete) && (
              <div className="flex gap-2 flex-wrap">
                {canCreate && (
                  <button
                    className="luxury-btn luxury-btn-outline"
                    onClick={() => navigate(`/workspace/${branchId}/pos/category/add`)}
                  >
                    <Plus size={15} /> Add Category
                  </button>
                )}
                {canCreate && (
                  <button
                    className="luxury-btn luxury-btn-outline"
                    onClick={() => navigate(`/workspace/${branchId}/pos/menu/add`)}
                  >
                    <Plus size={15} /> Add Menu
                  </button>
                )}
                {canUpdate && selectedCategoryDetails && (
                  <button
                    className="luxury-btn luxury-btn-outline"
                    onClick={editCategory}
                  >
                    <Pencil size={15} /> Edit Category
                  </button>
                )}
                {canDelete && selectedCategoryDetails && (
                  <button
                    className="luxury-btn luxury-btn-outline"
                    onClick={deleteCategory}
                  >
                    <Trash2 size={15} /> Delete Category
                  </button>
                )}
              </div>
            )}
            <div className="flex items-center gap-2 bg-[hsl(var(--muted))] text-muted-foreground px-3 py-2 rounded-md border border-[hsl(var(--border))] text-[13px] opacity-80 pointer-events-none whitespace-nowrap hidden sm:flex">
              <Clock size={16} />
              <span>
                {new Date().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="mb-6">
          <div className="inv-search-wrap !max-w-none w-full">
            <Search className="inv-search-icon" />
            <input
              placeholder="Search menu items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="inv-search-input"
            />
          </div>
        </div>

        {/* CATEGORY TABS */}
        <div className="pos-category-tabs mb-6 pb-2 scrollbar-custom border-b border-[hsl(var(--border))] border-opacity-50">
          {categories.map((cat) => (
            <button
              key={cat.categoryId}
              onClick={() => setSelectedCategory(cat.categoryId)}
              className={`pos-category-btn flex items-center gap-2 ${selectedCategory === cat.categoryId ? "active" : ""}`}
            >
              {getCategoryIcon(cat.name)}
              <span>{cat.name}</span>
            </button>
          ))}
        </div>

        {/* MENU GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMenu.map((item) => (
            <div
              key={item.itemId}
              onClick={() => !item.isSoldOut && addToCart(item)}
              className={`pos-menu-card ${item.isSoldOut ? "opacity-70" : ""}`}
            >
              <div>
                <div className="pos-menu-title">{item.name}</div>
                {item.description && (
                  <div className="pos-menu-desc mt-1 line-clamp-2">
                    {item.description}
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center mt-4 pt-2">
                <div className="pos-menu-price">{formatCurrency(item.price)}</div>
                <div
                  className="flex items-center gap-2"
                  onClick={(event) => event.stopPropagation()}
                >
                  {canUpdate && (
                    <button
                      type="button"
                      className="rm-icon-btn"
                      onClick={() => editItem(item.itemId)}
                      title="Edit menu item"
                    >
                      <Pencil size={15} />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      className="rm-icon-btn rm-icon-btn-danger"
                      onClick={() => deleteItem(item)}
                      title="Delete menu item"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                  {item.isSoldOut && (
                    <div className="pos-status-badge pos-status-soldout">
                      SOLD OUT
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT SIDE: CART PANEL */}
      <div className={`pos-cart-panel ${showCart ? "active" : ""}`}>
        <div className="pos-cart-header-area">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="pos-cart-title underline decoration-[hsl(var(--primary)/0.3)] underline-offset-8">Current Order</h3>
              <p className="pos-cart-subtitle">Review items to complete payment</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                className="pos-clear-btn"
                onClick={() => setCart([])}
              >
                CLEAR ALL
              </button>
              <button
                className="pos-close-btn"
                onClick={() => setShowCart(false)}
                title="Collapse order panel"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          <div className="pos-table-badge">
            <Users size={16} className="text-muted-foreground" />
            <select
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              className="pos-table-select"
            >
              <option value="">Select Table</option>
              {tables.map((tbl) => (
                <option key={tbl.name} value={tbl.name}>
                  {tbl.name} ({tbl.seats} seats)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* SCROLLABLE AREA: ITEMS + DISCOUNTS + SUMMARY */}
        <div className="pos-cart-scroll-area scrollbar-custom">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 py-20 grow">
              <ShoppingCart size={40} strokeWidth={1.5} className="mb-4" />
              <p className="text-sm font-medium tracking-tight">Cart is currently empty</p>
            </div>
          ) : (
            <>
              {/* CART ITEMS LIST */}
              <div className="flex flex-col gap-4">
                {cart.map((item) => (
                  <div key={item.itemId} className="pos-order-item">
                    <div className="pos-order-item-header">
                      <div>
                        <p className="pos-order-item-name">{item.name}</p>
                        <p className="pos-order-item-price">{formatCurrency(item.price)} / each</p>
                      </div>
                      <span className="pos-order-item-total">
                        {formatCurrency(item.price * item.quantity)}
                      </span>
                    </div>
                    <div className="pos-order-item-actions">
                      <div className="pos-qty-control">
                        <button className="pos-qty-btn" onClick={() => updateQty(item.itemId, -1)}>
                          <Minus size={14} />
                        </button>
                        <span className="pos-qty-val">{item.quantity}</span>
                        <button className="pos-qty-btn" onClick={() => updateQty(item.itemId, 1)}>
                          <Plus size={14} />
                        </button>
                      </div>
                      <button
                        onClick={() => setCart(cart.filter((c) => c.itemId !== item.itemId))}
                        className="pos-order-item-remove-btn"
                        title="Remove item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* DISCOUNT SELECTOR */}
              <div className="mt-8 border-t pt-8">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
                  Apply Discount
                </p>
                <div className="flex flex-wrap gap-2">
                  {[0, 5, 10, 15, 20].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => setDiscount(pct)}
                      className={`pos-discount-btn ${discount === pct ? "active" : ""}`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              {/* SUMMARY BOX */}
              <div className="pos-summary-box mt-8">
                <div className="pos-summary-row">
                  <span>Subtotal ({cart.reduce((a, c) => a + c.quantity, 0)} items)</span>
                  <span className="pos-summary-value">{formatCurrency(subTotal)}</span>
                </div>
                <div className="pos-summary-row">
                  <span>Tax ({branchTaxPercentage}%)</span>
                  <span className="pos-summary-value">{formatCurrency(taxAmount)}</span>
                </div>
                <div className="pos-summary-row">
                  <span>Service ({branchServiceChargePercentage}%)</span>
                  <span className="pos-summary-value">{formatCurrency(serviceCharge)}</span>
                </div>
                {discount > 0 && (
                  <div className="pos-summary-row text-emerald-600 font-bold bg-emerald-50/50 p-2 rounded-lg -mx-1 border border-emerald-100">
                    <span>Discount ({discount}%)</span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* FIXED FOOTER AREA: TOTAL + ACTIONS */}
        <div className="pos-cart-footer-area sticky-bottom">
          <div className="pos-summary-total">
            <span className="pos-total-label">Payable amount</span>
            <span className="pos-total-amount">{formatCurrency(total)}</span>
          </div>

          {showPayment ? (
            <div className="mt-6">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                Payment Method
              </p>
              <div className="grid grid-cols-3 gap-3">
                <button
                  className="flex flex-col items-center gap-2 p-4 bg-slate-50 border-2 border-transparent rounded-2xl hover:border-[hsl(var(--primary))] hover:bg-white transition-all group"
                  onClick={() => placeOrder("CARD")}
                >
                  <CreditCard className="text-slate-400 group-hover:text-[hsl(var(--primary))] mb-1" />
                  <span className="text-[11px] font-black">CARD</span>
                </button>
                <button
                  className="flex flex-col items-center gap-2 p-4 bg-slate-50 border-2 border-transparent rounded-2xl hover:border-[hsl(var(--primary))] hover:bg-white transition-all group"
                  onClick={() => placeOrder("CASH")}
                >
                  <Banknote className="text-slate-400 group-hover:text-[hsl(var(--primary))] mb-1" />
                  <span className="text-[11px] font-black">CASH</span>
                </button>
                <button
                  className="flex flex-col items-center gap-2 p-4 bg-slate-50 border-2 border-transparent rounded-2xl hover:border-[hsl(var(--primary))] hover:bg-white transition-all group"
                  onClick={() => placeOrder("ROOM")}
                >
                  <Building className="text-slate-400 group-hover:text-[hsl(var(--primary))] mb-1" />
                  <span className="text-[11px] font-black">ROOM</span>
                </button>
              </div>
              <button
                onClick={() => setShowPayment(false)}
                className="w-full mt-4 py-2 text-slate-400 text-[11px] font-bold uppercase tracking-widest hover:text-slate-600 transition-colors"
              >
                ← Back to Order
              </button>
            </div>
          ) : (
            <div className="pos-btn-grid">
              <button
                className="pos-action-btn pos-btn-kot group"
                onClick={() => placeOrder()}
                disabled={cart.length === 0}
              >
                <div className="rotate-[-45deg] transition-transform group-hover:scale-125 group-hover:rotate-0">
                  <Send size={15} />
                </div>
                <span>Send KOT</span>
              </button>
              <button
                className="pos-action-btn pos-btn-pay"
                onClick={() => setShowPayment(true)}
                disabled={cart.length === 0}
              >
                <CreditCard size={18} />
                <span>Pay Now</span>
              </button>
              <button className="pos-action-btn pos-btn-bill">
                <Printer size={18} />
                <span>Bill</span>
              </button>
            </div>
          )}
        </div>
      </div>


      {/* MOBILE CART BUTTON */}
      {cart.length > 0 && !showCart && (
        <button
          onClick={() => setShowCart(true)}
          className="pos-cart-floating flex items-center gap-3 z-[999] text-[15px] font-medium"
        >
          <ShoppingCart size={18} /> {cart.reduce((a, c) => a + c.quantity, 0)}{" "}
          items • {formatCurrency(total)}
        </button>
      )}
    </div>
  );
};

export default POS;
