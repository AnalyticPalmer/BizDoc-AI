from __future__ import annotations

from io import BytesIO
from pathlib import Path
from typing import Any

import pandas as pd
from fastapi import (
    HTTPException,
    UploadFile,
    status,
)

from app.services.column_mapper import ColumnMapper


ALLOWED_EXTENSIONS = {
    ".csv",
    ".xlsx",
    ".xls",
}

MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024

PREVIEW_ROWS = 10


class DataInspectionService:
    @staticmethod
    async def inspect_file(
        file: UploadFile,
        requested_sheet: str | None = None,
    ) -> dict[str, Any]:
        filename = (
            DataInspectionService._validate_filename(
                file
            )
        )

        extension = (
            Path(filename).suffix.lower()
        )

        if extension not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=(
                    status.HTTP_415_UNSUPPORTED_MEDIA_TYPE
                ),
                detail=(
                    "Unsupported file type. "
                    "Please upload a CSV, XLS, or XLSX file."
                ),
            )

        content = await file.read()

        if not content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The uploaded file is empty.",
            )

        if len(content) > MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=(
                    status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
                ),
                detail=(
                    "The file is larger than the "
                    "25 MB upload limit."
                ),
            )

        try:
            if extension == ".csv":
                dataframe = (
                    DataInspectionService._read_csv(
                        content
                    )
                )

                sheet_name = None
                available_sheets: list[str] = []

            else:
                (
                    dataframe,
                    sheet_name,
                    available_sheets,
                ) = DataInspectionService._read_excel(
                    content=content,
                    requested_sheet=requested_sheet,
                    extension=extension,
                )

        except HTTPException:
            raise

        except Exception as exc:
            raise HTTPException(
                status_code=(
                    status.HTTP_422_UNPROCESSABLE_ENTITY
                ),
                detail=(
                    "BizDoctor could not read this file. "
                    "Please confirm that the file is "
                    "valid and not corrupted."
                ),
            ) from exc

        dataframe = (
            DataInspectionService._prepare_dataframe(
                dataframe
            )
        )

        columns = dataframe.columns.tolist()

        column_matches = ColumnMapper.map_columns(
            columns
        )

        mapping_coverage = (
            ColumnMapper.calculate_mapping_coverage(
                column_matches
            )
        )

        mapped_columns = sum(
            1
            for match in column_matches
            if match.canonical_field is not None
        )

        unmapped_columns = (
            len(column_matches) - mapped_columns
        )

        column_mappings = [
            {
                "original_column": (
                    match.original_column
                ),
                "canonical_field": (
                    match.canonical_field
                ),
                "confidence": match.confidence,
                "match_type": match.match_type,
            }
            for match in column_matches
        ]

        return {
            "filename": filename,
            "file_type": (
                extension.removeprefix(".")
            ),
            "sheet_name": sheet_name,
            "available_sheets": available_sheets,
            "row_count": int(
                dataframe.shape[0]
            ),
            "column_count": int(
                dataframe.shape[1]
            ),
            "columns": columns,
            "completeness_percent": (
                DataInspectionService
                ._calculate_completeness(
                    dataframe
                )
            ),
            "mapping_summary": {
                "mapped_columns": mapped_columns,
                "unmapped_columns": (
                    unmapped_columns
                ),
                "coverage_percent": (
                    mapping_coverage
                ),
            },
            "column_mappings": (
                column_mappings
            ),
            "preview": (
                DataInspectionService
                ._build_preview(
                    dataframe
                )
            ),
        }

    @staticmethod
    def _validate_filename(
        file: UploadFile,
    ) -> str:
        if not file.filename:
            raise HTTPException(
                status_code=(
                    status.HTTP_400_BAD_REQUEST
                ),
                detail=(
                    "The uploaded file does not "
                    "have a filename."
                ),
            )

        filename = Path(
            file.filename
        ).name.strip()

        if not filename:
            raise HTTPException(
                status_code=(
                    status.HTTP_400_BAD_REQUEST
                ),
                detail="Invalid filename.",
            )

        return filename

    @staticmethod
    def _read_csv(
        content: bytes,
    ) -> pd.DataFrame:
        encodings = (
            "utf-8-sig",
            "utf-8",
            "cp1252",
            "latin-1",
        )

        last_error: Exception | None = None

        for encoding in encodings:
            try:
                return pd.read_csv(
                    BytesIO(content),
                    encoding=encoding,
                )

            except UnicodeDecodeError as exc:
                last_error = exc

        raise HTTPException(
            status_code=(
                status.HTTP_422_UNPROCESSABLE_ENTITY
            ),
            detail=(
                "BizDoctor could not determine "
                "the CSV file encoding."
            ),
        ) from last_error

    @staticmethod
    def _read_excel(
        content: bytes,
        requested_sheet: str | None,
        extension: str,
    ) -> tuple[
        pd.DataFrame,
        str,
        list[str],
    ]:
        engine = (
            "openpyxl"
            if extension == ".xlsx"
            else "xlrd"
        )

        excel_file = pd.ExcelFile(
            BytesIO(content),
            engine=engine,
        )

        available_sheets = (
            excel_file.sheet_names
        )

        if not available_sheets:
            raise HTTPException(
                status_code=(
                    status.HTTP_422_UNPROCESSABLE_ENTITY
                ),
                detail=(
                    "No worksheets were found "
                    "in the Excel file."
                ),
            )

        if requested_sheet:
            if (
                requested_sheet
                not in available_sheets
            ):
                raise HTTPException(
                    status_code=(
                        status.HTTP_400_BAD_REQUEST
                    ),
                    detail=(
                        f"Worksheet '{requested_sheet}' "
                        "was not found in the "
                        "uploaded workbook."
                    ),
                )

            selected_sheet = requested_sheet

        else:
            selected_sheet = (
                available_sheets[0]
            )

        dataframe = pd.read_excel(
            excel_file,
            sheet_name=selected_sheet,
        )

        return (
            dataframe,
            selected_sheet,
            available_sheets,
        )

    @staticmethod
    def _prepare_dataframe(
        dataframe: pd.DataFrame,
    ) -> pd.DataFrame:
        dataframe = dataframe.copy()

        if (
            dataframe.empty
            and len(dataframe.columns) == 0
        ):
            raise HTTPException(
                status_code=(
                    status.HTTP_422_UNPROCESSABLE_ENTITY
                ),
                detail=(
                    "The uploaded dataset does "
                    "not contain any data."
                ),
            )

        dataframe.columns = [
            DataInspectionService
            ._clean_column_name(column)
            for column in dataframe.columns
        ]

        duplicated_columns = (
            dataframe.columns.duplicated()
        )

        if duplicated_columns.any():
            dataframe.columns = (
                DataInspectionService
                ._make_columns_unique(
                    dataframe.columns.tolist()
                )
            )

        return dataframe

    @staticmethod
    def _clean_column_name(
        column: Any,
    ) -> str:
        cleaned = str(column).strip()

        if not cleaned:
            return "Unnamed Column"

        return cleaned

    @staticmethod
    def _make_columns_unique(
        columns: list[str],
    ) -> list[str]:
        counts: dict[str, int] = {}

        unique_columns: list[str] = []

        for column in columns:
            count = counts.get(
                column,
                0,
            )

            if count == 0:
                unique_columns.append(column)
            else:
                unique_columns.append(
                    f"{column} ({count + 1})"
                )

            counts[column] = count + 1

        return unique_columns

    @staticmethod
    def _calculate_completeness(
        dataframe: pd.DataFrame,
    ) -> float:
        if dataframe.empty:
            return 0.0

        total_cells = (
            dataframe.shape[0]
            * dataframe.shape[1]
        )

        if total_cells == 0:
            return 0.0

        populated_cells = int(
            dataframe.notna().sum().sum()
        )

        percentage = (
            populated_cells
            / total_cells
        ) * 100

        return round(
            percentage,
            2,
        )

    @staticmethod
    def _build_preview(
        dataframe: pd.DataFrame,
    ) -> list[dict[str, Any]]:
        preview_dataframe = (
            dataframe.head(
                PREVIEW_ROWS
            )
        )

        records: list[
            dict[str, Any]
        ] = []

        for (
            _,
            row,
        ) in preview_dataframe.iterrows():
            record: dict[
                str,
                Any,
            ] = {}

            for (
                column,
                value,
            ) in row.items():
                record[column] = (
                    DataInspectionService
                    ._make_json_safe(
                        value
                    )
                )

            records.append(record)

        return records

    @staticmethod
    def _make_json_safe(
        value: Any,
    ) -> Any:
        if pd.isna(value):
            return None

        if isinstance(
            value,
            pd.Timestamp,
        ):
            return value.isoformat()

        if hasattr(
            value,
            "item",
        ):
            try:
                return value.item()

            except (
                ValueError,
                AttributeError,
            ):
                pass

        return value