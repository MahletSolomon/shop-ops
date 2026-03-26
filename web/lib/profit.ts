import { requestWithAuth } from "@/lib/api";

export type ProfitPeriod = "daily" | "weekly" | "monthly";

export type ProfitQueryParams = {
  businessId: string;
  startDate?: string;
  endDate?: string;
  period?: ProfitPeriod;
};

export type ProfitSummaryResponse = {
  total_sales: number;
  total_expenses: number;
  net_profit: number;
  period?: string;
};

export type ProfitTrendDataPoint = {
  date: string;
  total_sales: number;
  total_expenses: number;
  net_profit: number;
};

export type ProfitTrendsResponse = {
  trends: ProfitTrendDataPoint[];
  period?: string;
};

export type ProfitCompareResponse = {
  current: ProfitSummaryResponse;
  previous: ProfitSummaryResponse;
  change_pct: number;
};

const buildProfitQuery = (params: ProfitQueryParams) => {
  const query = new URLSearchParams({ business_id: params.businessId });

  if (params.startDate) {
    query.set("start_date", params.startDate);
  }

  if (params.endDate) {
    query.set("end_date", params.endDate);
  }

  if (params.period) {
    query.set("period", params.period);
  }

  return query;
};

export const fetchProfitSummary = (params: ProfitQueryParams) => {
  const query = buildProfitQuery(params);

  return requestWithAuth<ProfitSummaryResponse>(`/profit/summary?${query.toString()}`, {
    method: "GET",
  });
};

export const fetchProfitTrends = (params: ProfitQueryParams) => {
  const query = buildProfitQuery(params);

  return requestWithAuth<ProfitTrendsResponse>(`/profit/trends?${query.toString()}`, {
    method: "GET",
  });
};

export const fetchProfitComparison = (params: ProfitQueryParams) => {
  const query = buildProfitQuery(params);

  return requestWithAuth<ProfitCompareResponse>(`/profit/compare?${query.toString()}`, {
    method: "GET",
  });
};
