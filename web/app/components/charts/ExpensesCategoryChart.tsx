import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

type CategoryDatum = { name: string; value: number; color: string };

const fallbackCategoryData: CategoryDatum[] = [
  { name: "No Data", value: 1, color: "#e2e8f0" },
];

const ExpensesCategoryChart = ({
  className = "",
  data,
}: {
  className?: string;
  data: CategoryDatum[];
}) => {
  const categoryData = data.length > 0 ? data : fallbackCategoryData;

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">By Category</h3>
          <p className="text-sm text-slate-500">Expense distribution</p>
        </div>
      </div>

      <div className="mt-6 h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={categoryData}
              dataKey="value"
              nameKey="name"
              innerRadius={70}
              outerRadius={95}
              paddingAngle={2}
            >
              {categoryData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
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
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-600">
        {categoryData.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span>{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExpensesCategoryChart;
