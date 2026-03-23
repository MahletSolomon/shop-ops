import React from "react";
import PageTitle from "@/app/components/ui/PageTitle";
import { Download, Plus } from "lucide-react";

type ExpensesHeaderProps = {
    title: string;
    subtitle: string;
    onExport?: () => void;
    onAdd?: () => void;
};

const ExpensesHeader: React.FC<ExpensesHeaderProps> = ({
    title,
    subtitle,
    onExport,
    onAdd,
}) => {
    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <PageTitle title={title} subtitle={subtitle} />
            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={onExport}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                >
                    <Download className="h-4 w-4" />
                    Export CSV
                </button>
                <button
                    type="button"
                    onClick={onAdd}
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-600"
                >
                    <Plus className="h-4 w-4" />
                    Add Expense
                </button>
            </div>
        </div>
    );
};

export default ExpensesHeader;