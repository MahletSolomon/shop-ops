import React from "react";
import Card from "@/app/components/ui/Card";
import { DollarSign, PieChart, Calculator } from "lucide-react";

const ExpensesStats = () => {
    return (
        <div className="grid gap-4 lg:grid-cols-3">
            <Card
                title="Total Expenses"
                value="Br 497,850.00"
                icon={DollarSign}
                iconWrapperClass="bg-emerald-50 text-emerald-600"
                trend=""
                trendDirection=""
                description="25 transactions"
            />

            <Card
                title="Top Category"
                value="Stock Purchase"
                icon={PieChart}
                iconWrapperClass="bg-blue-50 text-blue-600"
                trend=""
                trendDirection=""
                description="52% of total"
            />

            <Card
                title="Average Expense"
                value="Br 19,914.00"
                icon={Calculator}
                iconWrapperClass="bg-purple-50 text-purple-600"
                trend=""
                trendDirection=""
                description="Per transaction"
            />
        </div>
    );
};

export default ExpensesStats;