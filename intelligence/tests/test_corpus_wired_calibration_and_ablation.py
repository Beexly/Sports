"""Tests for intelligence.foundry_bridge.corpus_wired_calibration_and_ablation."""
import json
import sqlite3
from pathlib import Path

from intelligence.foundry_bridge.corpus_wired_calibration_and_ablation import (
    MAX_ABS_DELTA_LOG_ODDS,
    run_calibration_and_hold_gate,
)


def test_corpus_wired_calibration_enforces_hold_gate_and_bounds(tmp_path: Path) -> None:
    db_path = tmp_path / "foundry.db"
    conn = sqlite3.connect(db_path)
    conn.execute("CREATE TABLE corpus_queue (book_id TEXT, status TEXT)")
    conn.execute("INSERT INTO corpus_queue VALUES ('b1', 'COMPLETE')")
    conn.execute("INSERT INTO corpus_queue VALUES ('b2', 'PENDING')")
    conn.commit()
    conn.close()

    prim_dir = tmp_path / "prims"
    prim_dir.mkdir()
    for i in range(21):
        (prim_dir / f"book_{i:02d}.json").write_text(
            json.dumps(
                {
                    "book_id": f"book_{i:02d}",
                    "sha256": f"{'4' if i >= 5 else '3'}abc",
                    "ocr_rescued": i < 5,
                    "primitives": [{"primitive_id": "p1"}, {"primitive_id": "p2"}, {"primitive_id": "p3"}],
                }
            ),
            encoding="utf-8",
        )

    wiring_path = tmp_path / "wiring.json"
    wiring_path.write_text(
        json.dumps(
            {
                "counts": {"sovereign_books_loaded": 112},
                "six_situational_families": {
                    "pressure": {"sovereign_primitives_routed": 40, "gcp_shard_b_docs_routed": 52}
                },
            }
        ),
        encoding="utf-8",
    )
    sb_path = tmp_path / "sb.json"
    sb_path.write_text(
        json.dumps(
            {
                "total_markdown_files": 6310,
                "files_with_xml_sections": 6185,
                "total_extracted_equations": 27874,
                "family_counts": {"pressure": 52, "weather": 4574},
            }
        ),
        encoding="utf-8",
    )
    drv_path = tmp_path / "drv.json"
    drv_path.write_text(
        json.dumps(
            {
                "sources": {"equations_master_gz": {"rows": 940102}, "situational_master_gz": {"rows": 102082}},
                "equations_family_counts": {"pressure": 2905, "weather": 12309},
                "situational_family_counts": {"pressure": 299, "weather": 6125},
            }
        ),
        encoding="utf-8",
    )
    oof_path = tmp_path / "oof.json"
    oof_path.write_text(
        json.dumps({"n_rows": 4823, "oof": {"brier_raw": 0.2612, "brier_oof": 0.2480, "ece_oof": 0.0226}, "acceptance": {"hard_pass": True}}),
        encoding="utf-8",
    )
    out_path = tmp_path / "out.json"

    res = run_calibration_and_hold_gate(
        db_path=db_path,
        worktree_primitives_dir=prim_dir,
        wiring_manifest_path=wiring_path,
        shard_b_catalog_path=sb_path,
        drive_index_path=drv_path,
        oof_cal_path=oof_path,
        out_path=out_path,
        bq_row_counts={"sovereign_primitives": 900},
    )

    assert res["slate_hold_status"] == "WEEK10_HELD_FOR_CORPUS_COMPLETION"
    assert res["worktree_tier_a_extraction_summary"]["count"] == 21
    assert res["worktree_tier_a_extraction_summary"]["ocr_classics"] == 5
    for fam_info in res["empirical_bayes_six_family_priors"].values():
        assert fam_info["all_finite_non_nan"] is True
        assert abs(fam_info["bounded_eb_log_odds_prior"]) <= MAX_ABS_DELTA_LOG_ODDS
    assert out_path.is_file()
    assert res["pendingTierACount"] >= 0
    assert res["pendingAllTiersCount"] == 1
    assert res["calibrationVerified"] is False


def test_corpus_wired_calibration_fails_closed_when_db_or_prims_missing(tmp_path: Path) -> None:
    oof_path = tmp_path / "oof.json"
    oof_path.write_text(
        json.dumps({"n_rows": 4823, "oof": {"brier_raw": 0.2612, "brier_oof": 0.2480, "ece_oof": 0.0226}, "acceptance": {"hard_pass": True}}),
        encoding="utf-8",
    )
    res = run_calibration_and_hold_gate(
        db_path=tmp_path / "missing.db",
        worktree_primitives_dir=tmp_path / "missing_prims",
        wiring_manifest_path=tmp_path / "missing_wiring.json",
        shard_b_catalog_path=tmp_path / "missing_sb.json",
        drive_index_path=tmp_path / "missing_drv.json",
        oof_cal_path=oof_path,
        out_path=tmp_path / "out_missing.json",
    )
    assert res["slate_hold_status"] == "WEEK10_HELD_FOR_CORPUS_COMPLETION"
    assert res["calibrationVerified"] is False
    assert res["all_invariants_satisfied"] is False
    assert res["pendingTierACount"] == -1
    assert res["pendingAllTiersCount"] == -1


def test_corpus_wired_calibration_handles_page_extracts_and_disk_completion(tmp_path: Path) -> None:
    import json
    import sqlite3
    from intelligence.foundry_bridge.corpus_wired_calibration_and_ablation import (
        run_calibration_and_hold_gate,
    )

    prim_dir = tmp_path / "wt_prims"
    shared_dir = tmp_path / "shared_prims"
    prim_dir.mkdir()
    shared_dir.mkdir()
    for i in range(21):
        (prim_dir / f"book_{i:02d}.json").write_text(
            json.dumps({"book_id": f"book_{i:02d}", "primitives": [{"id": f"p{i}"}]}),
            encoding="utf-8",
        )

    db_path = tmp_path / "foundry.db"
    conn = sqlite3.connect(str(db_path))
    conn.execute(
        """
        CREATE TABLE corpus_queue (
            book_id TEXT PRIMARY KEY,
            sha256 TEXT,
            file_name TEXT,
            file_path TEXT,
            tier TEXT,
            status TEXT
        )
        """
    )
    conn.executemany(
        "INSERT INTO corpus_queue VALUES (?,?,?,?,?,?)",
        [
            ("pend_settled", "1" * 64, "pend_settled.pdf", "/tmp/pend_settled.pdf", "A", "PENDING"),
            ("deleg_matched", "8" * 64, "matched_book.md", "/tmp/matched_book.md", "B", "DELEGATED_GCP"),
            ("deleg_unmatched", "9" * 64, "missing_book.tex", "/tmp/missing_book.tex", "A", "DELEGATED_GCP"),
        ],
    )
    conn.commit()
    conn.close()

    (shared_dir / "pend_settled.json").write_text(
        json.dumps({"book_id": "pend_settled", "sha256": "1" * 64}),
        encoding="utf-8",
    )

    # Shard-B catalog total_markdown_files=500 is inflated by per-page extracts (p0001.txt),
    # while entries only matches deleg_matched -> deleg_unmatched MUST remain pending (=1).
    sb_path = tmp_path / "shard_b.json"
    entries = [{"doc_hash": f"page_{i}", "source": f"p{i:04d}.txt"} for i in range(499)]
    entries.append({"doc_hash": "match_1", "source": "matched_book.md"})
    sb_path.write_text(
        json.dumps(
            {
                "total_markdown_files": 500,
                "files_with_xml_sections": 500,
                "total_extracted_equations": 1000,
                "family_counts": {"pressure": 50},
                "entries": entries,
            }
        ),
        encoding="utf-8",
    )

    manifest_path = tmp_path / "manifest.json"
    manifest_path.write_text(json.dumps({"six_situational_families": {}}), encoding="utf-8")
    drive_path = tmp_path / "drive.json"
    drive_path.write_text(json.dumps({"equations_family_counts": {}, "situational_family_counts": {}}), encoding="utf-8")
    oof_path = tmp_path / "oof.json"
    oof_path.write_text(json.dumps({"acceptance": {"hard_pass": False}}), encoding="utf-8")
    out_path = tmp_path / "receipt.json"

    res1 = run_calibration_and_hold_gate(
        db_path=db_path,
        worktree_primitives_dir=prim_dir,
        shared_primitives_dir=shared_dir,
        wiring_manifest_path=manifest_path,
        shard_b_catalog_path=sb_path,
        drive_index_path=drive_path,
        oof_cal_path=oof_path,
        out_path=out_path,
    )
    assert res1["rawPendingAllTiersCount"] == 1
    assert res1["effectivePendingAllTiersCount"] == 0
    assert res1["effectiveDelegatedGcpUnmatchedCount"] == 1
    assert res1["pendingTierACount"] == 1
    assert res1["pendingAllTiersCount"] == 1
    assert res1["shardBAccountingMode"] == "entries_source_match"
    assert res1["slate_hold_status"] == "WEEK10_HELD_FOR_CORPUS_COMPLETION"
    for gate_key in (
        "LIVE_BOARD",
        "PUBLISH_LEDGER",
        "PUBLIC_PICKS",
        "PERFORMANCE_STATS",
        "CALIBRATION_ADJUSTMENTS_ENABLED",
    ):
        assert res1["public_gates"][gate_key] == "FAIL_CLOSED_UNCHANGED"
    assert res1["public_gates"]["signal_path_generate_signal_slate_ts"] == "UNTOUCHED_PER_DOCTRINE"

    # Settle the last unmatched item on disk -> gate transitions to READY while public_gates stay fail-closed.
    (shared_dir / "deleg_unmatched.json").write_text(
        json.dumps({"book_id": "deleg_unmatched", "sha256": "9" * 64}),
        encoding="utf-8",
    )
    res2 = run_calibration_and_hold_gate(
        db_path=db_path,
        worktree_primitives_dir=prim_dir,
        shared_primitives_dir=shared_dir,
        wiring_manifest_path=manifest_path,
        shard_b_catalog_path=sb_path,
        drive_index_path=drive_path,
        oof_cal_path=oof_path,
        out_path=out_path,
    )
    assert res2["pendingTierACount"] == 0
    assert res2["pendingAllTiersCount"] == 0
    assert res2["slate_hold_status"] == "CORPUS_DRAIN_COMPLETE_READY_FOR_GATE"
    for gate_key in (
        "LIVE_BOARD",
        "PUBLISH_LEDGER",
        "PUBLIC_PICKS",
        "PERFORMANCE_STATS",
        "CALIBRATION_ADJUSTMENTS_ENABLED",
    ):
        assert res2["public_gates"][gate_key] == "FAIL_CLOSED_UNCHANGED"
