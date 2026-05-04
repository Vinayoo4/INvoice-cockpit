"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/invoices", label: "Invoices", icon: "🧾" },
  { href: "/customers", label: "Customers", icon: "👥" },
  { href: "/payments", label: "Payments", icon: "💰" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, business, logout } = useAuth();

  return (
    <aside className="w-56 shrink-0 flex flex-col bg-slate-900 border-r border-slate-800 min-h-screen">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-slate-800">
        <span className="text-lg font-bold text-white">🧾 Cockpit</span>
        {business && (
          <p className="text-xs text-slate-400 mt-0.5 truncate">{business.name}</p>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {NAV.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-slate-800">
        <p className="text-xs text-slate-500 truncate mb-2">{user?.email}</p>
        <button
          onClick={logout}
          className="w-full text-left text-xs text-slate-500 hover:text-red-400 transition-colors"
        >
          Sign out →
        </button>
      </div>
    </aside>
  );
}
