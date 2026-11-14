"""Unit & Integration Tests for GCP Vision OCR Rescue + Sovereign/Shard-B -> 288-Bit Cognitive Router Wiring."""
from __future__ import annotations

import json
import math
from pathlib import Path

import pytest

from intelligence.foundry_bridge.gcp_vision_ocr_rescue import (
    DEFAULT_BOOK_PAGE_CAPS,
    EXTENDED_BOOK_PAGE_CAPS,
    MAX_VISION_PAGES_PER_RUN,
    format_foundry_core_transcript,
    load_books_by_ids_readonly,
    plan_page_allocation,
)
from intelligence.foundry_bridge.sovereign_to_cognitive_router_wiring import (
    MASK_WORDS,
    MAX_ABS_DELTA_LOG_ODDS,
    SIGNAL_FAMILIES,
    SITUATIONAL_FAMILIES,
    classify_text_to_family,
    encode_288bit_mask,
    positive_part_james_stein_shrink,
    run_wiring_and_export,
)


def test_vision_ocr_circuit_breaker_and_allocation() -> None:
    books = [
        {"book_id": "3d7cafefb6ffa2ae", "file_name": "DixonColes.pdf", "file_path": "x", "primary_domain": "football"},
        {"book_id": "3a88f7ddf53d358c", "file_name": "Tolman.pdf", "file_path": "x", "primary_domain": "psych"},
        {"book_id": "71382581388cd74f", "file_name": "Daly.pdf", "file_path": "x", "primary_domain": "football"},
        {"book_id": "1eb756d93ff49446", "file_name": "Hull.pdf", "file_path": "x", "primary_domain": "psych"},
        {"book_id": "17150554536af787", "file_name": "James.pdf", "file_path": "x", "primary_domain": "psych"},
    ]
    total_pages = {
        "3d7cafefb6ffa2ae": 17,
        "3a88f7ddf53d358c": 495,
        "71382581388cd74f": 210,
        "1eb756d93ff49446": 428,
        "17150554536af787": 726,
    }
    plans, planned_total = plan_page_allocation(books, total_pages, per_book_caps=DEFAULT_BOOK_PAGE_CAPS)
    assert planned_total <= MAX_VISION_PAGES_PER_RUN
    dixon = [p for p in plans if p["book_id"] == "3d7cafefb6ffa2ae"][0]
    assert dixon["pages_planned"] == 17
    assert dixon["coverage_mode"] == "FULL_DOCUMENT"

    with pytest.raises(ValueError, match="CIRCUIT_BREAKER_VIOLATION"):
        plan_page_allocation(books, total_pages, max_pages_total=MAX_VISION_PAGES_PER_RUN + 1)

    transcript = format_foundry_core_transcript({2: "Second page equation.", 1: "First page theorem."})
    assert transcript.startswith("========== PAGE 1 ==========\nFirst page theorem.")
    assert "========== PAGE 2 ==========\nSecond page equation." in transcript

    tierb_books = [
        {"book_id": "65dd26cd834db798", "file_name": "IBM-US7483986.pdf", "file_path": "x", "primary_domain": "math"},
        {"book_id": "6ff1729124cef6c7", "file_name": "Halmos-1950-MeasureTheory.pdf", "file_path": "x", "primary_domain": "math"},
    ]
    tierb_plans, tierb_total = plan_page_allocation(
        tierb_books,
        {"65dd26cd834db798": 14, "6ff1729124cef6c7": 320},
        max_pages_total=60,
        per_book_caps=EXTENDED_BOOK_PAGE_CAPS,
    )
    assert tierb_total == 54
    assert tierb_plans[0]["coverage_mode"] == "FULL_DOCUMENT"
    assert load_books_by_ids_readonly([]) == []


def test_vision_ocr_tracks_cumulative_monthly_pages_across_manifests(tmp_path: Path) -> None:
    from intelligence.foundry_bridge.gcp_vision_ocr_rescue import (
        ALWAYS_FREE_MONTHLY_LIMIT_PAGES,
        compute_cumulative_monthly_ocr_pages,
    )

    out_dir = tmp_path / "ocr"
    out_dir.mkdir()
    (out_dir / "ocr_rescue_manifest.json").write_text(
        json.dumps({"books_rescued": [{"book_id": "b1", "pages_rescued": 99}]}),
        encoding="utf-8",
    )
    (out_dir / "ocr_rescue_tierb_manifest.json").write_text(
        json.dumps({"books_rescued": [{"book_id": "b1", "pages_rescued": 99}, {"book_id": "b2", "pages_rescued": 88}]}),
        encoding="utf-8",
    )
    # Must deduplicate by book_id across both manifests so b1 is counted once (99 + 88 = 187)
    assert ALWAYS_FREE_MONTHLY_LIMIT_PAGES == 1000
    assert compute_cumulative_monthly_ocr_pages(out_dir) == 187

    # Corrupt manifest must fail closed rather than silently returning 0
    (out_dir / "ocr_rescue_tierb_manifest.json").write_text("{corrupt json", encoding="utf-8")
    with pytest.raises(RuntimeError, match="Corrupt Vision OCR manifest"):
        compute_cumulative_monthly_ocr_pages(out_dir)


def test_router_mask_and_james_stein_shrinkage_bounds() -> None:
    mask = encode_288bit_mask([0, 46, 92, 138, 184, 230, 278])
    assert len(mask) == MASK_WORDS
    assert all(isinstance(w, int) and 0 <= w <= 0xFFFFFFFF for w in mask)
    assert all(positive_part_james_stein_shrink(x, 0) == 0.0 for x in (0.5, float("nan"), float("inf")))
    assert abs(positive_part_james_stein_shrink(10.0, 5000)) == MAX_ABS_DELTA_LOG_ODDS
    assert abs(positive_part_james_stein_shrink(-10.0, 5000)) == MAX_ABS_DELTA_LOG_ODDS
    assert classify_text_to_family("Allianz Arena wind outdoor rain grass stadium") == "weather"
    assert classify_text_to_family("Blitz pressure pocket disruption pass block OL") == "pressure"
    assert classify_text_to_family("Pretraining human loss convergence", domain="stats") == "marketMicrostructure"
    assert classify_text_to_family("Human performance baseline telemetry", domain="math") == "qbSkillScript"


def test_live_sovereign_and_shard_b_wiring(tmp_path: Path) -> None:
    out_audit = tmp_path / "audit"
    out_bq = tmp_path / "bq"
    res = run_wiring_and_export(audit_out_dir=out_audit, bq_staging_dir=out_bq)
    c = res["counts"]
    assert c["sovereign_books_loaded"] >= 84
    assert c["sovereign_primitives_routed"] >= 726
    assert c["sovereign_reasoning_traces_routed"] >= 157
    assert c["gcp_shard_b_docs_routed"] >= 2859
    assert c["rules_rlvr_lessons_routed"] >= 100
    assert 0 < c["active_mask_bits_set"] <= SIGNAL_FAMILIES
    for fam in SITUATIONAL_FAMILIES:
        fam_info = res["six_situational_families"][fam]
        assert fam_info["all_finite_non_nan"] is True
        w = fam_info["bounded_james_stein_log_odds_weight"]
        assert math.isfinite(w) and abs(w) <= MAX_ABS_DELTA_LOG_ODDS

    for tbl_file in (
        "sovereign_primitives.jsonl",
        "sovereign_reasoning_traces.jsonl",
        "gcp_shard_b_extractions.jsonl",
        "router_and_situational_wiring.jsonl",
        "week10_entity_and_venue_truth.jsonl",
    ):
        fp = out_bq / tbl_file
        assert fp.is_file() and fp.stat().st_size > 100
        first_rec = json.loads(fp.read_text(encoding="utf-8").splitlines()[0])
        assert isinstance(first_rec, dict)
