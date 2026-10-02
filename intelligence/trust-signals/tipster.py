# Provenance: beat-desk spec Layer 3 (2026-09-13-beat-desk-prop-alignment-context-matrix-v5.3.0.md,
# line 70: "Trust is earned, not assigned. Every source starts at its tier prior; weights
# update on a rolling window by how that source's signals correlated with realized
# outcomes — a tipster leaderboard the engine maintains itself."). Verified in
# deep/c05/verified-claims.md §1.
# Honesty: challenges.md C3 — the spec states the principle but gives no update formula.
# The EMA rule below is SPEC (this module's design choice), not a research finding.
# challenges.md C11 — T4 (Reddit/aggregate) items are volume-gated: single posts never
# emit signals, only aggregates do.

"""Tipster leaderboard: source trust weights earned from realized outcomes.

Each source starts at its trust-tier prior. Every graded outcome nudges a rolling
accuracy estimate (exponential moving average); the effective weight is
tier_prior * (0.5 + accuracy_ema), so a source that is always wrong sinks to half
its prior and one that is always right rises to 1.5x.

This is deliberately simple and auditable. It is not a fitted model.
"""

from __future__ import annotations

from dataclasses import dataclass

from .models import TIER_PRIORS, TrustTier

# SPEC: EMA smoothing for the rolling accuracy window. Smaller = longer memory.
ACCURACY_ALPHA = 0.1

# SPEC: T4 aggregate sources only emit signals in volume — minimum items per
# (team, 24h window) before the aggregate counts. Single posts are stored silent.
T4_MIN_VOLUME = 5


@dataclass
class SourceTrust:
    """Rolling trust record for one source."""

    handle: str
    tier: TrustTier
    accuracy_ema: float = 0.5   # starts neutral: no evidence yet
    n_graded: int = 0

    @property
    def tier_prior(self) -> float:
        return TIER_PRIORS[self.tier]

    @property
    def weight(self) -> float:
        """Effective source weight: tier_prior * (0.5 + accuracy_ema).

        Range: [0.5 * prior, 1.5 * prior]. A new source (ema 0.5) sits at 1.0x prior.
        """
        return round(self.tier_prior * (0.5 + self.accuracy_ema), 6)

    def record_outcome(self, correct: bool, alpha: float = ACCURACY_ALPHA) -> None:
        """Grade one resolved signal. correct=True if the signal's implied
        direction matched the realized outcome."""
        outcome = 1.0 if correct else 0.0
        self.accuracy_ema = round((1 - alpha) * self.accuracy_ema + alpha * outcome, 6)
        self.n_graded += 1


class TipsterBoard:
    """The leaderboard itself: one SourceTrust per handle."""

    def __init__(self, handles_to_tiers: dict[str, TrustTier] | None = None):
        self._board: dict[str, SourceTrust] = {}
        for handle, tier in (handles_to_tiers or {}).items():
            self._board[handle] = SourceTrust(handle=handle, tier=tier)

    def register(self, handle: str, tier: TrustTier) -> SourceTrust:
        if handle not in self._board:
            self._board[handle] = SourceTrust(handle=handle, tier=tier)
        return self._board[handle]

    def weight_for(self, handle: str, tier: TrustTier) -> float:
        """Effective weight; auto-registers unknown sources at their tier prior."""
        return self.register(handle, tier).weight

    def record_outcome(self, handle: str, tier: TrustTier, correct: bool) -> SourceTrust:
        trust = self.register(handle, tier)
        trust.record_outcome(correct)
        return trust

    def leaderboard(self) -> list[SourceTrust]:
        """Sources ranked by effective weight, highest first."""
        return sorted(self._board.values(), key=lambda s: s.weight, reverse=True)
