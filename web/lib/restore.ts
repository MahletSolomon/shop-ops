import { requestWithAuth } from "@/lib/api";

export type RestoreInclude = "sales" | "expenses" | "products";

export type RestoreResponse = {
  sales?: Array<Record<string, unknown>>;
  expenses?: Array<Record<string, unknown>>;
  products?: Array<Record<string, unknown>>;
  since?: string;
  restored_at: string;
};

export const fullRestore = (businessId: string, include: RestoreInclude[] = []) => {
  const query = new URLSearchParams();
  if (include.length > 0) {
    query.set("include", include.join(","));
  }

  const suffix = query.toString() ? `?${query.toString()}` : "";

  return requestWithAuth<RestoreResponse>(`/businesses/${businessId}/restore${suffix}`, {
    method: "GET",
  });
};

export const incrementalRestore = (
  businessId: string,
  since: string,
  include: RestoreInclude[] = [],
) => {
  const query = new URLSearchParams({ since });
  if (include.length > 0) {
    query.set("include", include.join(","));
  }

  return requestWithAuth<RestoreResponse>(
    `/businesses/${businessId}/restore/incremental?${query.toString()}`,
    {
      method: "GET",
    },
  );
};
