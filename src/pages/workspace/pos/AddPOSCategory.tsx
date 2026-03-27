import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, PlusCircle, Save } from "lucide-react";
import api from "@/api/axios";
import { useToast } from "@/components/confirm/ConfirmProvider";

const AddPOSCategory = () => {
  const { branchId, categoryId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const isEditMode = !!categoryId;

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "FOOD",
    description: "",
  });

  useEffect(() => {
    if (!isEditMode || !categoryId) return;

    let active = true;

    const loadCategory = async () => {
      try {
        const response = await api.get<{
          data: Array<{
            categoryId: string;
            name: string;
            type: string;
            description?: string;
          }>;
        }>("/pos/categories");

        if (!active) return;

        const category = response.data.data.find(
          (entry) => entry.categoryId === categoryId,
        );

        if (!category) {
          toast.error("Category not found.");
          navigate(`/workspace/${branchId}/pos`);
          return;
        }

        setForm({
          name: category.name || "",
          type: category.type || "FOOD",
          description: category.description || "",
        });
      } catch {
        toast.error("Failed to load category.");
        navigate(`/workspace/${branchId}/pos`);
      }
    };

    loadCategory();

    return () => {
      active = false;
    };
  }, [branchId, categoryId, isEditMode, navigate, toast]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.warning("Category name is required.");
      return;
    }

    try {
      setSaving(true);

      if (isEditMode && categoryId) {
        await api.put(`/pos/categories/${categoryId}`, form);
        toast.success("Category updated successfully.");
      } else {
        await api.post("/pos/categories", form);
        toast.success("Category created successfully.");
      }

      navigate(`/workspace/${branchId}/pos`);
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(
        error.response?.data?.message ||
          `Failed to ${isEditMode ? "update" : "create"} category. Please try again.`,
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
            <PlusCircle className="add-branch-header-icon" />
          </div>
          <div>
            <h1 className="page-title">
              {isEditMode ? "Edit POS Category" : "Add POS Category"}
            </h1>
            <p className="page-subtitle">
              {isEditMode
                ? "Update category details for POS menu"
                : "Create a new category for POS menu"}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="ar-form-layout" noValidate>
        <div className="ar-form-main">
          <div className="luxury-card ar-section">
            <div className="ar-section-header">
              <h2 className="ar-section-title">Category Details</h2>
              <p className="ar-section-sub">Basic information and type</p>
            </div>

            <div className="ar-grid-2">
              <div className="ar-field">
                <label htmlFor="ar-name" className="ar-label">
                  Category Name <span className="ar-required">*</span>
                </label>
                <input
                  id="ar-name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="luxury-input"
                  placeholder="e.g. Starters, Beverages"
                  required
                />
              </div>

              <div className="ar-field">
                <label htmlFor="ar-type" className="ar-label">
                  Type
                </label>
                <select
                  id="ar-type"
                  name="type"
                  value={form.type}
                  onChange={handleChange}
                  className="luxury-input"
                >
                  <option value="FOOD">Food</option>
                  <option value="BEVERAGE">Beverage</option>
                  <option value="BAR">Bar</option>
                  <option value="ROOM_SERVICE">Room Service</option>
                </select>
              </div>
            </div>
          </div>

          <div className="luxury-card ar-section">
            <div className="ar-section-header">
              <h2 className="ar-section-title">Description</h2>
              <p className="ar-section-sub">
                Optional details about this category
              </p>
            </div>

            <div className="ar-field">
              <label htmlFor="ar-description" className="ar-label">
                Category Description
              </label>
              <textarea
                id="ar-description"
                name="description"
                value={form.description}
                onChange={handleChange}
                className="luxury-input ar-textarea"
                placeholder="Delicious appetizers to start your meal..."
                rows={4}
              />
            </div>
          </div>
        </div>

        <div className="ar-form-side">
          <div className="luxury-card ar-summary-card">
            <h3 className="ar-summary-title">Category Summary</h3>

            <div className="ar-summary-rows">
              <div className="ar-summary-row">
                <span className="ar-summary-key">Name</span>
                <span className="ar-summary-val">
                  {form.name || <span className="ar-empty">-</span>}
                </span>
              </div>
              <div className="ar-summary-row">
                <span className="ar-summary-key">Type</span>
                <span className="ar-summary-val">{form.type}</span>
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
                  {isEditMode ? "Updating..." : "Creating..."}
                </>
              ) : (
                <>
                  <Save size={15} />
                  {isEditMode ? "Update Category" : "Save Category"}
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

export default AddPOSCategory;
