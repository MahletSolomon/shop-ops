import React from 'react';

type AlertVariant = 'warning' | 'critical';

interface StockAlertItemProps {
    name: string;
    sku: string;
    quantity: string;
    status: string;
    variant?: AlertVariant;
}

const StockAlertItem: React.FC<StockAlertItemProps> = ({
    name,
    sku,
    quantity,
    status,
    variant = 'warning'
}) => {


    const styles: Record<AlertVariant, { container: string; quantityText: string; badge: string }> = {
        warning: {
            container: "border-slate-100 bg-slate-50/50",
            quantityText: "text-slate-700",
            badge: "bg-amber-100 text-amber-800"
        },
        critical: {
            container: "border-red-100 bg-red-50/30",
            quantityText: "text-red-600",
            badge: "bg-red-100 text-red-800"
        }
    };

    const currentStyle = styles[variant];

    return (
        <div className={`flex items-center justify-between p-3 border rounded-lg ${currentStyle.container}`}>
            <div className="space-y-1">
                <p className="text-sm font-medium leading-none text-slate-900">
                    {name}
                </p>
                <p className="text-xs text-slate-500">
                    {sku}
                </p>
            </div>
            <div className="flex flex-col items-end gap-1">
                <span className={`text-xs font-bold ${currentStyle.quantityText}`}>
                    {quantity}
                </span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${currentStyle.badge}`}>
                    {status}
                </span>
            </div>
        </div>
    );
};

export default StockAlertItem;