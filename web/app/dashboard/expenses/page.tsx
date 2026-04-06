"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import ExpensesHeader from "@/app/components/expenses/ExpensesHeader";
import ExpensesFilters from "@/app/components/expenses/ExpensesFilters";
import ExpensesStats from "@/app/components/expenses/ExpensesStats";
import ExpensesCharts from "@/app/components/expenses/ExpensesCharts";
import ExpensesTable, {
  ExpenseRow,
} from "@/app/components/tables/ExpensesTable";
import GuidedTour from "@/app/components/ui/GuidedTour";
import { useTour } from "@/app/hooks/useTour";
import { expensesTourSteps } from "@/app/config/tourSteps";
import {
  ApiExpense,
  EXPENSE_CATEGORY_LABELS,
  ExpenseCategoryApi,
  ExpenseSummaryResponse,
  createExpense,
  fetchExpenseCategories,
  fetchExpenseSummary,
  fetchExpenses,
  formatMoney,
  getExpenseCategoryLabel,
  toAmountNumber,
  updateExpense,
  voidExpense,
} from "@/lib/expenses";

type ActiveBusiness = {
  id: string;
};

type ExpenseFormState = {
  category: ExpenseCategoryApi;
  amount: string;
  note: string;
};

const FALLBACK_CATEGORIES: ExpenseCategoryApi[] = Object.keys(
  EXPENSE_CATEGORY_LABELS,
) as ExpenseCategoryApi[];

const CHART_COLORS = [
  "#10b981",
  "#f43f5e",
  "#3b82f6",
  "#f59e0b",
  "#fb923c",
  "#14b8a6",
  "#64748b",
  "#6366f1",
];

const formatDateForApi = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getDateRangeParams = (timeRange: string) => {
  const today = new Date();

  if (timeRange === "last_7") {
    const start = new Date(today);
    start.setDate(today.getDate() - 7);
    return {
      startDate: formatDateForApi(start),
      endDate: formatDateForApi(today),
    };
  }

  if (timeRange === "this_month") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return {
      startDate: formatDateForApi(start),
      endDate: formatDateForApi(today),
    };
  }

  return {
    startDate: "1970-01-01",
    endDate: formatDateForApi(today),
  };
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

const toExpenseRow = (expense: ApiExpense): ExpenseRow => {
  const createdAt = new Date(expense.created_at);
  const date = formatDateForApi(createdAt);
  const time = createdAt.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return {
    id: expense.id,
    date,
    time,
    category: getExpenseCategoryLabel(expense.category),
    description: expense.note || "-",
    amount: formatMoney(expense.amount),
    status: "Synced",
  };
};

const Expenses = () => {
  const t = useTranslations("expenses");
  const tCommon = useTranslations("common");
  const { showTour, completeTour, skipTour } = useTour("expenses");
  const [activeBusinessId, setActiveBusinessId] = useState("");
  const [timeRange, setTimeRange] = useState("all");
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(8);

  const [categoryOptions, setCategoryOptions] =
    useState<ExpenseCategoryApi[]>(FALLBACK_CATEGORIES);
  const [expenses, setExpenses] = useState<ApiExpense[]>([]);
  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [summary, setSummary] = useState<ExpenseSummaryResponse | null>(null);

  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [success, setSuccess] = useState("");

  const [formState, setFormState] = useState<ExpenseFormState>({
    category: FALLBACK_CATEGORIES[0],
    amount: "",
    note: "",
  });

  const dateRange = useMemo(() => getDateRangeParams(timeRange), [timeRange]);

  const reloadList = useCallback(async () => {
    if (!activeBusinessId) {
      setRows([]);
      setExpenses([]);
      setTotalCount(0);
      return;
    }

    setIsLoadingList(true);
    setError("");

    try {
      const response = await fetchExpenses({
        businessId: activeBusinessId,
        page: currentPage,
        limit: pageSize,
        category:
          category !== "all" ? (category as ExpenseCategoryApi) : undefined,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        sort: "date",
        order: "desc",
      });

      setExpenses(response.data);
      setRows(response.data.map(toExpenseRow));
      setTotalCount(response.pagination.total ?? 0);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to load expenses",
      );
      setRows([]);
      setExpenses([]);
      setTotalCount(0);
    } finally {
      setIsLoadingList(false);
    }
  }, [
    activeBusinessId,
    category,
    currentPage,
    dateRange.endDate,
    dateRange.startDate,
    pageSize,
  ]);

  const reloadSummary = useCallback(async () => {
    if (!activeBusinessId) {
      setSummary(null);
      return;
    }

    setIsLoadingSummary(true);

    try {
      const response = await fetchExpenseSummary(
        activeBusinessId,
        dateRange.startDate,
        dateRange.endDate,
      );
      setSummary(response);
    } catch {
      setSummary(null);
    } finally {
      setIsLoadingSummary(false);
    }
  }, [activeBusinessId, dateRange.endDate, dateRange.startDate]);

  useEffect(() => {
    const syncActiveBusiness = () => {
      const businessId = readActiveBusinessId();
      setActiveBusinessId(businessId);
    };

    syncActiveBusiness();
    window.addEventListener("activeBusinessChanged", syncActiveBusiness);

    return () => {
      window.removeEventListener("activeBusinessChanged", syncActiveBusiness);
    };
  }, []);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const apiCategories = await fetchExpenseCategories();
        const mapped = apiCategories.filter(
          (item): item is ExpenseCategoryApi => {
            return Object.prototype.hasOwnProperty.call(
              EXPENSE_CATEGORY_LABELS,
              item,
            );
          },
        );

        if (mapped.length > 0) {
          setCategoryOptions(mapped);
        }
      } catch {
        setCategoryOptions(FALLBACK_CATEGORIES);
      }
    };

    loadCategories();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeBusinessId, timeRange, category]);

  useEffect(() => {
    reloadList();
  }, [reloadList]);

  useEffect(() => {
    reloadSummary();
  }, [reloadSummary]);

  const filteredRows = useMemo<ExpenseRow[]>(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (normalizedSearch.length === 0) {
      return rows;
    }

    return rows.filter((row) => {
      const haystack = `${row.description} ${row.category}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [rows, search]);

  const summaryTotal = toAmountNumber(summary?.total ?? 0);
  const averageExpense = totalCount > 0 ? summaryTotal / totalCount : 0;

  const topCategoryInfo = useMemo(() => {
    const categories = summary?.categories ?? {};
    let topKey = "OTHER";
    let topValue = 0;

    for (const [key, value] of Object.entries(categories)) {
      const numericValue = toAmountNumber(value);
      if (numericValue > topValue) {
        topValue = numericValue;
        topKey = key;
      }
    }

    const share =
      summaryTotal > 0
        ? `${((topValue / summaryTotal) * 100).toFixed(1)}%`
        : "0%";
    return {
      name: getExpenseCategoryLabel(topKey),
      share,
    };
  }, [summary, summaryTotal]);

  const categoryChartData = useMemo(() => {
    const categories = summary?.categories ?? {};
    const rows = Object.entries(categories).map(([name, value], index) => ({
      name: getExpenseCategoryLabel(name),
      value: toAmountNumber(value),
      color: CHART_COLORS[index % CHART_COLORS.length],
    }));

    return rows.filter((item) => item.value > 0);
  }, [summary]);

  const trendChartData = useMemo(() => {
    const grouped = new Map<string, number>();

    for (const expense of expenses) {
      const createdAt = new Date(expense.created_at);
      const key = formatDateForApi(createdAt);
      const current = grouped.get(key) ?? 0;
      grouped.set(key, current + toAmountNumber(expense.amount));
    }

    return Array.from(grouped.entries())
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([date, value]) => {
        const localDate = new Date(`${date}T00:00:00`);
        return {
          name: localDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          value,
        };
      });
  }, [expenses]);

  const openCreateModal = () => {
    setActionError("");
    setSuccess("");
    setEditingExpenseId(null);
    setFormState({
      category: categoryOptions[0] ?? FALLBACK_CATEGORIES[0],
      amount: "",
      note: "",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (row: ExpenseRow) => {
    const target = expenses.find((item) => item.id === row.id);
    if (!target) {
      return;
    }

    setActionError("");
    setSuccess("");
    setEditingExpenseId(target.id);
    setFormState({
      category: target.category,
      amount: String(toAmountNumber(target.amount)),
      note: target.note,
    });
    setIsModalOpen(true);
  };

  const handleVoid = async (row: ExpenseRow) => {
    if (
      !window.confirm(
        t("voidExpenseConfirm")
      )
    ) {
      return;
    }

    setActionError("");
    setSuccess("");

    try {
      await voidExpense(String(row.id));
      setSuccess(t("expenseVoidedSuccessfully"));
      await Promise.all([reloadList(), reloadSummary()]);
    } catch (voidError) {
      setActionError(
        voidError instanceof Error
          ? voidError.message
          : t("failedToVoidExpense")
      );
    }
  };

  const submitForm = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!activeBusinessId) {
      setActionError(t("noActiveBusinessSelected"));
      return;
    }

    const amount = Number.parseFloat(formState.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setActionError(t("amountMustBeGreaterThanZero"));
      return;
    }

    setIsSubmitting(true);
    setActionError("");
    setSuccess("");

    try {
      if (editingExpenseId) {
        await updateExpense(editingExpenseId, {
          category: formState.category,
          amount,
          note: formState.note,
        });
        setSuccess(t("expenseUpdatedSuccessfully"));
      } else {
        await createExpense({
          business_id: activeBusinessId,
          category: formState.category,
          amount,
          note: formState.note,
        });
        setSuccess(t("expenseCreatedSuccessfully"));
      }

      setIsModalOpen(false);
      await Promise.all([reloadList(), reloadSummary()]);
    } catch (submitError) {
      setActionError(
        submitError instanceof Error
          ? submitError.message
          : t("failedToSaveExpense")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const exportCurrentRows = () => {
    const headers = [
      "Date",
      "Time",
      "Category",
      "Description",
      "Amount",
      "Status",
    ];
    const csvRows = filteredRows.map((row) => [
      row.date,
      row.time,
      row.category,
      row.description.replace(/,/g, " "),
      row.amount,
      row.status,
    ]);

    const csv = [headers, ...csvRows]
      .map((line) => line.map((value) => `"${value}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "expenses.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filterCategoryOptions = useMemo(() => {
    return [
      { value: "all", label: t("allCategories") },
      ...categoryOptions.map((value) => ({
        value,
        label: EXPENSE_CATEGORY_LABELS[value],
      })),
    ];
  }, [categoryOptions, t]);

  const shownTotalCount = search.trim() ? filteredRows.length : totalCount;

  const subtitle = activeBusinessId
    ? t("subtitle")
    : t("subtitleNoBusinessSelected");

  return (
    <div className="flex flex-col space-y-4">
      <ExpensesHeader
        title={t("title")}
        subtitle={subtitle}
        onAdd={openCreateModal}
        onExport={exportCurrentRows}
      />

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {actionError ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {actionError}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      <ExpensesFilters
        timeRange={timeRange}
        category={category}
        categoryOptions={filterCategoryOptions}
        search={search}
        onTimeRangeChange={setTimeRange}
        onCategoryChange={setCategory}
        onSearchChange={setSearch}
      />

      <ExpensesStats
        totalExpenses={formatMoney(summaryTotal)}
        topCategory={topCategoryInfo.name}
        topCategoryShare={topCategoryInfo.share}
        averageExpense={formatMoney(averageExpense)}
        transactionCount={totalCount}
      />

      <ExpensesCharts
        categoryData={isLoadingSummary ? [] : categoryChartData}
        trendData={trendChartData}
      />

      <ExpensesTable
        rows={filteredRows}
        totalCount={shownTotalCount}
        pageSize={pageSize}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        isLoading={isLoadingList}
        onEdit={openEditModal}
        onVoid={handleVoid}
      />

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={submitForm}
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
          >
            <h3 className="text-lg font-semibold text-slate-900">
              {editingExpenseId ? t("editExpense") : t("addExpense")}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {editingExpenseId
                ? t("updateExpenseDetails")
                : t("recordNewExpense")}
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  {t("category")}
                </label>
                <select
                  value={formState.category}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      category: event.target.value as ExpenseCategoryApi,
                    }))
                  }
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-emerald-400"
                >
                  {categoryOptions.map((option) => (
                    <option key={option} value={option}>
                      {EXPENSE_CATEGORY_LABELS[option]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  {t("amount")}
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={formState.amount}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      amount: event.target.value,
                    }))
                  }
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  {t("description")}
                </label>
                <textarea
                  value={formState.note}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      note: event.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-400"
                  placeholder={t("expenseNote")}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {tCommon("cancel")}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-600 disabled:opacity-50"
              >
                {isSubmitting
                  ? tCommon("saving")
                  : editingExpenseId
                    ? t("saveChanges")
                    : t("createExpense")}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {showTour && (
        <GuidedTour
          steps={expensesTourSteps}
          onComplete={completeTour}
          onSkip={skipTour}
          allowNavigation={true}
        />
      )}
    </div>
  );
};

export default Expenses;
