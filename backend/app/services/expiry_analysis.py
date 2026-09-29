"""
Expiry intelligence service for BizDoctor AI.

This service analyzes inventory expiry dates and identifies:

- Expired products
- Products expiring within 30 days
- Products expiring within 90 days
- Stock currently exposed to expiry risk
- Batch and supplier information where available

The service works with the canonical column mappings produced
by the BizDoctor column-mapping workflow.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

import pandas as pd


class ExpiryAnalysisService:
    """
    Analyze product expiry information from a business dataset.

    Required fields:
        - product_name OR product_id
        - expiry_date

    Recommended fields:
        - stock_quantity
        - batch_number
        - supplier
    """

    CRITICAL_DAYS = 30
    WARNING_DAYS = 90

    @staticmethod
    def _get_mapping(
        mappings: list[dict[str, Any]],
        canonical_field: str,
    ) -> str | None:
        """
        Find the uploaded column mapped to a canonical field.
        """
        for mapping in mappings:
            if mapping.get("canonical_field") == canonical_field:
                return mapping.get("original_column")

        return None

    @staticmethod
    def _clean_product_name(value: Any) -> str:
        """
        Convert a product value into a clean display string.
        """
        if pd.isna(value):
            return "Unknown Product"

        value = str(value).strip()

        return value if value else "Unknown Product"

    @staticmethod
    def _clean_optional_value(value: Any) -> str | None:
        """
        Convert optional values such as batch or supplier into
        clean strings.
        """
        if pd.isna(value):
            return None

        value = str(value).strip()

        return value if value else None

    @staticmethod
    def _clean_stock(value: Any) -> float:
        """
        Convert stock quantity into a safe numeric value.
        """
        try:
            if pd.isna(value):
                return 0.0

            return float(value)
        except (TypeError, ValueError):
            return 0.0

    @staticmethod
    def _classify_expiry(days_until_expiry: int) -> str:
        """
        Classify a product according to how close it is to expiry.
        """
        if days_until_expiry < 0:
            return "expired"

        if days_until_expiry <= ExpiryAnalysisService.CRITICAL_DAYS:
            return "critical"

        if days_until_expiry <= ExpiryAnalysisService.WARNING_DAYS:
            return "warning"

        return "safe"

    @staticmethod
    def _build_warnings(
        expired_count: int,
        critical_count: int,
        warning_count: int,
        expired_stock: float,
        critical_stock: float,
        warning_stock: float,
        invalid_date_count: int,
    ) -> list[str]:
        """
        Build human-readable business warnings.
        """
        warnings: list[str] = []

        if expired_count > 0:
            warnings.append(
                f"{expired_count} product(s) have already expired."
            )

        if expired_stock > 0:
            warnings.append(
                f"{expired_stock:,.0f} unit(s) of stock are already expired."
            )

        if critical_count > 0:
            warnings.append(
                f"{critical_count} product(s) will expire within "
                f"{ExpiryAnalysisService.CRITICAL_DAYS} days."
            )

        if critical_stock > 0:
            warnings.append(
                f"{critical_stock:,.0f} unit(s) are at critical expiry risk."
            )

        if warning_count > 0:
            warnings.append(
                f"{warning_count} product(s) will expire within "
                f"{ExpiryAnalysisService.WARNING_DAYS} days."
            )

        if warning_stock > 0:
            warnings.append(
                f"{warning_stock:,.0f} unit(s) are within the "
                f"{ExpiryAnalysisService.WARNING_DAYS}-day expiry window."
            )

        if invalid_date_count > 0:
            warnings.append(
                f"{invalid_date_count} row(s) have missing or invalid "
                "expiry dates and could not be classified."
            )

        return warnings

    @staticmethod
    def _empty_result(reason: str) -> dict[str, Any]:
        """
        Return a safe response when expiry analysis cannot be performed.
        """
        return {
            "available": False,
            "total_products": 0,
            "expired_count": 0,
            "critical_count": 0,
            "warning_count": 0,
            "total_stock_at_risk": 0.0,
            "expired_stock": 0.0,
            "critical_stock": 0.0,
            "warning_stock": 0.0,
            "products": [],
            "expired_products": [],
            "critical_products": [],
            "warning_products": [],
            "warnings": [reason],
        }

    @classmethod
    def analyze(
        cls,
        dataframe: pd.DataFrame,
        mappings: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """
        Analyze expiry information from the complete dataset.

        Parameters
        ----------
        dataframe:
            Complete uploaded business dataset.

        mappings:
            Canonical column mappings confirmed by the user.
        """

        if dataframe.empty:
            return cls._empty_result(
                "The uploaded dataset does not contain any rows."
            )

        product_name_column = cls._get_mapping(
            mappings,
            "product_name",
        )

        product_id_column = cls._get_mapping(
            mappings,
            "product_id",
        )

        expiry_date_column = cls._get_mapping(
            mappings,
            "expiry_date",
        )

        stock_column = cls._get_mapping(
            mappings,
            "stock_quantity",
        )

        batch_column = cls._get_mapping(
            mappings,
            "batch_number",
        )

        supplier_column = cls._get_mapping(
            mappings,
            "supplier",
        )

        # A product name or product ID is required.
        product_column = product_name_column or product_id_column

        if not product_column:
            return cls._empty_result(
                "Expiry analysis requires a product name or product ID column."
            )

        if not expiry_date_column:
            return cls._empty_result(
                "Expiry analysis requires an expiry date column."
            )

        # Verify the mapped columns actually exist.
        required_columns = [
            product_column,
            expiry_date_column,
        ]

        missing_columns = [
            column
            for column in required_columns
            if column not in dataframe.columns
        ]

        if missing_columns:
            return cls._empty_result(
                "The mapped expiry columns could not be found in the dataset."
            )

        # Create a working dataframe.
        working = dataframe.copy()

        # Convert expiry dates to pandas datetime.
        working["_bizdoctor_expiry_date"] = pd.to_datetime(
            working[expiry_date_column],
            errors="coerce",
        )

        invalid_date_count = int(
            working["_bizdoctor_expiry_date"].isna().sum()
        )

        # Remove rows where expiry date is unavailable.
        working = working[
            working["_bizdoctor_expiry_date"].notna()
        ].copy()

        if working.empty:
            return {
                "available": False,
                "total_products": 0,
                "expired_count": 0,
                "critical_count": 0,
                "warning_count": 0,
                "total_stock_at_risk": 0.0,
                "expired_stock": 0.0,
                "critical_stock": 0.0,
                "warning_stock": 0.0,
                "products": [],
                "expired_products": [],
                "critical_products": [],
                "warning_products": [],
                "warnings": [
                    "No valid expiry dates were found in the dataset."
                ],
            }

        # Normalize dates to midnight so the calculation is based on
        # whole calendar days rather than the current time of day.
        today = pd.Timestamp(datetime.now().date())

        products: list[dict[str, Any]] = []

        for _, row in working.iterrows():
            expiry_date = row["_bizdoctor_expiry_date"]

            days_until_expiry = int(
                (expiry_date.normalize() - today).days
            )

            status = cls._classify_expiry(days_until_expiry)

            stock_quantity = 0.0

            if stock_column and stock_column in working.columns:
                stock_quantity = cls._clean_stock(
                    row[stock_column]
                )

            product = cls._clean_product_name(
                row[product_column]
            )

            batch_number = None

            if batch_column and batch_column in working.columns:
                batch_number = cls._clean_optional_value(
                    row[batch_column]
                )

            supplier = None

            if supplier_column and supplier_column in working.columns:
                supplier = cls._clean_optional_value(
                    row[supplier_column]
                )

            products.append(
                {
                    "product": product,
                    "expiry_date": expiry_date.strftime("%Y-%m-%d"),
                    "days_until_expiry": days_until_expiry,
                    "stock_quantity": stock_quantity,
                    "batch_number": batch_number,
                    "supplier": supplier,
                    "status": status,
                }
            )

        # Sort by urgency:
        # expired first, then critical, warning and safe.
        status_order = {
            "expired": 0,
            "critical": 1,
            "warning": 2,
            "safe": 3,
        }

        products.sort(
            key=lambda item: (
                status_order.get(item["status"], 99),
                item["days_until_expiry"],
            )
        )

        expired_products = [
            product
            for product in products
            if product["status"] == "expired"
        ]

        critical_products = [
            product
            for product in products
            if product["status"] == "critical"
        ]

        warning_products = [
            product
            for product in products
            if product["status"] == "warning"
        ]

        expired_stock = sum(
            product["stock_quantity"]
            for product in expired_products
        )

        critical_stock = sum(
            product["stock_quantity"]
            for product in critical_products
        )

        warning_stock = sum(
            product["stock_quantity"]
            for product in warning_products
        )

        total_stock_at_risk = (
            expired_stock
            + critical_stock
            + warning_stock
        )

        warnings = cls._build_warnings(
            expired_count=len(expired_products),
            critical_count=len(critical_products),
            warning_count=len(warning_products),
            expired_stock=expired_stock,
            critical_stock=critical_stock,
            warning_stock=warning_stock,
            invalid_date_count=invalid_date_count,
        )

        return {
            "available": True,
            "total_products": len(products),
            "expired_count": len(expired_products),
            "critical_count": len(critical_products),
            "warning_count": len(warning_products),
            "total_stock_at_risk": float(total_stock_at_risk),
            "expired_stock": float(expired_stock),
            "critical_stock": float(critical_stock),
            "warning_stock": float(warning_stock),
            "products": products,
            "expired_products": expired_products,
            "critical_products": critical_products,
            "warning_products": warning_products,
            "warnings": warnings,
        }