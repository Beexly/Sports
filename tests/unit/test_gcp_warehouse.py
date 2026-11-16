"""Unit tests for BigQuery dry-run byte ceiling and GCS SHA-256 archival."""

from __future__ import annotations

import hashlib
from typing import Any

import pytest

from gse_engine.cloud.gcp_warehouse import (
    BytesBilledLimitExceeded,
    GcpWarehouseAdapter,
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
