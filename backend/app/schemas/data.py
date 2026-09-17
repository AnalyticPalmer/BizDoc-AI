from typing import Any

from pydantic import BaseModel, Field


class ColumnMapping(BaseModel):
    original_column: str
    canonical_field: str | None
    confidence: float
    match_type: str


class MappingSummary(BaseModel):
    mapped_columns: int
    unmapped_columns: int
    coverage_percent: float


class DatasetInspectionResponse(BaseModel):
    filename: str
    file_type: str

    sheet_name: str | None = None
    available_sheets: list[str] = Field(
        default_factory=list
    )

    row_count: int
    column_count: int

    columns: list[str]

    completeness_percent: float

    mapping_summary: MappingSummary

    column_mappings: list[ColumnMapping]

    preview: list[dict[str, Any]]