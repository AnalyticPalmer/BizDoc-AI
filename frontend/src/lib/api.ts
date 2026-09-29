/**
 * BizDoctor AI API client.
 *
 * Centralizes communication between the Next.js frontend
 * and the FastAPI backend.
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://127.0.0.1:8000/api/v1";

/* -------------------------------------------------------------------------- */
/* Currency                                                                    */
/* -------------------------------------------------------------------------- */

export type CurrencyCode =
  | "NGN"
  | "USD"
  | "GBP"
  | "EUR"
  | "ZAR"
  | "GHS"
  | "KES";

export const DEFAULT_CURRENCY: CurrencyCode = "NGN";

export const CURRENCY_OPTIONS: {
  code: CurrencyCode;
  label: string;
  symbol: string;
  name: string;
}[] = [
  {
    code: "NGN",
    label: "Nigerian Naira",
    name: "Nigerian Naira",
    symbol: "₦",
  },
  {
    code: "USD",
    label: "US Dollar",
    name: "US Dollar",
    symbol: "$",
  },
  {
    code: "GBP",
    label: "British Pound",
    name: "British Pound",
    symbol: "£",
  },
  {
    code: "EUR",
    label: "Euro",
    name: "Euro",
    symbol: "€",
  },
  {
    code: "ZAR",
    label: "South African Rand",
    name: "South African Rand",
    symbol: "R",
  },
  {
    code: "GHS",
    label: "Ghanaian Cedi",
    name: "Ghanaian Cedi",
    symbol: "₵",
  },
  {
    code: "KES",
    label: "Kenyan Shilling",
    name: "Kenyan Shilling",
    symbol: "KSh",
  },
];

export function getCurrencySymbol(currency: CurrencyCode): string {
  return (
    CURRENCY_OPTIONS.find((option) => option.code === currency)?.symbol ??
    "₦"
  );
}

/* -------------------------------------------------------------------------- */
/* Dataset                                                                     */
/* -------------------------------------------------------------------------- */

export interface ColumnMapping {
  original_column: string;
  canonical_field: string | null;
  confidence: number;
  match_type: string;
}

export interface MappingSummary {
  mapped_columns: number;
  unmapped_columns: number;
  coverage_percent: number;
}

export interface DatasetInspectionResponse {
  dataset_id: string;
  filename: string;
  file_type: string;
  sheet_name: string | null;
  available_sheets: string[];
  row_count: number;
  column_count: number;
  columns: string[];
  completeness_percent: number;
  mapping_summary: MappingSummary;
  column_mappings: ColumnMapping[];
  preview: Record<string, unknown>[];
}

/* -------------------------------------------------------------------------- */
/* Analysis types                                                              */
/* -------------------------------------------------------------------------- */

export type AnalysisType =
  | "sales"
  | "customer"
  | "churn"
  | "profitability"
  | "inventory"
  | "expiry"
  | "forecast"
  | "full_report";

/* -------------------------------------------------------------------------- */
/* Sales                                                                       */
/* -------------------------------------------------------------------------- */

export interface BusinessMetric {
  value: number;
  formatted: string;
}

export interface CustomerTopCustomer {
  customer: string | null;
  revenue: number;
  revenue_percentage: number;
}

export interface CustomerConcentration {
  top_1_percent: number;
  top_5_percent: number;
  top_10_percent: number;
  top_20_percent: number;
  level: string;
}

export interface CustomerRecord {
  customer: string;
  revenue: number;
  revenue_percentage: number;
  orders: number;
  average_order_value: number;
  customer_type?: string;
}

export interface CustomerAnalysis {
  available: boolean;
  total_customers: number;
  repeat_customers: number;
  one_time_customers: number;
  top_customer: CustomerTopCustomer;
  concentration: CustomerConcentration;
  customers: CustomerRecord[];
  warnings: string[];
}

export interface TopProduct {
  product: string;
  revenue: number;

  /**
   * Formatted revenue returned by the backend.
   *
   * `formatted` is kept because the dashboard currently
   * consumes this property.
   */
  formatted?: string;

  /**
   * Newer backend naming.
   */
  formatted_revenue?: string;

  units_sold: number;
  revenue_percentage: number;
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;

  /**
   * Formatted revenue consumed by the dashboard.
   */
  formatted?: string;

  /**
   * Newer backend naming.
   */
  formatted_revenue?: string;
}

export interface SalesAnalysisResponse {
  revenue: BusinessMetric;
  orders: BusinessMetric;
  units_sold: BusinessMetric;
  average_order_value: BusinessMetric;
  transaction_date_min: string | null;
  transaction_date_max: string | null;
  currency: CurrencyCode;
  top_products: TopProduct[];
  monthly_revenue: MonthlyRevenue[];
  customer_analysis: CustomerAnalysis;
  warnings: string[];
}

/* -------------------------------------------------------------------------- */
/* Profitability                                                               */
/* -------------------------------------------------------------------------- */

export interface ProfitabilityMetric {
  value: number;
  formatted: string;
}

export interface ProfitabilityMargin {
  value: number;
  formatted: string;
}

export interface ProfitabilityProduct {
  product: string;
  revenue: number;
  cost: number;
  profit: number;

  /**
   * Decimal margin, e.g. 0.25 = 25%.
   */
  margin: number;

  /**
   * Percentage margin used by the dashboard.
   *
   * Kept alongside `margin` for compatibility with the
   * existing backend/dashboard response structure.
   */
  margin_percentage?: number;

  units_sold?: number;
}

export interface ProfitabilityAnalysis {
  available: boolean;
  total_revenue: ProfitabilityMetric;
  total_cost: ProfitabilityMetric;
  gross_profit: ProfitabilityMetric;
  profit_margin: ProfitabilityMargin;
  products: ProfitabilityProduct[];
  low_profit_products: ProfitabilityProduct[];
  loss_making_products: ProfitabilityProduct[];
  warnings: string[];
}

export interface ProfitabilityAnalysisResponse {
  profitability: ProfitabilityAnalysis;
}

/* -------------------------------------------------------------------------- */
/* Inventory                                                                   */
/* -------------------------------------------------------------------------- */

export interface InventoryProduct {
  product: string;
  current_stock: number;
  units_sold: number;
  daily_velocity: number;
  days_remaining: number | null;
  target_stock: number;
  recommended_reorder: number;
  risk: string;
}

export interface InventoryAnalysis {
  available: boolean;
  total_products: number;
  total_current_stock: number;
  total_units_sold: number;
  analysis_days: number | null;
  average_daily_velocity: number;
  average_days_remaining: number | null;
  out_of_stock_count: number;
  critical_stock_count: number;
  high_risk_count: number;
  moderate_risk_count: number;
  low_stock_products: InventoryProduct[];
  products: InventoryProduct[];
  warnings: string[];
}

export interface InventoryAnalysisResponse {
  inventory: InventoryAnalysis;
}

/* -------------------------------------------------------------------------- */
/* Expiry                                                                      */
/* -------------------------------------------------------------------------- */

export interface ExpiryProduct {
  product: string;
  expiry_date: string;
  days_until_expiry: number;
  stock_quantity: number;
  batch_number: string | null;
  supplier: string | null;
  status: string;
}

export interface ExpiryAnalysis {
  available: boolean;
  total_products: number;
  expired_count: number;
  critical_count: number;
  warning_count: number;
  total_stock_at_risk: number;
  expired_stock: number;
  critical_stock: number;
  warning_stock: number;
  products: ExpiryProduct[];
  expired_products: ExpiryProduct[];
  critical_products: ExpiryProduct[];
  warning_products: ExpiryProduct[];
  warnings: string[];
}

export interface ExpiryAnalysisResponse {
  expiry: ExpiryAnalysis;
}

/* -------------------------------------------------------------------------- */
/* Generic analysis request                                                    */
/* -------------------------------------------------------------------------- */

export interface AnalyzeDatasetRequest {
  /**
   * Both naming conventions are supported for compatibility.
   */
  analysis_type?: string;
  analysisType?: string;

  /**
   * Both naming conventions are supported for compatibility.
   */
  dataset_id?: string;
  datasetId?: string;

  mappings: ColumnMapping[];
  currency?: CurrencyCode;
}

export type ApiResponse =
  | SalesAnalysisResponse
  | ProfitabilityAnalysisResponse
  | InventoryAnalysisResponse
  | ExpiryAnalysisResponse;

/* -------------------------------------------------------------------------- */
/* API Error                                                                   */
/* -------------------------------------------------------------------------- */

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);

    this.name = "ApiError";
    this.status = status;
    this.detail = detail;

    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/* -------------------------------------------------------------------------- */
/* Response helper                                                             */
/* -------------------------------------------------------------------------- */

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";

  let data: unknown;

  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    let detail = `Request failed with status ${response.status}.`;

    if (
      typeof data === "object" &&
      data !== null &&
      "detail" in data &&
      typeof data.detail === "string"
    ) {
      detail = data.detail;
    } else if (typeof data === "string" && data.trim()) {
      detail = data;
    }

    throw new ApiError(response.status, detail);
  }

  return data as T;
}

function buildUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

/* -------------------------------------------------------------------------- */
/* Health                                                                      */
/* -------------------------------------------------------------------------- */

export async function checkHealth(): Promise<{
  status: string;
}> {
  const response = await fetch(buildUrl("/health"), {
    method: "GET",
    cache: "no-store",
  });

  return parseResponse<{ status: string }>(response);
}

/* -------------------------------------------------------------------------- */
/* Dataset inspection                                                          */
/* -------------------------------------------------------------------------- */

export async function inspectDataset(
  file: File,
  sheetName?: string,
): Promise<DatasetInspectionResponse> {
  const formData = new FormData();

  formData.append("file", file);

  if (sheetName) {
    formData.append("sheet_name", sheetName);
  }

  const response = await fetch(buildUrl("/data/inspect"), {
    method: "POST",
    body: formData,
  });

  return parseResponse<DatasetInspectionResponse>(response);
}

/* -------------------------------------------------------------------------- */
/* Generic analysis                                                            */
/* -------------------------------------------------------------------------- */

export async function analyzeDataset(
  request: AnalyzeDatasetRequest,
): Promise<ApiResponse> {
  const analysisType =
    request.analysis_type ??
    request.analysisType ??
    "";

  const datasetId =
    request.dataset_id ??
    request.datasetId ??
    "";

  const formData = new FormData();

  formData.append("analysis_type", analysisType);
  formData.append("dataset_id", datasetId);
  formData.append(
    "mappings",
    JSON.stringify(request.mappings),
  );

  formData.append(
    "currency",
    request.currency ?? DEFAULT_CURRENCY,
  );

  const response = await fetch(buildUrl("/analysis/analyze"), {
    method: "POST",
    body: formData,
  });

  return parseResponse<ApiResponse>(response);
}

/* -------------------------------------------------------------------------- */
/* Sales                                                                       */
/* -------------------------------------------------------------------------- */

export async function analyzeSales(
  datasetId: string,
  mappings: ColumnMapping[],
  currency: CurrencyCode = DEFAULT_CURRENCY,
): Promise<SalesAnalysisResponse> {
  const result = await analyzeDataset({
    analysis_type: "sales",
    dataset_id: datasetId,
    mappings,
    currency,
  });

  if (!("revenue" in result)) {
    throw new ApiError(
      500,
      "The API returned an unexpected sales analysis response.",
    );
  }

  return result;
}

/* -------------------------------------------------------------------------- */
/* Customer                                                                    */
/* -------------------------------------------------------------------------- */

export async function analyzeCustomer(
  datasetId: string,
  mappings: ColumnMapping[],
  currency: CurrencyCode = DEFAULT_CURRENCY,
): Promise<SalesAnalysisResponse> {
  const result = await analyzeDataset({
    analysis_type: "customer",
    dataset_id: datasetId,
    mappings,
    currency,
  });

  if (!("customer_analysis" in result)) {
    throw new ApiError(
      500,
      "The API returned an unexpected customer analysis response.",
    );
  }

  return result;
}

/* -------------------------------------------------------------------------- */
/* Profitability                                                               */
/* -------------------------------------------------------------------------- */

export async function analyzeProfitability(
  datasetId: string,
  mappings: ColumnMapping[],
  currency: CurrencyCode = DEFAULT_CURRENCY,
): Promise<ProfitabilityAnalysisResponse> {
  const result = await analyzeDataset({
    analysis_type: "profitability",
    dataset_id: datasetId,
    mappings,
    currency,
  });

  if (!("profitability" in result)) {
    throw new ApiError(
      500,
      "The API returned an unexpected profitability analysis response.",
    );
  }

  return result;
}

/* -------------------------------------------------------------------------- */
/* Inventory                                                                   */
/* -------------------------------------------------------------------------- */

export async function analyzeInventory(
  datasetId: string,
  mappings: ColumnMapping[],
): Promise<InventoryAnalysisResponse> {
  const result = await analyzeDataset({
    analysis_type: "inventory",
    dataset_id: datasetId,
    mappings,
  });

  if (!("inventory" in result)) {
    throw new ApiError(
      500,
      "The API returned an unexpected inventory analysis response.",
    );
  }

  return result;
}

/* -------------------------------------------------------------------------- */
/* Expiry                                                                      */
/* -------------------------------------------------------------------------- */

export async function analyzeExpiry(
  datasetId: string,
  mappings: ColumnMapping[],
): Promise<ExpiryAnalysisResponse> {
  const result = await analyzeDataset({
    analysis_type: "expiry",
    dataset_id: datasetId,
    mappings,
  });

  if (!("expiry" in result)) {
    throw new ApiError(
      500,
      "The API returned an unexpected expiry analysis response.",
    );
  }

  return result;
}