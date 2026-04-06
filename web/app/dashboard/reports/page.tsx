"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowDownToLine,
  BarChart3,
  Database,
  Download,
  FileOutput,
  RefreshCcw,
  TrendingUp,
} from "lucide-react";
import PageTitle from "@/app/components/ui/PageTitle";
import Card from "@/app/components/ui/Card";
import {
  fetchExpenseReport,
  fetchInventoryReport,
  fetchProfitReport,
  fetchSalesReport,
  formatReportMoney,
  ReportGroupBy,
} from "@/lib/reports";
import {
  fetchProfitComparison,
  fetchProfitSummary,
  fetchProfitTrends,
  ProfitPeriod,
} from "@/lib/profit";
import {
  downloadExportFile,
  ExportHistoryResponse,
  ExportRequest,
  ExportType,
  fetchExportHistory,
  fetchExportStatus,
  requestExport,
} from "@/lib/exports";
import { fetchTransactions } from "@/lib/transactions";
import { fetchSyncHistory, fetchSyncStatus, syncBatch } from "@/lib/sync";
import { fullRestore, incrementalRestore, RestoreInclude } from "@/lib/restore";

type ActiveBusiness = {
  id: string;
};

type ReportTab =
  | "overview"
  | "profit"
  | "builder"
  | "transactions"
  | "exports"
  | "sync_restore";

type BuilderReportType = "sales" | "expenses" | "profit" | "inventory";

const TAB_OPTIONS: Array<{ id: ReportTab; labelKey: string }> = [
  { id: "overview", labelKey: "overview" },
  { id: "profit", labelKey: "profitAnalysis" },
  { id: "builder", labelKey: "reportsBuilder" },
  { id: "transactions", labelKey: "transactionsExplorer" },
  { id: "exports", labelKey: "exports" },
  { id: "sync_restore", labelKey: "syncAndRestore" },
];

const formatDateForApi = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

const toShortDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

const ReportsPage = () => {
  const t = useTranslations("reports");
  const tCommon = useTranslations("common");
  const today = useMemo(() => new Date(), []);
  const firstDayOfMonth = useMemo(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
    [today],
  );

  const [activeBusinessId, setActiveBusinessId] = useState("");
  const [activeTab, setActiveTab] = useState<ReportTab>("overview");
  const [startDate, setStartDate] = useState(formatDateForApi(firstDayOfMonth));
  const [endDate, setEndDate] = useState(formatDateForApi(today));
  const [groupBy, setGroupBy] = useState<ReportGroupBy>("day");

  const [isLoadingOverview, setIsLoadingOverview] = useState(false);
  const [isLoadingProfit, setIsLoadingProfit] = useState(false);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [isLoadingExports, setIsLoadingExports] = useState(false);
  const [isLoadingSync, setIsLoadingSync] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [salesReport, setSalesReport] = useState<any>(null);
  const [expenseReport, setExpenseReport] = useState<any>(null);
  const [profitReport, setProfitReport] = useState<any>(null);
  const [inventoryReport, setInventoryReport] = useState<any>(null);

  const [profitPeriod, setProfitPeriod] = useState<ProfitPeriod>("daily");
  const [profitSummary, setProfitSummary] = useState<any>(null);
  const [profitTrends, setProfitTrends] = useState<any>(null);
  const [profitComparison, setProfitComparison] = useState<any>(null);

  const [builderType, setBuilderType] = useState<BuilderReportType>("sales");
  const [builderData, setBuilderData] = useState<any>(null);
  const [isLoadingBuilder, setIsLoadingBuilder] = useState(false);

  const [transactionSearch, setTransactionSearch] = useState("");
  const [transactionType, setTransactionType] = useState<"all" | "sale" | "expense">("all");
  const [transactionPage, setTransactionPage] = useState(1);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [transactionPagination, setTransactionPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_records: 0,
    per_page: 10,
  });

  const [exportType, setExportType] = useState<ExportType>("sales");
  const [exportFields, setExportFields] = useState("date,amount,note");
  const [exportHistory, setExportHistory] = useState<ExportHistoryResponse | null>(null);
  const [isSubmittingExport, setIsSubmittingExport] = useState(false);

  const [syncDeviceId, setSyncDeviceId] = useState("web-dashboard");
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [syncHistory, setSyncHistory] = useState<any>(null);
  const [isSubmittingSync, setIsSubmittingSync] = useState(false);
  const [restoreInclude, setRestoreInclude] = useState<RestoreInclude[]>([
    "sales",
    "expenses",
    "products",
  ]);
  const [restoreSince, setRestoreSince] = useState("");
  const [restoreResultSummary, setRestoreResultSummary] = useState("");
  const [isRunningRestore, setIsRunningRestore] = useState(false);

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
    if (!success) {
      return;
    }

    const timeoutId = window.setTimeout(() => setSuccess(""), 2500);
    return () => window.clearTimeout(timeoutId);
  }, [success]);

  const loadOverview = useCallback(async () => {
    if (!activeBusinessId || !startDate || !endDate) {
      setSalesReport(null);
      setExpenseReport(null);
      setProfitReport(null);
      setInventoryReport(null);
      return;
    }

    setIsLoadingOverview(true);
    setError("");

    try {
      const [sales, expenses, profit, inventory] = await Promise.all([
        fetchSalesReport({ businessId: activeBusinessId, startDate, endDate, groupBy }),
        fetchExpenseReport({ businessId: activeBusinessId, startDate, endDate, groupBy }),
        fetchProfitReport({ businessId: activeBusinessId, startDate, endDate, groupBy }),
        fetchInventoryReport(activeBusinessId),
      ]);

      setSalesReport(sales);
      setExpenseReport(expenses);
      setProfitReport(profit);
      setInventoryReport(inventory);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to load report overview",
      );
      setSalesReport(null);
      setExpenseReport(null);
      setProfitReport(null);
      setInventoryReport(null);
    } finally {
      setIsLoadingOverview(false);
    }
  }, [activeBusinessId, endDate, groupBy, startDate]);

  const loadProfit = useCallback(async () => {
    if (!activeBusinessId) {
      setProfitSummary(null);
      setProfitTrends(null);
      setProfitComparison(null);
      return;
    }

    setIsLoadingProfit(true);

    try {
      const [summary, trends, comparison] = await Promise.all([
        fetchProfitSummary({
          businessId: activeBusinessId,
          startDate,
          endDate,
          period: profitPeriod,
        }),
        fetchProfitTrends({
          businessId: activeBusinessId,
          startDate,
          endDate,
          period: profitPeriod,
        }),
        fetchProfitComparison({
          businessId: activeBusinessId,
          startDate,
          endDate,
          period: profitPeriod,
        }),
      ]);

      setProfitSummary(summary);
      setProfitTrends(trends);
      setProfitComparison(comparison);
    } catch {
      setProfitSummary(null);
      setProfitTrends(null);
      setProfitComparison(null);
    } finally {
      setIsLoadingProfit(false);
    }
  }, [activeBusinessId, endDate, profitPeriod, startDate]);

  const loadTransactions = useCallback(async () => {
    if (!activeBusinessId) {
      setTransactions([]);
      setTransactionPagination({
        current_page: 1,
        total_pages: 1,
        total_records: 0,
        per_page: 10,
      });
      return;
    }

    setIsLoadingTransactions(true);

    try {
      const response = await fetchTransactions({
        businessId: activeBusinessId,
        startDate,
        endDate,
        type: transactionType,
        search: transactionSearch,
        page: transactionPage,
        limit: 10,
        sort: "date",
        order: "desc",
      });

      setTransactions(response.data);
      setTransactionPagination(response.pagination);
    } catch {
      setTransactions([]);
      setTransactionPagination({
        current_page: 1,
        total_pages: 1,
        total_records: 0,
        per_page: 10,
      });
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [activeBusinessId, endDate, startDate, transactionPage, transactionSearch, transactionType]);

  const loadExportHistory = useCallback(async () => {
    if (!activeBusinessId) {
      setExportHistory(null);
      return;
    }

    setIsLoadingExports(true);

    try {
      const response = await fetchExportHistory(activeBusinessId, 1, 20);
      setExportHistory(response);
    } catch {
      setExportHistory(null);
    } finally {
      setIsLoadingExports(false);
    }
  }, [activeBusinessId]);

  const loadSyncData = useCallback(async () => {
    if (!activeBusinessId) {
      setSyncStatus(null);
      setSyncHistory(null);
      return;
    }

    setIsLoadingSync(true);

    try {
      const [status, history] = await Promise.all([
        fetchSyncStatus(activeBusinessId, syncDeviceId),
        fetchSyncHistory(activeBusinessId, 1, 10),
      ]);

      setSyncStatus(status);
      setSyncHistory(history);
    } catch {
      setSyncStatus(null);
      setSyncHistory(null);
    } finally {
      setIsLoadingSync(false);
    }
  }, [activeBusinessId, syncDeviceId]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    loadProfit();
  }, [loadProfit]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  useEffect(() => {
    loadExportHistory();
  }, [loadExportHistory]);

  useEffect(() => {
    loadSyncData();
  }, [loadSyncData]);

  useEffect(() => {
    if (!activeBusinessId || !exportHistory?.data?.length) {
      return;
    }

    const pending = exportHistory.data.filter((item) => item.status === "pending");
    if (pending.length === 0) {
      return;
    }

    const intervalId = window.setInterval(async () => {
      try {
        const statuses = await Promise.all(
          pending.map((item) => fetchExportStatus(item.id, activeBusinessId)),
        );

        const merged = exportHistory.data.map((item) => {
          const found = statuses.find((status) => status.id === item.id);
          return found ?? item;
        });

        setExportHistory((prev) => {
          if (!prev) {
            return prev;
          }

          return {
            ...prev,
            data: merged,
          };
        });
      } catch {
        // no-op, keep existing list on transient poll errors
      }
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [activeBusinessId, exportHistory]);

  const handleGenerateReportPreview = async () => {
    if (!activeBusinessId) {
      setError("Select a business before generating report previews.");
      return;
    }

    setIsLoadingBuilder(true);
    setError("");

    try {
      if (builderType === "sales") {
        const response = await fetchSalesReport({
          businessId: activeBusinessId,
          startDate,
          endDate,
          groupBy,
        });
        setBuilderData(response);
      }

      if (builderType === "expenses") {
        const response = await fetchExpenseReport({
          businessId: activeBusinessId,
          startDate,
          endDate,
          groupBy,
        });
        setBuilderData(response);
      }

      if (builderType === "profit") {
        const response = await fetchProfitReport({
          businessId: activeBusinessId,
          startDate,
          endDate,
          groupBy,
        });
        setBuilderData(response);
      }

      if (builderType === "inventory") {
        const response = await fetchInventoryReport(activeBusinessId);
        setBuilderData(response);
      }
    } catch (previewError) {
      setError(
        previewError instanceof Error
          ? previewError.message
          : "Failed to generate report preview",
      );
      setBuilderData(null);
    } finally {
      setIsLoadingBuilder(false);
    }
  };

  const handleCreateExport = async () => {
    if (!activeBusinessId) {
      setError("Select a business before creating exports.");
      return;
    }

    setIsSubmittingExport(true);
    setError("");

    try {
      await requestExport({
        business_id: activeBusinessId,
        type: exportType,
        format: "csv",
        filters: {
          start_date: startDate,
          end_date: endDate,
        },
        fields: exportFields
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      });

      setSuccess("Export request submitted.");
      await loadExportHistory();
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "Failed to request export");
    } finally {
      setIsSubmittingExport(false);
    }
  };

  const handleDownloadExport = async (item: ExportRequest) => {
    if (!item.file_url) {
      return;
    }

    try {
      await downloadExportFile(item.file_url);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Failed to download export");
    }
  };

  const handleRunSyncBatch = async () => {
    if (!activeBusinessId) {
      setError("Select a business before running sync.");
      return;
    }

    setIsSubmittingSync(true);
    setError("");

    try {
      await syncBatch({
        business_id: activeBusinessId,
        device_id: syncDeviceId.trim() || "web-dashboard",
        sync_timestamp: new Date().toISOString(),
        transactions: [
          {
            local_id: `web-${Date.now()}`,
            type: "expense",
            data: {
              category: "OTHER",
              amount: 0,
              note: "Web dashboard test sync",
            },
          },
        ],
      });

      setSuccess("Sync batch submitted.");
      await loadSyncData();
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Failed to submit sync batch");
    } finally {
      setIsSubmittingSync(false);
    }
  };

  const handleRestore = async (mode: "full" | "incremental") => {
    if (!activeBusinessId) {
      setError("Select a business before running restore.");
      return;
    }

    if (mode === "incremental" && !restoreSince) {
      setError("Provide a valid RFC3339 timestamp for incremental restore.");
      return;
    }

    setIsRunningRestore(true);
    setError("");

    try {
      const response =
        mode === "full"
          ? await fullRestore(activeBusinessId, restoreInclude)
          : await incrementalRestore(activeBusinessId, restoreSince, restoreInclude);

      const salesCount = response.sales?.length ?? 0;
      const expenseCount = response.expenses?.length ?? 0;
      const productCount = response.products?.length ?? 0;

      setRestoreResultSummary(
        `Restored ${salesCount} sales, ${expenseCount} expenses, and ${productCount} products.`,
      );
      setSuccess(`${mode === "full" ? "Full" : "Incremental"} restore completed.`);
    } catch (restoreError) {
      setError(restoreError instanceof Error ? restoreError.message : "Restore failed");
    } finally {
      setIsRunningRestore(false);
    }
  };

  const topProductsChart = useMemo(() => {
    return (salesReport?.top_products ?? []).slice(0, 5).map((item: any) => ({
      name: item.product_name,
      value: Number(item.quantity ?? 0),
    }));
  }, [salesReport]);

  const expenseCategoryChart = useMemo(() => {
    return (expenseReport?.by_category ?? []).map((item: any) => ({
      name: item.category,
      value: Number(item.transaction_count ?? 0),
    }));
  }, [expenseReport]);

  const profitTrendChart = useMemo(() => {
    return (profitTrends?.trends ?? []).map((item: any) => ({
      name: toShortDate(item.date),
      net: Number(item.net_profit ?? 0),
      sales: Number(item.total_sales ?? 0),
      expenses: Number(item.total_expenses ?? 0),
    }));
  }, [profitTrends]);

  const isDateInvalid = startDate > endDate;

  const renderOverview = () => {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card
            title={t("salesRevenue")}
            value={isLoadingOverview ? t("loading") : formatReportMoney(salesReport?.total_sales ?? 0)}
            icon={BarChart3}
            iconWrapperClass="bg-indigo-50 text-indigo-600"
            trend=""
            description={t("inSelectedDateRange")}
          />
          <Card
            title={tCommon("expenses")}
            value={isLoadingOverview ? t("loading") : formatReportMoney(expenseReport?.total_expenses ?? 0)}
            icon={ArrowDownToLine}
            iconWrapperClass="bg-rose-50 text-rose-600"
            trend=""
            description={t("inSelectedDateRange")}
          />
          <Card
            title={t("netProfit")}
            value={isLoadingOverview ? t("loading") : formatReportMoney(profitReport?.profit ?? 0)}
            icon={TrendingUp}
            iconWrapperClass="bg-emerald-50 text-emerald-600"
            trend=""
            description={t("salesMinusExpenses")}
          />
          <Card
            title={t("lowStockProducts")}
            value={String(inventoryReport?.low_stock_products?.length ?? 0)}
            icon={AlertTriangle}
            iconWrapperClass="bg-amber-50 text-amber-600"
            trend=""
            description={t("requiresAttention")}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700">{t("topProductOrders")}</h3>
            <p className="text-xs text-slate-500">{t("mostSoldProducts")}</p>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProductsChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#4f46e5" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700">{t("expenseCategoryMix")}</h3>
            <p className="text-xs text-slate-500">{t("transactionDistribution")}</p>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip />
                  <Pie
                    data={expenseCategoryChart}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={95}
                    fill="#16a34a"
                    label
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderProfitAnalysis = () => {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card
            title={t("currentNetProfit")}
            value={isLoadingProfit ? t("loading") : formatReportMoney(profitSummary?.net_profit ?? 0)}
            icon={TrendingUp}
            iconWrapperClass="bg-emerald-50 text-emerald-600"
            trend=""
            description={t("forSelectedRange")}
          />
          <Card
            title={t("previousNetProfit")}
            value={
              isLoadingProfit
                ? t("loading")
                : formatReportMoney(profitComparison?.previous?.net_profit ?? 0)
            }
            icon={BarChart3}
            iconWrapperClass="bg-slate-100 text-slate-600"
            trend=""
            description={t("comparisonWindow")}
          />
          <Card
            title={t("profitChange")}
            value={`${Number(profitComparison?.change_pct ?? 0).toFixed(2)}%`}
            icon={TrendingUp}
            iconWrapperClass="bg-indigo-50 text-indigo-600"
            trend=""
            description={t("currentVsPrevious")}
          />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700">{t("profitTrend")}</h3>
          <p className="text-xs text-slate-500">{t("salesExpensesNetProfit")}</p>
          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={profitTrendChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="sales" stroke="#4f46e5" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="net" stroke="#16a34a" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  const renderBuilder = () => {
    const grouped = builderData?.grouped_data ?? [];

    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-500">{t("reportType")}</span>
              <select
                value={builderType}
                onChange={(event) => setBuilderType(event.target.value as BuilderReportType)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="sales">{t("salesReport")}</option>
                <option value="expenses">{t("expenseReport")}</option>
                <option value="profit">{t("profitReport")}</option>
                <option value="inventory">{t("inventoryReport")}</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-500">{t("groupBy")}</span>
              <select
                value={groupBy}
                onChange={(event) => setGroupBy(event.target.value as ReportGroupBy)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="day">{t("day")}</option>
                <option value="week">{t("week")}</option>
                <option value="month">{t("month")}</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-500">{t("startDate")}</span>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-500">{t("endDate")}</span>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={handleGenerateReportPreview}
            disabled={isLoadingBuilder || isDateInvalid}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FileOutput size={14} />
            {isLoadingBuilder ? t("generating") : t("generatePreview")}
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700">{t("preview")}</h3>
          <p className="text-xs text-slate-500">{t("renderedDataFromEndpoint")}</p>

          {builderType !== "inventory" && grouped.length > 0 ? (
            <div className="mt-4 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={grouped.map((item: any) => ({
                    period: item.period,
                    sales: Number(item.total_sales ?? item.sales ?? 0),
                    expenses: Number(item.total_amount ?? item.expenses ?? 0),
                    profit: Number(item.profit ?? 0),
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="sales" stroke="#4f46e5" fill="#c7d2fe" />
                  <Area type="monotone" dataKey="expenses" stroke="#ef4444" fill="#fecaca" />
                  {builderType === "profit" && (
                    <Area type="monotone" dataKey="profit" stroke="#16a34a" fill="#bbf7d0" />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-lg border border-slate-100">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">{t("field")}</th>
                    <th className="px-3 py-2">{t("value")}</th>
                  </tr>
                </thead>
                <tbody>
                  {builderData
                    ? Object.entries(builderData).map(([key, value]) => (
                        <tr key={key} className="border-t border-slate-100">
                          <td className="px-3 py-2 font-medium text-slate-600">{key}</td>
                          <td className="px-3 py-2">
                            {typeof value === "string" || typeof value === "number"
                              ? String(value)
                              : JSON.stringify(value)}
                          </td>
                        </tr>
                      ))
                    : (
                      <tr>
                        <td className="px-3 py-6 text-slate-500" colSpan={2}>
                          {t("noPreviewDataYet")}
                        </td>
                      </tr>
                    )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTransactions = () => {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-4">
            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-500">{t("type")}</span>
              <select
                value={transactionType}
                onChange={(event) => {
                  setTransactionType(event.target.value as "all" | "sale" | "expense");
                  setTransactionPage(1);
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="all">{t("all")}</option>
                <option value="sale">{t("sales")}</option>
                <option value="expense">{tCommon("expenses")}</option>
              </select>
            </label>

            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs font-medium text-slate-500">{t("search")}</span>
              <input
                value={transactionSearch}
                onChange={(event) => {
                  setTransactionSearch(event.target.value);
                  setTransactionPage(1);
                }}
                placeholder={t("searchNoteCategoryProduct")}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => loadTransactions()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                <RefreshCcw size={14} />
                {t("refresh")}
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">{t("date")}</th>
                  <th className="px-3 py-2">{t("type")}</th>
                  <th className="px-3 py-2">{t("description")}</th>
                  <th className="px-3 py-2">{t("amount")}</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingTransactions ? (
                  <tr>
                    <td className="px-3 py-6 text-slate-500" colSpan={4}>
                      {t("loadingTransactions")}
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-slate-500" colSpan={4}>
                      {t("noTransactionsFound")}
                    </td>
                  </tr>
                ) : (
                  transactions.map((item) => (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="px-3 py-2">{toShortDate(item.date)}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${
                            item.type === "sale"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {item.type}
                        </span>
                      </td>
                      <td className="px-3 py-2">{item.description || item.category || "-"}</td>
                      <td className="px-3 py-2 font-medium">{formatReportMoney(item.amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 px-3 py-3 text-xs text-slate-500">
            <span>
              {t("page")} {transactionPagination.current_page} {t("of")} {transactionPagination.total_pages} •
              {t("total")} {transactionPagination.total_records}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={transactionPage <= 1}
                onClick={() => setTransactionPage((prev) => Math.max(1, prev - 1))}
                className="rounded border border-slate-200 px-2 py-1 disabled:opacity-50"
              >
                {t("prev")}
              </button>
              <button
                type="button"
                disabled={transactionPage >= transactionPagination.total_pages}
                onClick={() =>
                  setTransactionPage((prev) => Math.min(transactionPagination.total_pages, prev + 1))
                }
                className="rounded border border-slate-200 px-2 py-1 disabled:opacity-50"
              >
                {tCommon("next")}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderExports = () => {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-slate-700">{t("createExport")}</h3>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-500">{t("type")}</span>
              <select
                value={exportType}
                onChange={(event) => setExportType(event.target.value as ExportType)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="sales">{t("sales")}</option>
                <option value="expenses">{tCommon("expenses")}</option>
                <option value="transactions">{t("transactions")}</option>
                <option value="inventory">{t("inventory")}</option>
                <option value="profit">{t("profit")}</option>
              </select>
            </label>

            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs font-medium text-slate-500">{t("fieldsCommaSeparated")}</span>
              <input
                value={exportFields}
                onChange={(event) => setExportFields(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={handleCreateExport}
            disabled={isSubmittingExport || isDateInvalid}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FileOutput size={14} />
            {isSubmittingExport ? t("submitting") : t("requestExport")}
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-700">{t("exportHistory")}</h3>
            <button
              type="button"
              onClick={() => loadExportHistory()}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"
            >
              <RefreshCcw size={13} />
              {t("refresh")}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">{t("created")}</th>
                  <th className="px-3 py-2">{t("type")}</th>
                  <th className="px-3 py-2">{tCommon("status")}</th>
                  <th className="px-3 py-2">{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingExports ? (
                  <tr>
                    <td className="px-3 py-6 text-slate-500" colSpan={4}>
                      {t("loadingExportHistory")}
                    </td>
                  </tr>
                ) : exportHistory?.data?.length ? (
                  exportHistory.data.map((item) => (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="px-3 py-2">{toShortDate(item.created_at)}</td>
                      <td className="px-3 py-2">{item.type}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${
                            item.status === "completed"
                              ? "bg-emerald-50 text-emerald-700"
                              : item.status === "failed"
                                ? "bg-rose-50 text-rose-700"
                                : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {item.status === "completed" && item.file_url ? (
                          <button
                            type="button"
                            onClick={() => handleDownloadExport(item)}
                            className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                          >
                            <Download size={13} />
                            {t("download")}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-3 py-6 text-slate-500" colSpan={4}>
                      {t("noExportRequestsYet")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderSyncRestore = () => {
    const historyRows = syncHistory?.data ?? [];

    return (
      <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">{t("syncStatus")}</h3>
            <label className="space-y-1 block">
              <span className="text-xs font-medium text-slate-500">{t("deviceId")}</span>
              <input
                value={syncDeviceId}
                onChange={(event) => setSyncDeviceId(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>
            <div className="text-xs text-slate-600 space-y-1">
              <p>{t("lastSyncId")}: {syncStatus?.last_sync_id || "-"}</p>
              <p>{t("lastStatus")}: {syncStatus?.last_status || "-"}</p>
              <p>{t("pendingRetries")}: {syncStatus?.pending_retries ?? 0}</p>
              <p>{t("totalSynced")}: {syncStatus?.total_synced ?? 0}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => loadSyncData()}
                className="inline-flex items-center gap-1 rounded border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                <RefreshCcw size={13} />
                {t("refreshStatus")}
              </button>
              <button
                type="button"
                onClick={handleRunSyncBatch}
                disabled={isSubmittingSync}
                className="inline-flex items-center gap-1 rounded bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Database size={13} />
                {isSubmittingSync ? t("submitting") : t("submitTestSync")}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">{t("restoreData")}</h3>
            <div className="flex flex-wrap gap-2 text-xs">
              {(["sales", "expenses", "products"] as RestoreInclude[]).map((item) => {
                const active = restoreInclude.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setRestoreInclude((prev) => {
                        if (prev.includes(item)) {
                          return prev.filter((entry) => entry !== item);
                        }
                        return [...prev, item];
                      });
                    }}
                    className={`rounded-full border px-3 py-1 font-medium ${
                      active
                        ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>

            <label className="space-y-1 block">
              <span className="text-xs font-medium text-slate-500">{t("incrementalSince")}</span>
              <input
                value={restoreSince}
                onChange={(event) => setRestoreSince(event.target.value)}
                placeholder="2026-03-20T12:00:00Z"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleRestore("full")}
                disabled={isRunningRestore}
                className="rounded border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                {t("fullRestore")}
              </button>
              <button
                type="button"
                onClick={() => handleRestore("incremental")}
                disabled={isRunningRestore}
                className="rounded bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {t("incrementalRestore")}
              </button>
            </div>

            {restoreResultSummary && (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                {restoreResultSummary}
              </p>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-700">{t("syncHistory")}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">{t("timestamp")}</th>
                  <th className="px-3 py-2">{tCommon("status")}</th>
                  <th className="px-3 py-2">{t("summary")}</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingSync ? (
                  <tr>
                    <td className="px-3 py-6 text-slate-500" colSpan={3}>
                      {t("loadingSyncHistory")}
                    </td>
                  </tr>
                ) : historyRows.length > 0 ? (
                  historyRows.map((item: any) => (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="px-3 py-2">{toShortDate(item.sync_timestamp)}</td>
                      <td className="px-3 py-2">{item.status}</td>
                      <td className="px-3 py-2">
                        {t("total")} {item.summary?.total ?? 0}, {t("success")} {item.summary?.success ?? 0}, {t("failed")}{" "}
                        {item.summary?.failed ?? 0}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-3 py-6 text-slate-500" colSpan={3}>
                      {t("noSyncHistoryAvailable")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col space-y-4">
      <PageTitle
        title={t("title")}
        subtitle={t("subtitleFull")}
      />

      {!activeBusinessId && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t("selectBusinessToLoad")}
        </div>
      )}

      {isDateInvalid && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {t("startDateBeforeEndDate")}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="space-y-1 sm:col-span-1">
            <span className="text-xs font-medium text-slate-500">{t("startDate")}</span>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-1 sm:col-span-1">
            <span className="text-xs font-medium text-slate-500">{t("endDate")}</span>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-1 sm:col-span-1">
            <span className="text-xs font-medium text-slate-500">{t("groupBy")}</span>
            <select
              value={groupBy}
              onChange={(event) => setGroupBy(event.target.value as ReportGroupBy)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="day">{t("day")}</option>
              <option value="week">{t("week")}</option>
              <option value="month">{t("month")}</option>
            </select>
          </label>
          <label className="space-y-1 sm:col-span-1">
            <span className="text-xs font-medium text-slate-500">{t("profitPeriod")}</span>
            <select
              value={profitPeriod}
              onChange={(event) => setProfitPeriod(event.target.value as ProfitPeriod)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="daily">{t("daily")}</option>
              <option value="weekly">{t("weekly")}</option>
              <option value="monthly">{t("monthly")}</option>
            </select>
          </label>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {TAB_OPTIONS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                activeTab === tab.id
                  ? "bg-indigo-600 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "overview" && renderOverview()}
      {activeTab === "profit" && renderProfitAnalysis()}
      {activeTab === "builder" && renderBuilder()}
      {activeTab === "transactions" && renderTransactions()}
      {activeTab === "exports" && renderExports()}
      {activeTab === "sync_restore" && renderSyncRestore()}
    </div>
  );
};

export default ReportsPage;
