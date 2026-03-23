"use client";

import React, { useEffect, useMemo, useState } from "react";

export type ExpenseRow = {
    id: number;
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
}) => {
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        setCurrentPage(1);
    }, [rows]);

    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
    const pageRows = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize;
        return rows.slice(startIndex, startIndex + pageSize);
    }, [rows, currentPage, pageSize]);

    const startIndex = rows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const endIndex = rows.length === 0 ? 0 : Math.min(startIndex + pageRows.length - 1, rows.length);

    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-700">
                    <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <tr className="border-b border-slate-200">
                            <th className="px-5 py-3">Date &amp; Time</th>
                            <th className="px-5 py-3">Category</th>
                            <th className="px-5 py-3">Description</th>
                            <th className="px-5 py-3 text-right">Amount</th>
                            <th className="px-5 py-3 text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pageRows.length > 0 ? (
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
                                            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${categoryStyles[row.category] ?? "bg-slate-100 text-slate-700"
                                                }`}
                                        >
                                            {row.category}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-slate-600">{row.description}</td>
                                    <td className="px-5 py-4 text-right font-semibold text-slate-900">
                                        {row.amount}
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                        <span
                                            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusStyles[row.status]
                                                }`}
                                        >
                                            {row.status}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="px-5 py-10 text-center text-slate-500">
                                    No results found for the selected filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <span>
                    Showing {startIndex} to {endIndex} of {totalCount} results
                </span>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Previous
                    </button>
                    <button
                        type="button"
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages || rows.length === 0}
                        className="rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExpensesTable;