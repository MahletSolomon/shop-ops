import { requestWithAuth } from "@/lib/api";

export type TransactionType = "sale" | "expense";

export type ApiTransaction = {
  id: string;
  type: TransactionType;
  date: string;
  amount: string | number;
  product_id?: string;
  product_name?: string;
  category?: string;
  description: string;
  created_at: string;
};

export type TransactionListResponse = {
  data: ApiTransaction[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_records: number;
    per_page: number;
  };
};

export type FetchTransactionsParams = {
  businessId: string;
  startDate?: string;
  endDate?: string;
  type?: "sale" | "expense" | "all";
  category?: string;
  productId?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  page?: number;
  limit?: number;
  sort?: "date" | "amount";
  order?: "asc" | "desc";
};

export const fetchTransactions = (params: FetchTransactionsParams) => {
  const query = new URLSearchParams({
    business_id: params.businessId,
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 20),
    sort: params.sort ?? "date",
    order: params.order ?? "desc",
  });

  if (params.startDate) {
    query.set("start_date", params.startDate);
  }
  if (params.endDate) {
    query.set("end_date", params.endDate);
  }
  if (params.type) {
    query.set("type", params.type);
  }
  if (params.category) {
    query.set("category", params.category);
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
  if (params.search?.trim()) {
    query.set("search", params.search.trim());
  }

  return requestWithAuth<TransactionListResponse>(`/transactions?${query.toString()}`, {
    method: "GET",
  });
};
