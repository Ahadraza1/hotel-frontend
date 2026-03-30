import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import socket from "@/socket";
import api from "@/api/axios";
import { useAuth } from "@/contexts/AuthContext";
import { useBranchWorkspace } from "@/contexts/BranchWorkspaceContext";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import { useConfirm, useToast } from "@/components/confirm/ConfirmProvider";
import PermissionNotice from "@/components/auth/PermissionNotice";
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
  Wallet,
  Smartphone,
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
  const { canAccess, canView, canCreate, canUpdate, canDelete } =
    useModulePermissions("POS");
  if (user && !canAccess) {
    navigate("/unauthorized");
  }

  const shouldHideContent = !!user && canAccess && !canView;

  const [categories, setCategories] = useState<Category[]>([]);
  const [menu, setMenu] = useState<POSItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showPayment, setShowPayment] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [search, setSearch] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [amountReceived, setAmountReceived] = useState<string>("0.00");
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

  const filteredMenu = menu.filter((item) => {
    const matchesCategory =
      selectedCategory === null || item.categoryId === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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
    if (lower.includes("appetizer") || lower.includes("starter")) return "🥗";
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

  if (shouldHideContent) {
    return (
      <PermissionNotice message="POS menu data is hidden because VIEW_POS_MENU is disabled for your role." />
    );
  }

  return (
    <div className="pos-layout">
      {/* LEFT SIDE: MENU SECTION */}
      <div className="pos-menu-section">
        {/* TOP BAR: SEARCH & BRANCH INFO */}
        <div className="pos-top-bar px-6 pt-6 pb-4">
          <div className="pos-top-bar-content flex justify-between items-center w-full gap-4">
            <div className="pos-search-wrapper flex-1">
              <Search className="pos-search-icon" size={18} />
              <input
                type="text"
                placeholder="Search menu items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pos-search-input-refined"
              />
            </div>

            <div className="pos-management-toolbar flex items-center gap-2">
              {canCreate && (
                <button
                  className="pos-mgmt-btn add"
                  onClick={() => navigate(`/workspace/${branchId}/pos/category/add`)}
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
                <div className="flex items-center gap-2 ml-2 pl-4 border-l border-border/40">
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

        {/* CATEGORY LIST (HORIZONTAL SCROLL) */}
        <div className="pos-category-container px-6 mb-4">
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

        {/* MENU GRID */}
        <div className="pos-menu-grid-container px-6 pb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredMenu.map((item, idx) => (
              <div
                key={item.itemId}
                onClick={() => !item.isSoldOut && addToCart(item)}
                className={`pos-item-card-refined group ${item.isSoldOut ? "sold-out" : ""}`}
              >
                <div className={`pos-item-visual bg-gradient-to-br pos-gradient-${(idx % 6) + 1}`}>
                   {item.isSoldOut && <span className="pos-unavailable-badge">Unavailable</span>}
                </div>
                <div className="pos-item-content">
                  <h3 className="pos-item-name-refined">{item.name}</h3>
                  <div className="pos-item-meta">
                    <span className="pos-item-price-refined">{formatCurrency(item.price)}</span>
                    <span className="pos-item-time-refined">
                      <Clock size={12} className="inline mr-1 opacity-60" />
                      {Math.floor(Math.random() * 20) + 5}m
                    </span>
                  </div>
                </div>

                {/* Quick Actions (Hover) */}
                <div className="pos-item-actions-refined opacity-0 group-hover:opacity-100 transition-opacity">
                  {canUpdate && (
                    <button
                      className="pos-item-action-btn-refined"
                      onClick={(e) => { e.stopPropagation(); editItem(item.itemId); }}
                      title="Edit Menu Item"
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      className="pos-item-action-btn-refined text-destructive"
                      onClick={(e) => { e.stopPropagation(); deleteItem(item); }}
                      title="Delete Menu Item"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: CART PANEL */}
      <div className={`pos-order-panel ${showCart ? "active" : ""}`}>
        <div className="pos-order-panel-header p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="pos-panel-title">Current Order</h2>
            {cart.length > 0 && (
              <button className="pos-panel-clear" onClick={() => setCart([])}>
                Clear All
              </button>
            )}
            <button className="pos-panel-close lg:hidden" onClick={() => setShowCart(false)} title="Close cart">
              <X size={20} />
            </button>
          </div>

          {/* ORDER TYPE TABS (Mockup) */}
          <div className="pos-order-tabs">
            <button className="pos-order-tab active">Dine-in</button>
            <button className="pos-order-tab">Takeaway</button>
            <button className="pos-order-tab">Delivery</button>
          </div>

          {/* TABLE SELECTOR */}
          <div className="pos-select-wrap mt-4">
            <Users className="pos-select-icon" size={16} />
            <select
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              className="pos-select-input-refined"
              title="Select a table for the order"
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

        {/* ORDER ITEMS (SCROLLABLE) */}
        <div className="pos-order-items-list px-6 scrollbar-custom">
          {cart.length === 0 ? (
            <div className="pos-empty-state">
              <ShoppingCart size={48} strokeWidth={1} className="mb-4 opacity-20" />
              <p>No items in cart</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 py-2">
              {cart.map((item) => (
                <div key={item.itemId} className="pos-order-card-refined">
                  <div className="pos-order-card-main">
                    <span className="pos-order-card-name">{item.name}</span>
                    <span className="pos-order-card-price">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                  <div className="pos-order-card-footer mt-3">
                    <div className="pos-qty-refiner">
                      <button onClick={() => updateQty(item.itemId, -1)} title="Decrease quantity">-</button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updateQty(item.itemId, 1)} title="Increase quantity">+</button>
                    </div>
                    <button 
                      className="pos-order-remove-refined"
                      onClick={() => setCart(cart.filter((c) => c.itemId !== item.itemId))}
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

        {/* ORDER TOTAL & ACTIONS (FIXED) */}
        <div className="pos-order-panel-footer p-6">
          <div className="pos-bill-summary mt-6">
            <div className="pos-discount-section mb-4">
              <label className="pos-discount-label">% DISCOUNT</label>
              <div className="pos-discount-chips">
                {[0, 5, 10, 15, 20].map((val) => (
                  <button
                    key={val}
                    className={`pos-discount-chip ${discount === val ? "active" : ""}`}
                    onClick={() => setDiscount(val)}
                  >
                    {val}%
                  </button>
                ))}
              </div>
            </div>

            <div className="pos-bill-row">
              <span className="opacity-70">Subtotal ({cart.reduce((a, b) => a + b.quantity, 0)} items)</span>
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
                <span className="opacity-70">Service Charge ({branchServiceChargePercentage}%)</span>
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
               onClick={() => placeOrder()}
               disabled={cart.length === 0 || !tableNumber}
             >
               <Send size={16} className="rotate-45" /> Send KOT
             </button>
             <button 
               className="pos-btn-refined-primary"
               onClick={() => {
                 setAmountReceived("0.00");
                 setShowPayment(true);
               }}
               disabled={cart.length === 0 || !tableNumber}
             >
               <CreditCard size={18} /> Charge
             </button>
          </div>
        </div>
      </div>

      {/* PAYMENT MODAL */}
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
                  className={`pos-method-btn ${paymentMethod === "WALLET" ? "active" : ""}`}
                  onClick={() => setPaymentMethod("WALLET")}
                >
                  <Wallet size={24} />
                  <span>Wallet</span>
                </button>
              </div>

              <div className="pos-input-group mb-8">
                <label className="pos-input-label">Amount Received</label>
                <input 
                  type="number" 
                  step="0.01"
                  className="pos-modal-input"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  title="Enter the amount received from customer"
                  placeholder="0.00"
                />
              </div>

              <button 
                className="pos-confirm-payment-btn"
                onClick={() => placeOrder(paymentMethod)}
              >
                Confirm Payment · {formatCurrency(total)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE CART TRIGGER */}
      {!showCart && cart.length > 0 && (
        <button className="pos-mobile-cart-btn" onClick={() => setShowCart(true)}>
          <ShoppingCart size={20} />
          <span>{cart.reduce((a, b) => a + b.quantity, 0)} items</span>
          <span className="ml-auto font-bold">{formatCurrency(total)}</span>
        </button>
      )}

      {/* ACTIONS (CATEGORY/MENU) - PORTABLE BTNS */}
    </div>
  );
};

export default POS;
