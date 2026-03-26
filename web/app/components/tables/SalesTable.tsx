"use client";

import React, { useState } from "react";
import { Eye, Search } from "lucide-react";

const salesData = [
  {
    id: 1,
    date: "Feb 9, 10:30 AM",
    customer: "Walk-in",
    items: "Rice (5kg), Sugar (2kg)",
    amount: "₦ 1,250.00",
    payment: "Cash",
    status: "synced",
  },
  {
    id: 2,
    date: "Feb 9, 11:15 AM",
    customer: "Meron Alemu",
    items: "Cooking Oil (3L)",
    amount: "₦ 780.00",
    payment: "Mobile Money",
    status: "synced",
  },
  {
    id: 3,
    date: "Feb 8, 02:00 PM",
    customer: "Walk-in",
    items: "Teff (10kg), Soap (x5)",
    amount: "₦ 3,200.00",
    payment: "Cash",
    status: "synced",
  },
  {
    id: 4,
    date: "Feb 8, 09:30 AM",
    customer: "Kebede Store",
    items: "Wholesale - mixed goods",
    amount: "₦ 15,000.00",
    payment: "Bank Transfer",
    status: "pending",
  },
  {
    id: 5,
    date: "Feb 7, 04:00 PM",
    customer: "Walk-in",
    items: "Water (x12), Detergent",
    amount: "₦ 650.00",
    payment: "Cash",
    status: "synced",
  },
  {
    id: 6,
    date: "Feb 7, 01:20 PM",
    customer: "Selamawit Cafe",
    items: "Sugar (25kg), Coffee",
    amount: "₦ 4,500.00",
    payment: "Mobile Money",
    status: "synced",
  },
  {
    id: 7,
    date: "Feb 6, 11:00 AM",
    customer: "Walk-in",
    items: "Flour (5kg)",
    amount: "₦ 420.00",
    payment: "Cash",
    status: "failed",
  },
  {
    id: 8,
    date: "Feb 5, 10:45 AM",
    customer: "Walk-in",
    items: "Rice (25kg)",
    amount: "₦ 2,800.00",
    payment: "Cash",
    status: "synced",
  },
  {
    id: 9,
    date: "Feb 4, 03:30 PM",
    customer: "Yonas Minimarket",
    items: "Wholesale order",
    amount: "₦ 22,000.00",
    payment: "Bank Transfer",
    status: "synced",
  },
  {
    id: 10,
    date: "Feb 3, 09:00 AM",
    customer: "Walk-in",
    items: "Soap (x3), Oil (1L)",
    amount: "₦ 380.00",
    payment: "Cash",
    status: "synced",
  },
];

const getStatusColor = (status) => {
  switch (status.toLowerCase()) {
    case "synced":
      return "bg-emerald-100 text-emerald-700";
    case "pending":
      return "bg-amber-100 text-amber-700";
    case "failed":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

export default function SalesTable() {
  const [searchTerm, setSearchTerm] = useState("");

  // Filter data
  const filteredData = salesData.filter((row) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      row.customer.toLowerCase().includes(searchLower) ||
      row.items.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative max-w-sm">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          className="flex h-10 w-full rounded-md border border-gray-300 bg-white pl-10 pr-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          placeholder="Search by customer or items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* table  */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="w-full">
          <table className="w-full caption-bottom text-sm text-gray-900">
            <thead className="bg-gray-50/50">
              <tr className="border-b border-gray-200">
                <th className="hidden md:table-cell h-12 px-4 text-left align-middle font-medium text-gray-500">
                  Date
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-gray-500">
                  Customer
                </th>
                <th className="hidden lg:table-cell h-12 px-4 text-left align-middle font-medium text-gray-500">
                  Items
                </th>
                <th className="h-12 px-4 align-middle font-medium text-gray-500 text-right">
                  Amount
                </th>
                <th className="hidden sm:table-cell h-12 px-4 text-left align-middle font-medium text-gray-500">
                  Payment
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-gray-500">
                  Status
                </th>
                <th className="h-12 px-4 w-10"></th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {filteredData.length > 0 ? (
                filteredData.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="hidden md:table-cell p-4 align-middle text-sm text-gray-600 whitespace-nowrap">
                      {row.date}
                    </td>
                    <td className="p-4 align-middle text-sm font-medium whitespace-nowrap">
                      {row.customer}
                      <div className="md:hidden text-xs text-gray-500 mt-1">
                        {row.date}
                      </div>
                    </td>
                    <td
                      className="hidden lg:table-cell p-4 align-middle text-sm text-gray-600 max-w-[200px] truncate"
                      title={row.items}
                    >
                      {row.items}
                    </td>
                    <td className="p-4 align-middle text-right font-medium tabular-nums text-sm whitespace-nowrap">
                      {row.amount}
                    </td>
                    <td className="hidden sm:table-cell p-4 align-middle whitespace-nowrap">
                      <div className="inline-flex items-center rounded-full border border-gray-200 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                        {row.payment}
                      </div>
                    </td>
                    <td className="p-4 align-middle whitespace-nowrap">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(row.status)}`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="p-4 align-middle">
                      <button className="inline-flex items-center justify-center gap-2 rounded-md h-8 w-8 text-gray-500 hover:bg-gray-200 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400">
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">View Details</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    No results found for "{searchTerm}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
