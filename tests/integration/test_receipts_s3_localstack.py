"""Receipt S3 archival integration tests (hermetic in-memory + optional LocalStack)."""

from __future__ import annotations

import os

import pytest

from gse_engine.storage.receipts_s3 import (
    LOCALSTACK_DEFAULT_ENDPOINT,
    InMemoryObjectStore,
    S3ReceiptArchiver,
)


def test_s3_receipt_archiver_roundtrip_and_tamper_detection() -> None:
    """Verifies SHA-256 archival and tamper refusal using InMemoryObjectStore."""
    store = InMemoryObjectStore()
    archiver = S3ReceiptArchiver(
        bucket="gse-sealed-receipts-test",
        endpoint_url=LOCALSTACK_DEFAULT_ENDPOINT,
        client=store,
    )
    payload = b'{"season":2026,"week":10,"decision":"ADMIT"}'
    archived = archiver.archive_receipt("2026/w10/sun_early.json", payload)

    assert archived.endpoint_url == LOCALSTACK_DEFAULT_ENDPOINT
    assert archiver.verify_receipt(archived.key, archived.sha256) is True
    assert archiver.verify_receipt(archived.key, "0" * 64) is False


def test_s3_receipt_archiver_live_localstack_when_opted_in() -> None:
    """Exercises real LocalStack S3 when GSE_RUN_LOCALSTACK_TESTS=1 is explicitly enabled."""
    if os.environ.get("GSE_RUN_LOCALSTACK_TESTS") != "1":
        pytest.skip("Set GSE_RUN_LOCALSTACK_TESTS=1 with docker-compose.localstack.yml running.")

    archiver = S3ReceiptArchiver(bucket="gse-sealed-receipts-local")
    payload = b'{"season":2026,"week":10,"localstack":true}'
    archived = archiver.archive_receipt("smoke/localstack.json", payload)
    assert archiver.verify_receipt(archived.key, archived.sha256) is True
