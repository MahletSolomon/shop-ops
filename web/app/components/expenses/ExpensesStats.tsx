'use client';

import React from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("expenses");
  
  return (
    <div className="grid gap-4 lg:grid-cols-3" data-tour="expense-stats">
      <Card
        title={t("totalExpenses")}
        value={totalExpenses}
        icon={DollarSign}
        iconWrapperClass="bg-emerald-50 text-emerald-600"
        trend=""
        trendDirection=""
        description={`${transactionCount} ${t("transactions")}`}
      />

      <Card
        title={t("topCategory")}
        value={topCategory}
        icon={PieChart}
        iconWrapperClass="bg-blue-50 text-blue-600"
        trend=""
        trendDirection=""
        description={t("ofTotal", { share: topCategoryShare })}
      />

      <Card
        title={t("averageExpense")}
        value={averageExpense}
        icon={Calculator}
        iconWrapperClass="bg-[#e2f2ff] text-[#135bec]"
        trend=""
        trendDirection=""
        description={t("perTransaction")}
      />
    </div>
  );
};

export default ExpensesStats;
