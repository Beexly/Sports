"""Zero-waste BigQuery dry-run guard & GCS archival adapter (google-cloud-python).

Enforces a hard byte-scanned budget via dry-run query inspection prior to
running SQL against `gse_data`, preventing accidental full-table scans from
exhausting GCP billing credits.
"""

from __future__ import annotations

import hashlib
from typing import Any, Protocol

DEFAULT_MAX_BYTES_BILLED = 1_073_741_824  # 1 GiB ceiling per query


class BytesBilledLimitExceeded(RuntimeError):
    """Raised when a dry-run query plan exceeds `max_bytes_billed`."""


class DryRunJobProtocol(Protocol):
    """Minimal BigQuery dry-run query job response shape."""

    total_bytes_processed: int


class BigQueryClientProtocol(Protocol):
    """Protocol satisfied by google.cloud.bigquery.Client or deterministic fakes."""

    def estimate_query_bytes(self, sql: str) -> int:
        """Executes a BigQuery dry run and returns bytes to be processed."""
        ...

    def execute_query(self, sql: str, max_bytes_billed: int) -> list[dict[str, Any]]:
        """Runs a query capped by `max_bytes_billed` and yields row mappings."""
        ...


class ObjectBucketClientProtocol(Protocol):
    """Protocol satisfied by wrapped GCS upload clients or deterministic fakes."""

    def upload_bytes(
        self,
        *,
        bucket: str,
        blob_name: str,
        data: bytes,
        content_type: str,
        metadata: dict[str, str],
    ) -> str:
        """Uploads payload bytes and returns the canonical gs:// URI."""
        ...


class GcpWarehouseAdapter:
    """Cost-bounded BigQuery SQL executor & SHA-256 verified GCS uploader."""

    def __init__(
        self,
        bq_client: BigQueryClientProtocol | None = None,
        gcs_client: ObjectBucketClientProtocol | None = None,
    ) -> None:
        """Attaches BigQuery and GCS clients (injectable for offline tests)."""
        self._bq = bq_client
        self._gcs = gcs_client

    def execute_guarded_query(
        self,
        sql: str,
        *,
        max_bytes_billed: int = DEFAULT_MAX_BYTES_BILLED,
    ) -> tuple[int, list[dict[str, Any]]]:
        """Estimates byte cost via dry-run first and refuses runaway queries."""
        if max_bytes_billed <= 0:
            raise ValueError("max_bytes_billed must be positive.")
        if self._bq is None:
            raise RuntimeError("No BigQuery client configured on GcpWarehouseAdapter.")

        estimated_bytes = self._bq.estimate_query_bytes(sql)
        if estimated_bytes > max_bytes_billed:
            raise BytesBilledLimitExceeded(
                f"Dry-run estimated {estimated_bytes} bytes "
                f"exceeds cap of {max_bytes_billed} bytes."
            )

        rows = self._bq.execute_query(sql, max_bytes_billed=max_bytes_billed)
        return estimated_bytes, rows

    def upload_artifact(
        self,
        bucket_name: str,
        object_name: str,
        payload: bytes,
        *,
        content_type: str = "application/json",
    ) -> dict[str, str]:
        """Uploads bytes with embedded SHA-256 metadata for integrity auditing."""
        if self._gcs is None:
            raise RuntimeError("No GCS client configured on GcpWarehouseAdapter.")
        digest = hashlib.sha256(payload).hexdigest()
        uri = self._gcs.upload_bytes(
            bucket=bucket_name,
            blob_name=object_name,
            data=payload,
            content_type=content_type,
            metadata={"sha256": digest},
        )
        return {"uri": uri, "sha256": digest, "bucket": bucket_name, "object": object_name}
