"""Unit & Integration Tests for GCP-LEV-04 Week 10 Entity, CSV-Sweep & Injury Truth Reconciler."""
from __future__ import annotations

from intelligence.foundry_bridge.gcp_entity_and_injury_truth_reconciler import (
    CANONICAL_NFL_KG_MIDS,
    audit_sweep_csvs_readonly,
    build_week10_entity_and_venue_truth_rows,
    query_google_kg_mid,
)


def test_sweep_csvs_readonly_audit_preserves_64_csvs_and_remaps_sfdata() -> None:
    audit = audit_sweep_csvs_readonly()
    assert audit["csv_count"] == 64
    assert len(audit["composite_sha256"]) == 64

    # 16 stale QB-team rows across the 5 sfdata team-tagged tables (incl. Murray & Brissett in quick-pressure)
    remaps = audit["sfdata_stale_remaps"]
    assert len(remaps) >= 14
    remap_pairs = {(r["canonical_player"], r["printed_team"], r["authoritative_week10_team"]) for r in remaps}
    assert ("Kyler Murray", "ARI", "MIN") in remap_pairs
    assert ("Kirk Cousins", "LV", "MIN") in remap_pairs
    assert ("Jacoby Brissett", "ARI", "BAL") in remap_pairs
    assert ("J.J. McCarthy", "MIN", "NYG") in remap_pairs

    # Josh Downs earned-stat convention split (IND -> KC)
    splits = audit["earned_stat_convention_splits"]
    assert any(
        s["canonical_player"] == "Josh Downs"
        and s["printed_team"] == "IND"
        and s["authoritative_week10_team"] == "KC"
        for s in splits
    )

    # Unverified second J.Daniels @ TB quarantined fail-closed
    anomalies = audit["quarantined_anomalies"]
    assert len(anomalies) == 1
    assert anomalies[0]["printed_team"] == "TB"
    assert anomalies[0]["disposition"] == "QUARANTINED_UNVERIFIED_SOURCE_ANOMALY"


def test_build_week10_entity_and_venue_truth_rows_completeness() -> None:
    rows, summary = build_week10_entity_and_venue_truth_rows(live_kg_lookup=False)
    assert summary["source_csvs_mutated"] == 0
    assert summary["confirmed_qb1_teams"] == 32
    assert summary["nflverse_week10_injury_rows"] >= 290
    assert summary["total_entity_truth_rows"] >= 480
    assert len(rows) == summary["total_entity_truth_rows"]

    entity_types = summary["counts_by_entity_type"]
    assert entity_types["CONFIRMED_WEEK10_QB1"] == 32
    assert entity_types["STADIUM_VENUE_TRUTH"] == 14
    assert entity_types["QUARANTINED_SOURCE_ANOMALY"] == 1
    assert entity_types["VERIFIED_HEAD_COACH"] == 2
    assert query_google_kg_mid("MIN") == CANONICAL_NFL_KG_MIDS["MIN"]
