# Provenance: c06 deep research buildable-systems.md §3 (scoring/aggregation design)
# and B6. Research basis: LEAP (0440) — tempered conjugate update
# τ_post=τ0+ηΣτᵢ, wᵢ∈[0.05,1.5], >4σ outlier rule, dependency clustering,
# LOO Δⱼ audit, "the prior carries the weight" ablation warning; sibling
# served_weight (magnitude × freshness_decay × tipster_weight) as τ input;
# BoRaEM (0530) per-source reliability concept (v1 = sibling TIER_PRIORS ×
# TipsterBoard EMA); r19 (agreement = τ-weighted direction HHI, never source
# counts); 0670 ŵ-vs-close as the promotion protocol; 1556 γ=0.5 gated
# post-calibration. v1: numpy, stdlib. All outputs shadow/UNCALIBRATED/INFERENCE.

"""Tempered Bayesian trust aggregator with LOO audit.

Corpus-backed (0440 LEAP): posterior form, tempered conjugate update,
role-weight range, outlier rule, one-representative-per-story, LOO Δⱼ.
INFERENCE (all in AGG_DEFAULTS, printed in every test log): prior μ0/τ0,
direction→μ mapping, η_social=0.5 temper, outlier shrink 0.25 (paper rejects
outright — documented deviation), consensus-HHI thresholds, n≥3 bayesian
threshold, ŵ>0.05 promotion threshold.

Honesty note: the draft spec's "ΣΔⱼ ≈ μ_post − μ_prior" is NOT a mathematical
identity (counterexample: n=2, τ0=1, τ₁=τ₂=1 gives ΣΔⱼ=(a+b)/6 vs
μ_post−μ0=(a+b)/3). LOO deltas are an audit trail, not a decomposition.
The exact identity tested is tau_post*(mu_post−mu0) = sum_i eta_i*tau_i*(mu_i−mu0).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum

import numpy as np

from .models import (
    CalibrationState,
    SignalOrigin,
    SignalType,
    TrustDirection,
    TrustSignal,
    Verification,
)

# ---------------------------------------------------------------------------
# AGG_DEFAULTS — every INFERENCE constant in one dict, printed in test logs.
# ---------------------------------------------------------------------------
AGG_DEFAULTS: dict = {
    # Prior (INFERENCE): neutral trust, unit precision.
    "mu0": 0.0,
    "tau0": 1.0,
    # Temper (INFERENCE): SOCIAL-origin items discounted — 0841 κ=0.25 and
    # 1119 lexicon limits justify *a* discount; the 0.5 value is a guess.
    "eta_default": 1.0,
    "eta_social": 0.5,
    # Outlier rule (LEAP: >4 prior-σ rejected; we shrink — documented deviation).
    "outlier_sigma": 4.0,
    "outlier_shrink": 0.25,
    # Role-weight range (LEAP w_i, corpus-backed); PROVENANCE-GAP pinned to floor.
    "role_weight_min": 0.05,
    "role_weight_max": 1.5,
    # Expert-consensus concentration (INFERENCE metric, greenfield).
    "hhi_clear": 0.8,
    "conflict_min_share": 0.25,
    # Bayesian path needs >=3 items (INFERENCE); else heuristic + weak-link flag.
    "min_items_bayesian": 3,
    # Promotion protocol (INFERENCE): 0670 ŵ-vs-close must clear 0.05.
    "what_promotion": 0.05,
}

# Direction sign per signal type (INFERENCE constants).
_TYPE_SIGN: dict[SignalType, int] = {
    SignalType.TRUST_UP: +1,
    SignalType.PRAISE_UNPROMPTED: +1,
    SignalType.TRUST_QUOTE: 0,   # direction comes from trust_direction instead
    SignalType.TRUST_DOWN: -1,
    SignalType.FRUSTRATION: -1,
    SignalType.ROLE_INCREASE: +1,   # scored on the separate role_delta axis
    SignalType.ROLE_DECREASE: -1,   # scored on the separate role_delta axis
}

# Types that never enter the trust mean.
_NON_MEAN_TYPES = frozenset({SignalType.NEWS_CONFLICT, SignalType.RETRACTION})


def direction_sign(sig: TrustSignal) -> int | None:
    """Signed direction of a signal for the trust mean, or None if it does not
    enter the mean (NEWS_CONFLICT/RETRACTION/UNKNOWN)."""
    if sig.signal_type in _NON_MEAN_TYPES:
        return None
    if sig.trust_direction == TrustDirection.UP:
        return +1
    if sig.trust_direction == TrustDirection.DOWN:
        return -1
    if sig.trust_direction == TrustDirection.NEUTRAL:
        return 0
    if sig.trust_direction == TrustDirection.CONFLICT:
        return None
    # Fall back to the type-level sign (e.g. FRUSTRATION with UNKNOWN direction).
    return _TYPE_SIGN.get(sig.signal_type, 0)


@dataclass(frozen=True)
class TrustScore:
    """Aggregated trust for one (speaker, target, team) group. Triage index —
    shadow=True, UNCALIBRATED, INFERENCE until the §4.5 gates pass."""
    team: str | None
    speaker_id: str | None
    speaker_name: str | None
    target_id: str | None
    target_name: str | None
    trust_score: float            # μ_post in [-1, 1]; NEVER a probability
    width: float                  # 1/sqrt(τ_post)
    n_items: int                  # input items in the group
    n_scored: int                 # items entering the mean (post story-dedup)
    n_clusters: int
    consensus_hhi: float          # τ-weighted direction HHI (r19: never source counts)
    direction: TrustDirection
    role_delta: float             # separate ROLE_INCREASE/DECREASE axis
    item_contributions: tuple[tuple[str, float], ...]  # (signal_id, Δⱼ) LOO audit
    weak_link: bool               # n_items < min_items_bayesian (spec T5)
    trust_path: str               # "bayesian" | "heuristic"
    story_cluster_ids: tuple[str, ...] = ()
    calibration_state: CalibrationState = CalibrationState.UNCALIBRATED
    shadow: bool = True
    verification: Verification = Verification.INFERENCE


def consensus_hhi(tau_pos: float, tau_neg: float, tau_neu: float) -> float:
    """τ-weighted direction concentration: 1.0 = unanimous, ~0.33 = split.
    Same math as target-share HHI, different object — do not conflate."""
    total = tau_pos + tau_neg + tau_neu
    if total <= 0:
        return 0.0
    return float((tau_pos / total) ** 2 + (tau_neg / total) ** 2 + (tau_neu / total) ** 2)


def _shrink_outliers(mus: np.ndarray, mu0: float, tau0: float,
                     defaults: dict) -> np.ndarray:
    """LEAP >4σ rule with our documented deviation: shrink, don't reject."""
    sigma0 = 1.0 / np.sqrt(tau0)
    k = defaults["outlier_sigma"]
    f = defaults["outlier_shrink"]
    out = mus.copy()
    mask = np.abs(mus - mu0) > k * sigma0
    out[mask] = mu0 + f * (mus[mask] - mu0)
    return out


def _item_etas(signals: list[TrustSignal], defaults: dict) -> "np.ndarray":
    """Per-item temper: SOCIAL-origin items get eta_social, everything else
    eta_default (INFERENCE — 0841 κ=0.25 / 1119 lexicon limits justify *a*
    discount; the 0.5 value is a guess)."""
    return np.array([
        defaults["eta_social"] if s.signal_origin == SignalOrigin.SOCIAL
        else defaults["eta_default"]
        for s in signals
    ])


def _posterior(mus: "np.ndarray", taus: "np.ndarray", etas: "np.ndarray",
               mu0: float, tau0: float) -> tuple[float, float]:
    w = etas * taus
    tau_post = tau0 + float(np.sum(w))
    mu_post = (tau0 * mu0 + float(np.sum(w * mus))) / tau_post
    return mu_post, tau_post


def aggregate_group(signals: list[TrustSignal],
                    weight_fn=None,
                    eta: float | None = None,
                    defaults: dict | None = AGG_DEFAULTS,
                    mu0: float | None = None,
                    tau0: float | None = None) -> TrustScore:
    """Aggregate one (speaker, target, team) group of story-representative
    signals into a TrustScore.

    Steps (§3.3): outlier shrink -> tempered conjugate update -> LOO Δⱼ.
    NEWS_CONFLICT items never enter the mean; they force direction=CONFLICT.
    ROLE_INCREASE/DECREASE items score the separate role_delta axis.
    """
    defaults = defaults or AGG_DEFAULTS
    mu0 = mu0 if mu0 is not None else defaults["mu0"]
    tau0 = tau0 if tau0 is not None else defaults["tau0"]
    weight_fn = weight_fn or (lambda s: s.magnitude)
    # Temper: explicit scalar override, else per-item by origin (INFERENCE).
    eta_override = eta

    team = signals[0].team if signals else None
    speaker_id = signals[0].speaker_id if signals else None
    speaker_name = signals[0].speaker_name if signals else None
    target_id = signals[0].target_id if signals else None
    target_name = signals[0].target_name if signals else None

    # Separate the role axis (ROLE_INCREASE/DECREASE) from the trust mean.
    role_items = [s for s in signals
                  if s.signal_type in (SignalType.ROLE_INCREASE, SignalType.ROLE_DECREASE)]
    trust_items = [s for s in signals if s not in role_items]

    scored: list[tuple[TrustSignal, float, float]] = []  # (signal, μᵢ, τᵢ)
    has_conflict = False
    for s in trust_items:
        if (s.signal_type == SignalType.NEWS_CONFLICT
                or s.trust_direction == TrustDirection.CONFLICT):
            has_conflict = True
            continue
        sd = direction_sign(s)
        if sd is None:
            continue
        mu_i = sd * s.magnitude                       # INFERENCE: magnitude as strength
        tau_i = weight_fn(s) * s.role_weight          # served_weight × LEAP wᵢ
        scored.append((s, mu_i, tau_i))

    n = len(signals)
    min_bayes = defaults["min_items_bayesian"]
    trust_path = "bayesian" if n >= min_bayes else "heuristic"

    if scored:
        sigs = [s for s, _, _ in scored]
        if eta_override is not None:
            etas = np.full(len(scored), eta_override)
        else:
            etas = _item_etas(sigs, defaults)
        mus = _shrink_outliers(np.array([m for _, m, _ in scored]), mu0, tau0, defaults)
        taus = np.array([t for _, _, t in scored])
        mu_post, tau_post = _posterior(mus, taus, etas, mu0, tau0)
        width = 1.0 / np.sqrt(tau_post)
        # LOO audit: Δⱼ = μ_post − μ_post^(−j) (audit trail, not a decomposition).
        contribs: list[tuple[str, float]] = []
        for k, (s, _m, _t) in enumerate(scored):
            mu_loo, _ = _posterior(np.delete(mus, k), np.delete(taus, k),
                                   np.delete(etas, k), mu0, tau0)
            contribs.append((s.signal_id, float(mu_post - mu_loo)))
        tau_pos = float(np.sum([e * t for (_, m, t), e in zip(scored, etas) if m > 0]))
        tau_neg = float(np.sum([e * t for (_, m, t), e in zip(scored, etas) if m < 0]))
        tau_neu = float(np.sum([e * t for (_, m, t), e in zip(scored, etas) if m == 0]))
    else:
        mu_post, tau_post = mu0, tau0
        width = 1.0 / np.sqrt(tau_post)
        contribs = []
        tau_pos = tau_neg = tau_neu = 0.0

    hhi = consensus_hhi(tau_pos, tau_neg, tau_neu)
    total_dir = tau_pos + tau_neg + tau_neu
    if has_conflict or (total_dir > 0
                        and min(tau_pos, tau_neg) / (tau_pos + tau_neg + 1e-12)
                        >= defaults["conflict_min_share"] and tau_pos > 0 and tau_neg > 0):
        direction = TrustDirection.CONFLICT
    elif tau_pos > tau_neg:
        direction = TrustDirection.UP
    elif tau_neg > tau_pos:
        direction = TrustDirection.DOWN
    else:
        direction = TrustDirection.NEUTRAL if total_dir > 0 else TrustDirection.UNKNOWN

    # Role axis: same machinery, ±1 signs (INFERENCE).
    if role_items:
        rmus = np.array([(+1 if s.signal_type == SignalType.ROLE_INCREASE else -1)
                         * s.magnitude for s in role_items])
        rtaus = np.array([weight_fn(s) * s.role_weight for s in role_items])
        if eta_override is not None:
            retas = np.full(len(role_items), eta_override)
        else:
            retas = _item_etas(role_items, defaults)
        role_delta, _ = _posterior(rmus, rtaus, retas, mu0, tau0)
    else:
        role_delta = 0.0

    clusters = tuple(sorted({s.story_cluster_id for s in signals if s.story_cluster_id}))

    return TrustScore(
        team=team, speaker_id=speaker_id, speaker_name=speaker_name,
        target_id=target_id, target_name=target_name,
        trust_score=float(np.clip(mu_post, -1.0, 1.0)), width=float(width),
        n_items=n, n_scored=len(scored), n_clusters=len(clusters) or (1 if n else 0),
        consensus_hhi=hhi, direction=direction, role_delta=float(role_delta),
        item_contributions=tuple(contribs),
        weak_link=n < min_bayes, trust_path=trust_path,
        story_cluster_ids=clusters,
    )


def aggregate_all(signals: list[TrustSignal], weight_fn=None,
                  defaults: dict | None = AGG_DEFAULTS) -> list[TrustScore]:
    """Group signals by (speaker_id/speaker_name, target_id/target_name, team)
    and aggregate each group. Expects story-representative inputs (the caller
    runs clustering.assign_story_clusters + select_representative first)."""
    groups: dict[tuple, list[TrustSignal]] = {}
    for s in signals:
        key = (s.speaker_id or s.speaker_name or "unknown-speaker",
               s.target_id or s.target_name or s.player_id or "unknown-target",
               s.team)
        groups.setdefault(key, []).append(s)
    return [aggregate_group(g, weight_fn=weight_fn, defaults=defaults)
            for g in groups.values()]
