"""Unit tests for BigQuery dry-run byte ceiling and GCS SHA-256 archival."""

from __future__ import annotations

import hashlib
from typing import Any

import pytest

from gse_engine.cloud.gcp_warehouse import (
    GSE_CALIBRATION_DATASET,
    GSE_CALIBRATION_REGION,
    BytesBilledLimitExceeded,
    GcpWarehouseAdapter,
    build_bqml_evaluate_sql,
    validate_partitioned_calibration_sql,
)


class _FakeBqClient:
    """Deterministic BigQuery double verifying dry-run enforcement."""

    def __init__(self, estimated_bytes: int) -> None:
        self.estimated_bytes = estimated_bytes
        self.executed = False

    def estimate_query_bytes(self, sql: str) -> int:
        del sql
        return self.estimated_bytes

    def execute_query(self, sql: str, max_bytes_billed: int) -> list[dict[str, Any]]:
        del sql, max_bytes_billed
        self.executed = True
        return [{"game_id": "2026_10_PIT_CIN", "epa_per_play": 0.14}]


class _FakeGcsClient:
    """Deterministic GCS double recording metadata and payloads."""

    def __init__(self) -> None:
        self.uploads: dict[tuple[str, str], dict[str, Any]] = {}

    def upload_bytes(
        self,
        *,
        bucket: str,
        blob_name: str,
        data: bytes,
        content_type: str,
        metadata: dict[str, str],
    ) -> str:
        self.uploads[(bucket, blob_name)] = {
            "data": data,
            "content_type": content_type,
            "metadata": metadata,
        }
        return f"gs://{bucket}/{blob_name}"


def test_blocks_runaway_bigquery_scan_before_execution() -> None:
    """Queries whose dry-run estimate exceeds max_bytes_billed never execute."""
    fake_bq = _FakeBqClient(estimated_bytes=5_000_000_000)
    adapter = GcpWarehouseAdapter(bq_client=fake_bq)

    with pytest.raises(BytesBilledLimitExceeded, match="exceeds cap"):
        adapter.execute_guarded_query("SELECT * FROM gse_data.pbp", max_bytes_billed=1_000_000)

    assert fake_bq.executed is False


def test_executes_bounded_query_and_uploads_sha256_gcs_artifact() -> None:
    """Bounded queries run and GCS artifacts embed exact SHA-256 metadata."""
    fake_bq = _FakeBqClient(estimated_bytes=250_000)
    fake_gcs = _FakeGcsClient()
    adapter = GcpWarehouseAdapter(bq_client=fake_bq, gcs_client=fake_gcs)

    scanned, rows = adapter.execute_guarded_query("SELECT game_id FROM gse_data.pbp WHERE week=10")
    assert scanned == 250_000
    assert fake_bq.executed is True
    assert rows[0]["game_id"] == "2026_10_PIT_CIN"

    payload = b'{"week":10,"ok":true}'
    res = adapter.upload_artifact("gse-archive-bucket", "receipts/w10.json", payload)
    expected_sha = hashlib.sha256(payload).hexdigest()
    assert res["uri"] == "gs://gse-archive-bucket/receipts/w10.json"
    assert res["sha256"] == expected_sha
    uploaded = fake_gcs.uploads[("gse-archive-bucket", "receipts/w10.json")]
    assert uploaded["metadata"]["sha256"] == expected_sha


def test_gse_calibration_partition_sql_guard() -> None:
    """Enforce zero SELECT * and mandatory partition predicates on gse_calibration."""
    assert GSE_CALIBRATION_DATASET == "gse_calibration"
    assert GSE_CALIBRATION_REGION == "US"

    with pytest.raises(ValueError, match="SELECT \\*"):
        validate_partitioned_calibration_sql(
            "SELECT * FROM gse_calibration.w1_w11_oos WHERE season = 2026"
        )

    with pytest.raises(ValueError, match="partition column"):
        validate_partitioned_calibration_sql(
            "SELECT norm_crps, ece FROM gse_calibration.w1_w11_oos"
        )

    validate_partitioned_calibration_sql(
        "SELECT week, norm_crps, ece, clv_cents FROM gse_calibration.w1_w11_oos "
        "WHERE season = 2026 AND week <= 11"
    )


def test_gse_calibration_sql_rejects_injection_tokens_and_avoids_select_star() -> None:
    """Confirm semicolon/comment/UNION/DROP rejection and explicit BQML evaluate columns."""
    for bad_sql in (
        "SELECT week FROM gse_calibration.w1_w11_oos WHERE season = 2026; DROP TABLE x",
        "SELECT week FROM gse_calibration.w1_w11_oos WHERE season = 2026 -- trailing",
        "SELECT week FROM gse_calibration.w1_w11_oos WHERE season = 2026 /* block */",
        "SELECT week FROM gse_calibration.w1_w11_oos WHERE season = 2026 UNION SELECT 1",
    ):
        with pytest.raises(ValueError):
            validate_partitioned_calibration_sql(bad_sql)

    with pytest.raises(ValueError, match="Unsafe SQL"):
        build_bqml_evaluate_sql(
            "w11_calib_lr",
            "w1_w11_oos",
            ["week", "clv_cents"],
            "season = 2026; DROP TABLE x",
        )

    eval_sql = build_bqml_evaluate_sql(
        "w11_calib_lr",
        "w1_w11_oos",
        ["week", "clv_cents"],
        "season = 2026 AND week <= 11",
    )
    assert "SELECT *" not in eval_sql
    assert "SELECT precision, recall, accuracy, f1_score, log_loss, roc_auc" in eval_sql
