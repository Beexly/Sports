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

# ---------------------------------------------------------------------------
# L2 cross-signal correlation: signals that MOVE TOGETHER on the same game
# (the doctrine's "biggest structural hole"). Two signals of the same direction
# sharing a mechanism class compound sub-additively (measured rule of thumb:
# sqrt(product) instead of product for same-mechanism stacks) - the SGP
# insight applied to the L4 update. Same-mechanism pairs are declared, not
# guessed, by the caller; the default pairs below are the documented ones.
# ---------------------------------------------------------------------------

SAME_MECHANISM_PAIRS: set[tuple[str, str]] = {
    ("air_density_kg_m3", "wind_kmh"),          # both ballistics
    ("dline_starters_out", "pressure_rate"),     # both pressure-funnel
    ("dt1_out", "dline_starters_out"),
}


def correlated_update(prior: "MarketPrior", signals: list["Signal"]) -> "BayesianUpdate":
    """update() with same-mechanism compounding.

    Signals matching the prior are grouped by mechanism class (metric-based
    pairing table). Within a group the product is dampened: LR_eff =
    sqrt(prod(group LRs)) per pair, full LR otherwise. Every dampening is
    recorded in the step notes so the math stays auditable.
    """
    import math

    prior_odds = prior.prior / (1.0 - prior.prior)
    steps: list[UpdateStep] = []
    unapplied: list[dict[str, Any]] = []
    groups: dict[str, list[Signal]] = {}
    singles: list[Signal] = []
    matched = [s for s in signals if s.hypothesis == prior.hypothesis]

    for s in matched:
        if s.direction == "neutral" or s.likelihood_ratio == 1.0:
            unapplied.append({**s.to_dict(), "reason": "neutral / LR=1.0"})
            continue
        placed = False
        for (a, b) in SAME_MECHANISM_PAIRS:
            if s.metric == a and not any(x.metric == b for x in matched):
                continue
            if s.metric == b and not any(x.metric == a for x in matched):
                continue
            if s.metric in (a, b):
                groups.setdefault(frozenset((a, b)).__str__(), []).append(s)
                placed = True
                break
        if not placed:
            singles.append(s)

    log_shift = 0.0
    for s in singles:
        lr = s.effective_lr()
        log_shift += math.log(lr) if lr > 0 else 0.0
        steps.append(UpdateStep(metric=s.metric, subject=s.subject, direction=s.direction,
                                lr=round(lr, 4), verification=s.verification, source=s.source, note=s.note))
    for key, grp in groups.items():
        if len(grp) == 1:
            s = grp[0]
            lr = s.effective_lr()
            log_shift += math.log(lr) if lr > 0 else 0.0
            steps.append(UpdateStep(metric=s.metric, subject=s.subject, direction=s.direction,
                                    lr=round(lr, 4), verification=s.verification, source=s.source, note=s.note))
            continue
        prod = 1.0
        for s in grp:
            prod *= s.effective_lr()
        eff = math.sqrt(prod)  # dampened same-mechanism stack (documented rule)
        log_shift += math.log(eff) if eff > 0 else 0.0
        names = "+".join(s.metric for s in grp)
        steps.append(UpdateStep(
            metric=names, subject="same-mechanism group", direction="supports",
            lr=round(eff, 4), verification="COMPUTED", source="bayes.correlated_update",
            note=f"same-mechanism pair damped: sqrt(prod)={eff:.4f} instead of prod={prod:.4f} (SGP compounding rule)",
        ))

    posterior_odds = prior_odds * math.exp(log_shift) if steps else prior_odds
    posterior = posterior_odds / (1.0 + posterior_odds)
    return BayesianUpdate(
        hypothesis=prior.hypothesis, prior=prior.prior, prior_source=prior.source,
        posterior=round(posterior, 4), log_odds_shift=round(log_shift, 4),
        steps=steps, unapplied=unapplied,
    )
