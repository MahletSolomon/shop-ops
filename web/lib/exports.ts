import { API_BASE_URL, getAccessToken, requestWithAuth } from "@/lib/api";

export type ExportType = "sales" | "expenses" | "transactions" | "inventory" | "profit";
export type ExportFormat = "csv";
export type ExportStatus = "pending" | "completed" | "failed";

export type ExportFilter = {
  start_date?: string;
  end_date?: string;
  category?: string;
  product_id?: string;
  search?: string;
  low_stock_only?: boolean;
  min_amount?: number;
  max_amount?: number;
};

export type CreateExportPayload = {
  business_id: string;
  type: ExportType;
  format: ExportFormat;
  filters?: ExportFilter;
  fields?: string[];
};

export type ExportRequest = {
  id: string;
  business_id: string;
  user_id: string;
  type: ExportType;
  format: ExportFormat;
  filters?: ExportFilter;
  fields?: string[];
  status: ExportStatus;
  file_url?: string;
  error?: string;
  created_at: string;
  updated_at: string;
};

export type ExportHistoryResponse = {
  data: ExportRequest[];
  total: number;
  page: number;
  limit: number;
};

export const requestExport = (payload: CreateExportPayload) => {
  return requestWithAuth<ExportRequest>("/export", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const fetchExportHistory = (businessId: string, page = 1, limit = 20) => {
  const query = new URLSearchParams({
    business_id: businessId,
    page: String(page),
    limit: String(limit),
  });

  return requestWithAuth<ExportHistoryResponse>(`/export/history?${query.toString()}`, {
    method: "GET",
  });
};

export const fetchExportStatus = (exportId: string, businessId: string) => {
  const query = new URLSearchParams({ business_id: businessId });

  return requestWithAuth<ExportRequest>(`/export/${exportId}?${query.toString()}`, {
    method: "GET",
  });
};

export const getDownloadPath = (fileUrl?: string) => {
  if (!fileUrl) {
    return "";
  }

  if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
    const fileName = fileUrl.split("/").pop();
    return fileName ? `/download/${fileName}` : "";
  }

  if (fileUrl.startsWith("/download/")) {
    return fileUrl;
  }

  const cleaned = fileUrl.replace(/\\/g, "/");
  const fileName = cleaned.split("/").pop();
  return fileName ? `/download/${fileName}` : "";
};

export const downloadExportFile = async (fileUrl: string) => {
  const path = getDownloadPath(fileUrl);
  if (!path) {
    throw new Error("No downloadable file URL is available yet.");
  }

  const token = getAccessToken();
  if (!token) {
    throw new Error("No auth token found. Please sign in again.");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Download failed (${response.status})`);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = path.split("/").pop() ?? "export.csv";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
};
