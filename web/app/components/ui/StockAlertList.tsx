import React from 'react';
import StockAlertItem from './StockAlertItem';

interface StockItem {
    name: string;
    sku: string;
    quantity: string;
    status: string;
    variant: 'warning' | 'critical';
}

const StockAlertList: React.FC = () => {

    const inventoryData: StockItem[] = [
        {
            name: "Cooking Oil (3L)",
            sku: "SKU: CO-003",
            quantity: "8 units",
            status: "Low Stock",
            variant: "warning",
        },
        {
            name: "Bottled Water",
            sku: "SKU: BW-012",
            quantity: "0 units",
            status: "Out of Stock",
            variant: "critical",
        },
        {
            name: "Bar Soap (6pk)",
            sku: "SKU: BS-006",
            quantity: "5 units",
            status: "Low Stock",
            variant: "warning",
        },
        {
            name: "Pasta (500g)",
            sku: "SKU: PA-500",
            quantity: "3 units",
            status: "Low Stock",
            variant: "warning",
        },
        {
            name: "Tomato Paste",
            sku: "SKU: TP-400",
            quantity: "0 units",
            status: "Out of Stock",
            variant: "critical",
        },
    ];

    return (
        <div className="space-y-4">
            {inventoryData.map((item, index) => (
                <StockAlertItem
                    key={item.sku}
                    name={item.name}
                    sku={item.sku}
                    quantity={item.quantity}
                    status={item.status}
                    variant={item.variant}
                />
            ))}
        </div>
    );
};

export default StockAlertList;