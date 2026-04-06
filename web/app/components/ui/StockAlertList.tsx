'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import StockAlertItem from './StockAlertItem';

export interface StockItem {
    name: string;
    sku: string;
    quantity: string;
    status: string;
    variant: 'warning' | 'critical';
}

interface StockAlertListProps {
    items: StockItem[];
    isLoading?: boolean;
    emptyMessage?: string;
}

const StockAlertList: React.FC<StockAlertListProps> = ({
    items,
    isLoading = false,
    emptyMessage,
}) => {
    const t = useTranslations("dashboard");

    if (isLoading) {
        return <p className="text-sm text-slate-500">{t("loadingLowStockItems")}</p>;
    }

    if (items.length === 0) {
        return <p className="text-sm text-slate-500">{emptyMessage || t("noLowStockItems")}</p>;
    }

    return (
        <div className="space-y-4">
            {items.map((item) => (
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