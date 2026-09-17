from typing import Any

from pydantic import BaseModel, Field


class DatasetInspectionResponse(BaseModel):
    filename: str
    file_type: str

    sheet_name: str | None = None
    available_sheets: list[str] = Field(default_factory=list)

    row_count: int
    column_count: int

    columns: list[str]

    completeness_percent: float

    preview: list[dict[str, Any]]