"""Empirical quarterback rushing physics including Q4 victory kneeldowns (ADR-0008).

Eliminates synthetic Gamma +5.9 rushing floors and models each quarterback's
observed scramble rate, designed rush attempts, and -1-yard victory kneeldowns.
"""

from __future__ import annotations

import math
from collections.abc import Sequence

import numpy as np

from gse_engine.models import QuarterbackRushInput, QuarterbackRushProjection

QB2_ARCHETYPE_PRIOR_DELTAS: dict[str, tuple[float, float, float, float, float, float]] = {
    # (epa_db, adot_yds, ttt_sec, sack_mult, int_mult, proe_pct)
    "GameManager_Vet": (-0.18, -1.45, 0.21, 1.36, 1.42, -4.2),
    "Scramble_Rookie": (-0.22, -1.10, 0.34, 1.48, 1.38, -5.0),
    "Gunslinger_Backup": (-0.14, 0.65, 0.16, 1.28, 1.58, -1.5),
}


def compute_qb2_backup_topology_shift(
    *,
    qb1_vector: Sequence[float],
    qb2_empirical_vector: Sequence[float],
    qb2_career_dropbacks_n: int,
    qb2_archetype: str = "GameManager_Vet",
    base_depth_bands_3: Sequence[float] = (0.48, 0.34, 0.18),
    r_rb_0: float = 0.14,
    r_te_0: float = 0.20,
    gamma_depth: float = 0.32,
) -> dict[str, object]:
    """Compute K12 160-dropback shrunk QB2 backup topology & RB/TE safety-valve shifts."""
    if len(qb1_vector) < 5 or len(qb2_empirical_vector) < 5:
        raise ValueError("qb1_vector and qb2_empirical_vector must each have at least 5 metrics.")

    arch = QB2_ARCHETYPE_PRIOR_DELTAS.get(
        qb2_archetype,
        QB2_ARCHETYPE_PRIOR_DELTAS["GameManager_Vet"],
    )
    prior_vec = [
        float(qb1_vector[0]) + arch[0],
        float(qb1_vector[1]) + arch[1],
        float(qb1_vector[2]) + arch[2],
        float(qb1_vector[3]) * arch[3],
        float(qb1_vector[4]) + arch[5],
    ]
    n_db = max(0, int(qb2_career_dropbacks_n))
    w_qb2 = float(n_db) / (float(n_db) + 160.0)
    theta_qb2 = [
        w_qb2 * float(qb2_empirical_vector[i]) + (1.0 - w_qb2) * prior_vec[i] for i in range(5)
    ]
    theta_qb2[1] = max(5.2, min(10.5, theta_qb2[1]))

    delta_vec = [theta_qb2[i] - float(qb1_vector[i]) for i in range(5)]
    delta_adot = delta_vec[1]

    # Softmax tilt across [short <10, intermediate 10-19, deep 20+] depth bands
    band_scores = [
        math.log(max(1e-6, float(base_depth_bands_3[0]))) - float(gamma_depth) * delta_adot * 0.5,
        math.log(max(1e-6, float(base_depth_bands_3[1]))),
        math.log(max(1e-6, float(base_depth_bands_3[2]))) + float(gamma_depth) * delta_adot,
    ]
    m_b = max(band_scores)
    e_b = [math.exp(s - m_b) for s in band_scores]
    s_b = sum(e_b) or 1.0
    b_depth_new = [v / s_b for v in e_b]

    rb_boost = max(0.015, min(0.055, -0.022 * delta_adot))
    te_boost = max(0.010, min(0.045, -0.018 * delta_adot))
    sack_mult = max(0.90, min(1.85, arch[3]))
    proe_shift = max(-8.5, min(2.0, delta_vec[4] if n_db > 0 else arch[5]))

    return {
        "w_qb2": round(w_qb2, 6),
        "theta_qb2": [round(v, 6) for v in theta_qb2],
        "prior_vec": [round(v, 6) for v in prior_vec],
        "delta_vec": [round(v, 6) for v in delta_vec],
        "b_depth_new": b_depth_new,
        "r_rb_new": round(float(r_rb_0) + rb_boost, 6),
        "r_te_new": round(float(r_te_0) + te_boost, 6),
        "rb_checkdown_boost": round(rb_boost, 6),
        "te_valve_boost": round(te_boost, 6),
        "sack_fault_multiplier": round(sack_mult, 4),
        "int_multiplier": round(arch[4], 4),
        "ttt_shift_sec": round(delta_vec[2], 4),
        "proe_shift_pct": round(proe_shift, 4),
    }


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
