"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  LayoutDashboard, Map, BookOpen, Car, Users,
  CreditCard, BarChart2, Bell, Settings,
  Shield, MessageSquare, Layers, LogOut,
  Truck, ExternalLink, Headphones, Gift,
} from "lucide-react";

const NAV = [
  { href: "/dashboard",               icon: LayoutDashboard, label: "Overview" },
  { href: "/dashboard/map",           icon: Map,             label: "Live Map" },
  { href: "/dashboard/bookings",      icon: BookOpen,        label: "Bookings" },
  { href: "/dashboard/drivers",       icon: Car,             label: "Drivers" },
  { href: "/dashboard/users",         icon: Users,           label: "Riders" },
  { href: "/dashboard/payments",      icon: CreditCard,      label: "Payments" },
  { href: "/dashboard/referrals",     icon: Gift,             label: "Referrals" },
  { href: "/dashboard/analytics",     icon: BarChart2,       label: "Analytics" },
  { href: "/dashboard/notifications", icon: Bell,            label: "Notifications" },
  { href: "/dashboard/services",      icon: Layers,          label: "Services" },
  { href: "/dashboard/support",       icon: MessageSquare,   label: "Support" },
  { href: "/dashboard/audit",         icon: Shield,          label: "Audit Log" },
  { href: "/dashboard/settings",      icon: Settings,        label: "Settings" },
];

const PAGE_TITLES: Record<string, string> = {
  "/dashboard":               "Overview",
  "/dashboard/map":           "Live Map",
  "/dashboard/bookings":      "Bookings",
  "/dashboard/drivers":       "Drivers",
  "/dashboard/users":         "Riders",
  "/dashboard/payments":      "Payments",
  "/dashboard/referrals":     "Referrals",
  "/dashboard/analytics":     "Analytics",
  "/dashboard/notifications": "Notifications",
  "/dashboard/services":      "Services",
  "/dashboard/support":       "Support",
  "/dashboard/audit":         "Audit Log",
  "/dashboard/settings":      "Settings",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("access_token")) {
      router.push("/");
    }
  }, []);

  const logout = () => {
    localStorage.removeItem("access_token");
    router.push("/");
  };

  const getTitle = () => {
    if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
    if (pathname.startsWith("/dashboard/drivers/")) return "Driver Detail";
    return "Dashboard";
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="w-60 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col fixed left-0 top-0 h-screen z-20">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-black text-sm">G</span>
            </div>
            <div>
              <span className="text-gray-900 font-bold text-base tracking-tight">bogie</span>
              <div className="mt-0.5">
                <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded-full tracking-wider uppercase">
                  Master Panel
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active =
              href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "bg-orange-50 text-orange-500 border-l-[3px] border-orange-500 pl-[9px]"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon size={17} className="flex-shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="px-3 py-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              A
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-900 truncate">Admin</p>
              <p className="text-[11px] text-gray-400">Master Access</p>
            </div>
          </div>
          {/* Sub Panels */}
          <div className="px-3 mb-2">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-1.5">Sub Panels</p>

            <a
              href="https://gogoo-cab-panel-production.up.railway.app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-orange-50 group mb-1 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Car size={13} className="text-orange-500" />
                </div>
                <span className="text-sm font-medium text-gray-600 group-hover:text-orange-600">Cab Panel</span>
              </div>
              <ExternalLink size={11} className="text-gray-400 group-hover:text-orange-400" />
            </a>

            <a
              href="https://gogoo-truck-panel-production.up.railway.app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-blue-50 group mb-1 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Truck size={13} className="text-blue-500" />
                </div>
                <span className="text-sm font-medium text-gray-600 group-hover:text-blue-600">Truck Panel</span>
              </div>
              <ExternalLink size={11} className="text-gray-400 group-hover:text-blue-400" />
            </a>

            <a
              href="https://gogoo-ambulance-panel-production.up.railway.app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-red-50 group mb-1 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-red-100 flex items-center justify-center">
                  <span className="text-xs">🚑</span>
                </div>
                <span className="text-sm font-medium text-gray-600 group-hover:text-red-600">Ambulance Panel</span>
              </div>
              <ExternalLink size={11} className="text-gray-400 group-hover:text-red-400" />
            </a>

            <a
              href="https://gogoo-support-panel-production.up.railway.app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-purple-50 group mb-1 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Headphones size={14} className="text-purple-500" />
                </div>
                <span className="text-sm font-medium text-gray-600 group-hover:text-purple-600">
                  Support Panel
                </span>
              </div>
              <ExternalLink size={12} className="text-gray-400 group-hover:text-purple-400" />
            </a>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 transition font-medium"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────── */}
      <div className="ml-60 flex-1 flex flex-col min-h-screen">
        {/* Sticky top header */}
        <header className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <h1 className="text-base font-bold text-gray-900">{getTitle()}</h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 border border-green-100 px-3 py-1.5 rounded-full font-semibold">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Live
            </div>
            <button className="relative p-2 hover:bg-gray-50 rounded-xl transition">
              <Bell size={18} className="text-gray-400" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>
          </div>
        </header>

        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
