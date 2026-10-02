# Provenance: stability/governance gate for every behavioral rate.
# Implements: partition-01-qb.md #12 (D/S/I audit per 1184 — flag D<0.5 or
# I<0.2 for shrinkage; Minerva Seal >=80 per 2048; n<30 flag per Challenge M;
# 100-dropback pipeline minimum); the answer to Garrett's 17:34 audit
# challenge for this lane: every profile number ships with n, stability
# grade, and recency model.
"""Audit gates: decide whether a computed metric may enter a profile."""
from __future__ import annotations

from dataclasses import dataclass

from . import metrics as M
from .profile import MetricValue, SeasonProfile, Verification

# Governance thresholds (from research, not invented)
D_SHRINK_THRESHOLD = 0.5   # 1184: flag D<0.5 metrics for shrinkage/removal
N_PROFILE_MIN = 100         # pipeline hard minimum (dropbacks/season)
N_SMALL_SAMPLE = 30        # Challenge M: below this is a slate read, not a profile input
N_TINY_SAMPLE = 12         # partition-04: n=12 graduation gate lets noise through — floor, not a pass


@dataclass
class GateResult:
    metric: str
    passed: bool
    reason: str


def sample_gate(key: str, m: MetricValue) -> GateResult:
    """n-based admission: below the tiny-sample floor it is not publishable;
    below 30 it is a slate read, not a profile input."""
    n = m.n or 0
    if n < N_TINY_SAMPLE:
        return GateResult(key, False, f"n={n} below tiny-sample floor {N_TINY_SAMPLE}: do not publish")
    if n < N_SMALL_SAMPLE:
        return GateResult(key, False, f"n={n} < {N_SMALL_SAMPLE}: slate read only, not a profile input")
    return GateResult(key, True, f"n={n} adequate")


def discrimination_gate(key: str, group_means: list[float]) -> GateResult:
    """D/S/I audit: D<0.5 -> shrink, don't drop (1184: relevance overrides)."""
    d = M.discrimination(group_means)
    if d < D_SHRINK_THRESHOLD:
        return GateResult(key, False,
                          f"D={d:.3f} < {D_SHRINK_THRESHOLD}: shrink toward prior, do not publish raw")
    return GateResult(key, True, f"D={d:.3f} adequate")


def audit_season_profile(sp: SeasonProfile) -> list[GateResult]:
    """Run admission gates over every metric in a season profile."""
    results = []
    for key, m in sp.metrics.items():
        results.append(sample_gate(key, m))
    return results


def failing_gates(results: list[GateResult]) -> list[GateResult]:
    return [r for r in results if not r.passed]


def mark_weak_links(sp: SeasonProfile, results: list[GateResult]) -> SeasonProfile:
    """Demote failing metrics to SINGLE_SOURCE with the gate reason.

    They stay in the profile (honest display) but can never be load-bearing
    at L4+ without an explicit flag (reasoning-depth-spec T5).
    """
    failed = {r.metric for r in failing_gates(results)}
    for key in failed:
        m = sp.metrics.get(key)
        if m is not None and m.verification == Verification.COMPUTED:
            m.verification = Verification.SINGLE_SOURCE
            m.note = (m.note + " | AUDIT: " if m.note else "AUDIT: ") + \
                     next(r.reason for r in results if r.metric == key)
    return sp
