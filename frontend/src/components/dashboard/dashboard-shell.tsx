"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Bot,
  Boxes,
  ChevronRight,
  CircleDollarSign,
  FileText,
  LayoutDashboard,
  Menu,
  PackageSearch,
  Settings,
  Sparkles,
  TrendingUp,
  Upload,
  Users,
  X,
} from "lucide-react";

import ApiStatus from "@/components/api-status";

type NavItem = {
  label: string;
  icon: LucideIcon;
  active?: boolean;
};

type MetricCardProps = {
  label: string;
  value: string;
  change: string;
  icon: LucideIcon;
};

type AlertCardProps = {
  title: string;
  description: string;
  type: "warning" | "danger" | "success";
};

const navigation: NavItem[] = [
  {
    label: "Overview",
    icon: LayoutDashboard,
    active: true,
  },
  {
    label: "Sales Analytics",
    icon: BarChart3,
  },
  {
    label: "Customers",
    icon: Users,
  },
  {
    label: "Products",
    icon: PackageSearch,
  },
  {
    label: "Inventory",
    icon: Boxes,
  },
  {
    label: "Forecasts",
    icon: TrendingUp,
  },
  {
    label: "Ask BizDoctor",
    icon: Bot,
  },
  {
    label: "Reports",
    icon: FileText,
  },
];

export default function DashboardShell() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F6F8FB] text-[#101828]">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[272px] border-r border-[#E4E7EC] bg-white lg:flex">
        <Sidebar />
      </aside>

      {/* Mobile sidebar */}
      {mobileMenuOpen && (
        <>
          <button
            type="button"
            aria-label="Close navigation overlay"
            className="fixed inset-0 z-40 bg-[#101828]/30 backdrop-blur-[1px] lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />

          <aside className="fixed inset-y-0 left-0 z-50 flex w-[286px] bg-white shadow-2xl lg:hidden">
            <button
              type="button"
              aria-label="Close menu"
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl border border-[#E4E7EC] bg-white text-[#475467]"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X size={18} />
            </button>

            <Sidebar />
          </aside>
        </>
      )}

      <div className="lg:pl-[272px]">
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b border-[#E4E7EC] bg-white/95 backdrop-blur">
          <div className="flex h-[72px] items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Open navigation"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E4E7EC] text-[#475467] lg:hidden"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu size={20} />
              </button>

              <div>
                <p className="text-sm font-semibold text-[#101828]">
                  Business Overview
                </p>
                <p className="hidden text-xs text-[#667085] sm:block">
                  Demo workspace
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Notifications"
                className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#E4E7EC] text-[#475467] transition hover:bg-[#F9FAFB]"
              >
                <Bell size={18} />

                <span className="absolute right-[9px] top-[8px] h-2 w-2 rounded-full border-2 border-white bg-[#3157F6]" />
              </button>

              <div className="flex items-center gap-3 border-l border-[#E4E7EC] pl-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#182230] text-sm font-semibold text-white">
                  DB
                </div>

                <div className="hidden sm:block">
                  <p className="text-sm font-semibold text-[#101828]">
                    Demo Business
                  </p>
                  <p className="text-xs text-[#667085]">Administrator</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main dashboard */}
        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-[1500px]">
            {/* Page heading */}
            <section className="mb-7 flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
              <div>
                <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-[#D0D5DD] bg-white px-2.5 py-1 text-xs font-medium text-[#475467]">
                  <Sparkles size={12} />
                  AI Business Intelligence
                </div>

                <h1 className="max-w-3xl text-2xl font-semibold tracking-[-0.035em] text-[#101828] sm:text-3xl">
                  Here&apos;s how your business is performing.
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#667085] sm:text-base">
                  Turn your sales, customer and inventory data into clear
                  decisions and actionable insights.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[#D0D5DD] bg-white px-4 text-sm font-semibold text-[#344054] shadow-sm transition hover:bg-[#F9FAFB]"
                >
                  <Upload size={17} />
                  Upload data
                </button>

                <button
                  type="button"
                  className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#3157F6] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2949D9]"
                >
                  <Bot size={17} />
                  Ask BizDoctor
                </button>
              </div>
            </section>

            {/* Health overview */}
            <section className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
              <div className="rounded-2xl border border-[#E4E7EC] bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.03)] sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-[#667085]">
                      Business Health
                    </p>

                    <div className="mt-3 flex items-end gap-2">
                      <span className="text-5xl font-semibold tracking-[-0.055em] text-[#101828]">
                        74
                      </span>

                      <span className="pb-1.5 text-lg font-medium text-[#98A2B3]">
                        /100
                      </span>
                    </div>
                  </div>

                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ECFDF3] text-[#039855]">
                    <Activity size={23} />
                  </div>
                </div>

                <div className="mt-6 h-2 overflow-hidden rounded-full bg-[#EAECF0]">
                  <div className="h-full w-[74%] rounded-full bg-[#12B76A]" />
                </div>

                <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#344054]">
                      Good business health
                    </p>

                    <p className="mt-1 text-sm text-[#667085]">
                      Three areas currently require attention.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="flex items-center gap-1 text-sm font-semibold text-[#3157F6]"
                  >
                    View analysis
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* AI insight */}
              <div className="relative overflow-hidden rounded-2xl bg-[#182230] p-6 text-white shadow-sm sm:p-7">
                <div className="absolute right-[-80px] top-[-100px] h-64 w-64 rounded-full bg-[#3157F6]/20 blur-3xl" />

                <div className="relative">
                  <div className="flex items-start justify-between gap-5">
                    <div>
                      <p className="text-sm font-medium text-white/60">
                        BizDoctor Insight
                      </p>

                      <h2 className="mt-3 max-w-md text-xl font-semibold tracking-[-0.025em]">
                        Your strongest opportunity is inventory optimization.
                      </h2>
                    </div>

                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10">
                      <Sparkles size={20} />
                    </div>
                  </div>

                  <p className="mt-4 max-w-xl text-sm leading-6 text-white/65">
                    Several high-demand products are approaching low stock while
                    capital remains tied up in slower-moving inventory.
                  </p>

                  <button
                    type="button"
                    className="mt-6 flex items-center gap-2 text-sm font-semibold text-white"
                  >
                    Explore recommendation
                    <ArrowUpRight size={16} />
                  </button>
                </div>
              </div>
            </section>

            {/* KPI cards */}
            <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Total Revenue"
                value="₦18.42M"
                change="+14.2%"
                icon={CircleDollarSign}
              />

              <MetricCard
                label="Customers"
                value="1,284"
                change="+5.4%"
                icon={Users}
              />

              <MetricCard
                label="Orders"
                value="4,719"
                change="+8.7%"
                icon={Boxes}
              />

              <MetricCard
                label="Average Order"
                value="₦3,903"
                change="+4.1%"
                icon={TrendingUp}
              />
            </section>

            {/* Analytics and alerts */}
            <section className="mt-4 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
              <div className="rounded-2xl border border-[#E4E7EC] bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div>
                    <h2 className="text-base font-semibold text-[#101828]">
                      Revenue Overview
                    </h2>

                    <p className="mt-1 text-sm text-[#667085]">
                      Revenue performance across your business
                    </p>
                  </div>

                  <select
                    aria-label="Revenue period"
                    className="rounded-lg border border-[#D0D5DD] bg-white px-3 py-2 text-sm text-[#344054] outline-none"
                  >
                    <option>12 months</option>
                    <option>6 months</option>
                    <option>3 months</option>
                  </select>
                </div>

                <div className="mt-8 flex h-[285px] items-center justify-center rounded-xl border border-dashed border-[#D0D5DD] bg-[#FCFCFD]">
                  <div className="max-w-xs text-center">
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#3157F6]">
                      <BarChart3 size={21} />
                    </div>

                    <p className="mt-3 text-sm font-semibold text-[#344054]">
                      Revenue analytics
                    </p>

                    <p className="mt-1 text-xs leading-5 text-[#667085]">
                      Your interactive revenue chart will appear here after
                      business data is uploaded.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#E4E7EC] bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-[#101828]">
                      Business Alerts
                    </h2>

                    <p className="mt-1 text-sm text-[#667085]">
                      Areas requiring your attention
                    </p>
                  </div>

                  <span className="rounded-full bg-[#FEF3F2] px-2.5 py-1 text-xs font-semibold text-[#B42318]">
                    3 issues
                  </span>
                </div>

                <div className="mt-6 space-y-3">
                  <AlertCard
                    title="Inventory risk"
                    description="₦684,200 may be tied up in slow-moving products."
                    type="warning"
                  />

                  <AlertCard
                    title="Customer risk"
                    description="23 previously active customers show declining purchasing activity."
                    type="danger"
                  />

                  <AlertCard
                    title="Stock opportunity"
                    description="4 high-demand products may require restocking soon."
                    type="success"
                  />
                </div>

                <button
                  type="button"
                  className="mt-5 flex items-center gap-2 text-sm font-semibold text-[#3157F6]"
                >
                  View all insights
                  <ArrowRight size={15} />
                </button>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

function Sidebar() {
  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex h-[72px] items-center border-b border-[#E4E7EC] px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3157F6] text-white shadow-sm">
            <Activity size={21} />
          </div>

          <div>
            <p className="text-[17px] font-bold tracking-[-0.035em] text-[#101828]">
              BizDoctor
            </p>

            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#98A2B3]">
              AI Business Health
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-5">
        <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.09em] text-[#98A2B3]">
          Workspace
        </p>

        <div className="space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.label}
                type="button"
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                  item.active
                    ? "bg-[#EEF2FF] text-[#3157F6]"
                    : "text-[#475467] hover:bg-[#F9FAFB] hover:text-[#101828]"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-[#E4E7EC] p-4">
        <div className="mb-3">
          <ApiStatus />
        </div>

        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#475467] transition hover:bg-[#F9FAFB]"
        >
          <Settings size={18} />
          Settings
        </button>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  change,
  icon: Icon,
}: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-[#E4E7EC] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F2F4F7] text-[#475467]">
          <Icon size={19} />
        </div>

        <span className="flex items-center gap-1 rounded-full bg-[#ECFDF3] px-2 py-1 text-xs font-semibold text-[#027A48]">
          <TrendingUp size={12} />
          {change}
        </span>
      </div>

      <p className="mt-5 text-sm font-medium text-[#667085]">{label}</p>

      <p className="mt-1 text-2xl font-semibold tracking-[-0.035em] text-[#101828]">
        {value}
      </p>
    </div>
  );
}

function AlertCard({
  title,
  description,
  type,
}: AlertCardProps) {
  const styles = {
    warning: {
      container: "bg-[#FFFAEB]",
      icon: "bg-[#FEF0C7] text-[#DC6803]",
    },
    danger: {
      container: "bg-[#FEF3F2]",
      icon: "bg-[#FEE4E2] text-[#D92D20]",
    },
    success: {
      container: "bg-[#ECFDF3]",
      icon: "bg-[#D1FADF] text-[#039855]",
    },
  };

  const currentStyle = styles[type];

  return (
    <div className={`rounded-xl p-4 ${currentStyle.container}`}>
      <div className="flex gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${currentStyle.icon}`}
        >
          <AlertTriangle size={17} />
        </div>

        <div>
          <p className="text-sm font-semibold text-[#344054]">{title}</p>

          <p className="mt-1 text-xs leading-5 text-[#667085]">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}