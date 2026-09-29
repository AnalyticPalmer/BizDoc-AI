"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  CURRENCY_OPTIONS,
  DEFAULT_CURRENCY,
  getCurrencySymbol,
  type AnalysisType,
  type CurrencyCode,
  type ExpiryAnalysisResponse,
  type InventoryAnalysisResponse,
  type ProfitabilityAnalysisResponse,
  type SalesAnalysisResponse,
} from "@/lib/api";

type DashboardResult =
  | SalesAnalysisResponse
  | ProfitabilityAnalysisResponse
  | InventoryAnalysisResponse
  | ExpiryAnalysisResponse;

interface DashboardSession {
  analysisType: AnalysisType;
  datasetId: string;
  result: DashboardResult;
  filename?: string;
  rowCount?: number;
  columnCount?: number;
  currency?: CurrencyCode;
}

const ANALYSIS_LABELS: Record<AnalysisType, string> = {
  sales: "Sales Performance",
  customer: "Customer Intelligence",
  churn: "Customer Churn",
  profitability: "Profitability",
  inventory: "Inventory Intelligence",
  expiry: "Expiry Intelligence",
  forecast: "Sales Forecast",
  full_report: "Business Report",
};

function isCurrencyCode(value: unknown): value is CurrencyCode {
  return CURRENCY_OPTIONS.some((option) => option.code === value);
}

function readDashboardSession(): DashboardSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = sessionStorage.getItem(
    "bizdoctor-dashboard-session",
  );

  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as DashboardSession;
  } catch {
    return null;
  }
}

function getSessionCurrency(
  session: DashboardSession,
): CurrencyCode {
  if (isCurrencyCode(session.currency)) {
    return session.currency;
  }

  if (typeof window !== "undefined") {
    const storedCurrency = sessionStorage.getItem(
      "bizdoctor-currency",
    );

    if (isCurrencyCode(storedCurrency)) {
      return storedCurrency;
    }
  }

  return DEFAULT_CURRENCY;
}

function formatNumber(value: number | undefined): string {
  return new Intl.NumberFormat("en-NG").format(value ?? 0);
}

function formatCurrency(
  value: number | undefined,
  currency: CurrencyCode,
): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function formatPercentage(value: number | undefined): string {
  return `${(value ?? 0).toFixed(1)}%`;
}

function isSalesResult(
  result: DashboardResult,
): result is SalesAnalysisResponse {
  return "revenue" in result && "orders" in result;
}

function isProfitabilityResult(
  result: DashboardResult,
): result is ProfitabilityAnalysisResponse {
  return "profitability" in result;
}

function isInventoryResult(
  result: DashboardResult,
): result is InventoryAnalysisResponse {
  return "inventory" in result;
}

function isExpiryResult(
  result: DashboardResult,
): result is ExpiryAnalysisResponse {
  return "expiry" in result;
}

function MetricCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
        {value}
      </p>

      {description ? (
        <p className="mt-1 text-xs text-slate-400">
          {description}
        </p>
      ) : null}
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
        {eyebrow}
      </p>

      <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
        {title}
      </h2>

      <p className="mt-1 text-sm text-slate-500">
        {description}
      </p>
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <span className="text-xl">—</span>
      </div>

      <h3 className="text-base font-semibold text-slate-900">
        {title}
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Sales Report                                                               */
/* -------------------------------------------------------------------------- */

function SalesReport({
  result,
  currency,
}: {
  result: SalesAnalysisResponse;
  currency: CurrencyCode;
}) {
  return (
    <div className="space-y-8">
      <section>
        <SectionHeader
          eyebrow="Revenue"
          title="Sales Performance"
          description="A summary of the sales activity detected in your uploaded dataset."
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Total Revenue"
            value={result.revenue.formatted}
          />

          <MetricCard
            label="Orders"
            value={result.orders.formatted}
          />

          <MetricCard
            label="Units Sold"
            value={result.units_sold.formatted}
          />

          <MetricCard
            label="Average Order Value"
            value={result.average_order_value.formatted}
          />
        </div>
      </section>

      {result.transaction_date_min ||
      result.transaction_date_max ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Analysis period
          </p>

          <p className="mt-2 text-sm font-semibold text-slate-900">
            {result.transaction_date_min ?? "Unknown"}

            <span className="mx-2 text-slate-300">
              →
            </span>

            {result.transaction_date_max ?? "Unknown"}
          </p>
        </div>
      ) : null}

      {result.top_products?.length > 0 ? (
        <section>
          <SectionHeader
            eyebrow="Products"
            title="Top Products"
            description="Products generating the highest revenue in the analyzed dataset."
          />

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-5 py-4 font-semibold text-slate-600">
                      Product
                    </th>

                    <th className="px-5 py-4 font-semibold text-slate-600">
                      Revenue
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {result.top_products.map(
                    (product, index) => (
                      <tr
                        key={`${product.product}-${index}`}
                      >
                        <td className="px-5 py-4 font-medium text-slate-900">
                          {product.product}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {product.formatted ??
                            formatCurrency(
                              product.revenue,
                              currency,
                            )}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      {result.monthly_revenue?.length > 0 ? (
        <section>
          <SectionHeader
            eyebrow="Trend"
            title="Monthly Revenue"
            description="Revenue grouped by month across the available transaction history."
          />

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-5 py-4 font-semibold text-slate-600">
                      Month
                    </th>

                    <th className="px-5 py-4 font-semibold text-slate-600">
                      Revenue
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {result.monthly_revenue.map(
                    (item, index) => (
                      <tr
                        key={`${item.month}-${index}`}
                      >
                        <td className="px-5 py-4 font-medium text-slate-900">
                          {item.month}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {item.formatted ??
                            formatCurrency(
                              item.revenue,
                              currency,
                            )}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Customer Report                                                            */
/* -------------------------------------------------------------------------- */

function CustomerReport({
  result,
  currency,
}: {
  result: SalesAnalysisResponse;
  currency: CurrencyCode;
}) {
  const customer = result.customer_analysis;

  if (!customer?.available) {
    return (
      <EmptyState
        title="Customer analysis is unavailable"
        description="The uploaded dataset does not contain enough customer information to perform customer intelligence analysis."
      />
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <SectionHeader
          eyebrow="Customers"
          title="Customer Intelligence"
          description="Understand repeat purchasing behavior and how concentrated your revenue is across customers."
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Total Customers"
            value={formatNumber(
              customer.total_customers,
            )}
          />

          <MetricCard
            label="Repeat Customers"
            value={formatNumber(
              customer.repeat_customers,
            )}
          />

          <MetricCard
            label="One-Time Customers"
            value={formatNumber(
              customer.one_time_customers,
            )}
          />

          <MetricCard
            label="Top Customer Revenue"
            value={formatCurrency(
              customer.top_customer.revenue,
              currency,
            )}
          />
        </div>
      </section>

      <section>
        <SectionHeader
          eyebrow="Revenue Concentration"
          title="Customer Revenue Concentration"
          description="The percentage of total revenue generated by the largest customer groups."
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Top 1 Customer"
            value={formatPercentage(
              customer.concentration.top_1_percent,
            )}
          />

          <MetricCard
            label="Top 5 Customers"
            value={formatPercentage(
              customer.concentration.top_5_percent,
            )}
          />

          <MetricCard
            label="Top 10 Customers"
            value={formatPercentage(
              customer.concentration.top_10_percent,
            )}
          />

          <MetricCard
            label="Top 20 Customers"
            value={formatPercentage(
              customer.concentration.top_20_percent,
            )}
          />
        </div>
      </section>

      {customer.customers?.length > 0 ? (
        <section>
          <SectionHeader
            eyebrow="Customer Ranking"
            title="Top Customers"
            description="Customers ranked by revenue contribution."
          />

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-5 py-4 font-semibold text-slate-600">
                      Customer
                    </th>

                    <th className="px-5 py-4 font-semibold text-slate-600">
                      Revenue
                    </th>

                    <th className="px-5 py-4 font-semibold text-slate-600">
                      Revenue Share
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {customer.customers
                    .slice(0, 20)
                    .map((item, index) => (
                      <tr
                        key={`${item.customer}-${index}`}
                      >
                        <td className="px-5 py-4 font-medium text-slate-900">
                          {item.customer}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {formatCurrency(
                            item.revenue,
                            currency,
                          )}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {formatPercentage(
                            item.revenue_percentage,
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      {customer.warnings?.length > 0 ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h3 className="font-semibold text-amber-900">
            Business Warnings
          </h3>

          <ul className="mt-3 space-y-2 text-sm text-amber-800">
            {customer.warnings.map(
              (warning, index) => (
                <li key={index}>• {warning}</li>
              ),
            )}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Profitability Report                                                       */
/* -------------------------------------------------------------------------- */

function ProfitabilityReport({
  result,
  currency,
}: {
  result: ProfitabilityAnalysisResponse;
  currency: CurrencyCode;
}) {
  const profitability = result.profitability;

  if (!profitability.available) {
    return (
      <EmptyState
        title="Profitability analysis is unavailable"
        description="The dataset does not contain enough revenue and cost information to calculate profitability."
      />
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <SectionHeader
          eyebrow="Margins"
          title="Profitability"
          description="Understand revenue, costs and profit performance across your products."
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Total Revenue"
            value={profitability.total_revenue.formatted}
          />

          <MetricCard
            label="Total Cost"
            value={profitability.total_cost.formatted}
          />

          <MetricCard
            label="Gross Profit"
            value={profitability.gross_profit.formatted}
          />

          <MetricCard
            label="Profit Margin"
            value={profitability.profit_margin.formatted}
          />
        </div>
      </section>

      {profitability.products?.length > 0 ? (
        <section>
          <SectionHeader
            eyebrow="Product Economics"
            title="Product Profitability"
            description="Revenue, cost and profit performance by product."
          />

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-5 py-4 font-semibold text-slate-600">
                      Product
                    </th>

                    <th className="px-5 py-4 font-semibold text-slate-600">
                      Revenue
                    </th>

                    <th className="px-5 py-4 font-semibold text-slate-600">
                      Cost
                    </th>

                    <th className="px-5 py-4 font-semibold text-slate-600">
                      Profit
                    </th>

                    <th className="px-5 py-4 font-semibold text-slate-600">
                      Margin
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {profitability.products
                    .slice(0, 50)
                    .map((product, index) => (
                      <tr
                        key={`${product.product}-${index}`}
                      >
                        <td className="px-5 py-4 font-medium text-slate-900">
                          {product.product}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {formatCurrency(
                            product.revenue,
                            currency,
                          )}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {formatCurrency(
                            product.cost,
                            currency,
                          )}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {formatCurrency(
                            product.profit,
                            currency,
                          )}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {formatPercentage(
                            product.margin_percentage,
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      {profitability.low_profit_products?.length > 0 ? (
        <section>
          <SectionHeader
            eyebrow="Attention Required"
            title="Low-Profit Products"
            description="Products generating revenue but operating with relatively low margins."
          />

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {profitability.low_profit_products
              .slice(0, 12)
              .map((product, index) => (
                <div
                  key={`${product.product}-${index}`}
                  className="rounded-2xl border border-amber-200 bg-amber-50 p-5"
                >
                  <p className="font-semibold text-amber-950">
                    {product.product}
                  </p>

                  <p className="mt-3 text-sm text-amber-800">
                    Revenue:{" "}
                    {formatCurrency(
                      product.revenue,
                      currency,
                    )}
                  </p>

                  <p className="mt-1 text-sm text-amber-800">
                    Profit:{" "}
                    {formatCurrency(
                      product.profit,
                      currency,
                    )}
                  </p>

                  <p className="mt-1 text-sm text-amber-800">
                    Margin:{" "}
                    {formatPercentage(
                      product.margin_percentage,
                    )}
                  </p>
                </div>
              ))}
          </div>
        </section>
      ) : null}

      {profitability.loss_making_products?.length > 0 ? (
        <section>
          <SectionHeader
            eyebrow="Losses"
            title="Loss-Making Products"
            description="Products where the calculated cost exceeds revenue."
          />

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {profitability.loss_making_products
              .slice(0, 12)
              .map((product, index) => (
                <div
                  key={`${product.product}-${index}`}
                  className="rounded-2xl border border-red-200 bg-red-50 p-5"
                >
                  <p className="font-semibold text-red-950">
                    {product.product}
                  </p>

                  <p className="mt-3 text-sm text-red-800">
                    Revenue:{" "}
                    {formatCurrency(
                      product.revenue,
                      currency,
                    )}
                  </p>

                  <p className="mt-1 text-sm text-red-800">
                    Profit:{" "}
                    {formatCurrency(
                      product.profit,
                      currency,
                    )}
                  </p>
                </div>
              ))}
          </div>
        </section>
      ) : null}

      {profitability.warnings?.length > 0 ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h3 className="font-semibold text-amber-900">
            Business Warnings
          </h3>

          <ul className="mt-3 space-y-2 text-sm text-amber-800">
            {profitability.warnings.map(
              (warning, index) => (
                <li key={index}>• {warning}</li>
              ),
            )}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Inventory Report                                                           */
/* -------------------------------------------------------------------------- */

function InventoryReport({
  result,
}: {
  result: InventoryAnalysisResponse;
}) {
  const inventory = result.inventory;

  if (!inventory.available) {
    return (
      <EmptyState
        title="Inventory analysis is unavailable"
        description="The dataset does not contain enough product, stock and sales information to calculate inventory risk."
      />
    );
  }

  const atRiskProducts = inventory.low_stock_products ?? [];

  const reorderProducts = (inventory.products ?? [])
    .filter((product) => product.recommended_reorder > 0)
    .sort(
      (a, b) =>
        b.recommended_reorder - a.recommended_reorder,
    );

  const criticalProducts = (inventory.products ?? [])
    .filter(
      (product) =>
        product.risk === "critical" ||
        product.risk === "out_of_stock",
    )
    .sort((a, b) => {
      const aDays = a.days_remaining ?? -1;
      const bDays = b.days_remaining ?? -1;

      return aDays - bDays;
    });

  const totalRecommendedReorder = reorderProducts.reduce(
    (total, product) =>
      total + product.recommended_reorder,
    0,
  );

  const getRiskClasses = (risk: string) => {
    switch (risk) {
      case "out_of_stock":
        return "bg-red-100 text-red-700";

      case "critical":
        return "bg-red-50 text-red-700";

      case "high":
        return "bg-orange-50 text-orange-700";

      case "moderate":
        return "bg-amber-50 text-amber-700";

      case "low":
        return "bg-emerald-50 text-emerald-700";

      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  const formatRiskLabel = (risk: string) =>
    risk.replace("_", " ");

  return (
    <div className="space-y-8">
      <section>
        <SectionHeader
          eyebrow="Inventory"
          title="Inventory Intelligence"
          description="Understand current stock levels, sales velocity, stock-out risk and replenishment requirements."
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Products"
            value={formatNumber(
              inventory.total_products,
            )}
          />

          <MetricCard
            label="Current Stock"
            value={formatNumber(
              inventory.total_current_stock,
            )}
          />

          <MetricCard
            label="Units Sold"
            value={formatNumber(
              inventory.total_units_sold,
            )}
          />

          <MetricCard
            label="Avg. Days Remaining"
            value={
              inventory.average_days_remaining === null
                ? "N/A"
                : `${inventory.average_days_remaining.toFixed(
                    1,
                  )} days`
            }
          />
        </div>
      </section>

      <section>
        <SectionHeader
          eyebrow="Stock Risk"
          title="Inventory Risk Overview"
          description="Products grouped by their estimated stock-out risk."
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Out of Stock"
            value={formatNumber(
              inventory.out_of_stock_count,
            )}
          />

          <MetricCard
            label="Critical"
            value={formatNumber(
              inventory.critical_stock_count,
            )}
          />

          <MetricCard
            label="High Risk"
            value={formatNumber(
              inventory.high_risk_count,
            )}
          />

          <MetricCard
            label="Moderate Risk"
            value={formatNumber(
              inventory.moderate_risk_count,
            )}
          />
        </div>
      </section>

      <section>
        <SectionHeader
          eyebrow="Replenishment"
          title="Reorder Intelligence"
          description="Products that may need replenishment based on current stock and recent sales velocity."
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            label="Products to Reorder"
            value={formatNumber(
              reorderProducts.length,
            )}
          />

          <MetricCard
            label="Recommended Reorder Units"
            value={formatNumber(
              totalRecommendedReorder,
            )}
          />

          <MetricCard
            label="Target Coverage"
            value="30 days"
          />
        </div>
      </section>

      {criticalProducts.length > 0 ? (
        <section>
          <SectionHeader
            eyebrow="Immediate Attention"
            title="Products at Risk of Stock-Out"
            description="These products have the most urgent inventory risk based on their current sales velocity."
          />

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {criticalProducts
              .slice(0, 12)
              .map((product, index) => (
                <div
                  key={`${product.product}-${index}`}
                  className="rounded-2xl border border-red-200 bg-red-50 p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-red-950">
                        {product.product}
                      </p>

                      <p className="mt-1 text-xs capitalize text-red-700">
                        {formatRiskLabel(
                          product.risk,
                        )}
                      </p>
                    </div>

                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-red-700">
                      {product.days_remaining === null
                        ? "Unknown"
                        : `${product.days_remaining.toFixed(
                            1,
                          )} days`}
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-white p-3">
                      <p className="text-xs text-slate-500">
                        Current Stock
                      </p>

                      <p className="mt-1 font-semibold text-slate-900">
                        {formatNumber(
                          product.current_stock,
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl bg-white p-3">
                      <p className="text-xs text-slate-500">
                        Daily Velocity
                      </p>

                      <p className="mt-1 font-semibold text-slate-900">
                        {product.daily_velocity.toFixed(
                          2,
                        )}
                      </p>
                    </div>
                  </div>

                  {product.recommended_reorder > 0 ? (
                    <div className="mt-4 rounded-xl border border-red-200 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
                        Recommended Reorder
                      </p>

                      <p className="mt-1 text-2xl font-bold text-red-950">
                        {formatNumber(
                          product.recommended_reorder,
                        )}{" "}
                        units
                      </p>

                      <p className="mt-1 text-xs text-red-700">
                        Target stock:{" "}
                        {formatNumber(
                          product.target_stock,
                        )}{" "}
                        units
                      </p>
                    </div>
                  ) : null}
                </div>
              ))}
          </div>
        </section>
      ) : null}

      {reorderProducts.length > 0 ? (
        <section>
          <SectionHeader
            eyebrow="Action Plan"
            title="Replenishment Recommendations"
            description="Recommended reorder quantities based on a 30-day target stock coverage."
          />

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-5 py-4 font-semibold text-slate-600">
                      Product
                    </th>

                    <th className="px-5 py-4 font-semibold text-slate-600">
                      Current Stock
                    </th>

                    <th className="px-5 py-4 font-semibold text-slate-600">
                      Daily Velocity
                    </th>

                    <th className="px-5 py-4 font-semibold text-slate-600">
                      Days Remaining
                    </th>

                    <th className="px-5 py-4 font-semibold text-slate-600">
                      Target Stock
                    </th>

                    <th className="px-5 py-4 font-semibold text-slate-600">
                      Recommended Reorder
                    </th>

                    <th className="px-5 py-4 font-semibold text-slate-600">
                      Risk
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {reorderProducts
                    .slice(0, 50)
                    .map((product, index) => (
                      <tr
                        key={`${product.product}-${index}`}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-5 py-4 font-medium text-slate-900">
                          {product.product}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {formatNumber(
                            product.current_stock,
                          )}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {product.daily_velocity.toFixed(
                            2,
                          )}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {product.days_remaining === null
                            ? "N/A"
                            : `${product.days_remaining.toFixed(
                                1,
                              )} days`}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {formatNumber(
                            product.target_stock,
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span className="font-semibold text-emerald-700">
                            {formatNumber(
                              product.recommended_reorder,
                            )}{" "}
                            units
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${getRiskClasses(
                              product.risk,
                            )}`}
                          >
                            {formatRiskLabel(
                              product.risk,
                            )}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      {atRiskProducts.length > 0 ? (
        <section>
          <SectionHeader
            eyebrow="Inventory Monitoring"
            title="Products at Risk"
            description="Products with the shortest estimated time remaining before stock runs out."
          />

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-5 py-4 font-semibold text-slate-600">
                      Product
                    </th>

                    <th className="px-5 py-4 font-semibold text-slate-600">
                      Current Stock
                    </th>

                    <th className="px-5 py-4 font-semibold text-slate-600">
                      Daily Velocity
                    </th>

                    <th className="px-5 py-4 font-semibold text-slate-600">
                      Days Remaining
                    </th>

                    <th className="px-5 py-4 font-semibold text-slate-600">
                      Recommended Reorder
                    </th>

                    <th className="px-5 py-4 font-semibold text-slate-600">
                      Risk
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {atRiskProducts
                    .slice(0, 50)
                    .map((product, index) => (
                      <tr
                        key={`${product.product}-${index}`}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-5 py-4 font-medium text-slate-900">
                          {product.product}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {formatNumber(
                            product.current_stock,
                          )}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {product.daily_velocity.toFixed(
                            2,
                          )}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {product.days_remaining === null
                            ? "N/A"
                            : `${product.days_remaining.toFixed(
                                1,
                              )} days`}
                        </td>

                        <td className="px-5 py-4 font-medium text-emerald-700">
                          {product.recommended_reorder > 0
                            ? `${formatNumber(
                                product.recommended_reorder,
                              )} units`
                            : "No reorder"}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${getRiskClasses(
                              product.risk,
                            )}`}
                          >
                            {formatRiskLabel(
                              product.risk,
                            )}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      {inventory.warnings?.length > 0 ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h3 className="font-semibold text-amber-900">
            Inventory Warnings
          </h3>

          <ul className="mt-3 space-y-2 text-sm text-amber-800">
            {inventory.warnings.map(
              (warning, index) => (
                <li key={index}>• {warning}</li>
              ),
            )}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Expiry Report                                                              */
/* -------------------------------------------------------------------------- */

function ExpiryReport({
  result,
}: {
  result: ExpiryAnalysisResponse;
}) {
  const expiry = result.expiry;

  if (!expiry.available) {
    return (
      <EmptyState
        title="Expiry analysis is unavailable"
        description="The dataset does not contain enough product expiry information to perform expiry intelligence."
      />
    );
  }

  const getStatusClasses = (status: string) => {
    switch (status) {
      case "expired":
        return "bg-red-100 text-red-700";

      case "critical":
        return "bg-orange-100 text-orange-700";

      case "warning":
        return "bg-amber-100 text-amber-700";

      case "safe":
        return "bg-emerald-100 text-emerald-700";

      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  const formatStatusLabel = (status: string) =>
    status.replace("_", " ");

  const riskProducts = [
    ...(expiry.expired_products ?? []),
    ...(expiry.critical_products ?? []),
    ...(expiry.warning_products ?? []),
  ];

  return (
    <div className="space-y-8">
      {/* ------------------------------------------------------------------ */}
      {/* Expiry Overview                                                     */}
      {/* ------------------------------------------------------------------ */}

      <section>
        <SectionHeader
          eyebrow="Inventory Risk"
          title="Expiry Intelligence"
          description="Identify products that have expired or are approaching their expiry dates so your business can act before stock becomes a loss."
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Products Monitored"
            value={formatNumber(
              expiry.total_products,
            )}
          />

          <MetricCard
            label="Expired"
            value={formatNumber(
              expiry.expired_count,
            )}
          />

          <MetricCard
            label="Critical"
            value={formatNumber(
              expiry.critical_count,
            )}
          />

          <MetricCard
            label="Warning"
            value={formatNumber(
              expiry.warning_count,
            )}
          />
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Stock Exposure                                                      */}
      {/* ------------------------------------------------------------------ */}

      <section>
        <SectionHeader
          eyebrow="Stock Exposure"
          title="Inventory at Risk of Expiry"
          description="Stock quantities associated with products that are already expired or approaching expiry."
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Total Stock at Risk"
            value={formatNumber(
              expiry.total_stock_at_risk,
            )}
          />

          <MetricCard
            label="Expired Stock"
            value={formatNumber(
              expiry.expired_stock,
            )}
          />

          <MetricCard
            label="Critical Stock"
            value={formatNumber(
              expiry.critical_stock,
            )}
          />

          <MetricCard
            label="Warning Stock"
            value={formatNumber(
              expiry.warning_stock,
            )}
          />
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Urgent Products                                                     */}
      {/* ------------------------------------------------------------------ */}

      {riskProducts.length > 0 ? (
        <section>
          <SectionHeader
            eyebrow="Action Required"
            title="Products Requiring Attention"
            description="Products sorted by expiry risk, starting with stock that has already expired."
          />

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {riskProducts
              .slice(0, 12)
              .map((product, index) => (
                <div
                  key={`${product.product}-${product.expiry_date}-${index}`}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-950">
                        {product.product}
                      </p>

                      {product.batch_number ? (
                        <p className="mt-1 text-xs text-slate-500">
                          Batch: {product.batch_number}
                        </p>
                      ) : null}
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusClasses(
                        product.status,
                      )}`}
                    >
                      {formatStatusLabel(
                        product.status,
                      )}
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">
                        Expiry Date
                      </p>

                      <p className="mt-1 font-semibold text-slate-900">
                        {product.expiry_date}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">
                        Stock
                      </p>

                      <p className="mt-1 font-semibold text-slate-900">
                        {formatNumber(
                          product.stock_quantity,
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Time to Expiry
                    </p>

                    <p className="mt-1 text-2xl font-bold text-slate-950">
                      {product.days_until_expiry < 0
                        ? `${Math.abs(
                            product.days_until_expiry,
                          )} days overdue`
                        : product.days_until_expiry === 0
                          ? "Expires today"
                          : `${product.days_until_expiry} days`}
                    </p>
                  </div>

                  {product.supplier ? (
                    <p className="mt-4 text-xs text-slate-500">
                      Supplier:{" "}
                      <span className="font-medium text-slate-700">
                        {product.supplier}
                      </span>
                    </p>
                  ) : null}
                </div>
              ))}
          </div>
        </section>
      ) : (
        <EmptyState
          title="No products are currently at expiry risk"
          description="No expired, critical or warning products were detected in the analyzed dataset."
        />
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Expiry Monitoring Table                                             */}
      {/* ------------------------------------------------------------------ */}

      {expiry.products?.length > 0 ? (
        <section>
          <SectionHeader
            eyebrow="Expiry Monitoring"
            title="Expiry Schedule"
            description="A detailed view of the products and expiry dates detected in your dataset."
          />

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-5 py-4 font-semibold text-slate-600">
                      Product
                    </th>

                    <th className="px-5 py-4 font-semibold text-slate-600">
                      Expiry Date
                    </th>

                    <th className="px-5 py-4 font-semibold text-slate-600">
                      Days Remaining
                    </th>

                    <th className="px-5 py-4 font-semibold text-slate-600">
                      Stock
                    </th>

                    <th className="px-5 py-4 font-semibold text-slate-600">
                      Batch
                    </th>

                    <th className="px-5 py-4 font-semibold text-slate-600">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {expiry.products
                    .slice(0, 100)
                    .map((product, index) => (
                      <tr
                        key={`${product.product}-${product.expiry_date}-${index}`}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-5 py-4 font-medium text-slate-900">
                          {product.product}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {product.expiry_date}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {product.days_until_expiry < 0
                            ? `${Math.abs(
                                product.days_until_expiry,
                              )} overdue`
                            : product.days_until_expiry ===
                                0
                              ? "Today"
                              : `${product.days_until_expiry} days`}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {formatNumber(
                            product.stock_quantity,
                          )}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {product.batch_number ?? "—"}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusClasses(
                              product.status,
                            )}`}
                          >
                            {formatStatusLabel(
                              product.status,
                            )}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------------------ */}
      {/* Expiry Warnings                                                     */}
      {/* ------------------------------------------------------------------ */}

      {expiry.warnings?.length > 0 ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h3 className="font-semibold text-amber-900">
            Expiry Warnings
          </h3>

          <ul className="mt-3 space-y-2 text-sm text-amber-800">
            {expiry.warnings.map(
              (warning, index) => (
                <li key={index}>• {warning}</li>
              ),
            )}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Future Reports                                                             */
/* -------------------------------------------------------------------------- */

function FutureReport({
  analysisType,
}: {
  analysisType: AnalysisType;
}) {
  const labels: Record<string, string> = {
    churn: "Customer Churn",
    forecast: "Sales Forecast",
    full_report: "Full Business Report",
  };

  const label =
    labels[analysisType] ??
    ANALYSIS_LABELS[analysisType];

  return (
    <EmptyState
      title={`${label} is coming next`}
      description="The analysis workflow is already prepared. This report will be connected to its dedicated backend analysis next."
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Dashboard Page                                                             */
/* -------------------------------------------------------------------------- */

export default function DashboardPage() {
  const router = useRouter();

  const [session] = useState<DashboardSession | null>(
    readDashboardSession,
  );

  const [currency] = useState<CurrencyCode>(() => {
    const dashboardSession = readDashboardSession();

    if (!dashboardSession) {
      return DEFAULT_CURRENCY;
    }

    return getSessionCurrency(dashboardSession);
  });

  useEffect(() => {
    if (!session) {
      router.replace("/analytics");
    }
  }, [router, session]);

  if (!session) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <p className="text-sm text-slate-500">
              Loading dashboard…
            </p>
          </div>
        </div>
      </main>
    );
  }

  const title =
    ANALYSIS_LABELS[session.analysisType] ??
    "Business Analysis";

  const currencyOption = CURRENCY_OPTIONS.find(
    (option) => option.code === currency,
  );

  const currencyName =
    currencyOption?.name ??
    `${currency} (${getCurrencySymbol(currency)})`;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <header className="mb-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <button
                type="button"
                onClick={() => router.push("/analytics")}
                className="mb-4 text-sm font-medium text-emerald-600 transition hover:text-emerald-700"
              >
                ← Back to Analytics
              </button>

              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
                BizDoctor AI
              </p>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                {title}
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                {session.filename
                  ? `Analysis generated from ${session.filename}.`
                  : "Analysis generated from your uploaded business dataset."}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                Display Currency
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-900">
                {currencyName}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                {getCurrencySymbol(currency)} display
                formatting
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {session.rowCount !== undefined ? (
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600">
                {formatNumber(session.rowCount)} rows
              </span>
            ) : null}

            {session.columnCount !== undefined ? (
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600">
                {formatNumber(
                  session.columnCount,
                )}{" "}
                columns
              </span>
            ) : null}

            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium capitalize text-emerald-700">
              {session.analysisType.replace(
                "_",
                " ",
              )}
            </span>
          </div>
        </header>

        {isSalesResult(session.result) &&
        session.analysisType === "sales" ? (
          <SalesReport
            result={session.result}
            currency={currency}
          />
        ) : null}

        {isSalesResult(session.result) &&
        session.analysisType === "customer" ? (
          <CustomerReport
            result={session.result}
            currency={currency}
          />
        ) : null}

        {isProfitabilityResult(session.result) &&
        session.analysisType === "profitability" ? (
          <ProfitabilityReport
            result={session.result}
            currency={currency}
          />
        ) : null}

        {isInventoryResult(session.result) &&
        session.analysisType === "inventory" ? (
          <InventoryReport
            result={session.result}
          />
        ) : null}

        {isExpiryResult(session.result) &&
        session.analysisType === "expiry" ? (
          <ExpiryReport
            result={session.result}
          />
        ) : null}

        {![
          "sales",
          "customer",
          "profitability",
          "inventory",
          "expiry",
        ].includes(session.analysisType) ? (
          <FutureReport
            analysisType={session.analysisType}
          />
        ) : null}
      </div>
    </main>
  );
}