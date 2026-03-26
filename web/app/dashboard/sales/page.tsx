"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import PageTitle from "@/app/components/ui/PageTitle";
import Card from "@/app/components/ui/Card";
import { DollarSign } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import {
  ApiSale,
  createSale,
  fetchSaleById,
  fetchSales,
  fetchSalesStats,
  fetchSalesSummary,
  formatSalesMoney,
  updateSaleNote,
  voidSale,
} from "@/lib/sales";
import { ApiProduct, fetchProducts } from "@/lib/inventory";

type SalesRow = {
  id: string;
  date: string;
  time: string;
  productId: string;
  quantity: number;
  unitPrice: string;
  total: string;
  note: string;
  status: "Active" | "Voided";
};

type ActiveBusiness = {
  id: string;
};

type SaleFormState = {
  productId: string;
  unitPrice: string;
  quantity: string;
  note: string;
};

const emptyForm: SaleFormState = {
  productId: "",
  unitPrice: "",
  quantity: "1",
  note: "",
};

const formatDateForApi = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateForDisplay = (date: string) => {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) {
    return date;
  }

  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

const toSalesRow = (sale: ApiSale): SalesRow => {
  const createdAt = new Date(sale.created_at);
  const date = formatDateForApi(createdAt);
  const time = createdAt.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return {
    id: sale.id,
    date,
    time,
    productId: sale.product_id ?? "N/A",
    quantity: sale.quantity,
    unitPrice: formatSalesMoney(sale.unit_price),
    total: formatSalesMoney(sale.total),
    note: sale.note?.trim() ? sale.note : "-",
    status: sale.is_voided ? "Voided" : "Active",
  };
};

const SalesPage = () => {
  const [activeBusinessId, setActiveBusinessId] = useState("");
  const [timeRange, setTimeRange] = useState("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  const [sales, setSales] = useState<ApiSale[]>([]);
  const [rows, setRows] = useState<SalesRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [dailyRevenue, setDailyRevenue] = useState(0);
  const [dailyCount, setDailyCount] = useState(0);
  const [rangeRevenue, setRangeRevenue] = useState(0);
  const [rangeCount, setRangeCount] = useState(0);
  const [availableProducts, setAvailableProducts] = useState<ApiProduct[]>([]);

  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [success, setSuccess] = useState("");
  const [details, setDetails] = useState<ApiSale | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [formState, setFormState] = useState<SaleFormState>(emptyForm);

  const dateRange = useMemo(() => getDateRangeParams(timeRange), [timeRange]);

  const reloadList = useCallback(async () => {
    if (!activeBusinessId) {
      setSales([]);
      setRows([]);
      setTotalCount(0);
      return;
    }

    setIsLoadingList(true);
    setError("");

    try {
      const response = await fetchSales({
        businessId: activeBusinessId,
        page: currentPage,
        limit: pageSize,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        sort: "created_at",
        order: "desc",
      });

      setSales(response.sales);
      setRows(response.sales.map(toSalesRow));
      setTotalCount(response.pagination.total ?? 0);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error ? fetchError.message : "Failed to load sales",
      );
      setSales([]);
      setRows([]);
      setTotalCount(0);
    } finally {
      setIsLoadingList(false);
    }
  }, [activeBusinessId, currentPage, dateRange.endDate, dateRange.startDate, pageSize]);

  const reloadSummary = useCallback(async () => {
    if (!activeBusinessId) {
      setDailyRevenue(0);
      setDailyCount(0);
      setRangeRevenue(0);
      setRangeCount(0);
      return;
    }

    setIsLoadingSummary(true);

    try {
      const [summaryResponse, statsResponse] = await Promise.all([
        fetchSalesSummary(activeBusinessId, dateRange.startDate, dateRange.endDate),
        fetchSalesStats(activeBusinessId),
      ]);

      setRangeRevenue(summaryResponse.total_revenue ?? 0);
      setRangeCount(summaryResponse.total_sales ?? 0);
      setDailyRevenue(statsResponse.daily.total_revenue ?? 0);
      setDailyCount(statsResponse.daily.total_sales ?? 0);
    } catch {
      setRangeRevenue(0);
      setRangeCount(0);
      setDailyRevenue(0);
      setDailyCount(0);
    } finally {
      setIsLoadingSummary(false);
    }
  }, [activeBusinessId, dateRange.endDate, dateRange.startDate]);

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
    setCurrentPage(1);
  }, [activeBusinessId, timeRange]);

  useEffect(() => {
    reloadList();
  }, [reloadList]);

  useEffect(() => {
    reloadSummary();
  }, [reloadSummary]);

  useEffect(() => {
    const loadProducts = async () => {
      if (!activeBusinessId) {
        setAvailableProducts([]);
        return;
      }

      try {
        const response = await fetchProducts({
          businessId: activeBusinessId,
          page: 1,
          limit: 100,
          sort: "name",
          order: "asc",
        });
        setAvailableProducts(response.products);
      } catch {
        setAvailableProducts([]);
      }
    };

    loadProducts();
  }, [activeBusinessId]);

  useEffect(() => {
    if (!success) {
      return;
    }

    const timeoutId = window.setTimeout(() => setSuccess(""), 2500);
    return () => window.clearTimeout(timeoutId);
  }, [success]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (normalizedSearch.length === 0) {
      return rows;
    }

    return rows.filter((row) => {
      const haystack = `${row.productId} ${row.note} ${row.status}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [rows, search]);

  const shownTotalCount = search.trim() ? filteredRows.length : totalCount;
  const averageSale = rangeCount > 0 ? rangeRevenue / rangeCount : 0;
  const totalPages = Math.max(1, Math.ceil(shownTotalCount / pageSize));
  const startIndex = shownTotalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = shownTotalCount === 0 ? 0 : Math.min(startIndex + filteredRows.length - 1, shownTotalCount);

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  const openCreateModal = () => {
    setActionError("");
    setSuccess("");
    setEditingSaleId(null);
    setFormState(emptyForm);
    setIsCreateOpen(true);
  };

  const openEditModal = (row: SalesRow) => {
    const target = sales.find((item) => item.id === row.id);
    if (!target || target.is_voided) {
      return;
    }

    setActionError("");
    setSuccess("");
    setEditingSaleId(target.id);
    setFormState({
      productId: target.product_id ?? "",
      unitPrice: String(target.unit_price),
      quantity: String(target.quantity),
      note: target.note ?? "",
    });
    setIsCreateOpen(true);
  };

  const handleView = async (row: SalesRow) => {
    if (!activeBusinessId) {
      setActionError("No active business selected.");
      return;
    }

    setActionError("");
    setIsDetailLoading(true);
    setDetails(null);

    try {
      const sale = await fetchSaleById(String(row.id), activeBusinessId);
      setDetails(sale);
    } catch (viewError) {
      setActionError(
        viewError instanceof Error
          ? viewError.message
          : "Failed to fetch sale details",
      );
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleVoid = async (row: SalesRow) => {
    if (!activeBusinessId) {
      setActionError("No active business selected.");
      return;
    }

    if (
      !window.confirm(
        "Void this sale? This marks it as voided and may return stock for linked products.",
      )
    ) {
      return;
    }

    setActionError("");
    setSuccess("");

    try {
      await voidSale(String(row.id), activeBusinessId);
      setSuccess("Sale voided successfully.");
      await Promise.all([reloadList(), reloadSummary()]);
    } catch (voidError) {
      setActionError(
        voidError instanceof Error ? voidError.message : "Failed to void sale",
      );
    }
  };

  const submitForm = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!activeBusinessId) {
      setActionError("No active business selected.");
      return;
    }

    const unitPrice = Number.parseFloat(formState.unitPrice);
    const quantity = Number.parseInt(formState.quantity, 10);

    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      setActionError("Unit price must be greater than 0.");
      return;
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      setActionError("Quantity must be a positive integer.");
      return;
    }

    setIsSubmitting(true);
    setActionError("");
    setSuccess("");

    try {
      if (editingSaleId) {
        await updateSaleNote(editingSaleId, {
          business_id: activeBusinessId,
          note: formState.note,
        });
        setSuccess("Sale note updated successfully.");
      } else {
        await createSale({
          business_id: activeBusinessId,
          product_id: formState.productId || undefined,
          unit_price: unitPrice,
          quantity,
          note: formState.note,
        });
        setSuccess("Sale recorded successfully.");
      }

      setIsCreateOpen(false);
      await Promise.all([reloadList(), reloadSummary()]);
    } catch (submitError) {
      setActionError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to save sale",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const subtitle = activeBusinessId
    ? "View and manage sales records"
    : "Select a business to start tracking sales";

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageTitle title="Sales" subtitle={subtitle} />
        <button
          type="button"
          onClick={openCreateModal}
          disabled={!activeBusinessId}
          className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Record Sale
        </button>
      </div>

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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title="Today's Sales"
          value={isLoadingSummary ? "Loading..." : formatSalesMoney(dailyRevenue)}
          icon={DollarSign}
          iconWrapperClass="bg-indigo-50 text-indigo-600"
          trend=""
          trendDirection=""
          description={`${dailyCount} transactions`}
        />
        <Card
          title="Avg. Sale"
          value={isLoadingSummary ? "Loading..." : formatSalesMoney(averageSale)}
          icon={DollarSign}
          iconWrapperClass="bg-indigo-50 text-indigo-600"
          trend=""
          trendDirection=""
          description={`${rangeCount} sales in selected period`}
        />
      </div>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Time range
          </label>
          <select
            value={timeRange}
            onChange={(event) => setTimeRange(event.target.value)}
            className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-indigo-400"
          >
            <option value="all">All time</option>
            <option value="last_7">Last 7 days</option>
            <option value="this_month">This month</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Search
          </label>
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by product id, note, or status"
            className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-indigo-400"
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
        <h3 className="text-sm font-semibold text-slate-900">Sale Details</h3>
        {isDetailLoading ? (
          <p className="mt-2 text-slate-500">Loading sale details...</p>
        ) : details ? (
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <p>
              <span className="font-medium">ID:</span> {details.id}
            </p>
            <p>
              <span className="font-medium">Product:</span> {details.product_id ?? "N/A"}
            </p>
            <p>
              <span className="font-medium">Unit:</span> {formatSalesMoney(details.unit_price)}
            </p>
            <p>
              <span className="font-medium">Total:</span> {formatSalesMoney(details.total)}
            </p>
            <p>
              <span className="font-medium">Quantity:</span> {details.quantity}
            </p>
            <p>
              <span className="font-medium">Status:</span> {details.is_voided ? "Voided" : "Active"}
            </p>
            <p className="sm:col-span-2 lg:col-span-2">
              <span className="font-medium">Note:</span> {details.note || "-"}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-slate-500">Select View on any sale row to inspect details.</p>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50 text-xs uppercase tracking-wide">
            <TableRow className="border-slate-200 hover:bg-transparent">
              <TableHead className="px-5 py-3">Date &amp; Time</TableHead>
              <TableHead className="px-5 py-3">Product ID</TableHead>
              <TableHead className="px-5 py-3 text-right">Qty</TableHead>
              <TableHead className="px-5 py-3 text-right">Unit Price</TableHead>
              <TableHead className="px-5 py-3 text-right">Total</TableHead>
              <TableHead className="px-5 py-3">Note</TableHead>
              <TableHead className="px-5 py-3 text-right">Status</TableHead>
              <TableHead className="px-5 py-3 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingList ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={8} className="px-5 py-10 text-center text-slate-500">
                  Loading sales...
                </TableCell>
              </TableRow>
            ) : filteredRows.length > 0 ? (
              filteredRows.map((row) => (
                <TableRow key={row.id} className="border-slate-100">
                  <TableCell className="px-5 py-4">
                    <div className="font-medium text-slate-800">{formatDateForDisplay(row.date)}</div>
                    <div className="text-xs text-slate-500">{row.time}</div>
                  </TableCell>
                  <TableCell className="px-5 py-4 font-mono text-xs text-slate-600">
                    {row.productId}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-right font-medium text-slate-900">
                    {row.quantity}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-right">{row.unitPrice}</TableCell>
                  <TableCell className="px-5 py-4 text-right font-semibold text-slate-900">
                    {row.total}
                  </TableCell>
                  <TableCell className="max-w-xs px-5 py-4 text-slate-600">{row.note}</TableCell>
                  <TableCell className="px-5 py-4 text-right">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                        row.status === "Voided"
                          ? "bg-rose-100 text-rose-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {row.status}
                    </span>
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleView(row)}
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(row)}
                        disabled={row.status === "Voided"}
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleVoid(row)}
                        disabled={row.status === "Voided"}
                        className="rounded-full border border-rose-200 px-3 py-1 text-xs font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Void
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={8} className="px-5 py-10 text-center text-slate-500">
                  No sales found for the selected filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Showing {startIndex} to {endIndex} of {shownTotalCount} results
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePreviousPage}
              disabled={currentPage === 1 || isLoadingList}
              className="rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={handleNextPage}
              disabled={currentPage === totalPages || filteredRows.length === 0 || isLoadingList}
              className="rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {isCreateOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={submitForm}
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
          >
            <h3 className="text-lg font-semibold text-slate-900">
              {editingSaleId ? "Edit Sale Note" : "Record Sale"}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {editingSaleId
                ? "Only note updates are allowed for existing sales."
                : "Record a new sale for the active business."}
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Product
                </label>
                <select
                  value={formState.productId}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      productId: event.target.value,
                    }))
                  }
                  disabled={Boolean(editingSaleId)}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-indigo-400 disabled:bg-slate-100"
                >
                  <option value="">No linked product</option>
                  {availableProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Unit Price
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    disabled={Boolean(editingSaleId)}
                    value={formState.unitPrice}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        unitPrice: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-indigo-400 disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    disabled={Boolean(editingSaleId)}
                    value={formState.quantity}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        quantity: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-indigo-400 disabled:bg-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Note
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
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400"
                  placeholder="Optional sale note"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSubmitting
                  ? "Saving..."
                  : editingSaleId
                    ? "Save Note"
                    : "Record Sale"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
};

export default SalesPage;
