"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutGrid,
  FolderGit2,
  Upload,
  Bug,
  FileCode2,
  History,
  Settings,
  Search,
  Bell,
  CheckCircle2,
  AlertTriangle,
  GitBranch,
  X,
  LogOut,
  Shield,
  ArrowRight,
  Radio
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { AuthManager, AuthUser } from "@/lib/auth";
import { getAuthProvider } from "@/lib/authProvider";
import { PushClient } from "@/lib/pushClient";

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

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/projects", label: "Projects", icon: FolderGit2 },
  { href: "/projects/new", label: "Upload", icon: Upload },
  { href: "/bugs", label: "Bugs", icon: Bug },
  { href: "/patches", label: "Patches", icon: FileCode2 },
  { href: "/history", label: "History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [pushStatus, setPushStatus] = useState<string>("");
  const [pushSending, setPushSending] = useState<boolean>(false);

  useEffect(() => {
    getAuthProvider().getSession().then(setUser);
    const unsubscribe = getAuthProvider().onAuthStateChange(setUser);
    // Fetch live notifications if available
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";
    fetch(`${apiBase}/notifications`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setNotifications(
            data.map((item: any) => ({
              id: item.id,
              type: item.type || "scan_completed",
              title: item.title,
              body: item.body,
              timestamp: item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now",
              read: item.read ?? false,
            }))
          );
        }
      })
      .catch(() => {
        // Fallback silently to initial mock notifications
      });
  }, [pathname]);

  // Keyboard shortcut Cmd/Ctrl + K for search modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setNotifOpen(false);
        setUserMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const toggleRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n))
    );
  };

  const handleSignOut = async () => {
    try {
      await getAuthProvider().signOut();
    } catch (e) {}
    AuthManager.clearSession();
    setUser(null);
    setUserMenuOpen(false);
    router.push("/login");
  };

  const searchableLinks = [
    { title: "Dashboard Control Room", desc: "Overview of bugs, patches & verification pulse", href: "/dashboard" },
    { title: "Upload Code Workspace", desc: "Upload source files, scripts, or directories", href: "/projects/new?tab=code" },
    { title: "Upload Dataset Workspace", desc: "Upload CSV, JSON, SQL or tabular datasets", href: "/projects/new?tab=dataset" },
    { title: "Paste Code or Stack Trace", desc: "Direct code snippet or runtime error crash log", href: "/projects/new?tab=paste" },
    { title: "Projects & Testbeds", desc: "All user uploads and active repositories", href: "/projects" },
    { title: "Active Bugs Queue", desc: "Reproducible defects across all targets", href: "/bugs" },
    { title: "Review Patches", desc: "Inspect candidate diffs and proof bundles", href: "/patches" },
    { title: "Python Marks Calculator", desc: "Demo project #1 with V4 Proven defect fix", href: "/projects/demo-proj-001" },
    { title: "Defect: Missing bounds validation", desc: "calculator.py negative marks vulnerability", href: "/bugs/demo-bug-001" },
    { title: "Patch: Bounds precondition assertion", desc: "V4 Candidate #1 passing 14 regression tests", href: "/patches/demo-patch-001" },
    { title: "Settings & System Quotas", desc: "Configure LLM provider, mock mode, and limits", href: "/settings" }
  ];

  const filteredLinks = searchQuery.trim()
    ? searchableLinks.filter(
        (item) =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.desc.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : searchableLinks;

  return (
    <>
      <header className="sticky top-0 z-40 w-full px-4 sm:px-6 py-2.5 bg-white/70 dark:bg-[#0C0A09]/70 backdrop-blur-md border-b border-black/5 dark:border-white/5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Left: Brand Identity */}
          <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
            <div className="w-8 h-8 rounded-xl bg-[#0F766E] dark:bg-[#14B8A6] flex items-center justify-center text-white dark:text-[#0C0A09] font-bold shadow-xs transition-transform group-hover:scale-105">
              <Shield className="w-4 h-4 stroke-[2]" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm tracking-tight text-[#1C1917] dark:text-[#F5F5F4] group-hover:text-[#0F766E] dark:group-hover:text-[#14B8A6] transition-colors">
                AutoPatch
              </span>
              <span className="text-[10px] font-mono text-[#78716C] dark:text-[#A8A29E] -mt-1 hidden sm:inline">
                Autonomous Repair
              </span>
            </div>
          </Link>

          {/* Center: Compact Centered Pill Navigation Dock (Reference Aesthetic) */}
          <nav
            aria-label="Primary Navigation"
            className="hidden md:flex items-center p-1 bg-white/80 dark:bg-[#1C1917]/80 backdrop-blur-md rounded-full border border-black/5 dark:border-white/10 shadow-xs"
          >
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : item.href === "/projects/new"
                  ? pathname === "/projects/new"
                  : pathname === item.href || (item.href !== "/projects" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  aria-label={item.label}
                  className={`flex items-center transition-all ${
                    isActive
                      ? "gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-[#292524] text-[#0F766E] dark:text-[#14B8A6] font-semibold text-xs shadow-xs"
                      : "p-1.5 rounded-full text-[#78716C] dark:text-[#A8A29E] hover:text-[#1C1917] dark:hover:text-[#F5F5F4] hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-4 h-4 stroke-[1.5]" />
                  {isActive && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          {/* Right: Utility Controls */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Search Button (Cmd/Ctrl + K) */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search AutoPatch workspace (Ctrl+K)"
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#57534E] dark:text-[#D6D3D1] hover:bg-black/5 dark:hover:bg-white/5 border border-black/5 dark:border-white/10 transition-colors"
            >
              <Search className="w-4 h-4 stroke-[1.5]" />
            </button>

            {/* Dark / Light Theme Toggle */}
            <ThemeToggle />

            {/* Notification Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotifOpen(!notifOpen);
                  setUserMenuOpen(false);
                }}
                aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "View notifications"}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#57534E] dark:text-[#D6D3D1] hover:bg-black/5 dark:hover:bg-white/5 relative border border-black/5 dark:border-white/10 transition-colors"
              >
                <Bell className="w-4 h-4 stroke-[1.5]" aria-hidden="true" />
                {unreadCount > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#0F766E] dark:bg-[#14B8A6] text-white dark:text-[#0C0A09] text-[9px] font-mono font-bold flex items-center justify-center shadow-xs"
                  >
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popover Dropdown */}
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-[#141210] border border-[#E7E5E4] dark:border-[#292524] rounded-2xl shadow-xl overflow-hidden z-50 text-xs">
                  <div className="p-3 border-b border-[#E7E5E4] dark:border-[#292524] flex items-center justify-between bg-[#FAF9F6] dark:bg-[#1C1917]">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#1C1917] dark:text-[#F5F5F4]">
                        Notifications
                      </span>
                      {unreadCount > 0 && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-[#0F766E]/10 text-[#0F766E] dark:text-[#14B8A6] font-medium">
                          {unreadCount} unread
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={markAllAsRead}
                          className="text-[11px] text-[#0F766E] dark:text-[#14B8A6] hover:underline"
                        >
                          Mark all as read
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setNotifOpen(false)}
                        aria-label="Close notification panel"
                        className="text-[#57534E] dark:text-[#D6D3D1] hover:text-[#1C1917] dark:hover:text-[#F5F5F4]"
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
                          {n.type === "scan_completed" && <CheckCircle2 className="w-4 h-4 text-[#047857] dark:text-[#34D399] stroke-[1.5]" />}
                          {n.type === "bug_confirmed" && <AlertTriangle className="w-4 h-4 text-[#DC2626] stroke-[1.5]" />}
                          {n.type === "patch_verified" && <CheckCircle2 className="w-4 h-4 text-[#047857] dark:text-[#34D399] stroke-[1.5]" />}
                          {n.type === "review_needed" && <GitBranch className="w-4 h-4 text-[#B45309] dark:text-[#FBBF24] stroke-[1.5]" />}
                        </div>

                        <div className="flex-1 space-y-0.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-[#1C1917] dark:text-[#F5F5F4]">{n.title}</span>
                            <span className="text-[#57534E] dark:text-[#D6D3D1] font-mono text-[10px]">{n.timestamp}</span>
                          </div>
                          <p className="text-[11px] text-[#57534E] dark:text-[#D6D3D1] leading-relaxed">
                            {n.body}
                          </p>
                        </div>

                        {!n.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#0F766E] dark:bg-[#14B8A6] mt-1.5 flex-shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Push Notification Controls Footer */}
                  <div className="p-2.5 bg-[#FAF9F6] dark:bg-[#1C1917] border-t border-[#E7E5E4] dark:border-[#292524] flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        setPushSending(true);
                        const res = await PushClient.requestAndRegister();
                        if (res.permission === "granted") {
                          setPushStatus("Web Push Connected");
                        } else {
                          setPushStatus(res.permission);
                        }
                        setPushSending(false);
                      }}
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium bg-white dark:bg-[#292524] border border-[#E7E5E4] dark:border-[#38332E] text-[#1C1917] dark:text-[#F5F5F4] hover:border-[#0F766E] transition-all"
                    >
                      <Radio className="w-3 h-3 text-[#0F766E] dark:text-[#14B8A6]" />
                      <span>{pushStatus || "Enable Push"}</span>
                    </button>

                    <button
                      type="button"
                      disabled={pushSending}
                      onClick={async () => {
                        setPushSending(true);
                        await PushClient.sendTestAlert();
                        setPushSending(false);
                      }}
                      className="px-2 py-1 rounded-md text-[11px] font-medium bg-[#0F766E] text-white hover:bg-[#0D655E] transition-colors disabled:opacity-50"
                    >
                      Send Test Alert
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Circular User Avatar & Menu */}
            <div className="relative">
              {user ? (
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(!userMenuOpen);
                    setNotifOpen(false);
                  }}
                  aria-label="User account menu"
                  className="w-8 h-8 rounded-full bg-[#0F766E] text-white flex items-center justify-center text-xs font-bold shadow-xs hover:ring-2 hover:ring-[#0F766E]/20 transition-all"
                >
                  {(user.name || user.fullName || "D").charAt(0).toUpperCase()}
                </button>
              ) : (
                <Link
                  href="/login"
                  className="px-3.5 py-1 rounded-full bg-[#0F766E] dark:bg-[#14B8A6] text-white dark:text-[#0C0A09] text-xs font-semibold hover:bg-[#115E59] dark:hover:bg-[#0D9488] transition-colors"
                >
                  Sign In
                </Link>
              )}

              {/* User Menu Dropdown */}
              {userMenuOpen && user && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#141210] border border-[#E7E5E4] dark:border-[#292524] rounded-2xl shadow-xl overflow-hidden z-50 text-xs">
                  <div className="p-3 border-b border-[#E7E5E4] dark:border-[#292524] bg-[#FAF9F6] dark:bg-[#1C1917]">
                    <div className="font-semibold text-[#1C1917] dark:text-[#F5F5F4]">{user.name || user.fullName}</div>
                    <div className="text-[11px] font-mono text-[#57534E] dark:text-[#D6D3D1] truncate">{user.email}</div>
                    <div className="mt-1.5 inline-block text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#0F766E]/10 text-[#0F766E] dark:text-[#14B8A6] font-semibold uppercase">
                      {user.role}
                    </div>
                  </div>
                  <div className="p-1 space-y-0.5">
                    <Link
                      href="/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[#1C1917] dark:text-[#F5F5F4] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                      <Settings className="w-3.5 h-3.5 stroke-[1.5]" />
                      <span>Account Settings</span>
                    </Link>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[#DC2626] hover:bg-[#DC2626]/10 transition-colors text-left"
                    >
                      <LogOut className="w-3.5 h-3.5 stroke-[1.5]" />
                      <span>Sign Out</span>
                    </button>
                  </div>

                  {/* Push Notification Controls Footer */}
                  <div className="p-2.5 bg-[#FAF9F6] dark:bg-[#1C1917] border-t border-[#E7E5E4] dark:border-[#292524] flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        setPushSending(true);
                        const res = await PushClient.requestAndRegister();
                        if (res.permission === "granted") {
                          setPushStatus("Web Push Connected");
                        } else {
                          setPushStatus(res.permission);
                        }
                        setPushSending(false);
                      }}
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium bg-white dark:bg-[#292524] border border-[#E7E5E4] dark:border-[#38332E] text-[#1C1917] dark:text-[#F5F5F4] hover:border-[#0F766E] transition-all"
                    >
                      <Radio className="w-3 h-3 text-[#0F766E] dark:text-[#14B8A6]" />
                      <span>{pushStatus || "Enable Push"}</span>
                    </button>

                    <button
                      type="button"
                      disabled={pushSending}
                      onClick={async () => {
                        setPushSending(true);
                        await PushClient.sendTestAlert();
                        setPushSending(false);
                      }}
                      className="px-2 py-1 rounded-md text-[11px] font-medium bg-[#0F766E] text-white hover:bg-[#0D655E] transition-colors disabled:opacity-50"
                    >
                      Send Test Alert
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation Dock */}
        <div className="md:hidden flex items-center justify-around gap-1 pt-2 mt-2 border-t border-[#E7E5E4] dark:border-[#292524] overflow-x-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname === item.href || (item.href !== "/projects" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded text-[10px] ${
                  isActive
                    ? "text-[#0F766E] dark:text-[#14B8A6] font-bold"
                    : "text-[#57534E] dark:text-[#D6D3D1]"
                }`}
              >
                <Icon className="w-4 h-4 stroke-[1.5]" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </header>

      {/* Global Cmd+K Search Command Modal */}
      {searchOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Search AutoPatch workspace"
          className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-[#141210] border border-[#E7E5E4] dark:border-[#292524] rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 border-b border-[#E7E5E4] dark:border-[#292524] flex items-center gap-2">
              <Search className="w-4 h-4 text-[#57534E] dark:text-[#D6D3D1]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type a command, route, or target (e.g., calculator, upload, patch)..."
                autoFocus
                className="flex-1 bg-transparent text-sm text-[#1C1917] dark:text-[#F5F5F4] placeholder-[#57534E] dark:placeholder-[#D6D3D1] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="text-xs text-[#57534E] dark:text-[#D6D3D1] hover:text-[#1C1917] dark:hover:text-[#F5F5F4]"
              >
                ESC
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto p-2 space-y-1 text-xs">
              {filteredLinks.length === 0 ? (
                <div className="p-4 text-center text-[#57534E] dark:text-[#D6D3D1]">
                  No matching items found.
                </div>
              ) : (
                filteredLinks.map((item, idx) => (
                  <Link
                    key={idx}
                    href={item.href}
                    onClick={() => setSearchOpen(false)}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-[#F5F5F4] dark:hover:bg-[#1C1917] transition-colors group"
                  >
                    <div>
                      <div className="font-semibold text-[#1C1917] dark:text-[#F5F5F4] group-hover:text-[#0F766E] dark:group-hover:text-[#14B8A6]">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-[#57534E] dark:text-[#D6D3D1]">{item.desc}</div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-[#57534E] dark:text-[#D6D3D1] group-hover:text-[#0F766E] dark:group-hover:text-[#14B8A6]" />
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
