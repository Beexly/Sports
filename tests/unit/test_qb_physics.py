"""Unit tests for empirical QB rushing physics and Q4 kneeldowns (ADR-0008)."""

from __future__ import annotations

import numpy as np

from gse_engine.compute.qb_physics import project_qb_rushing
from gse_engine.models import QuarterbackRushInput


def test_pocket_passer_has_no_phantom_floor_and_reflects_kneeldowns() -> None:
    """Low-scramble favorites must not receive artificial +5.9 rushing floors."""
    pocket_qb = QuarterbackRushInput(
        player_id="qb_pocket",
        player_name="Joe Flacco",
        expected_dropbacks=36.0,
        scramble_rate_per_dropback=0.01,
        yards_per_scramble=4.5,
        designed_rushes_per_game=0.2,
        yards_per_designed_rush=2.0,
        victory_formation_prob=0.65,
        expected_kneeldowns_when_winning=1.8,
    )

    proj = project_qb_rushing(pocket_qb, rng=np.random.default_rng(42), n_worlds=5_000)
    assert proj.expected_kneel_yards < 0.0
    assert proj.p10_rush_yards <= 0.0
    assert proj.mean_rush_yards < 5.0


def test_mobile_qb_projects_meaningful_scramble_and_designed_rush_volume() -> None:
    """High-scramble dual-threat QBs project materially higher rushing medians than pocket passers."""
    mobile_qb = QuarterbackRushInput(
        player_id="qb_mobile",
        player_name="Lamar Jackson",
        expected_dropbacks=32.0,
        scramble_rate_per_dropback=0.09,
        yards_per_scramble=7.5,
        designed_rushes_per_game=5.5,
        yards_per_designed_rush=5.4,
        victory_formation_prob=0.45,
    )

    proj = project_qb_rushing(mobile_qb, rng=np.random.default_rng(42), n_worlds=5_000)
    assert proj.mean_rush_yards > 35.0
    assert proj.p90_rush_yards > proj.median_rush_yards > proj.p10_rush_yards
    assert proj.mean_rush_attempts > 6.0
