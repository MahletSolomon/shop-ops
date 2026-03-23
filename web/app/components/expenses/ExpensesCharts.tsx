import React from "react";
import ExpensesCategoryChart from "@/app/components/charts/ExpensesCategoryChart";
import ExpensesTrendChart from "@/app/components/charts/ExpensesTrendChart";

const ExpensesCharts = () => {
    return (
        <div className="grid gap-4 lg:grid-cols-5">
            <ExpensesCategoryChart className="lg:col-span-2" />
            <ExpensesTrendChart className="lg:col-span-3" />
        </div>
    );
};

export default ExpensesCharts;