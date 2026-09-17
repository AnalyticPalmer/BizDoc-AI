from __future__ import annotations

import re
from dataclasses import dataclass
from difflib import SequenceMatcher


@dataclass(frozen=True)
class ColumnMatch:
    original_column: str
    canonical_field: str | None
    confidence: float
    match_type: str


CANONICAL_FIELDS: dict[str, set[str]] = {
    "transaction_date": {
        "date",
        "transaction date",
        "transaction_date",
        "sales date",
        "sale date",
        "order date",
        "invoice date",
        "purchase date",
        "created date",
        "created at",
        "timestamp",
        "datetime",
    },

    "order_id": {
        "order id",
        "order_id",
        "invoice id",
        "invoice_id",
        "invoice number",
        "invoice no",
        "invoice #",
        "receipt number",
        "receipt no",
        "transaction id",
        "transaction_id",
        "reference",
        "reference number",
    },

    "customer_id": {
        "customer id",
        "customer_id",
        "client id",
        "client_id",
        "buyer id",
        "buyer_id",
        "account number",
        "account no",
    },

    "customer_name": {
        "customer",
        "customer name",
        "customer_name",
        "client",
        "client name",
        "client_name",
        "buyer",
        "buyer name",
        "guest",
        "guest name",
    },

    "product_id": {
        "product id",
        "product_id",
        "item id",
        "item_id",
        "sku",
        "product code",
        "item code",
        "barcode",
        "bar code",
        "stock code",
    },

    "product_name": {
        "product",
        "product name",
        "product_name",
        "item",
        "item name",
        "item_name",
        "description",
        "product description",
        "item description",
        "medicine",
        "drug",
        "drug name",
    },

    "category": {
        "category",
        "product category",
        "product_category",
        "item category",
        "item_category",
        "department",
        "group",
        "product group",
        "class",
    },

    "quantity": {
        "quantity",
        "qty",
        "units",
        "units sold",
        "unit sold",
        "quantity sold",
        "qty sold",
        "sales quantity",
        "items sold",
    },

    "unit_price": {
        "unit price",
        "unit_price",
        "selling price",
        "selling_price",
        "sale price",
        "sales price",
        "price",
        "retail price",
        "retail_price",
    },

    "cost_price": {
        "cost",
        "cost price",
        "cost_price",
        "buying price",
        "buying_price",
        "purchase price",
        "purchase_price",
        "unit cost",
        "unit_cost",
        "cost per unit",
        "wholesale cost",
    },

    "revenue": {
        "revenue",
        "sales",
        "sales amount",
        "sales_amount",
        "amount",
        "total",
        "total amount",
        "total_amount",
        "net sales",
        "net_sales",
        "sales value",
        "transaction value",
        "invoice total",
        "gross sales",
    },

    "discount": {
        "discount",
        "discount amount",
        "discount_amount",
        "discount value",
        "discount_value",
        "discount percentage",
        "discount percent",
    },

    "profit": {
        "profit",
        "gross profit",
        "gross_profit",
        "net profit",
        "net_profit",
        "margin",
        "profit amount",
    },

    "stock_quantity": {
        "stock",
        "stock quantity",
        "stock_quantity",
        "stock qty",
        "closing stock",
        "closing_stock",
        "quantity in stock",
        "qty in stock",
        "inventory quantity",
        "inventory qty",
        "quantity on hand",
        "qty on hand",
        "on hand",
        "available stock",
        "current stock",
    },

    "supplier": {
        "supplier",
        "supplier name",
        "supplier_name",
        "vendor",
        "vendor name",
        "vendor_name",
        "distributor",
        "manufacturer",
    },

    "branch": {
        "branch",
        "branch name",
        "branch_name",
        "location",
        "store",
        "store name",
        "outlet",
        "outlet name",
        "shop",
        "shop name",
    },

    "payment_method": {
        "payment method",
        "payment_method",
        "payment type",
        "payment_type",
        "method of payment",
        "payment mode",
        "cash type",
        "tender type",
    },

    "expiry_date": {
        "expiry date",
        "expiry_date",
        "expiration date",
        "expiration_date",
        "expires",
        "expiry",
        "expiration",
    },

    "batch_number": {
        "batch",
        "batch number",
        "batch_number",
        "batch no",
        "lot",
        "lot number",
        "lot_number",
    },
}


class ColumnMapper:
    FUZZY_THRESHOLD = 0.88

    @classmethod
    def map_columns(
        cls,
        columns: list[str],
    ) -> list[ColumnMatch]:
        matches: list[ColumnMatch] = []

        used_canonical_fields: set[str] = set()

        for column in columns:
            match = cls._find_best_match(
                column=column,
                used_canonical_fields=used_canonical_fields,
            )

            matches.append(match)

            if match.canonical_field:
                used_canonical_fields.add(
                    match.canonical_field
                )

        return matches

    @classmethod
    def _find_best_match(
        cls,
        column: str,
        used_canonical_fields: set[str],
    ) -> ColumnMatch:
        normalized_column = cls._normalize(column)

        if not normalized_column:
            return ColumnMatch(
                original_column=column,
                canonical_field=None,
                confidence=0.0,
                match_type="unmapped",
            )

        # Exact alias match
        for canonical_field, aliases in CANONICAL_FIELDS.items():
            if canonical_field in used_canonical_fields:
                continue

            normalized_aliases = {
                cls._normalize(alias)
                for alias in aliases
            }

            normalized_aliases.add(
                cls._normalize(canonical_field)
            )

            if normalized_column in normalized_aliases:
                return ColumnMatch(
                    original_column=column,
                    canonical_field=canonical_field,
                    confidence=1.0,
                    match_type="exact",
                )

        # Fuzzy match
        best_field: str | None = None
        best_score = 0.0

        for canonical_field, aliases in CANONICAL_FIELDS.items():
            if canonical_field in used_canonical_fields:
                continue

            candidates = set(aliases)
            candidates.add(canonical_field)

            for alias in candidates:
                score = SequenceMatcher(
                    None,
                    normalized_column,
                    cls._normalize(alias),
                ).ratio()

                if score > best_score:
                    best_score = score
                    best_field = canonical_field

        if (
            best_field is not None
            and best_score >= cls.FUZZY_THRESHOLD
        ):
            return ColumnMatch(
                original_column=column,
                canonical_field=best_field,
                confidence=round(best_score, 2),
                match_type="fuzzy",
            )

        return ColumnMatch(
            original_column=column,
            canonical_field=None,
            confidence=0.0,
            match_type="unmapped",
        )

    @staticmethod
    def _normalize(value: str) -> str:
        value = value.strip().lower()

        value = value.replace("&", "and")

        value = re.sub(
            r"[_\-./\\]+",
            " ",
            value,
        )

        value = re.sub(
            r"[^a-z0-9\s]",
            "",
            value,
        )

        value = re.sub(
            r"\s+",
            " ",
            value,
        )

        return value.strip()

    @staticmethod
    def calculate_mapping_coverage(
        matches: list[ColumnMatch],
    ) -> float:
        if not matches:
            return 0.0

        mapped_count = sum(
            1
            for match in matches
            if match.canonical_field is not None
        )

        return round(
            (mapped_count / len(matches)) * 100,
            2,
        )