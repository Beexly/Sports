"""Corpus identities from c02 System 3. Not a scorer and not a join.

Sources:
- docs/engine/research/2026-10-02/corpus-deep/deep/c02/buildable-systems.md System 3
- docs/engine/research/2026-10-02/corpus-deep/deep/c02/work/a05-trust-target.md Metric 1-2
"""
from __future__ import annotations

from collections.abc import Sequence


def _counts(counts: Sequence[float]) -> list[float] | None:
    clean: list[float] = []
    for value in counts:
        if value is None or value != value:
            return None
        clean.append(float(value))
    return clean


def target_hhi(counts: Sequence[float], floor: float = 25.0) -> float | None:
    """a05 and c02 System 3: s_i = T_i / T and HHI = sum of s_i squared. T under 25 is null."""
    clean = _counts(counts)
    if not clean:
        return None
    total = sum(clean)
    if total < floor or total <= 0:
        return None
    return sum((count / total) ** 2 for count in clean)


def effective_targets(hhi: float | None) -> float | None:
    """a05: N_eff = 1 / HHI. A null or non-positive HHI stays null."""
    if hhi is None or hhi != hhi or hhi <= 0:
        return None
    return 1.0 / hhi


def top_two_share(counts: Sequence[float], floor: float = 25.0) -> float | None:
    """c02 System 3: top2_share is the sum of the two largest s_i. T under 25, or fewer than two receivers, is null."""
    clean = _counts(counts)
    if clean is None or len(clean) < 2:
        return None
    total = sum(clean)
    if total < floor or total <= 0:
        return None
    largest = sorted(clean, reverse=True)
    return (largest[0] + largest[1]) / total


def air_yard_share(receiver_air: float | None, team_air: float | None) -> float | None:
    """c02 System 3 leg 2: receiver air yards / team air yards. A missing or non-positive team total is null."""
    if receiver_air is None or receiver_air != receiver_air:
        return None
    if team_air is None or team_air != team_air or team_air <= 0:
        return None
    return float(receiver_air) / float(team_air)
