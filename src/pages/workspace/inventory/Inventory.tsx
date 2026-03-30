import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Plus,
  Minus,
  AlertTriangle,
  Layers,
  TrendingDown,
  Package,
  Search,
  SlidersHorizontal,
  Settings2,
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/api/axios";
import { useAuth } from "@/contexts/AuthContext";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import { useBranchWorkspace } from "@/contexts/BranchWorkspaceContext";
import PermissionNotice from "@/components/auth/PermissionNotice";

interface Item {
  itemId: string;
  name: string;
  category: string;
  unit: string;
  quantityAvailable: number;
  minimumStockLevel: number;
  costPerUnit: number;
  stockStatus: string;
  totalStockValue: number;
}

interface InventorySummary {
  totalItems: number;
  lowStockAlerts: number;
  totalStockValue: number;
  totalCategories: number;
}

const statusBadge: Record<string, string> = {
  OUT_OF_STOCK: "badge-danger",
  LOW_STOCK: "badge-warning",
  IN_STOCK: "badge-active",
};

const Inventory = () => {
  const { activeBranch } = useBranchWorkspace();
  const branchId = activeBranch?._id;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { formatCurrency } = useSystemSettings();
  const { canAccess, canView, canCreate, canUpdate } =
    useModulePermissions("INVENTORY");
  if (user && !canAccess) {
    navigate("/unauthorized");
  }

  const shouldHideContent = !!user && canAccess && !canView;

  const canManageInventory = canUpdate || canCreate;

  const [items, setItems] = useState<Item[]>([]);
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<number>(0);

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/inventory");
      setItems(res.data.data);
    } catch (error) {
      console.error("Failed to load inventory:", error);
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await api.get("/inventory/summary");
      setSummary(res.data.data);
    } catch (error) {
      console.error("Failed to load summary:", error);
    }
  }, []);

  useEffect(() => {
    const storedBranchId = localStorage.getItem("activeBranchId");

    if (!storedBranchId) return;

    fetchInventory();
    fetchSummary();
  }, [activeBranch]);

  const addStock = async () => {
    if (quantity <= 0) return;
    await api.post("/inventory/stock/in", { itemId: selectedItem, quantity });
    setSelectedItem(null);
    setQuantity(0);
    fetchInventory();
    fetchSummary();
  };

  const removeStock = async () => {
    if (quantity <= 0) return;
    await api.post("/inventory/stock/out", { itemId: selectedItem, quantity });
    setSelectedItem(null);
    setQuantity(0);
    fetchInventory();
    fetchSummary();
  };

  /* ── Derived categories count ── */
  const categoryCount = useMemo(() => {
    return new Set(items.map((i) => i.category)).size;
  }, [items]);

  /* ── Filter items ── */
  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (i) =>
        i.itemId.toLowerCase().includes(q) ||
        i.name.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q),
    );
  }, [items, search]);

  /* ── Pagination ── */
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedItems = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  /* ── Low Stock Alert List ── */
  const lowStockItems = useMemo(() => {
    return items.filter(
      (i) => i.stockStatus === "LOW_STOCK" || i.stockStatus === "OUT_OF_STOCK",
    );
  }, [items]);

  if (shouldHideContent) {
    return (
      <PermissionNotice message="Inventory data is hidden because VIEW_INVENTORY_ITEM is disabled for your role." />
    );
  }

  if (loading && items.length === 0) {
    return (
      <div className="inv-root animate-fade-in">
        <div className="inv-loading">
          <span className="eb-loading-spinner" />
          <span>Loading inventory…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="inv-root animate-fade-in">
      {/* ── Page Header ── */}
      <div className="inv-page-header">
        <div className="inv-title-group">
          <div className="add-branch-header-icon-wrap">
            <Package className="add-branch-header-icon" />
          </div>
          <div>
            <h1 className="page-title">Inventory</h1>
            <p className="page-subtitle">
              Track and manage stock, categories, and procurements
            </p>
          </div>
        </div>

        {canCreate && (
          <button
            onClick={() => navigate(`/workspace/${branchId}/inventory/add`)}
            className="luxury-btn luxury-btn-primary inv-add-btn"
          >
            <Plus size={15} />
            New Purchase Order
          </button>
        )}
      </div>

      {/* ── KPI Cards ── */}
      {summary && (
        <div className="inv-kpi-grid">
          <div className="inv-kpi-card">
            <span className="inv-kpi-value">{summary.totalItems}</span>
            <span className="inv-kpi-label">Total Items</span>
          </div>

          <div className="inv-kpi-card">
            <span className="inv-kpi-value inv-kpi-danger">
              {summary.lowStockAlerts}
            </span>
            <span className="inv-kpi-label">Low Stock Alerts</span>
          </div>

          <div className="inv-kpi-card">
            <span className="inv-kpi-value inv-kpi-info">{categoryCount}</span>
            <span className="inv-kpi-label">Categories</span>
          </div>

          <div className="inv-kpi-card">
            <span className="inv-kpi-value inv-kpi-gold">
              {formatCurrency(summary.totalStockValue)}
            </span>
            <span className="inv-kpi-label">Total Stock Value</span>
          </div>
        </div>
      )}

      {/* ── Low Stock Alert Panel ── */}
      {lowStockItems.length > 0 && (
        <div className="inv-alert-panel">
          <div className="inv-alert-header">
            <AlertTriangle size={15} />
            Low Stock Alert
          </div>
          <div className="inv-alert-list">
            {lowStockItems.map((item) => (
              <span key={item.itemId} className="inv-alert-item">
                {item.name} ({item.quantityAvailable}/{item.minimumStockLevel}{" "}
                {item.unit})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Table Card ── */}
      <div className="luxury-card inv-table-card">
        {/* Toolbar */}
        <div className="inv-toolbar">
          <div className="inv-search-wrap">
            <Search className="inv-search-icon" />
            <input
              className="inv-search-input"
              placeholder="Search inventory..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="inv-filter-btn">
            <SlidersHorizontal size={13} />
            Filter
          </button>
        </div>

        {/* Table */}
        <div className="inv-table-scroll">
          <table className="luxury-table">
            <thead>
              <tr>
                <th className="col-serial">#</th>
                <th>ID</th>
                <th>Item</th>
                <th>Category</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Cost/Unit</th>
                <th>Total Value</th>
                {canManageInventory && (
                  <th className="inv-th-actions">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {paginatedItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center py-6 text-muted-foreground"
                  >
                    No inventory items found.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item, index) => (
                  <tr key={item.itemId}>
                    <td className="col-serial">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="inv-cell-id">{item.itemId}</td>
                    <td className="inv-cell-bold">{item.name}</td>
                    <td className="text-muted-foreground">{item.category}</td>
                    <td
                      className={`inv-stock-value ${
                        item.stockStatus === "OUT_OF_STOCK" ||
                        item.stockStatus === "LOW_STOCK"
                          ? "inv-stock-low"
                          : "inv-stock-ok"
                      }`}
                    >
                      {item.quantityAvailable} {item.unit}
                    </td>
                    <td>
                      <span
                        className={`luxury-badge ${statusBadge[item.stockStatus] || "badge-info"}`}
                      >
                        {item.stockStatus.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td>{formatCurrency(item.costPerUnit)}</td>
                    <td className="inv-cell-bold">
                      {formatCurrency(item.totalStockValue)}
                    </td>

                    {canManageInventory && (
                      <td>
                        <div className="inv-td-actions">
                          <button
                            title="Add Stock"
                            onClick={() => setSelectedItem(item.itemId)}
                            className="inv-icon-btn"
                          >
                            <Settings2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="table-footer border-t border-[hsl(var(--border))]">
            <span className="pagination-info">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, filtered.length)} of{" "}
              {filtered.length} entries
            </span>
            <div className="pagination">
              <button
                className="page-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                Previous
              </button>
              <button
                className="page-btn"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Update Stock Modal ── */}
      {selectedItem && (
        <div className="rm-overlay" role="dialog" aria-modal="true">
          <div className="rm-modal !max-w-[24rem]">
            <div className="rm-modal-header">
              <div className="rm-modal-header-left">
                <div className="rm-modal-badge !w-9 !h-9">
                  <Package size={14} />
                </div>
                <div>
                  <h2 className="rm-modal-title !text-base">Update Stock</h2>
                  <p className="rm-modal-subtitle">Adjust inventory levels</p>
                </div>
              </div>
            </div>

            <div className="rm-modal-body bg-card">
              <div className="rm-form-grid !grid-cols-1 !mb-4">
                <div className="rm-field">
                  <label className="rm-label">Quantity</label>
                  <input
                    type="number"
                    className="luxury-input"
                    placeholder="e.g. 50"
                    value={quantity || ""}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={addStock}
                  className="luxury-btn luxury-btn-outline flex-1 !text-[hsl(var(--premium-green))] !border-[hsl(var(--premium-green)/0.4)]"
                >
                  <Plus size={14} /> Add
                </button>
                <button
                  onClick={removeStock}
                  className="luxury-btn luxury-btn-outline flex-1 !text-[hsl(var(--danger))] !border-[hsl(var(--danger)/0.4)]"
                >
                  <Minus size={14} /> Remove
                </button>
              </div>
              <div className="mt-2">
                <button
                  onClick={() => {
                    setSelectedItem(null);
                    setQuantity(0);
                  }}
                  className="luxury-btn luxury-btn-outline w-full"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
