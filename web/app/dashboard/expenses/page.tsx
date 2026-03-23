"use client";

import React, { useMemo, useState } from "react";
import ExpensesHeader from "@/app/components/expenses/ExpensesHeader";
import ExpensesFilters from "@/app/components/expenses/ExpensesFilters";
import ExpensesStats from "@/app/components/expenses/ExpensesStats";
import ExpensesCharts from "@/app/components/expenses/ExpensesCharts";
import ExpensesTable, {
    ExpenseRow,
} from "@/app/components/tables/ExpensesTable";

const expenseRows: ExpenseRow[] = [
    {
        id: 1,
        date: "2026-02-09",
        time: "08:30 AM",
        category: "Rent",
        description: "Monthly shop rent - Merkato branch",
        amount: "Br 35,000.00",
        status: "Synced",
    },
    {
        id: 2,
        date: "2026-02-08",
        time: "02:20 PM",
        category: "Stock Purchase",
        description: "Wholesale rice purchase - 50 bags",
        amount: "Br 87,500.00",
        status: "Synced",
    },
    {
        id: 3,
        date: "2026-02-06",
        time: "10:15 AM",
        category: "Maintenance",
        description: "Broken shelf repair",
        amount: "Br 2,400.00",
        status: "Synced",
    },
    {
        id: 4,
        date: "2026-02-05",
        time: "04:45 PM",
        category: "Transport",
        description: "Delivery van fuel refill",
        amount: "Br 3,250.00",
        status: "Pending",
    },
    {
        id: 5,
        date: "2026-02-04",
        time: "11:10 AM",
        category: "Salaries",
        description: "Part-time staff wages",
        amount: "Br 14,000.00",
        status: "Synced",
    },
    {
        id: 6,
        date: "2026-02-03",
        time: "01:05 PM",
        category: "Stock Purchase",
        description: "Cooking oil restock - 30 cartons",
        amount: "Br 42,800.00",
        status: "Synced",
    },
    {
        id: 7,
        date: "2026-02-02",
        time: "09:30 AM",
        category: "Other",
        description: "POS receipt paper rolls",
        amount: "Br 640.00",
        status: "Synced",
    },
    {
        id: 8,
        date: "2026-02-01",
        time: "03:40 PM",
        category: "Rent",
        description: "Warehouse space fee",
        amount: "Br 18,000.00",
        status: "Pending",
    },
    {
        id: 9,
        date: "2026-01-30",
        time: "12:25 PM",
        category: "Transport",
        description: "Supplier delivery service",
        amount: "Br 1,950.00",
        status: "Synced",
    },
    {
        id: 10,
        date: "2026-01-28",
        time: "09:00 AM",
        category: "Maintenance",
        description: "Air conditioner servicing",
        amount: "Br 3,800.00",
        status: "Synced",
    },
];

const latestExpenseDate = expenseRows.reduce((latest, row) => {
    const rowDate = new Date(`${row.date}T00:00:00`);
    return rowDate > latest ? rowDate : latest;
}, new Date(0));

const Expenses = () => {
    const [timeRange, setTimeRange] = useState("all");
    const [category, setCategory] = useState("all");
    const [search, setSearch] = useState("");

    const filteredRows = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();
        const baseDate = latestExpenseDate;
        const last7Date = new Date(baseDate);
        last7Date.setDate(baseDate.getDate() - 7);

        return expenseRows.filter((row) => {
            if (category !== "all" && row.category !== category) return false;

            if (timeRange !== "all") {
                const rowDate = new Date(`${row.date}T00:00:00`);
                if (timeRange === "last_7" && rowDate < last7Date) return false;
                if (
                    timeRange === "this_month" &&
                    (rowDate.getMonth() !== baseDate.getMonth() ||
                        rowDate.getFullYear() !== baseDate.getFullYear())
                ) {
                    return false;
                }
            }

            if (normalizedSearch.length > 0) {
                const haystack = `${row.description} ${row.category}`.toLowerCase();
                if (!haystack.includes(normalizedSearch)) return false;
            }

            return true;
        });
    }, [timeRange, category, search]);

    return (
        <div className="flex flex-col space-y-4">
            <ExpensesHeader
                title="Expenses"
                subtitle="Track and review business expenses"
            />

            <ExpensesFilters
                timeRange={timeRange}
                category={category}
                search={search}
                onTimeRangeChange={setTimeRange}
                onCategoryChange={setCategory}
                onSearchChange={setSearch}
            />

            <ExpensesStats />

            <ExpensesCharts />

            <ExpensesTable rows={filteredRows} totalCount={expenseRows.length} />
        </div>
    );
};

export default Expenses;