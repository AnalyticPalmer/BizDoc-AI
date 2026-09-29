from typing import Any

from pydantic import BaseModel, Field


class BusinessMetric(BaseModel):
    value: float
    formatted: str


class CustomerTopCustomer(BaseModel):
    customer: str | None = None
    revenue: float = 0.0
    revenue_percentage: float = 0.0


class CustomerConcentration(BaseModel):
    top_1_percent: float = 0.0
    top_5_percent: float = 0.0
    top_10_percent: float = 0.0
    top_20_percent: float = 0.0
    level: str = "unavailable"


class CustomerAnalysis(BaseModel):
    available: bool = False
    total_customers: int = 0
    repeat_customers: int = 0
    one_time_customers: int = 0
    top_customer: CustomerTopCustomer = Field(
        default_factory=CustomerTopCustomer
    )
    concentration: CustomerConcentration = Field(
        default_factory=CustomerConcentration
    )
    customers: list[dict[str, Any]] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class SalesAnalysisResponse(BaseModel):
    revenue: BusinessMetric
    orders: BusinessMetric
    units_sold: BusinessMetric
    average_order_value: BusinessMetric
    transaction_date_min: str | None = None
    transaction_date_max: str | None = None
    currency: str = "NGN"
    top_products: list[dict[str, Any]] = Field(default_factory=list)
    monthly_revenue: list[dict[str, Any]] = Field(default_factory=list)
    customer_analysis: CustomerAnalysis = Field(
        default_factory=CustomerAnalysis
    )
    warnings: list[str] = Field(default_factory=list)


class ProfitabilityMetric(BaseModel):
    value: float = 0.0
    formatted: str = "₦0.00"


class ProfitabilityMargin(BaseModel):
    value: float = 0.0
    formatted: str = "0.00%"


class ProfitabilityAnalysis(BaseModel):
    available: bool = False
    total_revenue: ProfitabilityMetric = Field(
        default_factory=ProfitabilityMetric
    )
    total_cost: ProfitabilityMetric = Field(
        default_factory=ProfitabilityMetric
    )
    gross_profit: ProfitabilityMetric = Field(
        default_factory=ProfitabilityMetric
    )
    profit_margin: ProfitabilityMargin = Field(
        default_factory=ProfitabilityMargin
    )
    products: list[dict[str, Any]] = Field(default_factory=list)
    low_profit_products: list[dict[str, Any]] = Field(
        default_factory=list
    )
    loss_making_products: list[dict[str, Any]] = Field(
        default_factory=list
    )
    warnings: list[str] = Field(default_factory=list)


class ProfitabilityAnalysisResponse(BaseModel):
    profitability: ProfitabilityAnalysis = Field(
        default_factory=ProfitabilityAnalysis
    )


class InventoryProduct(BaseModel):
    product: str
    current_stock: float = 0.0
    units_sold: float = 0.0
    daily_velocity: float = 0.0
    days_remaining: float | None = None
    target_stock: float = 0.0
    recommended_reorder: float = 0.0
    risk: str = "unknown"


class InventoryAnalysis(BaseModel):
    available: bool = False
    total_products: int = 0
    total_current_stock: float = 0.0
    total_units_sold: float = 0.0
    analysis_days: int | None = None
    average_daily_velocity: float = 0.0
    average_days_remaining: float | None = None
    out_of_stock_count: int = 0
    critical_stock_count: int = 0
    high_risk_count: int = 0
    moderate_risk_count: int = 0
    low_stock_products: list[InventoryProduct] = Field(
        default_factory=list
    )
    products: list[InventoryProduct] = Field(
        default_factory=list
    )
    warnings: list[str] = Field(default_factory=list)


class InventoryAnalysisResponse(BaseModel):
    inventory: InventoryAnalysis = Field(
        default_factory=InventoryAnalysis
    )


class ExpiryProduct(BaseModel):
    product: str
    expiry_date: str
    days_until_expiry: int
    stock_quantity: float = 0.0
    batch_number: str | None = None
    supplier: str | None = None
    status: str = "safe"


class ExpiryAnalysis(BaseModel):
    available: bool = False
    total_products: int = 0
    expired_count: int = 0
    critical_count: int = 0
    warning_count: int = 0
    total_stock_at_risk: float = 0.0
    expired_stock: float = 0.0
    critical_stock: float = 0.0
    warning_stock: float = 0.0
    products: list[ExpiryProduct] = Field(default_factory=list)
    expired_products: list[ExpiryProduct] = Field(
        default_factory=list
    )
    critical_products: list[ExpiryProduct] = Field(
        default_factory=list
    )
    warning_products: list[ExpiryProduct] = Field(
        default_factory=list
    )
    warnings: list[str] = Field(default_factory=list)


class ExpiryAnalysisResponse(BaseModel):
    expiry: ExpiryAnalysis = Field(
        default_factory=ExpiryAnalysis
    )