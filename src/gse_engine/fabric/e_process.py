"""Anytime-valid sequential martingale e-process gate for champion promotion.

Implements bounded score transformation phi(d_t) in [-1, 1] and predictable
F_{t-1}-measurable betting fractions lambda_t in [0, 1) so Ville's inequality
guarantees P_H0(sup_t W_t >= 1 / alpha) <= alpha across arbitrary stopping times.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field


def bounded_score_transform(score_diff: float, scale: float = 0.25) -> float:
    """Map `(champion_loss - challenger_loss)` odd-symmetrically into [-1, 1]."""
    if not math.isfinite(score_diff) or not math.isfinite(scale) or scale <= 0.0:
        raise ValueError("score_diff and positive scale must be finite")
    ratio = float(score_diff) / float(scale)
    return max(-1.0, min(1.0, ratio))


@dataclass(slots=True)
class EProcessObservation:
    """Single walk-forward step wealth transition telemetry."""

    step: int
    champion_loss: float
    challenger_loss: float
    phi: float
    lambda_bet: float
    wealth: float
    invariant_failures: int


@dataclass(slots=True)
class SequentialEProcessGate:
    """Sequential martingale test checking H1: challenger improves CRPS/log-loss."""

    alpha: float = 0.05
    score_scale: float = 0.25
    max_lambda: float = 0.45
    min_lambda: float = 0.01
    wealth: float = 1.0
    step_count: int = 0
    invariant_failures: int = 0
    _sum_phi: float = 0.0
    _sum_phi_sq: float = 0.0
    history: list[EProcessObservation] = field(default_factory=list)

    def __post_init__(self) -> None:
        """Validate sequential alpha and betting bounds."""
        if not (0.0 < self.alpha < 1.0):
            raise ValueError("alpha must lie strictly inside (0, 1)")
        if not (0.0 < self.max_lambda < 1.0):
            raise ValueError("max_lambda must lie strictly inside (0, 1)")

    @property
    def promotion_threshold(self) -> float:
        """Threshold 1 / alpha required to reject H0 safely at level alpha."""
        return 1.0 / self.alpha

    def next_predictable_lambda(self) -> float:
        """Compute strictly F_{t-1}-measurable betting fraction in [0, 1)."""
        if self.step_count < 3:
            return min(self.max_lambda, max(self.min_lambda, 0.08))
        n = float(self.step_count)
        mean_prev = self._sum_phi / n
        second_moment = self._sum_phi_sq / n
        var_prev = max(0.04, second_moment - mean_prev * mean_prev + 0.05)
        if mean_prev <= 0.0:
            return self.min_lambda
        kelly = 0.5 * mean_prev / var_prev
        return max(self.min_lambda, min(self.max_lambda, kelly))

    def step(
        self,
        champion_loss: float,
        challenger_loss: float,
        *,
        invariants_ok: bool = True,
    ) -> EProcessObservation:
        """Update martingale wealth on one chronological out-of-sample slice."""
        if not (math.isfinite(champion_loss) and math.isfinite(challenger_loss)):
            raise ValueError("champion_loss and challenger_loss must be finite")
        if not invariants_ok:
            self.invariant_failures += 1

        lam = self.next_predictable_lambda()
        diff = float(champion_loss) - float(challenger_loss)
        phi = bounded_score_transform(diff, scale=self.score_scale)
        multiplier = max(1e-12, 1.0 + lam * phi)
        self.wealth *= multiplier
        self.step_count += 1
        self._sum_phi += phi
        self._sum_phi_sq += phi * phi

        obs = EProcessObservation(
            step=self.step_count,
            champion_loss=float(champion_loss),
            challenger_loss=float(challenger_loss),
            phi=phi,
            lambda_bet=lam,
            wealth=self.wealth,
            invariant_failures=self.invariant_failures,
        )
        self.history.append(obs)
        return obs

    def can_promote(self) -> bool:
        """Return True iff W_t >= 1 / alpha and zero mathematical invariants failed."""
        return self.invariant_failures == 0 and self.wealth >= self.promotion_threshold
