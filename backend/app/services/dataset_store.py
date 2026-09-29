"""
Temporary in-memory storage for uploaded BizDoctor datasets.

The MVP uses an in-memory store so the complete uploaded dataset
can be reused across the inspection, mapping, and analysis steps.

This is intentionally simple for local development.

For production deployment, this should eventually be replaced with
persistent/object storage so datasets survive application restarts
and can be managed securely.
"""

from __future__ import annotations

from threading import Lock
from typing import Any
from uuid import uuid4

import pandas as pd


class DatasetStore:
    """
    Temporary storage for complete uploaded datasets.

    Each uploaded dataset receives a unique dataset_id.

    Example:

        dataset_id = DatasetStore.save(dataframe)

        dataframe = DatasetStore.get(dataset_id)
    """

    _datasets: dict[str, pd.DataFrame] = {}
    _lock = Lock()

    @classmethod
    def save(cls, dataframe: pd.DataFrame) -> str:
        """
        Store a copy of the complete dataframe.

        Returns:
            A unique dataset identifier.
        """

        dataset_id = str(uuid4())

        with cls._lock:
            cls._datasets[dataset_id] = dataframe.copy(deep=True)

        return dataset_id

    @classmethod
    def get(cls, dataset_id: str) -> pd.DataFrame:
        """
        Retrieve a stored dataset.

        Raises:
            KeyError: If the dataset does not exist.
        """

        with cls._lock:
            dataframe = cls._datasets.get(dataset_id)

            if dataframe is None:
                raise KeyError(dataset_id)

            return dataframe.copy(deep=True)

    @classmethod
    def delete(cls, dataset_id: str) -> bool:
        """
        Delete a stored dataset.

        Returns:
            True if the dataset existed and was deleted.
            False if it did not exist.
        """

        with cls._lock:
            return cls._datasets.pop(
                dataset_id,
                None,
            ) is not None

    @classmethod
    def exists(cls, dataset_id: str) -> bool:
        """
        Check whether a dataset exists.
        """

        with cls._lock:
            return dataset_id in cls._datasets

    @classmethod
    def clear(cls) -> None:
        """
        Clear all stored datasets.

        Primarily useful for tests and local development.
        """

        with cls._lock:
            cls._datasets.clear()

    @classmethod
    def count(cls) -> int:
        """
        Return the number of currently stored datasets.
        """

        with cls._lock:
            return len(cls._datasets)