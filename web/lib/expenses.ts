import { requestWithAuth } from "@/lib/api";

export type ExpenseCategoryApi =
  | "RENT"
  | "UTILITIES"
  | "SALARY"
  | "STOCK_PURCHASE"
  | "TRANSPORT"
  | "MARKETING"
  | "MAINTENANCE"
  | "OTHER";

export type ApiExpense = {
  id: string;
  business_id: string;
  category: ExpenseCategoryApi;
  amount: string | number;
  note: string;
  created_at: string;
  is_voided: boolean;
};

export type ExpensesListResponse = {
  data: ApiExpense[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
};

export type ExpenseSummaryResponse = {
  categories: Record<string, string | number>;
  total: string | number;
};

export type ExpenseListParams = {
  businessId: string;
  page: number;
  limit: number;
  category?: ExpenseCategoryApi;
  startDate?: string;
  endDate?: string;
  sort?: "date" | "amount" | "category";
  order?: "asc" | "desc";
};

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategoryApi, string> = {
  RENT: "Rent",
  UTILITIES: "Utilities",
  SALARY: "Salaries",
  STOCK_PURCHASE: "Stock Purchase",
  TRANSPORT: "Transport",
  MARKETING: "Marketing",
  MAINTENANCE: "Maintenance",
  OTHER: "Other",
};

export const getExpenseCategoryLabel = (value: string) => {
  return EXPENSE_CATEGORY_LABELS[value as ExpenseCategoryApi] ?? value;
};

export const toExpenseCategoryApi = (labelOrValue: string) => {
  const normalized = labelOrValue.trim().toUpperCase();
  const category = Object.keys(EXPENSE_CATEGORY_LABELS).find(
    (value) => value === normalized,
  );

  if (category) {
    return category as ExpenseCategoryApi;
  }

  const labelMatch = Object.entries(EXPENSE_CATEGORY_LABELS).find(
    ([, label]) => label.toUpperCase() === normalized,
  );

  return labelMatch?.[0] as ExpenseCategoryApi | undefined;
};

const toDecimalNumber = (value: string | number) => {
  if (typeof value === "number") {
    return value;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const formatMoney = (value: string | number) => {
  const amount = toDecimalNumber(value);
  return `Br ${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const fetchExpenseCategories = () => {
  return requestWithAuth<string[]>("/expenses/categories", { method: "GET" });
};

export const fetchExpenses = (params: ExpenseListParams) => {
  const query = new URLSearchParams({
    businessId: params.businessId,
    page: String(params.page),
    limit: String(params.limit),
    sort: params.sort ?? "date",
    order: params.order ?? "desc",
  });

  if (params.category) {
    query.set("category", params.category);
  }
  if (params.startDate) {
    query.set("start_date", params.startDate);
  }
  if (params.endDate) {
    query.set("end_date", params.endDate);
  }

  return requestWithAuth<ExpensesListResponse>(`/expenses/?${query.toString()}`, {
    method: "GET",
  });
};

export const fetchExpenseSummary = (businessId: string, startDate?: string, endDate?: string) => {
  const query = new URLSearchParams({ businessId });

  if (startDate) {
    query.set("start_date", startDate);
  }
  if (endDate) {
    query.set("end_date", endDate);
  }

  return requestWithAuth<ExpenseSummaryResponse>(`/expenses/summary?${query.toString()}`, {
    method: "GET",
  });
};

export const createExpense = (payload: {
  business_id: string;
  category: ExpenseCategoryApi;
  amount: number;
  note: string;
}) => {
  return requestWithAuth<ApiExpense>("/expenses", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const updateExpense = (
  expenseId: string,
  payload: {
    category?: ExpenseCategoryApi;
    amount?: number;
    note?: string;
  },
) => {
  return requestWithAuth<ApiExpense>(`/expenses/${expenseId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
};

export const voidExpense = (expenseId: string) => {
  return requestWithAuth<{ message: string; id: string; voided: boolean }>(`/expenses/${expenseId}`, {
    method: "DELETE",
  });
};

export const toAmountNumber = (value: string | number) => toDecimalNumber(value);
