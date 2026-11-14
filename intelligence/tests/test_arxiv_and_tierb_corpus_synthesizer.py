from __future__ import annotations

import json
import sqlite3
from pathlib import Path

import pytest

from intelligence.foundry_bridge.arxiv_and_tierb_corpus_synthesizer import (
    classify_corpus_track,
    synthesize_arxiv_and_sovereign_corpus,
)


def test_classify_corpus_track_covers_all_academic_and_football_buckets() -> None:
    assert (
        classify_corpus_track("2407.04153 PEER Mixture of a Million Experts", "2407.04153v1.pdf", "cs")
        == "arxiv_and_preprints"
    )
    assert (
        classify_corpus_track("MIT Sloan Sports Analytics Conference Injury Study", "sloan.pdf", "sports")
        == "mit_sloan_jqas_nessis_conferences"
    )
    assert (
        classify_corpus_track("nflWAR: A Reproducible Method for Offensive Players", "nflwar.pdf", "football")
        == "nfl_war_and_fourth_down_decision"
    )
    assert (
        classify_corpus_track("2026 Official NFL Playing Rules", "ops-2026-NFL-Rulebook-FINAL.pdf", "football")
        == "football_coaching_rules_and_scouting"
    )
    assert (
        classify_corpus_track("The Mental Game of Football", "mental-game.pdf", "psych")
        == "sports_psychology_and_cognition"
    )


def test_synthesizer_runs_readonly_and_forbids_direct_mind_jsonl(tmp_path: Path) -> None:
    wt_prims = tmp_path / "wt_prims"
    wt_prims.mkdir()
    shared_prims = tmp_path / "shared_prims"
    shared_prims.mkdir()
    arxiv_dir = tmp_path / "arxiv_program"
    arxiv_dir.mkdir()
    (arxiv_dir / "catalog.md").write_text(
        "Indexed papers: arXiv:1605.00690v2 and 2407.04153 plus 2301.12345.",
        encoding="utf-8",
    )

    sample_pdf = tmp_path / "sample_tier_b.pdf"
    sample_pdf.write_bytes(b"%PDF-1.4 sample")

    db_path = tmp_path / "foundry_test.db"
    conn = sqlite3.connect(db_path)
    conn.execute(
        """
        CREATE TABLE corpus_queue (
            book_id TEXT PRIMARY KEY,
            file_path TEXT,
            sha256 TEXT,
            file_name TEXT,
            title TEXT,
            year INTEGER,
            primary_domain TEXT,
            tier TEXT,
            status TEXT,
            pages_total INTEGER,
            file_size INTEGER
        )
        """
    )
    conn.execute(
        """
        INSERT INTO corpus_queue VALUES (
            '4abc1234ef567890', ?, '4abc1234ef567890000000000000000000000000000000000000000000000000',
            '2407.04153_peer.pdf', '2407.04153 PEER Routing', 2024, 'cs', 'A', 'PENDING', 18, 102400
        )
        """,
        (str(sample_pdf),),
    )
    conn.execute(
        """
        INSERT INTO corpus_queue VALUES (
            '5def1234ef567890', ?, '5def1234ef567890000000000000000000000000000000000000000000000000',
            'sloan_tier_b.pdf', 'MIT Sloan Passing Study', 2023, 'football', 'B', 'PENDING', 14, 204800
        )
        """,
        (str(sample_pdf),),
    )
    conn.commit()
    conn.close()

    (wt_prims / "4abc1234ef567890.json").write_text(
        json.dumps(
            {
                "book_id": "4abc1234ef567890",
                "title": "2407.04153 PEER Routing",
                "file_name": "2407.04153_peer.pdf",
                "primary_domain": "cs",
                "pages_total": 18,
                "pages_read": 18,
                "source_status": "COMPLETE",
                "primitives": [
                    {
                        "primitive_id": "p1",
                        "name": "Product-Key Expert Retrieval",
                        "canonical_form": "k^* = argmax_{(i,j)} (q_1^T c_i + q_2^T d_j)",
                        "verbatim_quote": "Product-key retrieval scales sublinearly with expert count.",
                        "source_page": 4,
                        "layer2": {
                            "tag": "[ISOMORPHISM]",
                            "mapping": "Maps next-snap quarterback read progression to sublinear expert routing.",
                        },
                    }
                ],
                "reasoning_traces": [
                    {
                        "trace_id": "t0",
                        "think": "Sublinear product-key lookup prevents linear latency blowup under pre-snap pressure.",
                        "theory_of_mind": "Defensive coordinator disguises two-high rotation post-snap.",
                        "cross_layer_veto": "Veto redundant collinearity across overlapping QB progression features.",
                    }
                ],
            }
        ),
        encoding="utf-8",
    )

    out_json = tmp_path / "synthesis.json"
    out_feed = tmp_path / "feed.jsonl"

    with pytest.raises(ValueError, match="mind.jsonl"):
        synthesize_arxiv_and_sovereign_corpus(
            wt_primitives_dir=wt_prims,
            shared_primitives_dir=shared_prims,
            foundry_db_path=db_path,
            gatekeeper_py=tmp_path / "nonexistent_gatekeeper.py",
            arxiv_docs_dir=arxiv_dir,
            synthesis_out_path=out_json,
            trainer_feed_out_path=tmp_path / "mind.jsonl",
        )

    payload = synthesize_arxiv_and_sovereign_corpus(
        wt_primitives_dir=wt_prims,
        shared_primitives_dir=shared_prims,
        foundry_db_path=db_path,
        gatekeeper_py=tmp_path / "nonexistent_gatekeeper.py",
        arxiv_docs_dir=arxiv_dir,
        synthesis_out_path=out_json,
        trainer_feed_out_path=out_feed,
    )

    assert payload["counts"]["complete_sovereign_books"] == 1
    assert payload["counts"]["total_sovereign_primitives"] == 1
    assert payload["counts"]["total_sovereign_reasoning_traces"] == 1
    assert payload["counts"]["trainer_feed_records_emitted"] == 2
    assert payload["counts"]["arxiv_program_unique_ids_indexed"] == 3
    assert payload["foundry_db_readonly_audit"]["shard_4to7_tier_a_remaining_with_file"] == 0
    assert payload["foundry_db_readonly_audit"]["shard_4to7_tier_b_pending_candidates_count"] == 1

    lines = [json.loads(line) for line in out_feed.read_text(encoding="utf-8").splitlines() if line.strip()]
    assert len(lines) == 2
    assert {r["record_type"] for r in lines} == {"sovereign_primitive", "sovereign_reasoning_trace"}
