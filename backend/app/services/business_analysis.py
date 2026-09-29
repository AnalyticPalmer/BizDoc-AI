"""
Business analysis services for BizDoctor AI.

This module provides the core sales-performance analysis used
by BizDoctor AI.

Current capabilities:
    - Total revenue
    - Total orders
    - Units sold
    - Average order value
    - Transaction date range
    - Top products
    - Monthly revenue
    - Data-quality warnings
    - Configurable display currency

Currency:
    The analysis defaults to Nigerian Naira (NGN).

    Supported currencies:
        NGN
        USD
        GBP
        EUR
        ZAR
        GHS
        KES

The currency affects presentation only. The uploaded numeric
values are not converted between currencies.

For example:
    A revenue value of 100000 remains 100000.

Selecting USD will display:
    $100,000.00

Selecting NGN will display:
    ₦100,000.00
"""

from __future__ import annotations

from typing import Any

import pandas as pd

from app.schemas.data import ColumnMapping


class BusinessAnalysisService:
    """
    Provides sales-performance analysis for BizDoctor AI.

    The service operates against the complete uploaded dataset,
    not the preview rows shown during dataset inspection.
    """

    # ---------------------------------------------------------
    # SUPPORTED CURRENCIES
    # ---------------------------------------------------------

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

    @staticmethod
    def analyze(
        dataframe: pd.DataFrame,
        mappings: list[ColumnMapping],
        currency: str = DEFAULT_CURRENCY,
    ) -> dict[str, Any]:
        """
        Analyse sales performance using the complete dataset.

        Args:
            dataframe:
                Complete uploaded business dataset.

            mappings:
                Confirmed canonical column mappings.

            currency:
                Currency code used when formatting monetary values.

                Defaults to NGN.

        Returns:
            Dictionary containing sales-performance metrics.
        """

        # -----------------------------------------------------
        # NORMALISE CURRENCY
        # -----------------------------------------------------

        currency = BusinessAnalysisService.normalize_currency(
            currency
        )

        mapped = {
            mapping.canonical_field: mapping.original_column
            for mapping in mappings
            if mapping.canonical_field
        }

        warnings: list[str] = []

        # -----------------------------------------------------
        # COLUMN RESOLUTION
        # -----------------------------------------------------

        revenue_column = mapped.get("revenue")

        quantity_column = mapped.get("quantity")

        order_id_column = mapped.get("order_id")

        transaction_date_column = mapped.get(
            "transaction_date"
        )

        product_column = mapped.get(
            "product_name"
        )

        # -----------------------------------------------------
        # REVENUE
        # -----------------------------------------------------

        if revenue_column:
            revenue_series = pd.to_numeric(
                dataframe[revenue_column],
                errors="coerce",
            ).fillna(0)

            total_revenue = float(
                revenue_series.sum()
            )

        else:
            total_revenue = 0.0

            warnings.append(
                "Revenue could not be calculated because no revenue column was confirmed."
            )

        # -----------------------------------------------------
        # ORDERS
        # -----------------------------------------------------

        if order_id_column:
            orders = int(
                dataframe[order_id_column]
                .dropna()
                .nunique()
            )

        else:
            orders = int(
                len(dataframe)
            )

            warnings.append(
                "No order ID column was available, so each data row was treated as one transaction."
            )

        # -----------------------------------------------------
        # UNITS SOLD
        # -----------------------------------------------------

        if quantity_column:
            quantity_series = pd.to_numeric(
                dataframe[quantity_column],
                errors="coerce",
            ).fillna(0)

            units_sold = float(
                quantity_series.sum()
            )

        else:
            units_sold = 0.0

            warnings.append(
                "Units sold could not be calculated because no quantity column was confirmed."
            )

        # -----------------------------------------------------
        # AVERAGE ORDER VALUE
        # -----------------------------------------------------

        average_order_value = (
            total_revenue / orders
            if orders > 0
            else 0.0
        )

        # -----------------------------------------------------
        # TRANSACTION DATE RANGE
        # -----------------------------------------------------

        transaction_date_min: str | None = None

        transaction_date_max: str | None = None

        if transaction_date_column:
            dates = pd.to_datetime(
                dataframe[
                    transaction_date_column
                ],
                errors="coerce",
            ).dropna()

            if not dates.empty:
                transaction_date_min = (
                    dates.min()
                    .date()
                    .isoformat()
                )

                transaction_date_max = (
                    dates.max()
                    .date()
                    .isoformat()
                )

        # -----------------------------------------------------
        # TOP PRODUCTS
        # -----------------------------------------------------

        top_products: list[
            dict[str, Any]
        ] = []

        if (
            product_column
            and revenue_column
        ):
            analysis_frame = dataframe[
                [
                    product_column,
                    revenue_column,
                ]
            ].copy()

            analysis_frame[
                revenue_column
            ] = pd.to_numeric(
                analysis_frame[
                    revenue_column
                ],
                errors="coerce",
            ).fillna(0)

            grouped = (
                analysis_frame
                .groupby(
                    product_column,
                    dropna=True,
                )[revenue_column]
                .sum()
                .sort_values(
                    ascending=False
                )
                .head(10)
            )

            for (
                product,
                product_revenue,
            ) in grouped.items():

                top_products.append(
                    {
                        "product": str(
                            product
                        ),
                        "revenue": round(
                            float(
                                product_revenue
                            ),
                            2,
                        ),
                        "formatted_revenue": (
                            BusinessAnalysisService
                            .format_currency(
                                product_revenue,
                                currency,
                            )
                        ),
                    }
                )

        # -----------------------------------------------------
        # MONTHLY REVENUE
        # -----------------------------------------------------

        monthly_revenue: list[
            dict[str, Any]
        ] = []

        if (
            transaction_date_column
            and revenue_column
        ):
            monthly_frame = dataframe[
                [
                    transaction_date_column,
                    revenue_column,
                ]
            ].copy()

            monthly_frame[
                transaction_date_column
            ] = pd.to_datetime(
                monthly_frame[
                    transaction_date_column
                ],
                errors="coerce",
            )

            monthly_frame[
                revenue_column
            ] = pd.to_numeric(
                monthly_frame[
                    revenue_column
                ],
                errors="coerce",
            ).fillna(0)

            monthly_frame = (
                monthly_frame.dropna(
                    subset=[
                        transaction_date_column
                    ]
                )
            )

            if not monthly_frame.empty:
                grouped_months = (
                    monthly_frame
                    .groupby(
                        monthly_frame[
                            transaction_date_column
                        ].dt.to_period("M")
                    )[revenue_column]
                    .sum()
                    .sort_index()
                )

                for (
                    month,
                    month_revenue,
                ) in grouped_months.items():

                    monthly_revenue.append(
                        {
                            "month": str(
                                month
                            ),
                            "revenue": round(
                                float(
                                    month_revenue
                                ),
                                2,
                            ),
                            "formatted_revenue": (
                                BusinessAnalysisService
                                .format_currency(
                                    month_revenue,
                                    currency,
                                )
                            ),
                        }
                    )

        # -----------------------------------------------------
        # FINAL RESPONSE
        # -----------------------------------------------------

        return {
            "currency": currency,

            "revenue": {
                "value": round(
                    total_revenue,
                    2,
                ),
                "formatted": (
                    BusinessAnalysisService
                    .format_currency(
                        total_revenue,
                        currency,
                    )
                ),
            },

            "orders": {
                "value": float(
                    orders
                ),
                "formatted": (
                    f"{orders:,}"
                ),
            },

            "units_sold": {
                "value": round(
                    units_sold,
                    2,
                ),
                "formatted": (
                    f"{units_sold:,.2f}"
                ),
            },

            "average_order_value": {
                "value": round(
                    average_order_value,
                    2,
                ),
                "formatted": (
                    BusinessAnalysisService
                    .format_currency(
                        average_order_value,
                        currency,
                    )
                ),
            },

            "transaction_date_min": (
                transaction_date_min
            ),

            "transaction_date_max": (
                transaction_date_max
            ),

            "top_products": top_products,

            "monthly_revenue": monthly_revenue,

            "warnings": warnings,
        }

    # ---------------------------------------------------------
    # CURRENCY NORMALISATION
    # ---------------------------------------------------------

    @staticmethod
    def normalize_currency(
        currency: str | None,
    ) -> str:
        """
        Normalise and validate the requested currency.

        Unsupported currencies fall back to NGN rather than
        causing the analysis to fail.
        """

        if not currency:
            return BusinessAnalysisService.DEFAULT_CURRENCY

        normalized = currency.upper().strip()

        if normalized not in (
            BusinessAnalysisService.CURRENCY_SYMBOLS
        ):
            return BusinessAnalysisService.DEFAULT_CURRENCY

        return normalized

    # ---------------------------------------------------------
    # CURRENCY FORMATTING
    # ---------------------------------------------------------

    @staticmethod
    def format_currency(
        value: float,
        currency: str = DEFAULT_CURRENCY,
    ) -> str:
        """
        Format a numeric value using the selected currency.

        Examples:

            NGN → ₦100,000.00
            USD → $100,000.00
            GBP → £100,000.00
            EUR → €100,000.00
            ZAR → R100,000.00
            GHS → ₵100,000.00
            KES → KSh100,000.00
        """

        normalized_currency = (
            BusinessAnalysisService
            .normalize_currency(
                currency
            )
        )

        symbol = (
            BusinessAnalysisService
            .CURRENCY_SYMBOLS[
                normalized_currency
            ]
        )

        return f"{symbol}{float(value):,.2f}"