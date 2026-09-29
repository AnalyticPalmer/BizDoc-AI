"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  Boxes,
  ChevronLeft,
  FileBarChart,
  Home,
  Menu,
  PackageSearch,
  Settings,
  Sparkles,
  Upload,
  Users,
  X,
} from "lucide-react";

const navigationItems = [
  {
    label: "Overview",
    href: "/",
    icon: Home,
  },
  {
    label: "Upload Data",
    href: "/upload",
    icon: Upload,
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: BarChart3,
  },
  {
    label: "Customers",
    href: "/analytics",
    icon: Users,
  },
  {
    label: "Products",
    href: "/analytics",
    icon: PackageSearch,
  },
  {
    label: "Inventory",
    href: "/analytics",
    icon: Boxes,
  },
  {
    label: "Reports",
    href: "/dashboard",
    icon: FileBarChart,
  },
];

export default function AppNavigation() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }

    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile header */}
      <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
        <Link
          href="/"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-2"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white">
            <Sparkles className="h-4 w-4" />
          </div>

          <div>
            <p className="text-sm font-bold text-slate-950">
              BizDoctor AI
            </p>
            <p className="text-[10px] text-slate-500">
              Business Intelligence
            </p>
          </div>
        </Link>

        <button
          type="button"
          onClick={() => setMobileOpen((value) => !value)}
          className="rounded-lg p-2 text-slate-700 hover:bg-slate-100"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </header>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/30 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          "fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-slate-200 bg-white transition-all duration-200",
          collapsed ? "w-20" : "w-64",
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        {/* Brand */}
        <div
          className={[
            "flex h-20 items-center border-b border-slate-200",
            collapsed ? "justify-center px-3" : "px-5",
          ].join(" ")}
        >
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>

            {!collapsed && (
              <div>
                <p className="text-base font-bold tracking-tight text-slate-950">
                  BizDoctor AI
                </p>
                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                  Business Intelligence
                </p>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <p
            className={[
              "mb-3 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400",
              collapsed ? "text-center" : "",
            ].join(" ")}
          >
            {!collapsed && "Workspace"}
          </p>

          <div className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  title={collapsed ? item.label : undefined}
                  className={[
                    "flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition",
                    collapsed ? "justify-center" : "gap-3",
                    active
                      ? "bg-slate-950 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                  ].join(" ")}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />

                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Bottom actions */}
        <div className="border-t border-slate-200 p-3">
          {!collapsed && (
            <Link
              href="/analytics"
              onClick={() => setMobileOpen(false)}
              className="mb-2 flex items-center gap-3 rounded-xl bg-slate-950 px-3 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <Sparkles className="h-[18px] w-[18px]" />
              Open Analytics
            </Link>
          )}

          <button
            type="button"
            title={collapsed ? "Settings" : undefined}
            className={[
              "flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950",
              collapsed ? "justify-center" : "gap-3",
            ].join(" ")}
          >
            <Settings className="h-[18px] w-[18px]" />

            {!collapsed && <span>Settings</span>}
          </button>

          {/* Collapse button — desktop only */}
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className="mt-2 hidden w-full items-center justify-center rounded-xl border border-slate-200 py-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950 lg:flex"
            title={collapsed ? "Expand menu" : "Collapse menu"}
          >
            <ChevronLeft
              className={[
                "h-4 w-4 transition-transform",
                collapsed ? "rotate-180" : "",
              ].join(" ")}
            />
          </button>
        </div>
      </aside>
    </>
  );
}
