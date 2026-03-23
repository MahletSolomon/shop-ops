"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    ShoppingCart,
    Receipt,
    Package,
    BarChart3,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Menu,
    X,
    Store,
} from "lucide-react";

export default function Sidebar() {
    const pathname = usePathname();
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    // navigation
    const navItems = [
        {
            label: "Dashboard",
            href: "/dashboard",
            icon: <LayoutDashboard size={20} />,
        },
        {
            label: "Sales",
            href: "/dashboard/sales",
            icon: <ShoppingCart size={20} />,
        },
        {
            label: "Expenses",
            href: "/dashboard/expenses",
            icon: <Receipt size={20} />,
        },
        {
            label: "Inventory",
            href: "/dashboard/inventory",
            icon: <Package size={20} />,
        },
        {
            label: "Reports",
            href: "/dashboard/reports",
            icon: <BarChart3 size={20} />,
        },
        {
            label: "Settings",
            href: "/dashboard/settings",
            icon: <Settings size={20} />,
        },
    ];

    useEffect(() => {
        setIsMounted(true);
        const saved = window.localStorage.getItem("sidebarCollapsed");
        if (saved) setIsCollapsed(JSON.parse(saved));
    }, []);

    const toggleCollapse = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        window.localStorage.setItem("sidebarCollapsed", JSON.stringify(newState));
    };

    const isActive = (href: string) => {
        if (href === "/" || href === "/dashboard") {
            return pathname === href;
        }
        return pathname.startsWith(href);
    };

    if (!isMounted) return null;

    return (
        <>
            {/* mobile screen menu */}
            <div className="md:hidden fixed bottom-6 right-6 z-50">
                <button
                    onClick={() => setIsMobileOpen(true)}
                    className="bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 transition-all active:scale-95"
                >
                    <Menu size={24} />
                </button>
            </div>

            {/* mobile drawer overlay */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-50 md:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* sidebar */}
            <aside
                className={`
          fixed md:static inset-y-0 left-0 z-50
          bg-white border-r border-slate-200 
          flex flex-col h-screen shadow-sm
          transition-all duration-300 ease-in-out
          
          ${isMobileOpen ? "translate-x-0 w-64" : "-translate-x-full md:translate-x-0"}
          ${isCollapsed ? "md:w-20" : "md:w-64"}
        `}
            >
                {/* siderbar header  */}
                <div
                    className={`h-16 flex items-center ${isCollapsed ? "justify-center" : "px-6 justify-between"} border-b border-slate-100`}
                >
                    <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap">
                        <div className="bg-indigo-600 p-1.5 rounded-lg text-white shrink-0">
                            <Store size={20} />
                        </div>
                        {(!isCollapsed || isMobileOpen) && (
                            <span className="font-bold text-lg tracking-tight text-slate-800">
                                Shop Ops
                            </span>
                        )}
                    </div>

                    {/* mobile close button */}
                    <button
                        onClick={() => setIsMobileOpen(false)}
                        className="md:hidden text-slate-400 hover:text-red-500"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* navigation links */}
                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                    {navItems.map((item) => {
                        const active = isActive(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsMobileOpen(false)}
                                className={`
                  group relative flex items-center rounded-lg transition-all duration-200
                  ${isCollapsed ? "justify-center py-3" : "px-3 py-2.5 gap-3"}
                  ${active
                                        ? "bg-indigo-50 text-indigo-600 font-medium"
                                        : "text-slate-600 hover:bg-slate-50 hover:text-indigo-600"
                                    }
                `}
                            >
                                <div className="shrink-0 transition-colors duration-200">
                                    {item.icon}
                                </div>

                                {(!isCollapsed || isMobileOpen) && (
                                    <span className="text-sm whitespace-nowrap transition-opacity duration-300">
                                        {item.label}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* sidebar footer / logout */}
                <div className="p-3 border-t border-slate-100 bg-slate-50/50">
                    <button
                        className={`
              w-full flex items-center rounded-lg transition-colors text-slate-500 hover:text-red-600 hover:bg-red-50
              ${isCollapsed ? "justify-center py-3" : "px-3 py-2.5 gap-3"}
            `}
                    >
                        <LogOut size={20} />
                        {(!isCollapsed || isMobileOpen) && (
                            <span className="text-sm font-medium">Logout</span>
                        )}
                    </button>

                    {/* sidebar collapse toggle */}
                    <button
                        onClick={toggleCollapse}
                        className="hidden md:flex absolute -right-3 top-20 bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 rounded-full p-1 shadow-sm z-50 items-center justify-center h-6 w-6"
                    >
                        {isCollapsed ? (
                            <ChevronRight size={14} />
                        ) : (
                            <ChevronLeft size={14} />
                        )}
                    </button>
                </div>
            </aside>
        </>
    );
}