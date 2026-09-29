"""
Analysis API routes for BizDoctor AI.

This module retrieves the complete uploaded dataset from the
temporary dataset store and routes analysis requests to the
appropriate analysis service.

Important architecture rule:

The frontend may only receive a small preview of the uploaded
dataset. Analysis must NEVER use that preview.

Every analysis request uses dataset_id to retrieve the complete
original dataset from DatasetStore.
"""

from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, Form, HTTPException, status

from app.schemas.analysis import (
    ExpiryAnalysisResponse,
    InventoryAnalysisResponse,
    ProfitabilityAnalysisResponse,
    SalesAnalysisResponse,
)
from app.schemas.data import ColumnMapping
from app.services.business_analysis import BusinessAnalysisService
from app.services.customer_analysis import CustomerAnalysisService
from app.services.dataset_store import DatasetStore
from app.services.expiry_analysis import ExpiryAnalysisService
from app.services.inventory_analysis import InventoryAnalysisService
from app.services.profitability_analysis import ProfitabilityAnalysisService


router = APIRouter()


def _parse_mappings(
    mappings: str | list[dict[str, Any]] | list[ColumnMapping],
) -> list[ColumnMapping]:
    """
    Parse frontend mappings and convert them into ColumnMapping
    objects expected by the analysis services.
    """

    # ---------------------------------------------------------
    # PARSE JSON STRING
    # ---------------------------------------------------------

    if isinstance(mappings, str):
        try:
            parsed = json.loads(mappings)
        except json.JSONDecodeError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid column mappings. Expected valid JSON.",
            ) from exc
    else:
        parsed = mappings

    # ---------------------------------------------------------
    # VALIDATE LIST
    # ---------------------------------------------------------

    if not isinstance(parsed, list):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid column mappings. Expected a list.",
        )

    if len(parsed) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Column mappings are required.",
        )

    # ---------------------------------------------------------
    # CONVERT DICTIONARIES TO PYDANTIC MODELS
    # ---------------------------------------------------------

    validated_mappings: list[ColumnMapping] = []

    for mapping in parsed:
        if isinstance(mapping, ColumnMapping):
            validated_mappings.append(mapping)
            continue

        if not isinstance(mapping, dict):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid column mapping format.",
            )

        try:
            validated_mappings.append(
                ColumnMapping.model_validate(mapping)
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid column mapping format.",
            ) from exc

    return validated_mappings


def _get_dataset(dataset_id: str | None):
    """
    Retrieve the complete uploaded dataset from DatasetStore.
    """

    if not dataset_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dataset ID is required.",
        )

    try:
        return DatasetStore.get(dataset_id)
    except KeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "The uploaded dataset could not be found. "
                "It may have expired or the server may have restarted."
            ),
        ) from exc


@router.post(
    "/analyze",
    response_model=(
        SalesAnalysisResponse
        | ProfitabilityAnalysisResponse
        | InventoryAnalysisResponse
        | ExpiryAnalysisResponse
    ),
    status_code=status.HTTP_200_OK,
    summary="Run business analysis on an uploaded dataset",
)
async def analyze_dataset(
    analysis_type: str = Form(...),
    dataset_id: str | None = Form(default=None),
    mappings: str = Form(...),
    currency: str = Form(default="NGN"),
):
    """
    Run an analysis against the complete uploaded dataset.

    Supported analysis types:

    - sales
    - customer
    - profitability
    - inventory
    - expiry
    """

    # ---------------------------------------------------------
    # GET COMPLETE DATASET
    # ---------------------------------------------------------

    dataframe = _get_dataset(dataset_id)

    # ---------------------------------------------------------
    # PARSE CONFIRMED COLUMN MAPPINGS
    # ---------------------------------------------------------

    parsed_mappings = _parse_mappings(mappings)

    normalized_analysis_type = analysis_type.strip().lower()

    # ---------------------------------------------------------
    # SALES ANALYSIS
    # ---------------------------------------------------------

    if normalized_analysis_type == "sales":
        result = BusinessAnalysisService.analyze(
            dataframe=dataframe,
            mappings=parsed_mappings,
            currency=currency,
        )

        return SalesAnalysisResponse(**result)

    # ---------------------------------------------------------
    # CUSTOMER ANALYSIS
    # ---------------------------------------------------------

    if normalized_analysis_type == "customer":
        sales_result = BusinessAnalysisService.analyze(
            dataframe=dataframe,
            mappings=parsed_mappings,
            currency=currency,
        )

        customer_result = CustomerAnalysisService.analyze(
            dataframe=dataframe,
            mappings=parsed_mappings,
        )

        sales_result["customer_analysis"] = customer_result

        return SalesAnalysisResponse(**sales_result)

    # ---------------------------------------------------------
    # PROFITABILITY ANALYSIS
    # ---------------------------------------------------------

    if normalized_analysis_type == "profitability":
        result = ProfitabilityAnalysisService.analyze(
            dataframe=dataframe,
            mappings=parsed_mappings,
            currency=currency,
        )

        return ProfitabilityAnalysisResponse(
            profitability=result
        )

    # ---------------------------------------------------------
    # INVENTORY ANALYSIS
    # ---------------------------------------------------------

    if normalized_analysis_type == "inventory":
        result = InventoryAnalysisService.analyze(
            dataframe=dataframe,
            mappings=parsed_mappings,
        )

        return InventoryAnalysisResponse(
            inventory=result
        )

    # ---------------------------------------------------------
    # EXPIRY ANALYSIS
    # ---------------------------------------------------------

    if normalized_analysis_type == "expiry":
        result = ExpiryAnalysisService.analyze(
            dataframe=dataframe,
            mappings=parsed_mappings,
        )

        return ExpiryAnalysisResponse(
            expiry=result
        )

    # ---------------------------------------------------------
    # UNSUPPORTED ANALYSIS
    # ---------------------------------------------------------

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=(
            f"Unsupported analysis type: "
            f"{normalized_analysis_type}"
        ),
    )


async def analyze_sales(
    payload: dict[str, Any],
):
    """
    Backward-compatible sales analysis handler.

    Existing tests and internal callers use this function
    with a normal Python dictionary.

    The function still retrieves the complete dataset from
    DatasetStore using dataset_id.
    """

    # ---------------------------------------------------------
    # DATASET ID
    # ---------------------------------------------------------

    dataset_id = payload.get("dataset_id")

    if not dataset_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dataset ID is required.",
        )

    # ---------------------------------------------------------
    # RETRIEVE COMPLETE DATASET
    # ---------------------------------------------------------

    try:
        dataframe = DatasetStore.get(dataset_id)
    except KeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "The uploaded dataset could not be found. "
                "It may have expired or the server may have restarted."
            ),
        ) from exc

    # ---------------------------------------------------------
    # REQUIRE MAPPINGS
    # ---------------------------------------------------------

    if "mappings" not in payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Column mappings are required.",
        )

    mappings = payload.get("mappings")

    if mappings is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Column mappings are required.",
        )

    # ---------------------------------------------------------
    # CONVERT MAPPINGS TO COLUMNMAPPING OBJECTS
    # ---------------------------------------------------------

    parsed_mappings = _parse_mappings(mappings)

    # ---------------------------------------------------------
    # CURRENCY
    # ---------------------------------------------------------

    currency = payload.get(
        "currency",
        "NGN",
    )

    # ---------------------------------------------------------
    # RUN ANALYSIS AGAINST COMPLETE DATASET
    # ---------------------------------------------------------

    result = BusinessAnalysisService.analyze(
        dataframe=dataframe,
        mappings=parsed_mappings,
        currency=currency,
    )

    return SalesAnalysisResponse(**result)