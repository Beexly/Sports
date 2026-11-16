"""Unit tests verifying scripts/ops/run_permanent_sequenced_weekly_pipeline.py connects gse_engine v3."""

from __future__ import annotations

from pathlib import Path

from scripts.ops.run_permanent_sequenced_weekly_pipeline import run_gse_engine_v3_pipeline_bridge

REPO_ROOT = Path(__file__).resolve().parents[2]


def test_sequenced_pipeline_v3_bridge_verifies_feeds_and_archives_receipt() -> None:
    """Runs gse_engine feed guard, Class B CAGE gate, and receipt archival on repo data."""
    report = run_gse_engine_v3_pipeline_bridge(repo_root=REPO_ROOT, season=2026, week=10)

    assert report["feed_guard_all_ok"] is True
    assert len(report["cage_receipt_sha256"]) == 64
    assert report["receipt_verified"] is True
    assert report["archived_key"] == "s2026/w10/gse_v3_cage_receipt.json"
