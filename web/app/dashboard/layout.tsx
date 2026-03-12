import React from "react";
import Sidebar from "../components/ui/Sidebar";
import Header from "../components/ui/Header";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full w-full h-screen">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Header />
        <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden gap-4 p-4 md:gap-8 md:p-6 bg-gray-50/10">
          {children}
        </div>
      </div>
    </div>
  );
}
