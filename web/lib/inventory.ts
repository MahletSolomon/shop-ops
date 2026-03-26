import { requestWithAuth } from "@/lib/api";

export type ApiProduct = {
  id: string;
  name: string;
  default_selling_price: string | number;
  stock_quantity: number;
  low_stock_threshold: number;
  is_low_stock: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductListResponse = {
  products: ApiProduct[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
};

export type FetchProductsParams = {
  businessId: string;
  search?: string;
  lowStockOnly?: boolean;
  page?: number;
  limit?: number;
  sort?: "name" | "stock" | "created_at";
  order?: "asc" | "desc";
};

export type CreateProductPayload = {
  business_id: string;
  name: string;
  default_selling_price: number;
  stock_quantity: number;
  low_stock_threshold: number;
};

export type UpdateProductPayload = {
  business_id: string;
  name?: string;
  default_selling_price?: number;
  low_stock_threshold?: number;
};

export type AdjustStockPayload = {
  business_id: string;
  quantity: number;
  type: "purchase" | "sale" | "adjust" | "damage" | "theft" | "return";
  reason: string;
};

const toNumber = (value: string | number) => {
  if (typeof value === "number") {
    return value;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const formatInventoryMoney = (value: string | number) => {
  const amount = toNumber(value);
  return `Br ${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const fetchProducts = (params: FetchProductsParams) => {
  const query = new URLSearchParams({
    business_id: params.businessId,
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 100),
    sort: params.sort ?? "name",
    order: params.order ?? "asc",
  });

  if (params.search) {
    query.set("search", params.search);
  }

  if (params.lowStockOnly) {
    query.set("low_stock_only", "true");
  }

  return requestWithAuth<ProductListResponse>(
    `/inventory/products?${query.toString()}`,
    {
      method: "GET",
    },
  );
};

export const fetchLowStockProducts = (businessId: string) => {
  const query = new URLSearchParams({ business_id: businessId });

  return requestWithAuth<ApiProduct[]>(
    `/inventory/products/low-stock?${query.toString()}`,
    {
      method: "GET",
    },
  );
};

export const createProduct = (payload: CreateProductPayload) => {
  return requestWithAuth<ApiProduct>("/inventory/products", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const updateProduct = (productId: string, payload: UpdateProductPayload) => {
  return requestWithAuth<ApiProduct>(`/inventory/products/${productId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
};

export const deleteProduct = (productId: string, businessId: string) => {
  const query = new URLSearchParams({ business_id: businessId });

  return requestWithAuth<{ message: string }>(
    `/inventory/products/${productId}?${query.toString()}`,
    {
      method: "DELETE",
    },
  );
};

export const adjustStock = (productId: string, payload: AdjustStockPayload) => {
  return requestWithAuth<{ message: string }>(`/inventory/products/${productId}/adjust`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
};
