"use client";

import React, { useState } from "react";
import { Bell, Search, CheckCircle2, AlertTriangle, GitBranch, Check, X } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

interface NotificationItem {
  id: string;
  type: "scan_completed" | "bug_confirmed" | "patch_verified" | "review_needed";
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "notif-001",
    type: "scan_completed",
    title: "Pipeline Scan Completed",
    body: "Scan finished: 6 bugs identified in Python Marks Calculator workspace.",
    timestamp: "10m ago",
    read: false
  },
  {
    id: "notif-002",
    type: "bug_confirmed",
    title: "Critical Flaw Confirmed",
    body: "Defect confirmed with repro input marks=-5 in calculator.py (L5-L12).",
    timestamp: "8m ago",
    read: false
  },
  {
    id: "notif-003",
    type: "patch_verified",
    title: "Patch Verified: V4 Proven",
    body: "Candidate #1 passed all 14 regression tests in isolated sandbox.",
    timestamp: "5m ago",
    read: false
  },
  {
    id: "notif-004",
    type: "review_needed",
    title: "Review Awaiting Sign-Off",
    body: "Low-risk patch proposed for student marks bounds validation.",
    timestamp: "2m ago",
    read: true
  }
];

export function TopNav() {
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const toggleRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n))
    );
  };

  return (
    <header className="h-12 border-b border-[#E7E5E4] dark:border-[#292524] bg-white dark:bg-[#141210] px-4 flex items-center justify-between relative z-40">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-mono text-[#78716C] dark:text-[#A8A29E] bg-[#FAF9F6] dark:bg-[#1C1917] px-2.5 py-1 rounded border border-[#E7E5E4] dark:border-[#292524]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
          <span>Active Target: Python Marks Calculator</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />

        {/* Notifications Popover Toggle */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="View notifications"
            className="w-8 h-8 rounded flex items-center justify-center text-[#78716C] dark:text-[#A8A29E] hover:bg-black/5 dark:hover:bg-white/5 relative border border-[#E7E5E4] dark:border-[#292524] transition-colors"
          >
            <Bell className="w-4 h-4 stroke-[1.5]" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#0F766E] dark:bg-[#14B8A6] text-white dark:text-[#0C0A09] text-[9px] font-mono font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Popover Dropdown */}
          {isOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-[#141210] border border-[#E7E5E4] dark:border-[#292524] rounded-lg shadow-lg overflow-hidden z-50 text-xs">
              <div className="p-3 border-b border-[#E7E5E4] dark:border-[#292524] flex items-center justify-between bg-[#FAF9F6] dark:bg-[#1C1917]">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#1C1917] dark:text-[#F5F5F4]">
                    Notifications
                  </span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#0F766E]/10 text-[#0F766E] dark:text-[#14B8A6] font-medium">
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-[11px] text-[#0F766E] dark:text-[#14B8A6] hover:underline"
                    >
                      Mark all as read
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    aria-label="Close notification panel"
                    className="text-[#78716C] hover:text-[#1C1917] dark:hover:text-[#F5F5F4]"
                  >
                    <X className="w-4 h-4 stroke-[1.5]" />
                  </button>
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-[#E7E5E4] dark:divide-[#292524]">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => toggleRead(n.id)}
                    className={`p-3 transition-colors cursor-pointer flex items-start gap-2.5 ${
                      n.read
                        ? "opacity-60 bg-transparent hover:bg-black/5 dark:hover:bg-white/5"
                        : "bg-[#0F766E]/[0.03] dark:bg-[#14B8A6]/[0.05] hover:bg-[#0F766E]/[0.06]"
                    }`}
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      {n.type === "scan_completed" && <CheckCircle2 className="w-4 h-4 text-[#0F766E] dark:text-[#14B8A6] stroke-[1.5]" />}
                      {n.type === "bug_confirmed" && <AlertTriangle className="w-4 h-4 text-[#EF4444] stroke-[1.5]" />}
                      {n.type === "patch_verified" && <CheckCircle2 className="w-4 h-4 text-[#10B981] stroke-[1.5]" />}
                      {n.type === "review_needed" && <GitBranch className="w-4 h-4 text-[#F59E0B] stroke-[1.5]" />}
                    </div>

                    <div className="flex-1 space-y-0.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-[#1C1917] dark:text-[#F5F5F4]">{n.title}</span>
                        <span className="text-[#A8A29E] font-mono text-[10px]">{n.timestamp}</span>
                      </div>
                      <p className="text-[11px] text-[#78716C] dark:text-[#A8A29E] leading-relaxed">
                        {n.body}
                      </p>
                    </div>

                    {!n.read && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0F766E] dark:bg-[#14B8A6] mt-1.5 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
