import React from "react";
import { Search, CalendarDays, ListFilter } from "lucide-react";

type ExpensesFiltersProps = {
    timeRange: string;
    category: string;
    search: string;
    onTimeRangeChange: (value: string) => void;
    onCategoryChange: (value: string) => void;
    onSearchChange: (value: string) => void;
};

const categoryOptions = [
    "All Categories",
    "Stock Purchase",
    "Salaries",
    "Rent",
    "Maintenance",
    "Transport",
    "Other",
];

const ExpensesFilters: React.FC<ExpensesFiltersProps> = ({
    timeRange,
    category,
    search,
    onTimeRangeChange,
    onCategoryChange,
    onSearchChange,
}) => {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-[180px_200px_1fr]">
                <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <select
                        value={timeRange}
                        onChange={(event) => onTimeRangeChange(event.target.value)}
                        className="h-10 w-full appearance-none rounded-full border border-slate-200 bg-white pl-10 pr-8 text-sm text-slate-700 shadow-sm focus:border-emerald-400 focus:outline-none"
                    >
                        <option value="all">All Time</option>
                        <option value="last_7">Last 7 Days</option>
                        <option value="this_month">This Month</option>
                    </select>
                </div>

                <div className="relative">
                    <ListFilter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <select
                        value={category}
                        onChange={(event) => onCategoryChange(event.target.value)}
                        className="h-10 w-full appearance-none rounded-full border border-slate-200 bg-white pl-10 pr-8 text-sm text-slate-700 shadow-sm focus:border-emerald-400 focus:outline-none"
                    >
                        {categoryOptions.map((option) => {
                            const value = option === "All Categories" ? "all" : option;
                            return (
                                <option key={option} value={value}>
                                    {option}
                                </option>
                            );
                        })}
                    </select>
                </div>

                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(event) => onSearchChange(event.target.value)}
                        placeholder="Search descriptions..."
                        className="h-10 w-full rounded-full border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none"
                    />
                </div>
            </div>
        </div>
    );
};

export default ExpensesFilters;