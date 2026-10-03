"""
motif_selective.py — The selective publication gate (abyssal contract 1).

The engine's binding constraint is coin-flip volume (~57 picks/day near 0.5),
not a new model. So: publish only forecasts with |p - 0.5| >= delta, sweep
delta over {0, 0.08, 0.10, 0.12, 0.15, 0.18}, and report what the gate keeps
versus what it rejects.

Ownership: Motif. Pure functions on settled rows — no engine imports.
Point-in-time: callers must pass only rows settled before mint; this module
never looks at a row it wasn't given.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import List, Optional, Sequence


DELTA_GRID: Sequence[float] = (0.0, 0.08, 0.10, 0.12, 0.15, 0.18)
POSTED_BRIER_TARGET = 0.22
REJECTED_BRIER_COINFLIP = 0.25
REJECTED_TOLERANCE = 0.03


@dataclass(frozen=True)
class SettledRow:
    """One settled forecast. p is the mint-time probability, y in {0, 1}."""
    p: float
    y: int
    close_p: Optional[float] = None  # de-vigged close at mint, for the beat-the-close check


def brier(rows: Sequence[SettledRow]) -> float:
    if not rows:
        return float("nan")
    return sum((r.p - r.y) ** 2 for r in rows) / len(rows)


def log_loss(rows: Sequence[SettledRow], eps: float = 1e-12) -> float:
    if not rows:
        return float("nan")
    total = 0.0
    for r in rows:
        p = min(max(r.p, eps), 1 - eps)
        total -= r.y * math.log(p) + (1 - r.y) * math.log(1 - p)
    return total / len(rows)


@dataclass
class GateResult:
    delta: float
    n_posted: int
    n_rejected: int
    posted_brier: float
    rejected_brier: float
    posted_log_loss: float
    close_log_loss: Optional[float]  # None if any posted row lacks close_p


def sweep_gate(rows: Sequence[SettledRow], deltas: Sequence[float] = DELTA_GRID) -> List[GateResult]:
    """Run the delta sweep. Returns one result per delta, in grid order."""
    out: List[GateResult] = []
    for delta in deltas:
        posted = [r for r in rows if abs(r.p - 0.5) >= delta]
        rejected = [r for r in rows if abs(r.p - 0.5) < delta]
        close_ll = None
        if posted and all(r.close_p is not None for r in posted):
            close_ll = log_loss([SettledRow(p=r.close_p, y=r.y) for r in posted])
        out.append(GateResult(
            delta=delta,
            n_posted=len(posted),
            n_rejected=len(rejected),
            posted_brier=brier(posted),
            rejected_brier=brier(rejected),
            posted_log_loss=log_loss(posted),
            close_log_loss=close_ll,
        ))
    return out


@dataclass
class GateVerdict:
    chosen_delta: Optional[float]
    passes: bool
    reasons: List[str]


def judge_sweep(results: List[GateResult]) -> GateVerdict:
    """
    Pick the smallest delta whose posted Brier <= 0.22, then apply the
    fail conditions:
      - rejected set must look like coin flips (Brier near 0.25),
      - posted log loss must beat the de-vigged close where closes exist,
      - the gate must actually reject something (delta=0 with no lift fails).
    """
    reasons: List[str] = []
    candidates = [r for r in results if not math.isnan(r.posted_brier)
                  and r.posted_brier <= POSTED_BRIER_TARGET and r.n_posted > 0
                  and r.n_rejected > 0]
    if not candidates:
        return GateVerdict(None, False, ["no selective delta reaches posted Brier <= 0.22"])
    best = min(candidates, key=lambda r: r.delta)

    if abs(best.rejected_brier - REJECTED_BRIER_COINFLIP) > REJECTED_TOLERANCE and best.n_rejected > 0:
        reasons.append(
            f"rejected set not coin-flip-like: Brier={best.rejected_brier:.4f} "
            f"(n={best.n_rejected})"
        )
    if best.close_log_loss is not None and best.posted_log_loss >= best.close_log_loss:
        reasons.append(
            f"posted log loss {best.posted_log_loss:.6f} does not beat close "
            f"{best.close_log_loss:.6f}"
        )
    if best.n_rejected == 0:
        reasons.append("gate rejects nothing: no selectivity demonstrated")

    return GateVerdict(best.delta, not reasons, reasons)
