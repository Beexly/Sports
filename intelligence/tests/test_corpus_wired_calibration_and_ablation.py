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
