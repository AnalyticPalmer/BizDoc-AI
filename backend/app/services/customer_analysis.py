
"""
Customer intelligence services for BizDoctor AI.

This module analyses customer-level revenue concentration
using the complete uploaded business dataset.

The service is intentionally independent from the API layer.
That makes the calculations easier to test, maintain, and
extend later with churn and customer segmentation.
"""

from __future__ import annotations

from typing import Any

import pandas as pd

from app.schemas.data import ColumnMapping


class CustomerAnalysisService:
    """
    Provides customer-level business intelligence.

    Current capabilities:
        - Total customer count
        - Customers with revenue
        - One-time customers
        - Repeat customers
        - Top customer
        - Top customer revenue percentage
        - Top 5 customer revenue percentage
        - Top 10 customer revenue percentage
        - Top 20 customer revenue percentage
        - Customer revenue ranking

    The service works against the complete DataFrame supplied
    by the DatasetStore workflow.
    """

    @staticmethod
    def analyze(
        dataframe: pd.DataFrame,
        mappings: list[ColumnMapping],
    ) -> dict[str, Any]:
        """
        Analyse customer revenue concentration.

        Args:
            dataframe:
                Complete uploaded business dataset.

            mappings:
                Confirmed column mappings from the frontend.

        Returns:
            Dictionary containing customer intelligence metrics.
        """

        if dataframe.empty:
            return CustomerAnalysisService._empty_result(
                "The uploaded dataset is empty."
            )

        # ---------------------------------------------------------
        # Resolve canonical fields to actual dataframe columns.
        # ---------------------------------------------------------
        column_map = {
            mapping.canonical_field: mapping.original_column
            for mapping in mappings
            if mapping.canonical_field
            and mapping.original_column in dataframe.columns
        }

        customer_column = column_map.get("customer_id")

        # Some businesses may not have customer IDs but may have
        # customer names. We can use customer_name as a fallback.
        if not customer_column:
            customer_column = column_map.get("customer_name")

        revenue_column = column_map.get("revenue")

        # Revenue is required for concentration analysis.
        if not revenue_column:
            return CustomerAnalysisService._empty_result(
                "Customer concentration analysis requires a revenue column."
            )

        if not customer_column:
            return CustomerAnalysisService._empty_result(
                "Customer concentration analysis requires a customer ID or customer name column."
            )

        # ---------------------------------------------------------
        # Prepare working data.
        # ---------------------------------------------------------
        working = dataframe[
            [customer_column, revenue_column]
        ].copy()

        working[customer_column] = (
            working[customer_column]
            .astype("string")
            .str.strip()
        )

        working[revenue_column] = pd.to_numeric(
            working[revenue_column],
            errors="coerce",
        )

        # Remove rows where either customer or revenue is unusable.
        working = working.dropna(
            subset=[
                customer_column,
                revenue_column,
            ]
        )

        working = working[
            working[customer_column] != ""
        ]

        if working.empty:
            return CustomerAnalysisService._empty_result(
                "No usable customer revenue records were found."
            )

        # ---------------------------------------------------------
        # Aggregate revenue by customer.
        # ---------------------------------------------------------
        customer_revenue = (
            working
            .groupby(
                customer_column,
                dropna=True,
            )[revenue_column]
            .sum()
            .sort_values(
                ascending=False
            )
        )

        if customer_revenue.empty:
            return CustomerAnalysisService._empty_result(
                "No customer revenue could be calculated."
            )

        total_revenue = float(
            customer_revenue.sum()
        )

        total_customers = int(
            customer_revenue.shape[0]
        )

        if total_revenue <= 0:
            return CustomerAnalysisService._empty_result(
                "Customer revenue must be greater than zero for concentration analysis."
            )

        # ---------------------------------------------------------
        # Customer purchase frequency.
        #
        # Each row represents a transaction unless the source
        # dataset has a different transaction grain. We therefore
        # count rows per customer as a practical MVP measure.
        # ---------------------------------------------------------
        customer_transaction_counts = (
            working
            .groupby(
                customer_column,
                dropna=True,
            )
            .size()
            .sort_values(
                ascending=False
            )
        )

        repeat_customers = int(
            (customer_transaction_counts > 1).sum()
        )

        one_time_customers = int(
            (customer_transaction_counts == 1).sum()
        )

        # ---------------------------------------------------------
        # Concentration calculations.
        # ---------------------------------------------------------
        def revenue_share(customer_count: int) -> float:
            """
            Calculate the percentage of total revenue generated
            by the top N customers.
            """

            top_revenue = float(
                customer_revenue.head(
                    customer_count
                ).sum()
            )

            return round(
                (top_revenue / total_revenue) * 100,
                2,
            )

        top_1_percent = revenue_share(1)
        top_5_percent = revenue_share(5)
        top_10_percent = revenue_share(10)
        top_20_percent = revenue_share(20)

        # ---------------------------------------------------------
        # Top customer.
        # ---------------------------------------------------------
        top_customer_name = str(
            customer_revenue.index[0]
        )

        top_customer_revenue = float(
            customer_revenue.iloc[0]
        )

        # ---------------------------------------------------------
        # Build customer ranking.
        # ---------------------------------------------------------
        ranked_customers: list[dict[str, Any]] = []

        for rank, (
            customer,
            revenue,
        ) in enumerate(
            customer_revenue.head(20).items(),
            start=1,
        ):
            revenue_value = float(
                revenue
            )

            revenue_percentage = round(
                (
                    revenue_value
                    / total_revenue
                )
                * 100,
                2,
            )

            transaction_count = int(
                customer_transaction_counts.get(
                    customer,
                    0,
                )
            )

            ranked_customers.append(
                {
                    "rank": rank,
                    "customer": str(customer),
                    "revenue": round(
                        revenue_value,
                        2,
                    ),
                    "revenue_percentage": revenue_percentage,
                    "transactions": transaction_count,
                }
            )

        # ---------------------------------------------------------
        # Determine concentration level.
        #
        # This is a descriptive classification for dashboard use,
        # not a financial risk score.
        # ---------------------------------------------------------
        concentration_level = (
            CustomerAnalysisService._classify_concentration(
                top_10_percent
            )
        )

        return {
            "available": True,
            "total_customers": total_customers,
            "repeat_customers": repeat_customers,
            "one_time_customers": one_time_customers,
            "top_customer": {
                "customer": top_customer_name,
                "revenue": round(
                    top_customer_revenue,
                    2,
                ),
                "revenue_percentage": top_1_percent,
            },
            "concentration": {
                "top_1_percent": top_1_percent,
                "top_5_percent": top_5_percent,
                "top_10_percent": top_10_percent,
                "top_20_percent": top_20_percent,
                "level": concentration_level,
            },
            "customers": ranked_customers,
            "warnings": (
                CustomerAnalysisService._build_warnings(
                    top_10_percent=top_10_percent,
                    one_time_customers=one_time_customers,
                    total_customers=total_customers,
                )
            ),
        }

    @staticmethod
    def _classify_concentration(
        top_10_percent: float,
    ) -> str:
        """
        Classify revenue concentration based on the share
        generated by the top 10 customers.

        Thresholds are intentionally simple for the MVP and
        should later become configurable business rules.
        """

        if top_10_percent >= 70:
            return "high"

        if top_10_percent >= 50:
            return "moderate"

        return "low"

    @staticmethod
    def _build_warnings(
        top_10_percent: float,
        one_time_customers: int,
        total_customers: int,
    ) -> list[str]:
        """
        Generate useful descriptive customer warnings.
        """

        warnings: list[str] = []

        if top_10_percent >= 70:
            warnings.append(
                "A large share of revenue comes from the top 10 customers."
            )

        elif top_10_percent >= 50:
            warnings.append(
                "Revenue is moderately concentrated among the top 10 customers."
            )

        if total_customers > 0:
            one_time_percentage = (
                one_time_customers
                / total_customers
            ) * 100

            if one_time_percentage >= 60:
                warnings.append(
                    "A large proportion of customers have purchased only once."
                )

        return warnings

    @staticmethod
    def _empty_result(
        warning: str,
    ) -> dict[str, Any]:
        """
        Return a consistent response when customer analysis
        cannot be performed.
        """

        return {
            "available": False,
            "total_customers": 0,
            "repeat_customers": 0,
            "one_time_customers": 0,
            "top_customer": {
                "customer": None,
                "revenue": 0.0,
                "revenue_percentage": 0.0,
            },
            "concentration": {
                "top_1_percent": 0.0,
                "top_5_percent": 0.0,
                "top_10_percent": 0.0,
                "top_20_percent": 0.0,
                "level": "unavailable",
            },
            "customers": [],
            "warnings": [warning],
        }

