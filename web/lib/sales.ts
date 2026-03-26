import { requestWithAuth } from "@/lib/api";

export type ApiSale = {
  id: string;
  business_id: string;
  product_id?: string;
  unit_price: number;
  quantity: number;
  total: number;
  note?: string;
  is_voided: boolean;
  created_at: string;
};

export type SaleListResponse = {
  sales: ApiSale[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
};

export type SaleSummaryResponse = {
  total_sales: number;
  total_revenue: number;
  voided_count: number;
  period?: string;
};

export type SaleStatsResponse = {
  daily: SaleSummaryResponse;
  weekly: SaleSummaryResponse;
  monthly: SaleSummaryResponse;
};

export type FetchSalesParams = {
  businessId: string;
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  productId?: string;
  minAmount?: number;
  maxAmount?: number;
  sort?: "created_at" | "total";
  order?: "asc" | "desc";
};

export type CreateSalePayload = {
  business_id: string;
  product_id?: string;
  unit_price: number;
  quantity: number;
  note?: string;
};

export type UpdateSalePayload = {
  business_id: string;
  note?: string;
};

const toNumber = (value: string | number) => {
  if (typeof value === "number") {
    return value;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const formatSalesMoney = (value: string | number) => {
  const amount = toNumber(value);
  return `Br ${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const fetchSales = (params: FetchSalesParams) => {
  const query = new URLSearchParams({
    business_id: params.businessId,
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 10),
    sort: params.sort ?? "created_at",
    order: params.order ?? "desc",
  });

  if (params.startDate) {
    query.set("start_date", params.startDate);
  }
  if (params.endDate) {
    query.set("end_date", params.endDate);
  }
  if (params.productId) {
    query.set("product_id", params.productId);
  }
  if (typeof params.minAmount === "number") {
    query.set("min_amount", String(params.minAmount));
  }
  if (typeof params.maxAmount === "number") {
    query.set("max_amount", String(params.maxAmount));
  }

  return requestWithAuth<SaleListResponse>(`/sales?${query.toString()}`, {
    method: "GET",
  });
};

export const fetchSaleById = (saleId: string, businessId: string) => {
  const query = new URLSearchParams({ business_id: businessId });

  return requestWithAuth<ApiSale>(`/sales/${saleId}?${query.toString()}`, {
    method: "GET",
  });
};

export const createSale = (payload: CreateSalePayload) => {
  return requestWithAuth<ApiSale>("/sales", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const updateSaleNote = (saleId: string, payload: UpdateSalePayload) => {
  return requestWithAuth<ApiSale>(`/sales/${saleId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
};

export const voidSale = (saleId: string, businessId: string) => {
  const query = new URLSearchParams({ business_id: businessId });

  return requestWithAuth<{ message: string }>(`/sales/${saleId}?${query.toString()}`, {
    method: "DELETE",
  });
};

export const fetchSalesSummary = (
  businessId: string,
  startDate?: string,
  endDate?: string,
) => {
  const query = new URLSearchParams({ business_id: businessId });

  if (startDate) {
    query.set("start_date", startDate);
  }
  if (endDate) {
    query.set("end_date", endDate);
  }

  return requestWithAuth<SaleSummaryResponse>(`/sales/summary?${query.toString()}`, {
    method: "GET",
  });
};

export const fetchSalesStats = (businessId: string) => {
  const query = new URLSearchParams({ business_id: businessId });

  return requestWithAuth<SaleStatsResponse>(`/sales/stats?${query.toString()}`, {
    method: "GET",
  });
};

export const toAmountNumber = (value: string | number) => toNumber(value);
