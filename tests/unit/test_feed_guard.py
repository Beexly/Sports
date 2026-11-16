"""Unit tests for Stage 1 content-type feed integrity verification (magika / magic-byte guard)."""

from __future__ import annotations

from gse_engine.ingestion.feed_guard import verify_feed_payload


def test_rejects_cloudflare_html_disguised_as_csv_or_parquet() -> None:
    """HTML error pages saved under tabular filenames must fail closed."""
    html_bytes = b"<!DOCTYPE html><html><head><title>Attention Required</title></head></html>"

    csv_verdict = verify_feed_payload(html_bytes, "csv")
    parquet_verdict = verify_feed_payload(html_bytes, "parquet")

    assert csv_verdict.ok is False
    assert csv_verdict.detected_kind == "html"
    assert parquet_verdict.ok is False
    assert parquet_verdict.detected_kind == "html"


def test_rejects_empty_and_binary_corrupted_csv() -> None:
    """Empty payloads and NUL-byte binary streams are rejected prior to parsing."""
    assert verify_feed_payload(b"", "csv").ok is False
    nul_verdict = verify_feed_payload(b"col1,col2\n\x00bad,2\n", "csv")
    assert nul_verdict.ok is False
    assert nul_verdict.detected_kind == "binary"


def test_accepts_valid_parquet_csv_and_json_payloads() -> None:
    """Valid PAR1 Parquet, UTF-8 CSV, and UTF-8 JSON payloads pass cleanly."""
    parquet_verdict = verify_feed_payload(b"PAR1\x00\x01\x02PAR1", "parquet")
    csv_verdict = verify_feed_payload(b"player_id,team,snaps\np1,CIN,54\n", "csv")
    json_verdict = verify_feed_payload(b'{"season": 2026, "week": 10}', "json")

    assert parquet_verdict.ok is True
    assert parquet_verdict.detected_kind == "parquet"
    assert csv_verdict.ok is True
    assert csv_verdict.detected_kind == "csv"
    assert json_verdict.ok is True
    assert json_verdict.detected_kind == "json"
