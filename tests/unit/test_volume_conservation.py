"""Unit tests for zero-leak Sinkhorn vacated-volume conservation (ADR-0008)."""

from __future__ import annotations

import pytest

from gse_engine.compute.volume_conservation import (
    MAX_RESIDUAL_SHARE,
    MIN_NAMED_ATTRIBUTION,
    reallocate_vacated_volume,
)
from gse_engine.models import PlayerShare


def test_vacated_starter_volume_conserved_without_phantom_sinks() -> None:
    """When WR1 is OUT, active teammates absorb targets within role caps and residual bounds."""
    roster = [
        PlayerShare("wr1", "Starter WR1", "WR", False, 0.28, 0.02),
        PlayerShare("wr2", "Alpha WR2", "WR", True, 0.20, 0.0),
        PlayerShare("wr3", "Slot WR3", "WR", True, 0.14, 0.0),
        PlayerShare("te1", "Primary TE", "TE", True, 0.18, 0.0),
        PlayerShare("rb1", "Lead RB1", "RB", True, 0.12, 0.68),
        PlayerShare("rb2", "Change RB2", "RB", True, 0.05, 0.28),
    ]

    res = reallocate_vacated_volume(roster, opp_front7_outs=3)

    assert res.named_target_attribution >= MIN_NAMED_ATTRIBUTION
    assert res.named_carry_attribution >= MIN_NAMED_ATTRIBUTION
    assert res.residual_target_share <= MAX_RESIDUAL_SHARE
    assert res.residual_carry_share <= MAX_RESIDUAL_SHARE
    assert res.allocated_targets["wr2"] > 0.20
    assert res.allocated_targets["wr2"] <= 0.34
    assert res.allocated_carries["rb1"] <= 0.78
    assert res.efficiency_boost == pytest.approx(0.105)


def test_raises_when_no_active_players_remain() -> None:
    """Empty active rosters fail loudly instead of silently dumping into OTHER_TEAM sinks."""
    with pytest.raises(ValueError, match="zero active Stage-0 players"):
        reallocate_vacated_volume([PlayerShare("wr1", "Out WR1", "WR", False, 0.30, 0.0)])
