'use client';

import React from "react";
import { useTranslations } from "next-intl";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type TrendDatum = { name: string; value: number };

const ExpensesTrendChart = ({
  className = "",
  data,
}: {
  className?: string;
  data: TrendDatum[];
}) => {
  const t = useTranslations("charts");
  const trendData = data.length > 0 ? data : [{ name: t("noData"), value: 0 }];

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}
    >
      <div>
        <h3 className="font-semibold text-slate-900">{t("dailyTrend")}</h3>
        <p className="text-sm text-slate-500">{t("expensesOverTime")}</p>
      </div>

      <div className="mt-6 h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={trendData}
            margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e2e8f0"
            />
            <XAxis
              dataKey="name"
              stroke="#94a3b8"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => value.toLocaleString()}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              }}
              itemStyle={{ color: "#1e293b", fontSize: "12px" }}
              labelStyle={{ color: "#64748b", marginBottom: "0.5rem" }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#14b8a6"
              strokeWidth={2}
              fill="#ccfbf1"
              activeDot={{ r: 5, fill: "#14b8a6" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ExpensesTrendChart;
