"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  Wifi,
  CalendarDays,
  Bell,
} from "lucide-react";

type NotificationItem = {
  id: number;
  title: string;
  message: string;
  time: string;
  unread: boolean;
};

const initialNotifications: NotificationItem[] = [
  {
    id: 1,
    title: "Low stock alert",
    message: "Bottled Water (pack) is below threshold.",
    time: "5 min ago",
    unread: true,
  },
  {
    id: 2,
    title: "Expense synced",
    message: "Transport expense of Br 1,950.00 was synced.",
    time: "22 min ago",
    unread: true,
  },
  {
    id: 3,
    title: "Daily report ready",
    message: "Today\'s sales summary is available in reports.",
    time: "1 hr ago",
    unread: false,
  },
];

export default function Header() {
  const [user, setUser] = useState<{name: string, phone: string} | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const notificationPopoverRef = useRef<HTMLDivElement>(null);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => notification.unread).length,
    [notifications],
  );

  const handleMarkAsRead = (id: number) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id ? { ...notification, unread: false } : notification,
      ),
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((notification) => ({ ...notification, unread: false })));
  };

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser({
          name: parsedUser.name || "Unknown User",
          phone: parsedUser.phone || "",
        });
      } catch (e) {
        console.error("Failed to parse user data from localStorage", e);
      }
    }
  }, []);

  useEffect(() => {
    if (!isNotificationsOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (
        notificationPopoverRef.current &&
        !notificationPopoverRef.current.contains(event.target as Node)
      ) {
        setIsNotificationsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isNotificationsOpen]);

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 z-10 sticky top-0">

      {/* Store Selection */}
      <div className="flex items-center gap-4">
        <button className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all group">
          <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-600">
            Merkato Mini-Market
          </span>
          <ChevronDown size={16} className="text-slate-400 group-hover:text-indigo-600" />
        </button>

        {/* online status  */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-xs font-medium text-emerald-600">
          <Wifi size={12} />
          <span>Online</span>
        </div>
      </div>

      {/* right section */}
      <div className="flex items-center gap-2 sm:gap-4">

        {/* date */}
        <div className="hidden md:flex items-center gap-2 text-sm text-slate-500 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-100">
          <CalendarDays size={16} className="text-slate-400" />
          <span>Fri, Feb 20 2026</span>
        </div>

        <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

        {/* notification bell */}
        <div className="relative" ref={notificationPopoverRef}>
          <button
            type="button"
            onClick={() => setIsNotificationsOpen((prev) => !prev)}
            className="relative p-2 rounded-lg text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all"
            aria-label="Open notifications"
            aria-expanded={isNotificationsOpen}
            aria-haspopup="dialog"
          >
            <Bell size={20} />

            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-4 h-4 rounded-full bg-red-500 px-1 text-[10px] leading-4 font-semibold text-white text-center ring-2 ring-white">
                {unreadCount}
              </span>
            )}
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-sm rounded-xl border border-slate-200 bg-white shadow-lg z-30">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <h3 className="text-sm font-semibold text-slate-800">Notifications</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllAsRead}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      Mark all as read
                    </button>
                  )}
                  <span className="text-xs text-slate-500">{unreadCount} unread</span>
                </div>
              </div>

              <ul className="max-h-80 overflow-y-auto py-2">
                {notifications.map((notification) => (
                  <li key={notification.id} className="px-4 py-3 hover:bg-slate-50 transition">
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-1 h-2 w-2 rounded-full ${
                          notification.unread ? "bg-indigo-500" : "bg-slate-300"
                        }`}
                      ></span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-medium text-slate-700 truncate">
                            {notification.title}
                          </p>
                          {notification.unread && (
                            <button
                              type="button"
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="shrink-0 text-[11px] font-medium text-indigo-600 hover:text-indigo-700"
                            >
                              Mark as read
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 leading-5">
                          {notification.message}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">{notification.time}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* profile */}
        <Link href="/dashboard/profile" className="flex items-center gap-2 ml-1">
          <div className="h-9 w-9 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xs shadow-sm hover:ring-2 hover:ring-indigo-100 transition-all">
            {user ? user.name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase() : "NA"}
          </div>
          <div className="hidden lg:flex flex-col items-start">
            <span className="text-sm font-medium text-slate-700">{user ? user.name.split(" ")[0] : "Admin"}</span>
            <span className="text-[10px] text-slate-500 uppercase tracking-wide">{user ? user.phone : "Manager"}</span>
          </div>
        </Link>
      </div>
    </header>
  );
}