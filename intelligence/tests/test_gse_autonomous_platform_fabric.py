"""Tests for intelligence.ops.gse_autonomous_platform_fabric."""

import json
import sqlite3
from pathlib import Path

from intelligence.ops.gse_autonomous_platform_fabric import (
    build_execution_plan,
    evaluate_corpus_hold_gate,
    inspect_foundry_queue_ro,
    mask_secret,
    resolve_auto_nfl_week,
)


def test_mask_secret_never_leaks_raw_token() -> None:
    assert mask_secret("sk-or-v1-1234567890abcdef") == "sk-o...cdef"
    assert mask_secret("") == ""


def test_inspect_foundry_queue_ro_and_hold_gate(tmp_path: Path) -> None:
    db_path = tmp_path / "foundry.db"
    conn = sqlite3.connect(db_path)
    conn.execute("CREATE TABLE corpus_queue (book_id TEXT, status TEXT, tier TEXT)")
    conn.execute("CREATE TABLE primitives (primitive_id TEXT)")
    conn.execute("CREATE TABLE reasoning_traces (trace_id TEXT)")
    conn.execute("INSERT INTO corpus_queue VALUES ('b1', 'PENDING', 'A')")
    conn.execute("INSERT INTO corpus_queue VALUES ('b2', 'COMPLETE', 'A')")
    conn.execute("INSERT INTO primitives VALUES ('p1')")
    conn.commit()
    conn.close()

    stats = inspect_foundry_queue_ro(db_path)
    assert stats["exists"] is True
    assert stats["pending_tier_a"] == 1
    assert stats["complete_total"] == 1
    assert stats["primitives_rows"] == 1

    receipt = tmp_path / "cal_receipt.json"
    receipt.write_text(json.dumps({"calibrationVerified": True}), encoding="utf-8")
    gate_held = evaluate_corpus_hold_gate(stats, receipt)
    assert gate_held["slate_prep_allowed"] is False
    assert gate_held["status"] == "WEEK10_HELD_FOR_CORPUS_COMPLETION"

    # Once pending_tier_a == 0 and calibrationVerified == True -> unlocked
    stats_done = {**stats, "pending_tier_a": 0, "insufficient_ocr": 0}
    gate_ready = evaluate_corpus_hold_gate(stats_done, receipt)
    assert gate_ready["slate_prep_allowed"] is True
    assert gate_ready["status"] == "READY_FOR_WEEK10_PREP"


def test_build_execution_plan_covers_all_councils_and_respects_zero_cost() -> None:
    plan = build_execution_plan(
        model_lane="free",
        suite="all",
        max_cost_usd=0.50,
        dry_run=True,
        queue_stats={"exists": True, "pending_tier_a": 10},
        hold_gate={"slate_prep_allowed": False, "status": "WEEK10_HELD_FOR_CORPUS_COMPLETION"},
        jules_audit={"live_api_queried": False, "sources_count": 28, "total_sessions": 167, "state_counts": {}},
        providers={"default_lane": "hybrid_auto", "free_endpoints_ready": ["MODELSCOPE_API_KEY"]},
        week_info=resolve_auto_nfl_week(),
    )
    assert plan["council_coverage"]["agent_council_seats"] == 23
    assert plan["council_coverage"]["subagent_templates"] == 21
    assert plan["council_coverage"]["ai_council_destroy_seats"] == 10
    assert plan["council_coverage"]["war_room_watchers"] == 8
    assert plan["council_coverage"]["governed_workflows"] == 14
    assert plan["total_estimated_cost_usd"] == 0.0
    assert len(plan["jobs"]) == 6
