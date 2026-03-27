import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Coffee, Save } from "lucide-react";
import api from "@/api/axios";
import { useToast } from "@/components/confirm/ConfirmProvider";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";

interface Category {
  categoryId: string;
  name: string;
}

interface POSItemResponse {
  itemId: string;
  name: string;
  categoryId: string;
  price: number;
  preparationTimeMinutes?: number;
  kitchenStation?: string;
  description?: string;
}

const AddPOSMenu = () => {
  const { branchId, itemId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { formatCurrency } = useSystemSettings();
  const isEditMode = !!itemId;

  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    categoryId: "",
    price: "",
    preparationTimeMinutes: "10",
    kitchenStation: "MAIN_KITCHEN",
    description: "",
  });

  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      try {
        const [catRes, itemRes] = await Promise.all([
          api.get<{ data: Category[] }>("/pos/categories"),
          isEditMode
            ? api.get<{ data: POSItemResponse[] }>("/pos/items")
            : Promise.resolve({ data: { data: [] as POSItemResponse[] } }),
        ]);

        if (!active) return;

        const incomingCategories = catRes.data.data || [];
        setCategories(incomingCategories);

        if (isEditMode && itemId) {
          const item = itemRes.data.data.find((entry) => entry.itemId === itemId);

          if (!item) {
            toast.error("Menu item not found.");
            navigate(`/workspace/${branchId}/pos`);
            return;
          }

          setForm({
            name: item.name || "",
            categoryId: item.categoryId || incomingCategories[0]?.categoryId || "",
            price: item.price != null ? String(item.price) : "",
            preparationTimeMinutes: String(item.preparationTimeMinutes || 10),
            kitchenStation: item.kitchenStation || "MAIN_KITCHEN",
            description: item.description || "",
          });
          return;
        }

        if (incomingCategories.length > 0) {
          setForm((prev) => ({
            ...prev,
            categoryId: prev.categoryId || incomingCategories[0].categoryId,
          }));
        }
      } catch {
        toast.error(
          isEditMode ? "Failed to load menu item." : "Failed to fetch categories.",
        );
        if (isEditMode) {
          navigate(`/workspace/${branchId}/pos`);
        }
      }
    };

    fetchData();

    return () => {
      active = false;
    };
  }, [branchId, isEditMode, itemId, navigate, toast]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.warning("Item name is required.");
      return;
    }

    if (!form.price || Number(form.price) < 0) {
      toast.warning("Please enter a valid price.");
      return;
    }

    if (!form.categoryId) {
      toast.warning("Please select a category.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: form.name.trim(),
        categoryId: form.categoryId,
        price: Number(form.price),
        preparationTimeMinutes: Number(form.preparationTimeMinutes),
        kitchenStation: form.kitchenStation,
        description: form.description.trim(),
      };

      if (isEditMode && itemId) {
        await api.put(`/pos/items/${itemId}`, payload);
        toast.success("Menu item updated successfully.");
      } else {
        await api.post("/pos/items", payload);
        toast.success("Menu item created successfully.");
      }

      navigate(`/workspace/${branchId}/pos`);
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(
        error.response?.data?.message ||
          `Failed to ${isEditMode ? "update" : "create"} menu item. Please try again.`,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ar-root animate-fade-in">
      <div className="add-branch-header">
        <div className="ar-header-left">
          <button
            onClick={() => navigate(`/workspace/${branchId}/pos`)}
            className="ar-back-btn"
            aria-label="Back to POS"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="add-branch-header-icon-wrap">
            <Coffee className="add-branch-header-icon" />
          </div>
          <div>
            <h1 className="page-title">
              {isEditMode ? "Edit Menu Item" : "Add Menu Item"}
            </h1>
            <p className="page-subtitle">
              {isEditMode
                ? "Update an existing POS menu item"
                : "Create a new item for the POS system"}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="ar-form-layout" noValidate>
        <div className="ar-form-main">
          <div className="luxury-card ar-section">
            <div className="ar-section-header">
              <h2 className="ar-section-title">Item Details</h2>
              <p className="ar-section-sub">
                Basic information and classification
              </p>
            </div>

            <div className="ar-grid-2">
              <div className="ar-field">
                <label htmlFor="ar-name" className="ar-label">
                  Item Name <span className="ar-required">*</span>
                </label>
                <input
                  id="ar-name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="luxury-input"
                  placeholder="e.g. Margherita Pizza"
                  required
                />
              </div>

              <div className="ar-field">
                <label htmlFor="ar-category" className="ar-label">
                  Category <span className="ar-required">*</span>
                </label>
                <select
                  id="ar-category"
                  name="categoryId"
                  value={form.categoryId}
                  onChange={handleChange}
                  className="luxury-input luxury-select"
                  required
                >
                  <option value="" disabled>
                    Select Category
                  </option>
                  {categories.map((category) => (
                    <option key={category.categoryId} value={category.categoryId}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="ar-field">
                <label htmlFor="ar-price" className="ar-label">
                  Price ($) <span className="ar-required">*</span>
                </label>
                <input
                  id="ar-price"
                  type="number"
                  name="price"
                  value={form.price}
                  onChange={handleChange}
                  className="luxury-input"
                  placeholder="e.g. 15.00"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
            </div>
          </div>

          <div className="luxury-card ar-section">
            <div className="ar-section-header">
              <h2 className="ar-section-title">Preparation Details</h2>
              <p className="ar-section-sub">
                Routing and timing configuration
              </p>
            </div>

            <div className="ar-grid-2">
              <div className="ar-field">
                <label htmlFor="ar-kitchenStation" className="ar-label">
                  Kitchen Station
                </label>
                <select
                  id="ar-kitchenStation"
                  name="kitchenStation"
                  value={form.kitchenStation}
                  onChange={handleChange}
                  className="luxury-input luxury-select"
                >
                  <option value="MAIN_KITCHEN">Main Kitchen</option>
                  <option value="BAR">Bar</option>
                  <option value="BAKERY">Bakery</option>
                  <option value="ROOM_SERVICE">Room Service</option>
                </select>
              </div>

              <div className="ar-field">
                <label htmlFor="ar-prep" className="ar-label">
                  Prep Time (mins)
                </label>
                <input
                  id="ar-prep"
                  type="number"
                  name="preparationTimeMinutes"
                  value={form.preparationTimeMinutes}
                  onChange={handleChange}
                  className="luxury-input"
                  min="1"
                />
              </div>
            </div>
          </div>

          <div className="luxury-card ar-section">
            <div className="ar-section-header">
              <h2 className="ar-section-title">Description</h2>
              <p className="ar-section-sub">
                Optional details about this menu item
              </p>
            </div>

            <div className="ar-field">
              <label htmlFor="ar-description" className="ar-label">
                Item Description
              </label>
              <textarea
                id="ar-description"
                name="description"
                value={form.description}
                onChange={handleChange}
                className="luxury-input ar-textarea"
                placeholder="Fresh basil, mozzarella, tomato sauce..."
                rows={4}
              />
            </div>
          </div>
        </div>

        <div className="ar-form-side">
          <div className="luxury-card ar-summary-card">
            <h3 className="ar-summary-title">Item Summary</h3>

            <div className="ar-summary-rows">
              <div className="ar-summary-row">
                <span className="ar-summary-key">Name</span>
                <span className="ar-summary-val">
                  {form.name || <span className="ar-empty">-</span>}
                </span>
              </div>
              <div className="ar-summary-row">
                <span className="ar-summary-key">Category</span>
                <span className="ar-summary-val">
                  {categories.find((category) => category.categoryId === form.categoryId)
                    ?.name || <span className="ar-empty">-</span>}
                </span>
              </div>
              <div className="ar-summary-row">
                <span className="ar-summary-key">Station</span>
                <span className="ar-summary-val">
                  {form.kitchenStation.replace("_", " ")}
                </span>
              </div>
              <div className="ar-summary-row ar-summary-price-row">
                <span className="ar-summary-key">Price</span>
                <span className="ar-summary-price">
                  {form.price
                    ? formatCurrency(Number(form.price))
                    : <span className="ar-empty">—</span>}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="luxury-btn luxury-btn-primary ar-submit-btn"
            >
              {saving ? (
                <>
                  <span className="eb-loading-spinner ar-btn-spinner" />
                  {isEditMode ? "Updating..." : "Saving..."}
                </>
              ) : (
                <>
                  <Save size={15} />
                  {isEditMode ? "Update Item" : "Save Item"}
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate(`/workspace/${branchId}/pos`)}
              className="luxury-btn luxury-btn-secondary ar-cancel-btn"
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddPOSMenu;
