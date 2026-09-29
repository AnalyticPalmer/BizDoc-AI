"""
Profitability analysis service for BizDoctor AI.

This service analyzes revenue, cost, gross profit, and product margins
using the complete uploaded dataset.

Currency handling:
- The selected currency is a DISPLAY currency only.
- No foreign-exchange conversion is performed.
- Numeric values remain unchanged.
- Formatted monetary values use the selected currency symbol.
"""

from __future__ import annotations

from typing import Any

import pandas as pd


# ---------------------------------------------------------------------------
# Currency configuration
# ---------------------------------------------------------------------------

CURRENCY_SYMBOLS = {
    "NGN": "₦",
    "USD": "$",
    "GBP": "£",
    "EUR": "€",
    "ZAR": "R",
    "GHS": "₵",
    "KES": "KSh",
}

DEFAULT_CURRENCY = "NGN"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def normalize_currency(currency: str | None) -> str:
    """
    Normalize and validate a currency code.

    Unsupported currencies fall back to NGN.
    """

    normalized = str(currency or DEFAULT_CURRENCY).strip().upper()

    if normalized not in CURRENCY_SYMBOLS:
        return DEFAULT_CURRENCY

    return normalized


def format_currency(value: float, currency: str) -> str:
    """
    Format a numeric value using the selected currency symbol.

    This is display formatting only. No FX conversion is performed.
    """

    normalized_currency = normalize_currency(currency)
    symbol = CURRENCY_SYMBOLS[normalized_currency]

    return f"{symbol}{value:,.2f}"


def _safe_float(value: Any) -> float:
    """Convert a value to float safely."""

    try:
        if pd.isna(value):
            return 0.0

        return float(value)
    except (TypeError, ValueError):
        return 0.0


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------

class ProfitabilityAnalysisService:
    """
    Analyze profitability using the complete uploaded dataset.

    Supported profitability inputs:

    1. Revenue + Profit
       Uses the uploaded profit column directly.

    2. Revenue + Cost Price + Quantity
       Calculates:

           Total Cost = Cost Price × Quantity
           Profit = Revenue - Total Cost

    The service returns both raw numeric values and formatted currency
    values for frontend display.
    """

    @classmethod
    def analyze(
        cls,
        dataframe: pd.DataFrame,
        mappings: dict[str, str | None],
        currency: str = DEFAULT_CURRENCY,
    ) -> dict[str, Any]:
        """
        Run profitability analysis.

        Parameters
        ----------
        dataframe:
            Complete uploaded dataset.

        mappings:
            Mapping from canonical BizDoctor fields to uploaded columns.

        currency:
            Display currency code.

        Returns
        -------
        dict
            Profitability analysis result.
        """

        selected_currency = normalize_currency(currency)

        revenue_column = mappings.get("revenue")
        profit_column = mappings.get("profit")
        cost_price_column = mappings.get("cost_price")
        quantity_column = mappings.get("quantity")
        product_column = (
            mappings.get("product_name")
            or mappings.get("product_id")
        )

        # ---------------------------------------------------------------
        # Validate required revenue field
        # ---------------------------------------------------------------

        if not revenue_column or revenue_column not in dataframe.columns:
            return cls._empty_result(
                currency=selected_currency,
                warning=(
                    "Profitability analysis requires a revenue column."
                ),
            )

        # ---------------------------------------------------------------
        # Validate profitability inputs
        # ---------------------------------------------------------------

        has_profit = (
            bool(profit_column)
            and profit_column in dataframe.columns
        )

        has_cost_inputs = (
            bool(cost_price_column)
            and cost_price_column in dataframe.columns
            and bool(quantity_column)
            and quantity_column in dataframe.columns
        )

        if not has_profit and not has_cost_inputs:
            return cls._empty_result(
                currency=selected_currency,
                warning=(
                    "Profitability analysis requires either a profit "
                    "column or both cost price and quantity columns."
                ),
            )

        working = dataframe.copy()

        # ---------------------------------------------------------------
        # Normalize revenue
        # ---------------------------------------------------------------

        working["_revenue"] = pd.to_numeric(
            working[revenue_column],
            errors="coerce",
        ).fillna(0)

        # ---------------------------------------------------------------
        # Calculate profit
        # ---------------------------------------------------------------

        warnings: list[str] = []

        if has_profit:
            working["_profit"] = pd.to_numeric(
                working[profit_column],
                errors="coerce",
            ).fillna(0)

            working["_cost"] = (
                working["_revenue"] - working["_profit"]
            )

        else:
            working["_cost_price"] = pd.to_numeric(
                working[cost_price_column],
                errors="coerce",
            ).fillna(0)

            working["_quantity"] = pd.to_numeric(
                working[quantity_column],
                errors="coerce",
            ).fillna(0)

            working["_cost"] = (
                working["_cost_price"] * working["_quantity"]
            )

            working["_profit"] = (
                working["_revenue"] - working["_cost"]
            )

        # ---------------------------------------------------------------
        # Overall metrics
        # ---------------------------------------------------------------

        total_revenue = float(working["_revenue"].sum())
        total_cost = float(working["_cost"].sum())
        gross_profit = float(working["_profit"].sum())

        profit_margin = (
            (gross_profit / total_revenue) * 100
            if total_revenue != 0
            else 0.0
        )

        # ---------------------------------------------------------------
        # Product-level profitability
        # ---------------------------------------------------------------

        products: list[dict[str, Any]] = []
        low_profit_products: list[dict[str, Any]] = []
        loss_making_products: list[dict[str, Any]] = []

        if product_column and product_column in working.columns:
            grouped = (
                working.groupby(product_column, dropna=False)
                .agg(
                    revenue=("_revenue", "sum"),
                    cost=("_cost", "sum"),
                    profit=("_profit", "sum"),
                )
                .reset_index()
            )

            grouped = grouped.sort_values(
                by="profit",
                ascending=False,
            )

            for _, row in grouped.iterrows():
                product_name = str(row[product_column])

                revenue = _safe_float(row["revenue"])
                cost = _safe_float(row["cost"])
                profit = _safe_float(row["profit"])

                margin = (
                    (profit / revenue) * 100
                    if revenue != 0
                    else 0.0
                )

                product_result = {
                    "product": product_name,
                    "revenue": revenue,
                    "formatted_revenue": format_currency(
                        revenue,
                        selected_currency,
                    ),
                    "cost": cost,
                    "formatted_cost": format_currency(
                        cost,
                        selected_currency,
                    ),
                    "profit": profit,
                    "formatted_profit": format_currency(
                        profit,
                        selected_currency,
                    ),
                    "margin": margin,
                    "formatted_margin": f"{margin:.2f}%",
                }

                products.append(product_result)

                # Low-profit threshold: below 10% margin.
                if 0 <= margin < 10:
                    low_profit_products.append(product_result)

                # Loss-making products have negative profit.
                if profit < 0:
                    loss_making_products.append(product_result)

        # ---------------------------------------------------------------
        # Warnings
        # ---------------------------------------------------------------

        if profit_margin < 10:
            warnings.append(
                "Overall profit margin is below 10%."
            )

        if gross_profit < 0:
            warnings.append(
                "The dataset shows an overall gross loss."
            )

        if loss_making_products:
            warnings.append(
                f"{len(loss_making_products)} product(s) are currently "
                "loss-making."
            )

        if low_profit_products:
            warnings.append(
                f"{len(low_profit_products)} product(s) have profit "
                "margins below 10%."
            )

        # ---------------------------------------------------------------
        # Final response
        # ---------------------------------------------------------------

        return {
            "available": True,
            "currency": selected_currency,
            "total_revenue": {
                "value": total_revenue,
                "formatted": format_currency(
                    total_revenue,
                    selected_currency,
                ),
            },
            "total_cost": {
                "value": total_cost,
                "formatted": format_currency(
                    total_cost,
                    selected_currency,
                ),
            },
            "gross_profit": {
                "value": gross_profit,
                "formatted": format_currency(
                    gross_profit,
                    selected_currency,
                ),
            },
            "profit_margin": {
                "value": profit_margin,
                "formatted": f"{profit_margin:.2f}%",
            },
            "products": products,
            "low_profit_products": low_profit_products,
            "loss_making_products": loss_making_products,
            "warnings": warnings,
        }

    # -----------------------------------------------------------------------
    # Empty result
    # -----------------------------------------------------------------------

    @staticmethod
    def _empty_result(
        currency: str,
        warning: str | None = None,
    ) -> dict[str, Any]:
        """
        Return a safe unavailable profitability response.
        """

        selected_currency = normalize_currency(currency)

        warnings = []

        if warning:
            warnings.append(warning)

        return {
            "available": False,
            "currency": selected_currency,
            "total_revenue": {
                "value": 0.0,
                "formatted": format_currency(
                    0.0,
                    selected_currency,
                ),
            },
            "total_cost": {
                "value": 0.0,
                "formatted": format_currency(
                    0.0,
                    selected_currency,
                ),
            },
            "gross_profit": {
                "value": 0.0,
                "formatted": format_currency(
                    0.0,
                    selected_currency,
                ),
            },
            "profit_margin": {
                "value": 0.0,
                "formatted": "0.00%",
            },
            "products": [],
            "low_profit_products": [],
            "loss_making_products": [],
            "warnings": warnings,
        }