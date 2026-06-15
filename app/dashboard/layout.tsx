"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: "⬡" },
  { href: "/dashboard/bookings", label: "Bookings", icon: "🗺" },
    { href: "/dashboard/map",       label: "Live Map",  icon: "🗺"  },

  { href: "/dashboard/drivers", label: "Drivers", icon: "🚗" },
  { href: "/dashboard/users", label: "Riders", icon: "👤" },
  { href: "/dashboard/payments", label: "Payments", icon: "₹" },
  { href: "/dashboard/analytics",     label: "Analytics",     icon: "📊" },
  { href: "/dashboard/notifications", label: "Notifications",  icon: "🔔" },
  { href: "/dashboard/settings",      label: "Settings",       icon: "⚙" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!localStorage.getItem("access_token")) router.push("/");
  }, []);

  const logout = () => {
    localStorage.removeItem("access_token");
    router.push("/");
  };

  return (
    <div className="flex h-screen bg-[#0F0F0F] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-[#0F0F0F] border-r border-[#1E1E1E] flex flex-col">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-[#1E1E1E]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#FF6B2B] flex items-center justify-center">
              <span className="text-white font-black text-sm">G</span>
            </div>
            <span className="text-white font-bold text-lg tracking-tight">gogoo</span>
          </div>
          <p className="text-[#444] text-xs mt-1">Operations</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map(item => {
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                  active
                    ? "bg-[#FF6B2B]/10 text-[#FF6B2B] font-medium"
                    : "text-[#888] hover:text-white hover:bg-[#1A1A1A]"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-[#1E1E1E]">
          <button onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#888] hover:text-red-400 hover:bg-[#1A1A1A] transition"
          >
            <span>↩</span> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
