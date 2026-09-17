from app.services.column_mapper import (
    ColumnMapper,
)


def test_standard_retail_columns_are_mapped() -> None:
    columns = [
        "Sales Date",
        "Invoice No",
        "Customer Name",
        "Product Name",
        "Qty",
        "Selling Price",
        "Buying Price",
        "Total Amount",
        "Closing Stock",
    ]

    matches = ColumnMapper.map_columns(
        columns
    )

    mapping = {
        match.original_column:
        match.canonical_field
        for match in matches
    }

    assert mapping["Sales Date"] == (
        "transaction_date"
    )

    assert mapping["Invoice No"] == (
        "order_id"
    )

    assert mapping["Customer Name"] == (
        "customer_name"
    )

    assert mapping["Product Name"] == (
        "product_name"
    )

    assert mapping["Qty"] == "quantity"

    assert mapping["Selling Price"] == (
        "unit_price"
    )

    assert mapping["Buying Price"] == (
        "cost_price"
    )

    assert mapping["Total Amount"] == (
        "revenue"
    )

    assert mapping["Closing Stock"] == (
        "stock_quantity"
    )


def test_pharmacy_columns_are_mapped() -> None:
    columns = [
        "Drug Name",
        "Batch No",
        "Expiry Date",
        "Qty On Hand",
    ]

    matches = ColumnMapper.map_columns(
        columns
    )

    mapping = {
        match.original_column:
        match.canonical_field
        for match in matches
    }

    assert mapping["Drug Name"] == (
        "product_name"
    )

    assert mapping["Batch No"] == (
        "batch_number"
    )

    assert mapping["Expiry Date"] == (
        "expiry_date"
    )

    assert mapping["Qty On Hand"] == (
        "stock_quantity"
    )


def test_unknown_columns_remain_unmapped() -> None:
    columns = [
        "Internal Comment",
        "Manager Note",
    ]

    matches = ColumnMapper.map_columns(
        columns
    )

    assert all(
        match.canonical_field is None
        for match in matches
    )


def test_mapping_coverage_is_calculated() -> None:
    columns = [
        "Date",
        "Product",
        "Qty",
        "Random Notes",
    ]

    matches = ColumnMapper.map_columns(
        columns
    )

    coverage = (
        ColumnMapper
        .calculate_mapping_coverage(
            matches
        )
    )

    assert coverage == 75.0