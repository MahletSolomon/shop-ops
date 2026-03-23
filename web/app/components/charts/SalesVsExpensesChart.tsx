import React from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";

export interface ChartDataPoint {
    name: string;
    sales: number;
    expenses: number;
}

interface SalesVsExpensesChartProps {
    data: ChartDataPoint[];
    className?: string;
}

const SalesVsExpensesChart: React.FC<SalesVsExpensesChartProps> = ({
    data,
    className,
}) => {
    return (
        <div
            className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}
        >
            <div className="p-6 flex flex-col space-y-1.5">
                <h3 className="font-semibold leading-none tracking-tight">
                    Sales vs Expenses
                </h3>
                <p className="text-sm text-slate-500">
                    Daily financial performance for February
                </p>
            </div>

            {/* Chart Container */}
            <div className="p-2">
                <div className="h-75 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={data}
                            margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
                        >
                            <CartesianGrid
                                strokeDasharray="3 3"
                                vertical={false}
                                stroke="#e2e8f0"
                            />
                            <XAxis
                                dataKey="name"
                                stroke="#64748b"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                dy={10}
                            />
                            <YAxis
                                stroke="#64748b"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `Br ${value}`}
                                dx={-10}
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
                            <Legend wrapperStyle={{ paddingTop: "20px" }} />
                            <Line
                                type="monotone"
                                dataKey="sales"
                                name="Sales"
                                stroke="#4f46e5" // Indigo-600
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 6, fill: "#4f46e5" }}
                            />
                            <Line
                                type="monotone"
                                dataKey="expenses"
                                name="Expenses"
                                stroke="#ef4444" // Red-500
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 6, fill: "#ef4444" }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default SalesVsExpensesChart;