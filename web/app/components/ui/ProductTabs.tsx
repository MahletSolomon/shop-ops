"use client";

import React from "react";
import { Search } from "lucide-react";

type TabItem = { id: string; label: string; count: number };

interface ProductTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  onSearch: (query: string) => void;
}

export const ProductTabs = ({ tabs, activeTab, onTabChange, onSearch }: ProductTabsProps) => {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
      {/* Tabs Container */}
      <div className="inline-flex h-10 items-center justify-center rounded-lg bg-gray-100 p-1 text-gray-600">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-white text-gray-900 shadow-sm"
                : "hover:text-gray-900 hover:bg-gray-200/50"
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div className="relative w-full sm:max-w-sm">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          className="flex h-10 w-full rounded-md border border-gray-300 bg-white pl-10 pr-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          placeholder="Search products..."
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>
    </div>
  );
};