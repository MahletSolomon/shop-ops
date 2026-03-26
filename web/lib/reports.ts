import { requestWithAuth } from "@/lib/api";

export type ReportGroupBy = "day" | "week" | "month";

export type TopProduct = {
  product_id?: string;
  product_name: string;
  total_sales: string | number;
  quantity: number;
};

export type SalesReportGroup = {
  period: string;
  total_sales: string | number;
  orders: number;
};

export type SalesReportResponse = {
  total_sales: string | number;
  total_orders: number;
  top_products: TopProduct[];
  start_date: string;
  end_date: string;
  group_by?: ReportGroupBy;
  grouped_data?: SalesReportGroup[];
};

export type ExpenseByCategory = {
  category: string;
  total_amount: string | number;
  transaction_count: number;
};

export type ExpenseReportGroup = {
  period: string;
  total_amount: string | number;
  count: number;
};

export type ExpenseReportResponse = {
  total_expenses: string | number;
  total_transactions: number;
  by_category: ExpenseByCategory[];
  start_date: string;
  end_date: string;
  group_by?: ReportGroupBy;
  grouped_data?: ExpenseReportGroup[];
};

export type ProfitReportGroup = {
  period: string;
  sales: string | number;
  expenses: string | number;
  profit: string | number;
};

export type ProfitReportResponse = {
  total_sales: string | number;
  total_expenses: string | number;
  profit: string | number;
  start_date: string;
  end_date: string;
  group_by?: ReportGroupBy;
  grouped_data?: ProfitReportGroup[];
};

export type InventoryReportItem = {
  product_id: string;
  product_name: string;
  current_stock: number;
  low_stock_threshold: number;
  is_low_stock: boolean;
};

export type InventoryReportResponse = {
  total_products: number;
  low_stock_products: InventoryReportItem[];
  out_of_stock_products: InventoryReportItem[];
  generated_at: string;
};

export type ReportQueryParams = {
  businessId: string;
  startDate: string;
  endDate: string;
  groupBy?: ReportGroupBy;
};

const buildReportQuery = (params: ReportQueryParams) => {
  const query = new URLSearchParams({
    business_id: params.businessId,
    start_date: params.startDate,
    end_date: params.endDate,
  });

  if (params.groupBy) {
    query.set("group_by", params.groupBy);
  }

  return query;
};

export const fetchSalesReport = (params: ReportQueryParams) => {
  const query = buildReportQuery(params);

  return requestWithAuth<SalesReportResponse>(`/reports/sales?${query.toString()}`, {
    method: "GET",
  });
};

export const fetchExpenseReport = (params: ReportQueryParams) => {
  const query = buildReportQuery(params);

  return requestWithAuth<ExpenseReportResponse>(`/reports/expenses?${query.toString()}`, {
    method: "GET",
  });
};

export const fetchProfitReport = (params: ReportQueryParams) => {
  const query = buildReportQuery(params);

  return requestWithAuth<ProfitReportResponse>(`/reports/profit?${query.toString()}`, {
    method: "GET",
  });
};

export const fetchInventoryReport = (businessId: string) => {
  const query = new URLSearchParams({ business_id: businessId });

  return requestWithAuth<InventoryReportResponse>(`/reports/inventory?${query.toString()}`, {
    method: "GET",
  });
};

export const toDecimalNumber = (value: string | number) => {
  if (typeof value === "number") {
    return value;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const formatReportMoney = (value: string | number) => {
  const amount = toDecimalNumber(value);
  return `Br ${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};
