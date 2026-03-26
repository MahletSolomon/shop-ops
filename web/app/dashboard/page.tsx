"use client";
import Card from "../components/ui/Card";
import SalesVsExpensesChart, {
    ChartDataPoint,
} from "../components/charts/SalesVsExpensesChart";
import PageTitle from "../components/ui/PageTitle";
import React, { useEffect, useMemo, useState } from "react";
import StockAlertList from "../components/ui/StockAlertList";
import { DollarSign, TrendingUp, Package, TriangleAlert } from "lucide-react";
import {
    fetchSales,
    fetchSalesStats,
    fetchSalesSummary,
    formatSalesMoney,
    toAmountNumber as toSalesNumber,
} from "@/lib/sales";
import { fetchExpenseSummary, fetchExpenses, formatMoney, toAmountNumber } from "@/lib/expenses";
import { fetchLowStockProducts } from "@/lib/inventory";
import type { StockItem } from "../components/ui/StockAlertList";

type ActiveBusiness = {
    id: string;
};

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

export default function DashboardPage() {
        const [activeBusinessId, setActiveBusinessId] = useState("");
        const [isLoading, setIsLoading] = useState(false);
        const [todaySales, setTodaySales] = useState(0);
        const [todaySalesCount, setTodaySalesCount] = useState(0);
        const [monthlySales, setMonthlySales] = useState(0);
        const [todayExpenses, setTodayExpenses] = useState(0);
        const [pendingSyncs, setPendingSyncs] = useState(0);
    const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
    const [lowStockItems, setLowStockItems] = useState<StockItem[]>([]);
    const [isLoadingLowStock, setIsLoadingLowStock] = useState(false);

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
                const loadDashboardMetrics = async () => {
                        if (!activeBusinessId) {
                                setTodaySales(0);
                                setTodaySalesCount(0);
                                setMonthlySales(0);
                                setTodayExpenses(0);
                                setPendingSyncs(0);
                                return;
                        }

                        const now = new Date();
                        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                        const today = formatDateForApi(now);

                        setIsLoading(true);

                        try {
                                const [salesStats, monthSummary, expenseSummary] = await Promise.all([
                                        fetchSalesStats(activeBusinessId),
                                        fetchSalesSummary(activeBusinessId, formatDateForApi(monthStart), today),
                                        fetchExpenseSummary(activeBusinessId, today, today),
                                ]);

                                setTodaySales(salesStats.daily.total_revenue ?? 0);
                                setTodaySalesCount(salesStats.daily.total_sales ?? 0);
                                setMonthlySales(monthSummary.total_revenue ?? 0);
                                setTodayExpenses(toAmountNumber(expenseSummary.total ?? 0));
                                setPendingSyncs(salesStats.daily.voided_count ?? 0);
                        } catch {
                                setTodaySales(0);
                                setTodaySalesCount(0);
                                setMonthlySales(0);
                                setTodayExpenses(0);
                                setPendingSyncs(0);
                        } finally {
                                setIsLoading(false);
                        }
                };

                loadDashboardMetrics();
        }, [activeBusinessId]);

            useEffect(() => {
                const loadLowStock = async () => {
                    if (!activeBusinessId) {
                        setLowStockItems([]);
                        return;
                    }

                    setIsLoadingLowStock(true);
                    try {
                        const products = await fetchLowStockProducts(activeBusinessId);
                        const mapped: StockItem[] = products.map((product) => ({
                            name: product.name,
                            sku: `ID: ${product.id}`,
                            quantity: `${product.stock_quantity} units`,
                            status: product.stock_quantity <= 0 ? "Out of Stock" : "Low Stock",
                            variant: product.stock_quantity <= 0 ? "critical" : "warning",
                        }));
                        setLowStockItems(mapped);
                    } catch {
                        setLowStockItems([]);
                    } finally {
                        setIsLoadingLowStock(false);
                    }
                };

                loadLowStock();
            }, [activeBusinessId]);

            useEffect(() => {
                const loadChartData = async () => {
                    if (!activeBusinessId) {
                        setChartData([]);
                        return;
                    }

                    const today = new Date();
                    const start = new Date(today);
                    start.setDate(today.getDate() - 6);

                    const startDate = formatDateForApi(start);
                    const endDate = formatDateForApi(today);

                    try {
                        const [salesResponse, expensesResponse] = await Promise.all([
                            fetchSales({
                                businessId: activeBusinessId,
                                page: 1,
                                limit: 200,
                                startDate,
                                endDate,
                                sort: "created_at",
                                order: "asc",
                            }),
                            fetchExpenses({
                                businessId: activeBusinessId,
                                page: 1,
                                limit: 200,
                                startDate,
                                endDate,
                                sort: "date",
                                order: "asc",
                            }),
                        ]);

                        const salesByDate = new Map<string, number>();
                        for (const sale of salesResponse.sales) {
                            const dateKey = new Date(sale.created_at).toISOString().slice(0, 10);
                            const current = salesByDate.get(dateKey) ?? 0;
                            salesByDate.set(dateKey, current + toSalesNumber(sale.total));
                        }

                        const expensesByDate = new Map<string, number>();
                        for (const expense of expensesResponse.data) {
                            const dateKey = new Date(expense.created_at).toISOString().slice(0, 10);
                            const current = expensesByDate.get(dateKey) ?? 0;
                            expensesByDate.set(dateKey, current + toAmountNumber(expense.amount));
                        }

                        const points: ChartDataPoint[] = [];
                        for (let i = 0; i < 7; i += 1) {
                            const date = new Date(start);
                            date.setDate(start.getDate() + i);
                            const key = formatDateForApi(date);

                            points.push({
                                name: date.toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                }),
                                sales: Number((salesByDate.get(key) ?? 0).toFixed(2)),
                                expenses: Number((expensesByDate.get(key) ?? 0).toFixed(2)),
                            });
                        }

                        setChartData(points);
                    } catch {
                        setChartData([]);
                    }
                };

                loadChartData();
            }, [activeBusinessId]);

    return (
        <div className="flex flex-col space-y-4">
            {/* Dashboard Header */}
            <PageTitle
                title="Dashboard"
                subtitle="Overview of your business operations"
            />

            {/* Dashboard KPI Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card
                    title="Today's Sales"
                    value={isLoading ? "Loading..." : formatSalesMoney(todaySales)}
                    icon={DollarSign}
                    iconWrapperClass="bg-indigo-50 text-indigo-600"
                    trend=""
                    trendDirection="up"
                    description={`${todaySalesCount} transactions today`}
                />

                <Card
                    title="Today's Expenses"
                    value={isLoading ? "Loading..." : formatMoney(todayExpenses)}
                    icon={TrendingUp}
                    iconWrapperClass="bg-red-50 text-red-600"
                    trend=""
                    trendDirection="down"
                    description="Based on recorded expenses"
                />

                <Card
                    title="Monthly Sales"
                    value={isLoading ? "Loading..." : formatSalesMoney(monthlySales)}
                    icon={DollarSign}
                    iconWrapperClass="bg-indigo-50 text-indigo-600"
                    trend=""
                    trendDirection="up"
                    description="Current month cumulative"
                />

                <Card
                    title="Pending Syncs"
                    value={String(pendingSyncs)}
                    icon={Package}
                    iconWrapperClass="bg-orange-50 text-orange-600"
                    description="Voided sales today"
                    trend=""
                />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 ">
                {/* Chart */}
                <SalesVsExpensesChart data={chartData} className="col-span-4" />

                {/* Low Stock Alerts */}
                <div className="col-span-3 rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="p-6 flex flex-col space-y-1.5">
                        <h3 className="font-semibold leading-none tracking-tight flex items-center gap-2">
                            <TriangleAlert className="h-4 w-4 text-amber-500" />
                            Low Stock Alerts
                        </h3>
                        <p className="text-sm text-slate-500">{lowStockItems.length} items require attention</p>
                    </div>
                    <div className="p-6 pt-0">
                        <StockAlertList
                            items={lowStockItems}
                            isLoading={isLoadingLowStock}
                            emptyMessage="No low stock alerts right now."
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}