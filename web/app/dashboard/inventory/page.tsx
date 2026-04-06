"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import PageTitle from "@/app/components/ui/PageTitle";
import Card from "@/app/components/ui/Card";
import { AlertTriangle, PackageX, TrendingUp } from "lucide-react";
import { ProductTabs } from "@/app/components/ui/ProductTabs";
import { Product, ProductTable } from "@/app/components/tables/ProductTable";
import GuidedTour from "@/app/components/ui/GuidedTour";
import { useTour } from "@/app/hooks/useTour";
import { inventoryTourSteps } from "@/app/config/tourSteps";
import {
  adjustStock,
  ApiProduct,
  createProduct,
  deleteProduct,
  fetchProducts,
  formatInventoryMoney,
  updateProduct,
} from "@/lib/inventory";

type ActiveBusiness = {
  id: string;
};

type ProductFormState = {
  name: string;
  defaultSellingPrice: string;
  stockQuantity: string;
  lowStockThreshold: string;
};

const emptyForm: ProductFormState = {
  name: "",
  defaultSellingPrice: "",
  stockQuantity: "0",
  lowStockThreshold: "5",
};

const readActiveBusinessId = () => {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    const raw = window.localStorage.getItem("activeBusiness");
    if (!raw) {
      return "";
    }

    const parsed = JSON.parse(raw) as ActiveBusiness;
    return parsed?.id ?? "";
  } catch {
    return "";
  }
};

const toStatus = (product: ApiProduct) => {
  if (product.stock_quantity === 0) {
    return "Out of Stock";
  }

  if (
    product.is_low_stock ||
    product.stock_quantity <= product.low_stock_threshold
  ) {
    return "Low Stock";
  }

  return "In Stock";
};

const toTableProduct = (product: ApiProduct): Product => {
  return {
    id: product.id,
    name: product.name,
    sku: "N/A",
    category: "General",
    qty: product.stock_quantity,
    price: formatInventoryMoney(product.default_selling_price),
    status: toStatus(product),
  };
};

const Inventory = () => {
  const t = useTranslations("inventory");
  const tCommon = useTranslations("common");
  const { showTour, completeTour, skipTour } = useTour("inventory");
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeBusinessId, setActiveBusinessId] = useState("");
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [mutatingProductId, setMutatingProductId] = useState<
    string | number | null
  >(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [actionError, setActionError] = useState("");
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [formState, setFormState] = useState<ProductFormState>(emptyForm);

  const reloadProducts = useCallback(async () => {
    if (!activeBusinessId) {
      setProducts([]);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetchProducts({
        businessId: activeBusinessId,
        search: searchQuery.trim() || undefined,
        page: 1,
        limit: 100,
        sort: "name",
        order: "asc",
      });

      setProducts(response.products);
    } catch (fetchError) {
      setProducts([]);
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to load inventory",
      );
    } finally {
      setIsLoading(false);
    }
  }, [activeBusinessId, searchQuery]);

  useEffect(() => {
    const syncActiveBusiness = () => {
      setActiveBusinessId(readActiveBusinessId());
    };

    syncActiveBusiness();
    window.addEventListener("activeBusinessChanged", syncActiveBusiness);

    return () => {
      window.removeEventListener("activeBusinessChanged", syncActiveBusiness);
    };
  }, []);

  useEffect(() => {
    reloadProducts();
  }, [reloadProducts]);

  useEffect(() => {
    if (!success) {
      return;
    }

    const timeoutId = window.setTimeout(() => setSuccess(""), 2500);
    return () => window.clearTimeout(timeoutId);
  }, [success]);

  const openCreate = () => {
    setFormMode("create");
    setEditingProductId(null);
    setFormState(emptyForm);
    setActionError("");
  };

  const openEdit = (id: string | number) => {
    const product = products.find((item) => item.id === String(id));
    if (!product) {
      return;
    }

    setFormMode("edit");
    setEditingProductId(product.id);
    setActionError("");
    setFormState({
      name: product.name,
      defaultSellingPrice: String(product.default_selling_price),
      stockQuantity: String(product.stock_quantity),
      lowStockThreshold: String(product.low_stock_threshold),
    });
  };

  const closeForm = () => {
    if (isSaving) {
      return;
    }

    setFormMode(null);
    setEditingProductId(null);
    setFormState(emptyForm);
    setActionError("");
  };

  const handleSave = async () => {
    if (!activeBusinessId) {
      setActionError("Select a business before performing inventory actions.");
      return;
    }

    const name = formState.name.trim();
    const price = Number.parseFloat(formState.defaultSellingPrice);
    const stockQuantity = Number.parseInt(formState.stockQuantity, 10);
    const lowStockThreshold = Number.parseInt(formState.lowStockThreshold, 10);

    if (!name) {
      setActionError("Product name is required.");
      return;
    }

    if (!Number.isFinite(price) || price <= 0) {
      setActionError("Price must be a number greater than zero.");
      return;
    }

    if (
      formMode === "create" &&
      (!Number.isInteger(stockQuantity) || stockQuantity < 0)
    ) {
      setActionError("Starting stock must be a non-negative integer.");
      return;
    }

    if (!Number.isInteger(lowStockThreshold) || lowStockThreshold < 0) {
      setActionError("Low stock threshold must be a non-negative integer.");
      return;
    }

    setIsSaving(true);
    setActionError("");
    setSuccess("");

    try {
      if (formMode === "create") {
        await createProduct({
          business_id: activeBusinessId,
          name,
          default_selling_price: price,
          stock_quantity: stockQuantity,
          low_stock_threshold: lowStockThreshold,
        });
        setSuccess("Product created successfully.");
      }

      if (formMode === "edit" && editingProductId) {
        await updateProduct(editingProductId, {
          business_id: activeBusinessId,
          name,
          default_selling_price: price,
          low_stock_threshold: lowStockThreshold,
        });
        setSuccess("Product updated successfully.");
      }

      closeForm();
      await reloadProducts();
    } catch (saveError) {
      setActionError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save product",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string | number) => {
    if (!activeBusinessId) {
      setActionError("Select a business before deleting products.");
      return;
    }

    const confirmed = window.confirm(
      "Delete this product? This action cannot be undone.",
    );
    if (!confirmed) {
      return;
    }

    setMutatingProductId(id);
    setActionError("");
    setSuccess("");

    try {
      await deleteProduct(String(id), activeBusinessId);
      setSuccess("Product deleted successfully.");
      await reloadProducts();
    } catch (deleteError) {
      setActionError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete product",
      );
    } finally {
      setMutatingProductId(null);
    }
  };

  const handleRestock = async (id: string | number) => {
    if (!activeBusinessId) {
      setActionError("Select a business before restocking products.");
      return;
    }

    const quantityRaw = window.prompt("Enter quantity to add to stock:", "1");
    if (!quantityRaw) {
      return;
    }

    const quantity = Number.parseInt(quantityRaw, 10);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      setActionError("Restock quantity must be a positive integer.");
      return;
    }

    setMutatingProductId(id);
    setActionError("");
    setSuccess("");

    try {
      await adjustStock(String(id), {
        business_id: activeBusinessId,
        quantity,
        type: "purchase",
        reason: "Manual restock from dashboard",
      });
      setSuccess("Stock adjusted successfully.");
      await reloadProducts();
    } catch (adjustError) {
      setActionError(
        adjustError instanceof Error
          ? adjustError.message
          : "Failed to adjust stock",
      );
    } finally {
      setMutatingProductId(null);
    }
  };

  const inStockCount = useMemo(
    () =>
      products.filter(
        (product) => product.stock_quantity > product.low_stock_threshold,
      ).length,
    [products],
  );

  const lowStockCount = useMemo(
    () =>
      products.filter(
        (product) =>
          product.stock_quantity > 0 &&
          (product.is_low_stock ||
            product.stock_quantity <= product.low_stock_threshold),
      ).length,
    [products],
  );

  const outOfStockCount = useMemo(
    () => products.filter((product) => product.stock_quantity === 0).length,
    [products],
  );

  const filteredProducts = useMemo(() => {
    return products
      .filter((product) => {
        if (activeTab === "out") {
          return product.stock_quantity === 0;
        }

        if (activeTab === "low") {
          return (
            product.stock_quantity > 0 &&
            (product.is_low_stock ||
              product.stock_quantity <= product.low_stock_threshold)
          );
        }

        return true;
      })
      .map(toTableProduct);
  }, [activeTab, products]);

  const tabOptions = [
    { id: "all", label: "All", count: products.length },
    { id: "low", label: "Low", count: lowStockCount },
    { id: "out", label: "Out", count: outOfStockCount },
  ];

  return (
    <div className="flex flex-col space-y-4">
      <PageTitle
        title={t("title")}
        subtitle={t("subtitle")}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card
          title=""
          value={String(inStockCount)}
          icon={TrendingUp}
          iconWrapperClass="bg-red-50 text-red-600"
          trend=""
          trendDirection=""
          description="In Stock"
        />

        <Card
          title=""
          value={String(lowStockCount)}
          icon={AlertTriangle}
          iconWrapperClass="bg-indigo-50 text-indigo-600"
          trend=""
          trendDirection=""
          description="Low Stock"
        />

        <Card
          title=""
          value={String(outOfStockCount)}
          icon={PackageX}
          iconWrapperClass="bg-indigo-50 text-indigo-600"
          trend=""
          trendDirection=""
          description="Out of Stock"
        />
      </div>

      <div className="space-y-4">
        {!activeBusinessId ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Select a business to load inventory data.
          </div>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {actionError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {actionError}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        ) : null}

        <ProductTabs
          tabs={tabOptions}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onSearch={setSearchQuery}
          data-tour="product-filters"
        />

        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {isLoading
              ? "Loading products..."
              : `${filteredProducts.length} product(s)`}
          </p>
          <button
            onClick={openCreate}
            disabled={!activeBusinessId || isSaving}
            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            data-tour="add-product-btn"
          >
            Add Product
          </button>
        </div>

        {formMode ? (
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-900">
              {formMode === "create" ? "Create Product" : "Edit Product"}
            </h3>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="text-sm text-gray-700">
                Name
                <input
                  type="text"
                  value={formState.name}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  className="mt-1 h-10 w-full rounded-md border border-gray-300 px-3 text-sm"
                />
              </label>

              <label className="text-sm text-gray-700">
                Price
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formState.defaultSellingPrice}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      defaultSellingPrice: event.target.value,
                    }))
                  }
                  className="mt-1 h-10 w-full rounded-md border border-gray-300 px-3 text-sm"
                />
              </label>

              <label className="text-sm text-gray-700">
                Starting Stock
                <input
                  type="number"
                  min="0"
                  value={formState.stockQuantity}
                  disabled={formMode === "edit"}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      stockQuantity: event.target.value,
                    }))
                  }
                  className="mt-1 h-10 w-full rounded-md border border-gray-300 px-3 text-sm disabled:bg-gray-100"
                />
              </label>

              <label className="text-sm text-gray-700">
                Low Stock Threshold
                <input
                  type="number"
                  min="0"
                  value={formState.lowStockThreshold}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      lowStockThreshold: event.target.value,
                    }))
                  }
                  className="mt-1 h-10 w-full rounded-md border border-gray-300 px-3 text-sm"
                />
              </label>
            </div>

            {formMode === "edit" ? (
              <p className="mt-2 text-xs text-gray-500">
                Stock quantity cannot be changed from edit; use Restock on the
                row action.
              </p>
            ) : null}

            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving
                  ? "Saving..."
                  : formMode === "create"
                    ? "Create"
                    : "Save Changes"}
              </button>
              <button
                onClick={closeForm}
                disabled={isSaving}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {/* table with filtered list */}
        <div data-tour="product-table">
          <ProductTable
            products={filteredProducts}
            onRestock={handleRestock}
            onEdit={openEdit}
            onDelete={handleDelete}
            mutatingProductId={mutatingProductId}
          />
        </div>
      </div>

      {showTour && (
        <GuidedTour
          steps={inventoryTourSteps}
          onComplete={completeTour}
          onSkip={skipTour}
          allowNavigation={true}
        />
      )}
    </div>
  );
};

export default Inventory;
