"""Wave 27 unit tests: 150+ monotone deduped RLVR flywheel and 8-benchmark parity."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

import pytest

from gse_engine.memory.knowledge_continuity_and_gsi_rlvr_flywheel import (
    compile_gse_to_gsi_rlvr_training_batch,
    evaluate_frontier_reasoning_benchmark_suite,
)
from gse_engine.memory.wave22_cross_branch_salvage_and_vault_crosslink_suite import (
    exact_substring_dedup,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
_FORBIDDEN_ODDS_PATTERN = re.compile(
    r"\b(?:odds|moneyline|moneylines|sportsbook|sportsbooks|over_under|"
    r"draftkings|fanduel|betmgm|caesars|pinnacle|circa|parlay|parlays|"
    r"wager|wagers|bettor|bettors|bookmaker|bookmakers|vig|vigorish|juice)\b",
    re.IGNORECASE,
)


def _assert_rlvr_feed_contract(jsonl_path: Path) -> None:
    """Assert 150+ pure-ASCII monotone deduped RLVR records with zero odds words."""
    assert jsonl_path.is_file()
    raw_bytes = jsonl_path.read_bytes()
    assert all(b <= 127 for b in raw_bytes)
    lines = [ln for ln in raw_bytes.decode("ascii").splitlines() if ln.strip()]
    assert len(lines) >= 150

    prev_rank = 0
    seen_ids: set[str] = set()
    corpus_texts: list[str] = []
    for ln in lines:
        rec = json.loads(ln)
        rid = str(rec["record_id"])
        assert rid not in seen_ids
        seen_ids.add(rid)
        rank = int(rec["tier_rank"])
        assert rank >= prev_rank
        prev_rank = rank
        assert rec["curriculum_tier"] in {
            "TIER_1_FOUNDATION",
            "TIER_2_SYNTHESIS",
            "TIER_3_BEHEMOTH",
        }
        corpus_texts.append(f"{rec['domain']}::{rec['prompt']}::{rec['think']}")

        payload_text = " ".join(
            [
                str(rec["prompt"]),
                str(rec["think"]),
                json.dumps(rec["ground_truth"]),
            ]
        )
        assert _FORBIDDEN_ODDS_PATTERN.search(payload_text) is None

        ns: dict[str, Any] = {}
        exec(rec["reward_verifier"], ns, ns)
        assert ns["verify"](rec["ground_truth"]) is True
        assert ns["verify"]({}) is False

    kept = exact_substring_dedup(corpus_texts, k=16, w=16)
    assert len(kept) == len(corpus_texts)


def test_wave27_single_writer_guard_and_compiler_summary() -> None:
    """Ensure brain/mind.jsonl cannot be mutated and compiler outputs monotone summaries."""
    with pytest.raises(ValueError, match="SINGLE_WRITER_VIOLATION"):
        compile_gse_to_gsi_rlvr_training_batch(
            REPO_ROOT,
            output_path=REPO_ROOT / "brain" / "mind.jsonl",
        )

    res = compile_gse_to_gsi_rlvr_training_batch(REPO_ROOT)
    assert res["records_compiled"] >= 150
    assert res["all_verifiers_passed"] is True
    assert res["zero_odds_contamination"] is True
    assert res["monotone_curriculum_verified"] is True
    assert res["substring_dedup_verified"] is True
    tier_counts = res["curriculum_tier_counts"]
    assert tier_counts["TIER_1_FOUNDATION"] >= 50
    assert tier_counts["TIER_2_SYNTHESIS"] >= 48
    assert tier_counts["TIER_3_BEHEMOTH"] >= 50
    assert res["axolotl_multipack"]["packing_efficiency"] > 0.0
    assert abs(sum(res["trl_grpo_summary"]["advantages"])) < 1e-4
    assert res["lm_eval_calibration"]["acc_norm"] is True


def test_wave27_staged_rlvr_feeds_on_disk() -> None:
    """Validate both staged RLVR JSONL feeds under brain/feeds/."""
    _assert_rlvr_feed_contract(
        REPO_ROOT
        / "brain"
        / "feeds"
        / "2026-11-16"
        / "gse_to_gsi_verifiable_reasoning_rlvr_feed.jsonl"
    )
    _assert_rlvr_feed_contract(
        REPO_ROOT / "brain" / "feeds" / "2026-11-17" / "gse_to_gsi_overnight_rlvr_feed.jsonl"
    )


def test_wave27_eight_benchmark_frontier_parity_suite() -> None:
    """Validate 6 canonical axes (100.0) plus full 8-benchmark (450-item) parity report."""
    bench = evaluate_frontier_reasoning_benchmark_suite(REPO_ROOT)
    assert bench["all_axes_passed"] is True
    assert len(bench["axes"]) == 6
    assert bench["composite_score"] == 100.0
    eight = bench["eight_benchmark_suite"]
    assert eight["benchmarks_verified"] == 8
    assert eight["total_items"] == 450
    assert eight["calibbench_frechet_valid"] is True
    assert eight["all_eight_ready"] is True
    assert set(eight["benchmark_counts"].keys()) == {
        "GPQA_Diamond",
        "MATH_500",
        "GSM8K",
        "HumanEval",
        "ARC_Challenge",
        "MMLU",
        "ForecastBench",
        "CalibBench_100",
    }
