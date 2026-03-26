import React from "react";
import Card from "@/app/components/ui/Card";
import { DollarSign, PieChart, Calculator } from "lucide-react";

type ExpensesStatsProps = {
  totalExpenses: string;
  topCategory: string;
  topCategoryShare: string;
  averageExpense: string;
  transactionCount: number;
};

const ExpensesStats: React.FC<ExpensesStatsProps> = ({
  totalExpenses,
  topCategory,
  topCategoryShare,
  averageExpense,
  transactionCount,
}) => {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card
        title="Total Expenses"
        value={totalExpenses}
        icon={DollarSign}
        iconWrapperClass="bg-emerald-50 text-emerald-600"
        trend=""
        trendDirection=""
        description={`${transactionCount} transactions`}
      />

      <Card
        title="Top Category"
        value={topCategory}
        icon={PieChart}
        iconWrapperClass="bg-blue-50 text-blue-600"
        trend=""
        trendDirection=""
        description={`${topCategoryShare} of total`}
      />

      <Card
        title="Average Expense"
        value={averageExpense}
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
