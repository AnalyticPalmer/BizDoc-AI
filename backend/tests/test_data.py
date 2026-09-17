from io import BytesIO

from fastapi.testclient import TestClient
from openpyxl import Workbook

from app.main import app


client = TestClient(app)


def test_csv_upload_is_inspected_successfully() -> None:
    csv_content = (
        "Date,Product,Quantity,Revenue\n"
        "2026-01-01,Laptop,2,850000\n"
        "2026-01-02,Mouse,5,125000\n"
        "2026-01-03,Keyboard,3,180000\n"
    )

    response = client.post(
        "/api/v1/data/inspect",
        files={
            "file": (
                "sales.csv",
                csv_content,
                "text/csv",
            )
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["filename"] == "sales.csv"
    assert data["file_type"] == "csv"
    assert data["row_count"] == 3
    assert data["column_count"] == 4

    assert data["columns"] == [
        "Date",
        "Product",
        "Quantity",
        "Revenue",
    ]

    assert data["completeness_percent"] == 100.0

    assert len(data["preview"]) == 3


def test_excel_upload_is_inspected_successfully() -> None:
    workbook = Workbook()

    worksheet = workbook.active

    worksheet.title = "Sales"

    worksheet.append(
        [
            "Date",
            "Product",
            "Quantity",
            "Revenue",
        ]
    )

    worksheet.append(
        [
            "2026-01-01",
            "Laptop",
            2,
            850000,
        ]
    )

    worksheet.append(
        [
            "2026-01-02",
            "Mouse",
            5,
            125000,
        ]
    )

    buffer = BytesIO()

    workbook.save(buffer)

    response = client.post(
        "/api/v1/data/inspect",
        files={
            "file": (
                "sales.xlsx",
                buffer.getvalue(),
                (
                    "application/vnd.openxmlformats-"
                    "officedocument.spreadsheetml.sheet"
                ),
            )
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["filename"] == "sales.xlsx"
    assert data["file_type"] == "xlsx"

    assert data["sheet_name"] == "Sales"

    assert data["available_sheets"] == [
        "Sales"
    ]

    assert data["row_count"] == 2

    assert data["column_count"] == 4


def test_invalid_file_extension_is_rejected() -> None:
    response = client.post(
        "/api/v1/data/inspect",
        files={
            "file": (
                "sales.txt",
                b"test data",
                "text/plain",
            )
        },
    )

    assert response.status_code == 415