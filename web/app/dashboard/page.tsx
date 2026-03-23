"use client";
import Card from "../components/ui/Card";
import SalesVsExpensesChart from "../components/charts/SalesVsExpensesChart";
import PageTitle from "../components/ui/PageTitle";
import React from "react";
import StockAlertList from "../components/ui/StockAlertList";
import { DollarSign, TrendingUp, Package, TriangleAlert } from "lucide-react";

// dummy data for the chart
const chartData = [
    { name: "Feb 1", sales: 12000, expenses: 8000 },
    { name: "Feb 2", sales: 19000, expenses: 7500 },
    { name: "Feb 3", sales: 15000, expenses: 9000 },
    { name: "Feb 4", sales: 22000, expenses: 6000 },
    { name: "Feb 5", sales: 28000, expenses: 11000 },
    { name: "Feb 6", sales: 24000, expenses: 13000 },
    { name: "Feb 7", sales: 32000, expenses: 10000 },
    { name: "Feb 8", sales: 35000, expenses: 14000 },
    { name: "Feb 9", sales: 42000, expenses: 16000 },
];

export default function DashboardPage() {
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
                    value="Br 12,450.00"
                    icon={DollarSign}
                    iconWrapperClass="bg-indigo-50 text-indigo-600"
                    trend="+12%"
                    trendDirection="up"
                    description="vs last period"
                />

                <Card
                    title="Today's Expenses"
                    value="Br 5,200.00"
                    icon={TrendingUp}
                    iconWrapperClass="bg-red-50 text-red-600"
                    trend="-5%"
                    trendDirection="down"
                    description="vs last period"
                />

                <Card
                    title="Monthly Sales"
                    value="Br 285,000.00"
                    icon={DollarSign}
                    iconWrapperClass="bg-indigo-50 text-indigo-600"
                    trend="+8%"
                    trendDirection="up"
                    description="vs last period"
                />

                <Card
                    title="Pending Syncs"
                    value="4"
                    icon={Package}
                    iconWrapperClass="bg-orange-50 text-orange-600"
                    description="Items waiting to upload"
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
                        <p className="text-sm text-slate-500">5 items require attention</p>
                    </div>
                    <div className="p-6 pt-0">
                        <StockAlertList />
                    </div>
                </div>
            </div>
        </div>
    );
}