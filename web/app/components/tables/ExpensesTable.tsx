"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

export type ExpenseRow = {
  id: string | number;
  date: string; // YYYY-MM-DD
  time: string;
  category: string;
  description: string;
  amount: string;
  status: "Synced" | "Pending";
};

type ExpensesTableProps = {
  rows: ExpenseRow[];
  totalCount: number;
  pageSize?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  isLoading?: boolean;
  onEdit?: (row: ExpenseRow) => void;
  onVoid?: (row: ExpenseRow) => void;
};

const statusStyles: Record<ExpenseRow["status"], string> = {
  Synced: "bg-emerald-100 text-emerald-700",
  Pending: "bg-amber-100 text-amber-700",
};

const categoryStyles: Record<string, string> = {
  "Stock Purchase": "bg-emerald-100 text-emerald-700",
  Salaries: "bg-rose-100 text-rose-700",
  Rent: "bg-blue-100 text-blue-700",
  Maintenance: "bg-amber-100 text-amber-700",
  Transport: "bg-orange-100 text-orange-700",
  Other: "bg-slate-100 text-slate-700",
};

const formatDate = (date: string) => {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const ExpensesTable: React.FC<ExpensesTableProps> = ({
  rows,
  totalCount,
  pageSize = 4,
  currentPage: controlledPage,
  onPageChange,
  isLoading = false,
  onEdit,
  onVoid,
}) => {
  const t = useTranslations("expenses");
  const tCommon = useTranslations("common");
  const [localPage, setLocalPage] = useState(1);
  const isServerPagination =
    typeof onPageChange === "function" && typeof controlledPage === "number";
  const page = isServerPagination ? controlledPage : localPage;

  useEffect(() => {
    if (!isServerPagination) {
      setLocalPage(1);
    }
  }, [rows, isServerPagination]);

  const totalPages = Math.max(
    1,
    Math.ceil((isServerPagination ? totalCount : rows.length) / pageSize),
  );
  const pageRows = useMemo(() => {
    if (isServerPagination) {
      return rows;
    }

    const startIndex = (page - 1) * pageSize;
    return rows.slice(startIndex, startIndex + pageSize);
  }, [rows, page, pageSize, isServerPagination]);

  const startIndex = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex =
    totalCount === 0
      ? 0
      : Math.min(startIndex + pageRows.length - 1, totalCount);

  const handlePrevious = () => {
    const nextPage = Math.max(1, page - 1);

    if (isServerPagination) {
      onPageChange(nextPage);
      return;
    }

    setLocalPage(nextPage);
  };

  const handleNext = () => {
    const nextPage = Math.min(totalPages, page + 1);

    if (isServerPagination) {
      onPageChange(nextPage);
      return;
    }

    setLocalPage(nextPage);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-700">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr className="border-b border-slate-200">
              <th className="px-5 py-3">{t("dateAndTime")}</th>
              <th className="px-5 py-3">{t("category")}</th>
              <th className="px-5 py-3">{t("description")}</th>
              <th className="px-5 py-3 text-right">{t("amount")}</th>
              <th className="px-5 py-3 text-right">{tCommon("status")}</th>
              <th className="px-5 py-3 text-right">{tCommon("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-10 text-center text-slate-500"
                >
                  {t("loadingExpenses")}
                </td>
              </tr>
            ) : pageRows.length > 0 ? (
              pageRows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <td className="px-5 py-4">
                    <div className="font-medium text-slate-800">
                      {formatDate(row.date)}
                    </div>
                    <div className="text-xs text-slate-500">{row.time}</div>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                        categoryStyles[row.category] ??
                        "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {row.category}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    {row.description}
                  </td>
                  <td className="px-5 py-4 text-right font-semibold text-slate-900">
                    {row.amount}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                        statusStyles[row.status]
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit?.(row)}
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={!onEdit}
                      >
                        {tCommon("edit")}
                      </button>
                      <button
                        type="button"
                        onClick={() => onVoid?.(row)}
                        className="rounded-full border border-rose-200 px-3 py-1 text-xs font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={!onVoid}
                      >
                        {t("void")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-10 text-center text-slate-500"
                >
                  {tCommon("noResults")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <span>
          {t("showing")} {startIndex} {t("to")} {endIndex} {t("of")} {totalCount} {t("results")}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={page === 1 || isLoading}
            className="rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {tCommon("previous")}
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={page === totalPages || rows.length === 0 || isLoading}
            className="rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {tCommon("next")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExpensesTable;
