"""Empirical quarterback rushing physics including Q4 victory kneeldowns (ADR-0008).

Eliminates synthetic Gamma +5.9 rushing floors and models each quarterback's
observed scramble rate, designed rush attempts, and -1-yard victory kneeldowns.
"""

from __future__ import annotations

import numpy as np

from gse_engine.models import QuarterbackRushInput, QuarterbackRushProjection


def project_qb_rushing(
    inp: QuarterbackRushInput,
    rng: np.random.Generator | None = None,
    n_worlds: int = 10_000,
) -> QuarterbackRushProjection:
    """Simulates quarterback rushing attempts and net yards with victory kneeldowns.

    Args:
        inp: Empirical quarterback rushing inputs.
        rng: Optional NumPy Generator for deterministic testing.
        n_worlds: Simulation world count (default 10,000).

    Returns:
        QuarterbackRushProjection with mean/median/quantile rush yards and kneeldown impact.
    """
    gen = rng if rng is not None else np.random.default_rng(20261115)
    n = max(100, n_worlds)

    lam_scramble = max(0.0, inp.expected_dropbacks * inp.scramble_rate_per_dropback)
    scrambles = gen.poisson(lam=lam_scramble, size=n)
    designed = gen.poisson(lam=max(0.0, inp.designed_rushes_per_game), size=n)

    # Empirical right-skewed gain without synthetic +5.9 floor offset.
    scramble_yards = np.where(
        scrambles > 0,
        gen.gamma(shape=1.6, scale=max(0.5, inp.yards_per_scramble / 1.6), size=n) * scrambles,
        0.0,
    )
    designed_yards = np.where(
        designed > 0,
        gen.gamma(shape=1.4, scale=max(0.5, inp.yards_per_designed_rush / 1.4), size=n) * designed,
        0.0,
    )

    victory_trigger = gen.random(size=n) < min(1.0, max(0.0, inp.victory_formation_prob))
    kneels = np.where(
        victory_trigger,
        gen.poisson(lam=max(0.0, inp.expected_kneeldowns_when_winning), size=n),
        0,
    )
    kneel_yards = -1.0 * kneels

    net_yards = scramble_yards + designed_yards + kneel_yards
    total_attempts = scrambles + designed + kneels

    return QuarterbackRushProjection(
        mean_rush_yards=round(float(np.mean(net_yards)), 3),
        median_rush_yards=round(float(np.median(net_yards)), 3),
        p10_rush_yards=round(float(np.percentile(net_yards, 10)), 3),
        p90_rush_yards=round(float(np.percentile(net_yards, 90)), 3),
        mean_rush_attempts=round(float(np.mean(total_attempts)), 3),
        expected_kneel_yards=round(float(np.mean(kneel_yards)), 3),
    )
