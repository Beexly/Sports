"""L4 — Bayesian update of the market prior by ingested signals.

Spec (reasoning-depth-spec.md §4 L4 / the 10/13 re-founding brief §3):
"Start with market-implied probability. Each signal applies a multiplicative
likelihood update. Report the posterior, not just the prior or the signal
score. Show the update math."

The update is the standard Bayes odds form:

    posterior_odds = prior_odds * LR_1 * LR_2 * ... * LR_n
    posterior      = posterior_odds / (1 + posterior_odds)

Every applied factor is recorded with its source and verification, so the
update is an audit trail, not a black box. A signal with LR=1.0 changes
nothing and says so. The prior ALWAYS comes from a real market price
(MarketPrior), never from a model feeling.
"""

from __future__ import annotations

from dataclasses import dataclass, field, asdict
from typing import Any

from .signals import MarketPrior, Signal


@dataclass
class UpdateStep:
    """One multiplicative factor in the L4 update, with its provenance."""

    metric: str
    subject: str
    direction: str
    lr: float
    verification: str
    source: str
    note: str


@dataclass
class BayesianUpdate:
    """The full L4 record for one hypothesis."""

    hypothesis: str
    prior: float
    prior_source: str
    posterior: float
    log_odds_shift: float            # natural log of the total LR product
    steps: list[UpdateStep] = field(default_factory=list)
    unapplied: list[dict[str, Any]] = field(default_factory=list)  # neutral/unverifiable signals

    def to_dict(self) -> dict:
        return asdict(self)


def update(prior: MarketPrior, signals: list[Signal]) -> BayesianUpdate:
    """Apply every signal whose hypothesis matches the prior's.

    Matching is by exact hypothesis string; signals for other hypotheses are
    ignored here (they belong to their own update). A CONTRADICTS signal with
    LR>1 applies its inverse. Signals with LR==1 or direction NEUTRAL are
    recorded as unapplied, never dropped silently.
    """
    prior_odds = prior.prior / (1.0 - prior.prior)
    log_shift = 0.0
    steps: list[UpdateStep] = []
    unapplied: list[dict[str, Any]] = []

    for s in signals:
        if s.hypothesis != prior.hypothesis:
            continue
        if s.direction == "neutral" or s.likelihood_ratio == 1.0:
            unapplied.append({**s.to_dict(), "reason": "neutral / LR=1.0: no measured effect"})
            continue
        lr = s.effective_lr()
        log_shift += _ln(lr)
        steps.append(UpdateStep(
            metric=s.metric, subject=s.subject, direction=s.direction,
            lr=round(lr, 4), verification=s.verification, source=s.source,
            note=s.note,
        ))

    posterior_odds = prior_odds * _exp(log_shift) if steps else prior_odds
    posterior = posterior_odds / (1.0 + posterior_odds)
    return BayesianUpdate(
        hypothesis=prior.hypothesis,
        prior=prior.prior,
        prior_source=prior.source,
        posterior=round(posterior, 4),
        log_odds_shift=round(log_shift, 4),
        steps=steps,
        unapplied=unapplied,
    )


def update_all(priors: list[MarketPrior], signals: list[Signal]) -> list[BayesianUpdate]:
    return [update(p, signals) for p in priors]


# --- math helpers (stdlib only; exact, no float tricks) -----------------------

def _ln(x: float) -> float:
    import math
    return math.log(x) if x > 0 else 0.0


def _exp(x: float) -> float:
    import math
    return math.exp(x)
