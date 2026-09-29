"""
Inventory intelligence service for BizDoctor AI.

This service analyzes product-level inventory movement and estimates:

- Current stock
- Units sold
- Daily sales velocity
- Days of stock remaining
- Inventory risk
- Recommended reorder quantity

The service works from the complete uploaded dataset stored by
DatasetStore. It does not rely on the preview returned during upload.
"""

from __future__ import annotations

from typing import Any

import pandas as pd


class InventoryAnalysisService:
    """
    Analyze inventory health and generate replenishment recommendations.
    """

    TARGET_COVERAGE_DAYS = 30

    @classmethod
    def analyze(
        cls,
        dataframe: pd.DataFrame,
        mappings: dict[str, str | None],
    ) -> dict[str, Any]:
        """
        Analyze inventory using the complete uploaded dataset.

        Required fields:

        - product_name OR product_id
        - quantity
        - stock_quantity

        Recommended:

        - transaction_date
        """

        product_column = cls._resolve_column(
            dataframe,
            mappings,
            "product_name",
            "product_id",
        )

        quantity_column = cls._resolve_column(
            dataframe,
            mappings,
            "quantity",
        )

        stock_column = cls._resolve_column(
            dataframe,
            mappings,
            "stock_quantity",
        )

        date_column = cls._resolve_column(
            dataframe,
            mappings,
            "transaction_date",
        )

        if not product_column or not quantity_column or not stock_column:
            return cls._empty_result(
                "Inventory analysis requires product, quantity, and stock quantity fields."
            )

        working = dataframe.copy()

        working[quantity_column] = pd.to_numeric(
            working[quantity_column],
            errors="coerce",
        ).fillna(0)

        working[stock_column] = pd.to_numeric(
            working[stock_column],
            errors="coerce",
        )

        working = working.dropna(subset=[product_column])

        if working.empty:
            return cls._empty_result(
                "No usable product records were found."
            )

        analysis_days = cls._calculate_analysis_days(
            working,
            date_column,
        )

        if analysis_days is None or analysis_days <= 0:
            analysis_days = 1

        products: list[dict[str, Any]] = []

        grouped = working.groupby(
            product_column,
            dropna=True,
        )

        for product_name, group in grouped:
            product = str(product_name)

            units_sold = float(
                group[quantity_column].sum()
            )

            current_stock = cls._get_current_stock(
                group,
                stock_column,
                date_column,
            )

            daily_velocity = (
                units_sold / analysis_days
                if units_sold > 0
                else 0.0
            )

            if daily_velocity > 0:
                days_remaining = current_stock / daily_velocity
            else:
                days_remaining = None

            risk = cls._classify_risk(
                current_stock=current_stock,
                days_remaining=days_remaining,
            )

            target_stock = daily_velocity * cls.TARGET_COVERAGE_DAYS

            recommended_reorder = max(
                target_stock - current_stock,
                0.0,
            )

            products.append(
                {
                    "product": product,
                    "current_stock": round(current_stock, 2),
                    "units_sold": round(units_sold, 2),
                    "daily_velocity": round(daily_velocity, 2),
                    "days_remaining": (
                        round(days_remaining, 2)
                        if days_remaining is not None
                        else None
                    ),
                    "target_stock": round(target_stock, 2),
                    "recommended_reorder": round(
                        recommended_reorder,
                        2,
                    ),
                    "risk": risk,
                }
            )

        products.sort(
            key=lambda item: (
                item["days_remaining"]
                if item["days_remaining"] is not None
                else float("inf")
            )
        )

        total_products = len(products)

        total_current_stock = sum(
            item["current_stock"]
            for item in products
        )

        total_units_sold = sum(
            item["units_sold"]
            for item in products
        )

        average_daily_velocity = (
            total_units_sold / analysis_days
            if analysis_days > 0
            else 0.0
        )

        products_with_days = [
            item["days_remaining"]
            for item in products
            if item["days_remaining"] is not None
        ]

        average_days_remaining = (
            sum(products_with_days) / len(products_with_days)
            if products_with_days
            else None
        )

        out_of_stock_count = sum(
            1
            for item in products
            if item["risk"] == "out_of_stock"
        )

        critical_stock_count = sum(
            1
            for item in products
            if item["risk"] == "critical"
        )

        high_risk_count = sum(
            1
            for item in products
            if item["risk"] == "high"
        )

        moderate_risk_count = sum(
            1
            for item in products
            if item["risk"] == "moderate"
        )

        low_stock_products = [
            item
            for item in products
            if item["risk"]
            in {
                "out_of_stock",
                "critical",
                "high",
                "moderate",
            }
        ]

        warnings = cls._build_warnings(
            products=products,
            analysis_days=analysis_days,
            out_of_stock_count=out_of_stock_count,
            critical_stock_count=critical_stock_count,
            high_risk_count=high_risk_count,
            total_products=total_products,
            date_available=bool(date_column),
        )

        return {
            "available": True,
            "total_products": total_products,
            "total_current_stock": round(
                total_current_stock,
                2,
            ),
            "total_units_sold": round(
                total_units_sold,
                2,
            ),
            "analysis_days": analysis_days,
            "average_daily_velocity": round(
                average_daily_velocity,
                2,
            ),
            "average_days_remaining": (
                round(
                    average_days_remaining,
                    2,
                )
                if average_days_remaining is not None
                else None
            ),
            "out_of_stock_count": out_of_stock_count,
            "critical_stock_count": critical_stock_count,
            "high_risk_count": high_risk_count,
            "moderate_risk_count": moderate_risk_count,
            "low_stock_products": low_stock_products,
            "products": products,
            "warnings": warnings,
        }

    # ------------------------------------------------------------------
    # Column helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _resolve_column(
        dataframe: pd.DataFrame,
        mappings: dict[str, str | None],
        *canonical_fields: str,
    ) -> str | None:
        """
        Resolve a canonical field to the actual dataframe column.
        """

        for canonical_field in canonical_fields:
            original_column = mappings.get(canonical_field)

            if (
                original_column
                and original_column in dataframe.columns
            ):
                return original_column

        return None

    # ------------------------------------------------------------------
    # Stock calculations
    # ------------------------------------------------------------------

    @classmethod
    def _get_current_stock(
        cls,
        group: pd.DataFrame,
        stock_column: str,
        date_column: str | None,
    ) -> float:
        """
        Determine the latest known stock quantity.

        When transaction dates exist, the latest dated observation
        is treated as the current stock.

        Without dates, the final valid stock observation is used.
        """

        stock_values = pd.to_numeric(
            group[stock_column],
            errors="coerce",
        )

        valid = group.loc[stock_values.notna()].copy()

        if valid.empty:
            return 0.0

        if date_column:
            dates = pd.to_datetime(
                valid[date_column],
                errors="coerce",
            )

            valid = valid.assign(
                _inventory_date=dates,
                _inventory_stock=stock_values.loc[
                    valid.index
                ],
            )

            dated = valid.dropna(
                subset=["_inventory_date"]
            )

            if not dated.empty:
                latest = dated.sort_values(
                    "_inventory_date"
                ).iloc[-1]

                return float(
                    latest["_inventory_stock"]
                )

        return float(
            stock_values.loc[valid.index].iloc[-1]
        )

    @staticmethod
    def _calculate_analysis_days(
        dataframe: pd.DataFrame,
        date_column: str | None,
    ) -> int | None:
        """
        Calculate the number of calendar days covered by the data.
        """

        if not date_column:
            return None

        dates = pd.to_datetime(
            dataframe[date_column],
            errors="coerce",
        ).dropna()

        if dates.empty:
            return None

        minimum = dates.min()
        maximum = dates.max()

        return max(
            int((maximum - minimum).days) + 1,
            1,
        )

    # ------------------------------------------------------------------
    # Risk classification
    # ------------------------------------------------------------------

    @staticmethod
    def _classify_risk(
        current_stock: float,
        days_remaining: float | None,
    ) -> str:
        """
        Classify inventory risk based on projected stock coverage.
        """

        if current_stock <= 0:
            return "out_of_stock"

        if days_remaining is None:
            return "unknown"

        if days_remaining <= 7:
            return "critical"

        if days_remaining <= 14:
            return "high"

        if days_remaining <= 30:
            return "moderate"

        return "low"

    # ------------------------------------------------------------------
    # Warnings
    # ------------------------------------------------------------------

    @classmethod
    def _build_warnings(
        cls,
        products: list[dict[str, Any]],
        analysis_days: int,
        out_of_stock_count: int,
        critical_stock_count: int,
        high_risk_count: int,
        total_products: int,
        date_available: bool,
    ) -> list[str]:
        warnings: list[str] = []

        if out_of_stock_count > 0:
            warnings.append(
                f"{out_of_stock_count} product(s) are currently out of stock."
            )

        if critical_stock_count > 0:
            warnings.append(
                f"{critical_stock_count} product(s) are projected to run out within 7 days."
            )

        if high_risk_count > 0:
            warnings.append(
                f"{high_risk_count} product(s) have less than 14 days of projected stock coverage."
            )

        if total_products > 0:
            out_of_stock_percentage = (
                out_of_stock_count / total_products
            ) * 100

            if out_of_stock_percentage >= 20:
                warnings.append(
                    "More than 20% of products are currently out of stock."
                )

        if not date_available:
            warnings.append(
                "Transaction dates were not mapped, so inventory velocity uses the available dataset period."
            )

        if analysis_days < 7:
            warnings.append(
                "The dataset contains less than 7 days of history, so stock projections may be less reliable."
            )

        reorder_products = [
            item
            for item in products
            if item["recommended_reorder"] > 0
        ]

        if reorder_products:
            warnings.append(
                f"{len(reorder_products)} product(s) may require replenishment based on a {cls.TARGET_COVERAGE_DAYS}-day target."
            )

        return warnings

    # ------------------------------------------------------------------
    # Empty response
    # ------------------------------------------------------------------

    @staticmethod
    def _empty_result(
        warning: str,
    ) -> dict[str, Any]:
        return {
            "available": False,
            "total_products": 0,
            "total_current_stock": 0.0,
            "total_units_sold": 0.0,
            "analysis_days": None,
            "average_daily_velocity": 0.0,
            "average_days_remaining": None,
            "out_of_stock_count": 0,
            "critical_stock_count": 0,
            "high_risk_count": 0,
            "moderate_risk_count": 0,
            "low_stock_products": [],
            "products": [],
            "warnings": [warning],
        }