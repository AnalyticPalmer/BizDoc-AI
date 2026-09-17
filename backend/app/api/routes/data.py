from fastapi import (
    APIRouter,
    File,
    Form,
    UploadFile,
    status,
)

from app.schemas.data import DatasetInspectionResponse
from app.services.data_inspection import DataInspectionService


router = APIRouter()


@router.post(
    "/inspect",
    response_model=DatasetInspectionResponse,
    status_code=status.HTTP_200_OK,
    summary="Inspect an uploaded business dataset",
)
async def inspect_dataset(
    file: UploadFile = File(...),
    sheet_name: str | None = Form(default=None),
) -> DatasetInspectionResponse:
    inspection = await DataInspectionService.inspect_file(
        file=file,
        requested_sheet=sheet_name,
    )

    return DatasetInspectionResponse(**inspection)