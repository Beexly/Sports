"""
Calibration eligibility gate — a proven port of the production decision.

Mirrors apps/web/lib/ops/calibration-eligibility.ts, including the exact reason
strings, because an operator comparing this tool's output against the live
/api/ops/public-surface-truth surface must see the SAME words, not a paraphrase.

This module is READ-ONLY in the strongest sense: it evaluates, it never
persists, and it has no code path that can raise a floor's permissiveness. The
floors are constants mirrored from production and `evaluate` refuses to run with
floors looser than the production defaults — under AGENTS.md law 9 a guard may
be given narrower context, never less power. A local analysis tool that could
quietly relax a floor would be a way to launder an unearned claim, so it cannot.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Sequence

__all__ = [
    "Floors",
    "MurphyTerms",
    "LiveMetrics",
    "EligibilityReport",
    "DEFAULT_FLOORS",
    "resolve_floors",
    "evaluate_eligibility",
]


@dataclass(frozen=True, slots=True)
class Floors:
    n: int
    brier: float
    ece: float
    murphy_reliability: float


# Mirrors DEFAULT_CALIBRATION_FLOORS.
DEFAULT_FLOORS = Floors(n=100, brier=0.22, ece=0.05, murphy_reliability=0.05)


@dataclass(frozen=True, slots=True)
class MurphyTerms:
    reliability: float
    resolution: float
    uncertainty: float


@dataclass(frozen=True, slots=True)
class LiveMetrics:
    n: int
    brier: float | None = None
    ece: float | None = None
    mce: float | None = None
    murphy: MurphyTerms | None = None
    model_version: str | None = None
    date_range: str | None = None
    generated_at: str | None = None


@dataclass(frozen=True, slots=True)
class EligibilityReport:
    status: str  # "GREEN" | "RED"
    run_meets_floors: bool
    reasons: tuple[str, ...]
    n: int
    brier: float | None
    ece: float | None
    mce: float | None
    murphy: MurphyTerms | None
    floors: Floors
    consecutive_green: int
    streak_required: int
    operator_hint: str


def _fixed4(value: float) -> str:
    """JavaScript Number.prototype.toFixed(4)."""
    return f"{value:.4f}"


def _finite(value: float | None) -> bool:
    return value is not None and math.isfinite(value)


def resolve_floors(
    partial: dict | None,
    min_settled_for_learning: int,
) -> Floors:
    """Mirrors resolveCalibrationFloors, then REFUSES any loosening.

    Production allows a caller to pass tighter or looser floors. This lab only
    permits tighter. That is a deliberate asymmetry: the tool exists to tell the
    truth about the gate, and a looser floor here would produce a green reading
    that production would never give.
    """
    partial = partial or {}
    base_n = max(1, min_settled_for_learning or DEFAULT_FLOORS.n)
    resolved = Floors(
        n=max(1, int(partial.get("n", base_n))),
        brier=float(partial.get("brier", DEFAULT_FLOORS.brier)),
        ece=float(partial.get("ece", DEFAULT_FLOORS.ece)),
        murphy_reliability=float(
            partial.get("murphy_reliability", DEFAULT_FLOORS.murphy_reliability)
        ),
    )
    if (
        resolved.brier > DEFAULT_FLOORS.brier
        or resolved.ece > DEFAULT_FLOORS.ece
        or resolved.murphy_reliability > DEFAULT_FLOORS.murphy_reliability
    ):
        raise ValueError(
            "Refusing floors looser than production defaults "
            f"({DEFAULT_FLOORS}). AGENTS.md law 9: never weaken a guard."
        )
    return resolved


def evaluate_eligibility(
    *,
    metrics: LiveMetrics | None,
    canonical_settled: int,
    min_settled_for_learning: int,
    settlement_healthy: bool,
    consecutive_green_prior: int,
    streak_required: int,
    floors: dict | None = None,
) -> EligibilityReport:
    """Mirrors evaluateCalibrationEligibility, reason strings included."""
    resolved = resolve_floors(floors, min_settled_for_learning)
    streak_required = max(1, math.floor(streak_required))
    prior = max(0, math.floor(consecutive_green_prior))
    reasons: list[str] = []

    m = metrics
    n = m.n if m else 0
    brier = m.brier if m else None
    ece = m.ece if m else None
    mce = m.mce if m else None
    murphy = m.murphy if m else None

    if not settlement_healthy:
        reasons.append("Settlement not healthy")
    if canonical_settled < min_settled_for_learning:
        reasons.append(f"Canonical settled {canonical_settled}/{min_settled_for_learning}")

    if not m or n <= 0:
        reasons.append("No live calibration metrics artifact")
    else:
        if n < resolved.n:
            reasons.append(f"Map n {n} < floor {resolved.n}")
        if not _finite(brier):
            reasons.append("Brier missing")
        elif brier > resolved.brier:  # type: ignore[operator]
            reasons.append(f"Brier {_fixed4(brier)} > {resolved.brier}")  # type: ignore[arg-type]
        if not _finite(ece):
            reasons.append("ECE missing")
        elif ece > resolved.ece:  # type: ignore[operator]
            reasons.append(f"ECE {_fixed4(ece)} > {resolved.ece}")  # type: ignore[arg-type]
        if not murphy or not math.isfinite(murphy.reliability):
            reasons.append("Murphy reliability missing")
        elif murphy.reliability > resolved.murphy_reliability:
            reasons.append(
                f"Murphy reliability {_fixed4(murphy.reliability)} > {resolved.murphy_reliability}"
            )

    run_meets_floors = len(reasons) == 0
    consecutive_green = prior + 1 if run_meets_floors else 0
    status = "GREEN" if run_meets_floors and consecutive_green >= streak_required else "RED"

    if run_meets_floors and status == "RED":
        reasons.append(
            f"Streak {consecutive_green}/{streak_required} — need "
            f"{streak_required - consecutive_green} more consecutive GREEN run(s)"
        )

    if status == "GREEN":
        hint = (
            f"Eligibility GREEN ({consecutive_green}≥{streak_required}). "
            "Publish automation may promote when CALIBRATION_AUTO_PUBLISH=true."
        )
    elif run_meets_floors:
        hint = (
            f"Floors met this run; streak {consecutive_green}/{streak_required}. "
            "Keep calibration-metrics cron running."
        )
    else:
        hint = (
            f"Eligibility RED: {'; '.join(reasons[:3])}. "
            "Do not publish performance claims."
        )

    return EligibilityReport(
        status=status,
        run_meets_floors=run_meets_floors,
        reasons=tuple(reasons),
        n=n,
        brier=brier,
        ece=ece,
        mce=mce,
        murphy=murphy,
        floors=resolved,
        consecutive_green=consecutive_green,
        streak_required=streak_required,
        operator_hint=hint,
    )
