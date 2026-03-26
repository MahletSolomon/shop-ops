import { requestWithAuth } from "@/lib/api";

export type SyncTransactionType = "sale" | "expense";

export type SyncBatchTransaction = {
  local_id: string;
  type: SyncTransactionType;
  data: Record<string, unknown>;
};

export type SyncBatchPayload = {
  business_id: string;
  device_id: string;
  sync_timestamp: string;
  transactions: SyncBatchTransaction[];
};

export type SyncItemResult = {
  local_id: string;
  server_id?: string;
  status: string;
  message?: string;
};

export type SyncBatchResponse = {
  sync_id: string;
  status: string;
  timestamp: string;
  results: SyncItemResult[];
  summary: {
    total: number;
    success: number;
    failed: number;
  };
  retry_after_seconds?: number;
};

export type SyncStatusResponse = {
  business_id: string;
  device_id: string;
  last_sync_at: string;
  last_sync_id: string;
  last_status: string;
  pending_retries: number;
  total_synced: number;
  failed_last_24h: number;
};

export type SyncHistoryResponse = {
  data: Array<{
    id: string;
    business_id: string;
    device_id: string;
    sync_timestamp: string;
    status: string;
    summary: {
      total: number;
      success: number;
      failed: number;
    };
    created_at: string;
  }>;
  pagination: {
    current_page: number;
    total_pages: number;
    total_records: number;
    per_page: number;
  };
};

export const fetchSyncStatus = (businessId: string, deviceId?: string) => {
  const query = new URLSearchParams({ business_id: businessId });
  if (deviceId) {
    query.set("device_id", deviceId);
  }

  return requestWithAuth<SyncStatusResponse>(`/sync/status?${query.toString()}`, {
    method: "GET",
  });
};

export const fetchSyncHistory = (businessId: string, page = 1, limit = 10) => {
  const query = new URLSearchParams({
    business_id: businessId,
    page: String(page),
    limit: String(limit),
  });

  return requestWithAuth<SyncHistoryResponse>(`/sync/history?${query.toString()}`, {
    method: "GET",
  });
};

export const syncBatch = (payload: SyncBatchPayload) => {
  return requestWithAuth<SyncBatchResponse>("/sync/batch", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};
