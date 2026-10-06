# PROVENANCE — gse-intelligence-build / coaching / common.py
# Implements: corpus-intelligence/deep/c03/buildable-systems.md §1 (shared infrastructure:
#   neutral_mask, empbayes, league_expected_rate, safe-div, half-split helper)
#   + deep/c03/syntheses.md Thread 2 (n-floor formalization: 1575's >=25-decision gate).
# Research basis: 1575 (τ estimand, 200-bootstrap uncertainty ritual, n>=25 publication
#   gate); 0598 (permutation two-sample regime gate); reasoning-depth-spec.md §5 Track 2.
# Runtime deps: Python stdlib + numpy ONLY (no pandas/pyarrow — see tests/README.md).
"""Shared math + play filters for the coaching tendency engine.

Every predicate here is the single source of truth shared by the build-time
table generator (coaching/build/build_tables.py) and the runtime modules, so a
number computed offline and a number computed live can never disagree on the
definition of "neutral script" or "scrimmage play".
"""
from __future__ import annotations

import math
from typing import Any, Mapping, Optional

import numpy as np

# ---------------------------------------------------------------------------
# Play-level predicates (operate on dict-like play records)
# ---------------------------------------------------------------------------

SCRIMMAGE_TYPES = ("pass", "run")


def _nz1(v: Any) -> bool:
    """True when a flag column equals 1 (tolerates None/NaN/0)."""
    try:
        return float(v) == 1.0
    except (TypeError, ValueError):
        return False


def is_scrimmage_play(play: Mapping[str, Any]) -> bool:
    """Base filter — matches compute_tendencies.py: pass/run, no kneels/spikes/aborted."""
    return (
        play.get("play_type") in SCRIMMAGE_TYPES
        and not _nz1(play.get("qb_kneel"))
        and not _nz1(play.get("qb_spike"))
        and not _nz1(play.get("aborted_play"))
        and play.get("posteam") is not None
    )


def is_neutral_script(play: Mapping[str, Any], lo: float = 0.35, hi: float = 0.65) -> bool:
    """Neutral-script window — nflverse descriptive norm (buildable-systems.md §1)."""
    wp = play.get("wp")
    if wp is None:
        return False
    try:
        wp = float(wp)
    except (TypeError, ValueError):
        return False
    if math.isnan(wp):
        return False
    return lo <= wp <= hi


def is_early_down(play: Mapping[str, Any]) -> bool:
    return play.get("down") in (1, 2)


def ydstogo_bin(ydstogo: Any) -> Optional[str]:
    """Distance bins shared by PROE cells: short / mid / long."""
    try:
        y = float(ydstogo)
    except (TypeError, ValueError):
        return None
    if math.isnan(y):
        return None
    if y <= 3:
        return "short"
    if y <= 7:
        return "mid"
    return "long"


def down_group(down: Any) -> Optional[str]:
    try:
        d = int(down)
    except (TypeError, ValueError):
        return None
    if d in (1, 2):
        return "early"
    if d == 3:
        return "third"
    if d == 4:
        return "fourth"
    return None


def is_pass_attempt(play: Mapping[str, Any]) -> bool:
    return _nz1(play.get("pass_attempt"))


def is_rush_attempt(play: Mapping[str, Any]) -> bool:
    return _nz1(play.get("rush_attempt"))


# ---------------------------------------------------------------------------
# Rate math
# ---------------------------------------------------------------------------

def safe_div(a: float, b: float) -> float:
    return float(a) / float(b) if b else math.nan


def pass_rate(n_pass: float, n_rush: float) -> float:
    """Pass/(pass+rush) — matches the base pipeline's prate convention."""
    return safe_div(n_pass, n_pass + n_rush)


def rate_se(p: float, n: float) -> float:
    """Binomial standard error of a rate."""
    if n <= 0 or math.isnan(p):
        return math.nan
    return math.sqrt(p * (1.0 - p) / n)


def empbayes_shrink(raw: float, n: float, k: float) -> float:
    """Empirical-Bayes shrink toward the league prior (prior mean 0 for deltas).

    w = n / (n + k); shrunk = raw * w. k = league-median cell n.
    (buildable-systems.md §1: M01/M05 shared infrastructure.)
    """
    if n <= 0 or k <= 0 or math.isnan(raw):
        return math.nan
    return raw * (n / (n + k))


def zscore_within_season(values: list[float]) -> list[float]:
    """League z-scores within one season; NaN-safe (NaN in -> NaN out)."""
    arr = np.array(values, dtype=float)
    mu = np.nanmean(arr)
    sd = np.nanstd(arr)
    if sd == 0 or math.isnan(sd):
        return [math.nan] * len(values)
    return [((v - mu) / sd) if not math.isnan(v) else math.nan for v in values]


def spearman(x: list[float], y: list[float]) -> float:
    """Spearman rank correlation, pairwise-NaN-dropping."""
    pairs = [(a, b) for a, b in zip(x, y)
             if not (math.isnan(a) or math.isnan(b))]
    if len(pairs) < 3:
        return math.nan
    xa = np.array([p[0] for p in pairs])
    ya = np.array([p[1] for p in pairs])
    rx = np.argsort(np.argsort(xa)).astype(float)
    ry = np.argsort(np.argsort(ya)).astype(float)
    if np.std(rx) == 0 or np.std(ry) == 0:
        return math.nan
    return float(np.corrcoef(rx, ry)[0, 1])


# ---------------------------------------------------------------------------
# 1575 publication gate (Thread 2 / syntheses.md "Duplication = FORMALIZE")
# ---------------------------------------------------------------------------

MIN_DECISIONS_1575 = 25  # coach plots restricted to >=25 decisions per region per WP range


def publishable(n: float, floor: float = MIN_DECISIONS_1575) -> bool:
    """1575's own publication gate, enforced mechanically (was hand-flagged)."""
    return n >= floor


# ---------------------------------------------------------------------------
# 0598 permutation two-sample regime gate (A2 rank #1)
# ---------------------------------------------------------------------------

def permutation_two_sample_p(
    pre: list[float],
    post: list[float],
    n_permutations: int = 10000,
    seed: int = 20261002,
) -> tuple[float, float]:
    """Permutation p-value for a mean shift between two windows.

    Statistic: squared standardized mean difference of the two samples
    (the coaching-tendency adaptation of 0598's quadratic form — Variant B in
    A2-regime-shift-specs.md §2a). Returns (p_value, effect_size) where
    effect_size = |mean(post) - mean(pre)| in the input's units.
    Deterministic given seed (tests/README.md rule 4).
    """
    pre_a = np.array([v for v in pre if not math.isnan(v)], dtype=float)
    post_a = np.array([v for v in post if not math.isnan(v)], dtype=float)
    if len(pre_a) < 2 or len(post_a) < 2:
        return math.nan, math.nan
    pooled_sd = math.sqrt((np.var(pre_a) + np.var(post_a)) / 2.0)
    if pooled_sd == 0:
        # Degenerate: no within-sample variation (e.g. constant test vectors).
        # Fall back to the unstandardized squared mean difference — the
        # permutation distribution is still informative about the shift.
        pooled_sd = 1.0
        standardized = False
    else:
        standardized = True
    obs = ((np.mean(post_a) - np.mean(pre_a)) / pooled_sd) ** 2
    combined = np.concatenate([pre_a, post_a])
    n_pre = len(pre_a)
    rng = np.random.default_rng(seed)
    ge = 0
    for _ in range(n_permutations):
        rng.shuffle(combined)
        a, b = combined[:n_pre], combined[n_pre:]
        stat = ((np.mean(b) - np.mean(a)) / pooled_sd) ** 2
        if stat >= obs:
            ge += 1
    # +1 smoothing: never report p = 0 from a finite permutation draw.
    p = (ge + 1) / (n_permutations + 1)
    return float(p), float(abs(np.mean(post_a) - np.mean(pre_a)))


# ---------------------------------------------------------------------------
# Coach-id slugs (provider-facing)
# ---------------------------------------------------------------------------

def coach_slug(name: str) -> str:
    """'Todd Monken' -> 'todd-monken'. Provider contract key."""
    return "-".join(name.strip().lower().split())
