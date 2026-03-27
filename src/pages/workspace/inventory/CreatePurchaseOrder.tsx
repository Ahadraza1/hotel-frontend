import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Package, Save } from "lucide-react";
import api from "@/api/axios";
import { useToast } from "@/components/confirm/ConfirmProvider";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";

const CreatePurchaseOrder = () => {
  const { branchId } = useParams();
  const navigate     = useNavigate();
  const toast = useToast();
  const { formatCurrency } = useSystemSettings();

  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name:              "",
    category:          "",
    unit:              "pcs",
    quantityAvailable: "",
    minimumStockLevel: "",
    costPerUnit:       "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /* ── Submit ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.warning("Item name is required."); return; }
    if (!form.category.trim()) { toast.warning("Category is required."); return; }
    if (!form.costPerUnit || Number(form.costPerUnit) <= 0) {
      toast.warning("Cost per unit must be greater than zero."); return;
    }

    try {
      setSaving(true);
      await api.post("/inventory", {
        branchId,
        name:              form.name.trim(),
        category:          form.category.trim(),
        unit:              form.unit,
        quantityAvailable: Number(form.quantityAvailable) || 0,
        minimumStockLevel: Number(form.minimumStockLevel) || 10,
        costPerUnit:       Number(form.costPerUnit),
      });
      toast.success("Inventory item created successfully.");
      navigate(`/workspace/${branchId}/inventory`);
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to create order. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  /* ── Derived summary values ── */
  const totalValue = (Number(form.quantityAvailable) || 0) * (Number(form.costPerUnit) || 0);

  return (
    <div className="cpo-root animate-fade-in">

      {/* ── Page Header ── */}
      <div className="add-branch-header">
        <div className="cpo-header-left">
          <button
            onClick={() => navigate(`/workspace/${branchId}/inventory`)}
            className="cpo-back-btn"
            aria-label="Back to inventory"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="add-branch-header-icon-wrap">
            <Package className="add-branch-header-icon" />
          </div>
          <div>
            <h1 className="page-title">New Purchase Order</h1>
            <p className="page-subtitle">Procure stock and register new inventory items</p>
          </div>
        </div>
      </div>

      {/* ── Form ── */}
      <form onSubmit={handleSubmit} className="cpo-form-layout" noValidate>

        {/* Left column — primary fields */}
        <div className="cpo-form-main">

          {/* Item Identification */}
          <div className="luxury-card cpo-section">
            <div className="cpo-section-header">
              <h2 className="cpo-section-title">Item Identity</h2>
              <p className="cpo-section-sub">Basic identification and classification</p>
            </div>

            <div className="cpo-grid-2">
              <div className="cpo-field">
                <label htmlFor="cpo-name" className="cpo-label">
                  Item Name <span className="cpo-required">*</span>
                </label>
                <input
                  id="cpo-name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="luxury-input"
                  placeholder="e.g. Premium Bath Towels"
                  required
                />
              </div>

              <div className="cpo-field">
                <label htmlFor="cpo-category" className="cpo-label">
                  Category <span className="cpo-required">*</span>
                </label>
                <input
                  id="cpo-category"
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  className="luxury-input"
                  placeholder="e.g. Linen, F&B, Amenities"
                  required
                />
              </div>
            </div>
          </div>

          {/* Stock Metrics */}
          <div className="luxury-card cpo-section">
            <div className="cpo-section-header">
              <h2 className="cpo-section-title">Stock Details</h2>
              <p className="cpo-section-sub">Quantities, thresholds, and pricing</p>
            </div>

            <div className="cpo-grid-2">
              <div className="cpo-field">
                <label htmlFor="cpo-unit" className="cpo-label">Unit of Measure</label>
                <select
                  id="cpo-unit"
                  name="unit"
                  value={form.unit}
                  onChange={handleChange}
                  className="luxury-input"
                >
                  <option value="pcs">Pieces (pcs)</option>
                  <option value="sets">Sets</option>
                  <option value="bottles">Bottles</option>
                  <option value="kg">Kilograms (kg)</option>
                  <option value="liters">Liters</option>
                  <option value="boxes">Boxes</option>
                  <option value="kits">Kits</option>
                </select>
              </div>

              <div className="cpo-field">
                <label htmlFor="cpo-cost" className="cpo-label">
                  Cost per Unit ($) <span className="cpo-required">*</span>
                </label>
                <input
                  id="cpo-cost"
                  type="number"
                  name="costPerUnit"
                  value={form.costPerUnit}
                  onChange={handleChange}
                  className="luxury-input"
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                  required
                />
              </div>

              <div className="cpo-field">
                <label htmlFor="cpo-qty" className="cpo-label">Initial Quantity</label>
                <input
                  id="cpo-qty"
                  type="number"
                  name="quantityAvailable"
                  value={form.quantityAvailable}
                  onChange={handleChange}
                  className="luxury-input"
                  placeholder="0"
                  min="0"
                />
              </div>

              <div className="cpo-field">
                <label htmlFor="cpo-min" className="cpo-label">Low Stock Threshold</label>
                <input
                  id="cpo-min"
                  type="number"
                  name="minimumStockLevel"
                  value={form.minimumStockLevel}
                  onChange={handleChange}
                  className="luxury-input"
                  placeholder="e.g. 10"
                  min="1"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right column — summary + submit */}
        <div className="cpo-form-side">
          <div className="luxury-card cpo-summary-card">
            <h3 className="cpo-summary-title">Order Summary</h3>

            <div className="cpo-summary-rows">
              <div className="cpo-summary-row">
                <span className="cpo-summary-key">Item</span>
                <span className="cpo-summary-val truncate max-w-[140px]">
                  {form.name || <span className="cpo-empty">—</span>}
                </span>
              </div>
              <div className="cpo-summary-row">
                <span className="cpo-summary-key">Category</span>
                <span className="cpo-summary-val">
                  {form.category || <span className="cpo-empty">—</span>}
                </span>
              </div>
              <div className="cpo-summary-row">
                <span className="cpo-summary-key">Unit</span>
                <span className="cpo-summary-val">{form.unit}</span>
              </div>
              <div className="cpo-summary-row">
                <span className="cpo-summary-key">Ordered Qty</span>
                <span className="cpo-summary-val">
                  {form.quantityAvailable ? Number(form.quantityAvailable) : <span className="cpo-empty">0</span>}
                </span>
              </div>
              <div className="cpo-summary-row">
                <span className="cpo-summary-key">Cost / Unit</span>
                <span className="cpo-summary-val">
                  {form.costPerUnit ? formatCurrency(Number(form.costPerUnit)) : <span className="cpo-empty">—</span>}
                </span>
              </div>
              <div className="cpo-summary-row cpo-summary-price-row">
                <span className="cpo-summary-key">Total Est. Value</span>
                <span className="cpo-summary-total">
                  {totalValue > 0 ? formatCurrency(totalValue) : <span className="cpo-empty">—</span>}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="luxury-btn luxury-btn-primary cpo-submit-btn"
            >
              {saving ? (
                <>
                  <span className="eb-loading-spinner cpo-btn-spinner" />
                  Processing…
                </>
              ) : (
                <>
                  <Save size={15} />
                  Authorize Order
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate(`/workspace/${branchId}/inventory`)}
              className="luxury-btn luxury-btn-outline cpo-cancel-btn"
            >
              Cancel
            </button>
          </div>
        </div>

      </form>
    </div>
  );
};

export default CreatePurchaseOrder;
