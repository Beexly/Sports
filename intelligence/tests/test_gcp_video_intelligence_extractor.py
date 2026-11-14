"""Unit tests for GCP-LEV-03 Bounded Cloud Video Intelligence & MP4 Extractor."""

from __future__ import annotations

from pathlib import Path
import pytest

from intelligence.foundry_bridge.gcp_video_intelligence_extractor import (
    build_gcp_platform_leverage_wiring_rows,
    build_video_intelligence_manifest,
    enforce_video_intelligence_circuit_breaker,
)


def test_gcp_lev03_discovers_all_repo_mp4_assets_with_zero_cost_and_vip_isolation(tmp_path: Path) -> None:
    out = tmp_path / "gcp_lev03_receipt.json"
    receipt = build_video_intelligence_manifest(output_receipt_path=out)

    assert out.exists()
    raw_text = out.read_text(encoding="utf-8")
    assert "31-11" not in raw_text
    probe = receipt["live_gcp_video_intelligence_verification"]
    assert probe["live_api_verified"] is False
    assert probe["sample_asset"] is None
    assert probe["shot_count"] == 0
    counts = receipt["asset_counts"]
    assert counts["total_mp4_assets"] >= 11
    assert counts["vip_vault_gated_assets"] >= 1
    assert counts["public_zero_leakage_assets"] >= 10
    assert 9.0 <= counts["total_duration_minutes"] <= 60.0
    assert receipt["circuit_breaker"]["circuit_breaker_passed"] is True
    assert receipt["circuit_breaker"]["cost_usd"] == 0.0

    for asset in receipt["assets"]:
        assert asset["duration_seconds"] > 0.0
        assert asset["public_pick_leakage_allowed"] is False


def test_gcp_lev03_circuit_breaker_trips_on_run_or_monthly_overage() -> None:
    with pytest.raises(ValueError, match="CIRCUIT_BREAKER_TRIPPED"):
        enforce_video_intelligence_circuit_breaker(requested_minutes=65.0)

    with pytest.raises(ValueError, match="CIRCUIT_BREAKER_TRIPPED"):
        enforce_video_intelligence_circuit_breaker(
            requested_minutes=20.0,
            prior_monthly_minutes_used=740.0,
        )


def test_gcp_platform_leverage_wiring_rows_non_empty() -> None:
    build_video_intelligence_manifest()
    rows = build_gcp_platform_leverage_wiring_rows(now_iso="2026-11-14T10:15:00Z")
    assert len(rows) >= 12
    assert all(r["non_nan"] is True for r in rows)
