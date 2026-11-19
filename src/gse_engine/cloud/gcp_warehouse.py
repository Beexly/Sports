"""Zero-waste BigQuery dry-run guard & GCS archival adapter (google-cloud-python).

Enforces a hard byte-scanned budget via dry-run query inspection prior to
running SQL against `gse_data`, preventing accidental full-table scans from
exhausting GCP billing credits.
"""

from __future__ import annotations

import hashlib
import re
from collections.abc import Sequence
from typing import Any, Protocol

DEFAULT_MAX_BYTES_BILLED = 1_073_741_824  # 1 GiB ceiling per query
GSE_CALIBRATION_DATASET = "gse_calibration"
GSE_CALIBRATION_REGION = "US"
_SELECT_STAR_RE = re.compile(r"\bSELECT\s+\*", re.IGNORECASE)
_PARTITION_PREDICATE_RE = re.compile(
    r"\bWHERE\b.*\b(?:season|week|settled_date|timestamp)\b",
    re.IGNORECASE | re.DOTALL,
)
_SAFE_IDENT_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
_UNSAFE_SQL_FRAGMENT_RE = re.compile(
    r"(?:;|--|\*/|/\*|\bUNION\b|\bDROP\b|\bDELETE\b|\bINSERT\b|\bUPDATE\b|\bALTER\b)",
    re.IGNORECASE,
)


def _validate_partition_where_clause(where_clause: str) -> str:
    clean = where_clause.strip()
    if not clean:
        raise ValueError("where_partition_clause must be non-empty.")
    if _UNSAFE_SQL_FRAGMENT_RE.search(clean):
        raise ValueError(
            "Unsafe SQL token detected in where_partition_clause "
            "(semicolons, comments, and DML/DDL keywords are forbidden)."
        )
    return clean


def validate_partitioned_calibration_sql(sql: str) -> None:
    """Reject unpartitioned, stacked, or `SELECT *` queries against BigQuery `gse_calibration`."""
    stripped = sql.strip()
    if not stripped:
        raise ValueError("Calibration SQL must be non-empty.")
    if _UNSAFE_SQL_FRAGMENT_RE.search(stripped.rstrip(";")):
        raise ValueError("Unsafe SQL comment, stacked statement, or keyword rejected.")
    if _SELECT_STAR_RE.search(stripped):
        raise ValueError(
            "Unbounded `SELECT *` is disallowed against gse_calibration; "
            "project explicit calibration columns."
        )
    if not _PARTITION_PREDICATE_RE.search(stripped):
        raise ValueError(
            "Calibration SQL must filter on a partition column "
            "(`season`, `week`, or `settled_date`)."
        )


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
        require_calibration_partition: bool = False,
    ) -> tuple[int, list[dict[str, Any]]]:
        """Estimates byte cost via dry-run first and refuses runaway queries."""
        if max_bytes_billed <= 0:
            raise ValueError("max_bytes_billed must be positive.")
        if require_calibration_partition:
            validate_partitioned_calibration_sql(sql)
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


def _validate_identifier(name: str, label: str) -> str:
    clean = name.strip()
    if not _SAFE_IDENT_RE.fullmatch(clean):
        raise ValueError(f"Invalid SQL {label}: {name!r}")
    return clean


def _normalize_explicit_columns(select_columns: Sequence[str]) -> str:
    cols = [col.strip() for col in select_columns if col.strip()]
    if not cols:
        raise ValueError("select_columns must be non-empty.")
    if any("*" in col for col in cols):
        raise ValueError("Wildcard `*` is forbidden in BigQuery projection columns.")
    for col in cols:
        if not _SAFE_IDENT_RE.fullmatch(col):
            raise ValueError(f"Unsafe projection column identifier: {col!r}")
    return ", ".join(cols)


def build_time_partitioned_table_ddl(
    dataset: str,
    table: str,
    columns: Sequence[tuple[str, str]],
    *,
    partition_column: str = "settled_date",
) -> str:
    """Build time-partitioned BigQuery table DDL enforcing zero unpartitioned storage."""
    ds = _validate_identifier(dataset, "dataset")
    tbl = _validate_identifier(table, "table")
    part_col = _validate_identifier(partition_column, "partition_column")
    if part_col.lower() not in {"settled_date", "timestamp"}:
        raise ValueError(
            "partition_column must be `settled_date` or `timestamp` for BigQuery partitioning."
        )
    if not columns:
        raise ValueError("columns schema cannot be empty.")
    col_defs: list[str] = []
    seen_cols: set[str] = set()
    for col_name, col_type in columns:
        cname = _validate_identifier(col_name, "column")
        ctype = col_type.strip().upper()
        if not ctype or not re.fullmatch(r"[A-Z0-9_]+", ctype):
            raise ValueError(f"Invalid BigQuery column type: {col_type!r}")
        col_defs.append(f"{cname} {ctype}")
        seen_cols.add(cname)
    if part_col not in seen_cols:
        raise ValueError(f"partition_column {part_col!r} must exist in table columns.")
    part_expr = (
        f"DATE({part_col})" if part_col.lower() == "timestamp" else part_col
    )
    cols_sql = ",\n  ".join(col_defs)
    return (
        f"CREATE TABLE IF NOT EXISTS `{ds}.{tbl}` (\n  {cols_sql}\n)\n"
        f"PARTITION BY {part_expr}\n"
        "OPTIONS(require_partition_filter = TRUE);"
    )


def build_bqml_logistic_model_sql(
    model_name: str,
    source_table: str,
    select_columns: Sequence[str],
    where_partition_clause: str,
    *,
    dataset: str = GSE_CALIBRATION_DATASET,
    label_column: str = "outcome",
) -> str:
    """Build a partition-filtered BigQuery ML LOGISTIC_REG training SQL statement."""
    ds = _validate_identifier(dataset, "dataset")
    mdl = _validate_identifier(model_name, "model_name")
    tbl = _validate_identifier(source_table, "source_table")
    lbl = _validate_identifier(label_column, "label_column")
    cols_sql = _normalize_explicit_columns(select_columns)
    where_sql = _validate_partition_where_clause(where_partition_clause)
    inner_select = f"SELECT {cols_sql} FROM `{ds}.{tbl}` WHERE {where_sql}"
    validate_partitioned_calibration_sql(inner_select)
    return (
        f"CREATE OR REPLACE MODEL `{ds}.{mdl}`\n"
        f"OPTIONS(model_type='LOGISTIC_REG', input_label_cols=['{lbl}'], "
        "auto_class_weights=TRUE) AS\n"
        f"{inner_select};"
    )


def build_bqml_evaluate_sql(
    model_name: str,
    eval_table: str,
    select_columns: Sequence[str],
    where_partition_clause: str,
    *,
    dataset: str = GSE_CALIBRATION_DATASET,
) -> str:
    """Build a partition-guarded BigQuery ML ML.EVALUATE query."""
    ds = _validate_identifier(dataset, "dataset")
    mdl = _validate_identifier(model_name, "model_name")
    tbl = _validate_identifier(eval_table, "eval_table")
    cols_sql = _normalize_explicit_columns(select_columns)
    where_sql = _validate_partition_where_clause(where_partition_clause)
    inner_select = f"SELECT {cols_sql} FROM `{ds}.{tbl}` WHERE {where_sql}"
    validate_partitioned_calibration_sql(inner_select)
    return (
        "SELECT precision, recall, accuracy, f1_score, log_loss, roc_auc "
        f"FROM ML.EVALUATE(MODEL `{ds}.{mdl}`, ({inner_select}));"
    )


def build_bqml_predict_sql(
    model_name: str,
    input_table: str,
    select_columns: Sequence[str],
    where_partition_clause: str,
    *,
    dataset: str = GSE_CALIBRATION_DATASET,
) -> str:
    """Build a partition-guarded BigQuery ML ML.PREDICT query returning bounded columns."""
    ds = _validate_identifier(dataset, "dataset")
    mdl = _validate_identifier(model_name, "model_name")
    tbl = _validate_identifier(input_table, "input_table")
    cols_sql = _normalize_explicit_columns(select_columns)
    where_sql = _validate_partition_where_clause(where_partition_clause)
    inner_select = f"SELECT {cols_sql} FROM `{ds}.{tbl}` WHERE {where_sql}"
    validate_partitioned_calibration_sql(inner_select)
    return (
        f"SELECT predicted_outcome, predicted_outcome_probs "
        f"FROM ML.PREDICT(MODEL `{ds}.{mdl}`, ({inner_select}));"
    )
