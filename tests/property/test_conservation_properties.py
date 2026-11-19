"""Property-based invariant checks for Stage-2/3 vacated-volume conservation."""

from __future__ import annotations

import random

from gse_engine.compute.volume_conservation import (
    MAX_RESIDUAL_SHARE,
    MIN_NAMED_ATTRIBUTION,
    reallocate_vacated_volume,
)
from gse_engine.models import PlayerShare


def test_randomized_multi_injury_rosters_preserve_volume_conservation() -> None:
    """Across 50 randomized injury configurations, conservation bounds hold strictly."""
    rng = random.Random(20261115)
    for _ in range(50):
        wr1_active = rng.random() > 0.35
        wr2_active = rng.random() > 0.25 or not wr1_active
        rb1_active = rng.random() > 0.30
        roster = [
            PlayerShare("wr1", "WR One", "WR", wr1_active, 0.26, 0.02),
            PlayerShare("wr2", "WR Two", "WR", wr2_active, 0.21, 0.01),
            PlayerShare("wr3", "WR Three", "WR", True, 0.14, 0.0),
            PlayerShare("te1", "TE One", "TE", True, 0.18, 0.0),
            PlayerShare("rb1", "RB One", "RB", rb1_active, 0.11, 0.64),
            PlayerShare("rb2", "RB Two", "RB", True, 0.06, 0.29),
        ]
        res = reallocate_vacated_volume(roster, opp_front7_outs=rng.randint(0, 4))
        assert res.named_target_attribution >= MIN_NAMED_ATTRIBUTION
        assert res.named_carry_attribution >= MIN_NAMED_ATTRIBUTION
        assert res.residual_target_share <= MAX_RESIDUAL_SHARE
        assert res.residual_carry_share <= MAX_RESIDUAL_SHARE
        assert sum(res.allocated_targets.values()) <= 1.0001
        assert sum(res.allocated_carries.values()) <= 1.0001
