import asyncio

import pandas as pd

from app.api.routes.analysis import analyze_sales
from app.services.dataset_store import DatasetStore


def build_sales_dataset() -> pd.DataFrame:
    """
    Build a representative sales dataset for testing.

    The dataset intentionally contains more rows than a typical
    frontend preview so we can verify that the analysis uses the
    complete stored dataset.
    """

    return pd.DataFrame(
        [
            {
                "Date": "2026-01-05",
                "Product": "Laptop",
                "Quantity": 2,
                "Revenue": 500000,
                "Order ID": "ORD-001",
            },
            {
                "Date": "2026-01-10",
                "Product": "Phone",
                "Quantity": 3,
                "Revenue": 450000,
                "Order ID": "ORD-002",
            },
            {
                "Date": "2026-02-03",
                "Product": "Laptop",
                "Quantity": 1,
                "Revenue": 250000,
                "Order ID": "ORD-003",
            },
            {
                "Date": "2026-02-15",
                "Product": "Tablet",
                "Quantity": 4,
                "Revenue": 300000,
                "Order ID": "ORD-004",
            },
            {
                "Date": "2026-03-01",
                "Product": "Phone",
                "Quantity": 2,
                "Revenue": 300000,
                "Order ID": "ORD-005",
            },
        ]
    )


def build_mappings() -> list[dict]:
    """
    Build the confirmed column mappings used by the analysis service.
    """

    return [
        {
            "original_column": "Date",
            "canonical_field": "transaction_date",
            "confidence": 1.0,
            "match_type": "exact",
        },
        {
            "original_column": "Product",
            "canonical_field": "product_name",
            "confidence": 1.0,
            "match_type": "exact",
        },
        {
            "original_column": "Quantity",
            "canonical_field": "quantity",
            "confidence": 1.0,
            "match_type": "exact",
        },
        {
            "original_column": "Revenue",
            "canonical_field": "revenue",
            "confidence": 1.0,
            "match_type": "exact",
        },
        {
            "original_column": "Order ID",
            "canonical_field": "order_id",
            "confidence": 1.0,
            "match_type": "exact",
        },
    ]


def setup_function() -> None:
    """
    Clear the temporary dataset store before every test.
    """

    DatasetStore.clear()


def test_sales_analysis_uses_complete_stored_dataset() -> None:
    """
    Verify that sales analysis uses the complete stored dataset.

    This test is important because the frontend preview may contain
    only a small number of rows.

    The analysis must retrieve the full DataFrame from DatasetStore.
    """

    dataframe = build_sales_dataset()

    dataset_id = DatasetStore.save(
        dataframe
    )

    payload = {
        "dataset_id": dataset_id,
        "mappings": build_mappings(),
    }

    response = asyncio.run(
        analyze_sales(payload)
    )

    # Total revenue across ALL five rows.
    assert response.revenue.value == 1_800_000

    # Five unique orders.
    assert response.orders.value == 5

    # Total quantity across ALL five rows.
    assert response.units_sold.value == 12

    # Average order value.
    assert response.average_order_value.value == 360_000


def test_sales_analysis_requires_dataset_id() -> None:
    """
    Verify that analysis cannot run without a dataset ID.
    """

    payload = {
        "mappings": build_mappings(),
    }

    try:
        asyncio.run(
            analyze_sales(payload)
        )

        assert False, (
            "Expected analyze_sales to raise an HTTPException."
        )

    except Exception as exc:
        assert getattr(
            exc,
            "status_code",
            None,
        ) == 400

        assert getattr(
            exc,
            "detail",
            None,
        ) == "Dataset ID is required."


def test_sales_analysis_returns_404_for_unknown_dataset() -> None:
    """
    Verify that an invalid or expired dataset ID returns HTTP 404.
    """

    payload = {
        "dataset_id": "missing-dataset-id",
        "mappings": build_mappings(),
    }

    try:
        asyncio.run(
            analyze_sales(payload)
        )

        assert False, (
            "Expected analyze_sales to raise an HTTPException."
        )

    except Exception as exc:
        assert getattr(
            exc,
            "status_code",
            None,
        ) == 404

        assert getattr(
            exc,
            "detail",
            None,
        ) == (
            "The uploaded dataset could not be found. "
            "It may have expired or the server may have restarted."
        )


def test_sales_analysis_requires_mappings() -> None:
    """
    Verify that analysis cannot run without column mappings.
    """

    dataframe = build_sales_dataset()

    dataset_id = DatasetStore.save(
        dataframe
    )

    payload = {
        "dataset_id": dataset_id,
    }

    try:
        asyncio.run(
            analyze_sales(payload)
        )

        assert False, (
            "Expected analyze_sales to raise an HTTPException."
        )

    except Exception as exc:
        assert getattr(
            exc,
            "status_code",
            None,
        ) == 400

        assert getattr(
            exc,
            "detail",
            None,
        ) == "Column mappings are required."