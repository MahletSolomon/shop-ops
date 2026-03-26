import React from "react";
import ExpensesCategoryChart from "@/app/components/charts/ExpensesCategoryChart";
import ExpensesTrendChart from "@/app/components/charts/ExpensesTrendChart";

type ExpensesChartsProps = {
  categoryData: Array<{ name: string; value: number; color: string }>;
  trendData: Array<{ name: string; value: number }>;
};

const ExpensesCharts: React.FC<ExpensesChartsProps> = ({
  categoryData,
  trendData,
}) => {
  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <ExpensesCategoryChart className="lg:col-span-2" data={categoryData} />
      <ExpensesTrendChart className="lg:col-span-3" data={trendData} />
    </div>
  );
};

export default ExpensesCharts;
