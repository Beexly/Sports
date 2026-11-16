"""Unit tests for billion-context LSM hierarchical memory compaction."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from gse_engine.memory.billion_context import ContextTurn, LsmContextKernel


def test_lsm_context_kernel_distills_critical_facts_and_drops_future() -> None:
    """Preserves critical salience tags and strips future-dated leakage."""
    base = datetime(2026, 11, 15, 18, 0, tzinfo=UTC)
    turns = [
        ContextTurn(
            turn_id="t1",
            tier="L0_CAPTURE",
            content="QB1 hamstring upgrade logged in official Friday practice report.",
            token_estimate=40,
            salience_tags=("injury", "qb1"),
            recorded_utc=base - timedelta(hours=6),
        ),
        ContextTurn(
            turn_id="t2",
            tier="L0_CAPTURE",
            content="Routine log banner acknowledged cleanly.",
            token_estimate=40,
            salience_tags=("ops",),
            recorded_utc=base - timedelta(hours=5),
        ),
        ContextTurn(
            turn_id="t3",
            tier="L0_CAPTURE",
            content="Recent snap tempo delta verified.",
            token_estimate=20,
            salience_tags=("tempo",),
            recorded_utc=base - timedelta(hours=1),
        ),
        ContextTurn(
            turn_id="t4-future",
            tier="L0_CAPTURE",
            content="Postgame final score should never leak before kickoff.",
            token_estimate=30,
            salience_tags=("qb1",),
            recorded_utc=base + timedelta(hours=2),
        ),
    ]

    kernel = LsmContextKernel(max_token_budget=64, keep_recent_l0=1)
    result = kernel.compact(turns, as_of_utc=base)

    retained_ids = {t.turn_id for t in result.retained_turns}
    assert "t4-future" not in retained_ids
    assert "t3" in retained_ids
    assert "l1-distill-critical" in retained_ids
    assert result.total_tokens_before == 100
    assert result.distilled_count == 2
    assert len(result.digest_sha256) == 64
