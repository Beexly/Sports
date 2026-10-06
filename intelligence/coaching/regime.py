# PROVENANCE — gse-intelligence-build / coaching / regime.py
# Implements: buildable-systems.md M04 (regime gate), A2-regime-shift-specs.md
#   (0598 permutation gate ranked #1 buildable; 1905 drift alarm SPEC-only;
#   2129 epistemic gate SPEC-only; 1888 protect-high-interference INVERTED for
#   regime change -> quarantine stale-regime games at x0.25 weight).
# Research basis: 0598 (permutation two-sample, RUN on European football,
#   p=0.971 negative baseline); 0236 (changepoint trigger, RUN); 1905/2129
#   (SPECs — never run on NFL data; implemented as pre-registered gates only).
"""M04 — Coordinator regime-shift detection.

Pipeline: 0236 changepoint trigger proposes a split week -> 0598 permutation
gate confirms it (p<0.05 AND >=5pp sustained shift) -> 1888-inverted rule
quarantines pre-shift games at x0.25 weight for current-regime tendency
computation. The weekly_tendencies.csv series is the feed.
"""
from __future__ import annotations

import math
from typing import Any, Optional, Sequence

from . import common as C

P_GATE = 0.05        # 0598 pre-registered drift gate
MIN_SHIFT_PP = 5.0   # ...sustained >=5pp shift
QUARANTINE_WEIGHT = 0.25  # 1888 inverted: stale-regime games down-weighted


def regime_gate(
    pre: Sequence[float],
    post: Sequence[float],
    min_shift_pp: float = MIN_SHIFT_PP,
    n_permutations: int = 10000,
    seed: int = 20261002,
) -> dict[str, Any]:
    """0598 permutation gate on a proposed pre/post split.

    Passes only if p<0.05 AND |mean shift| >= min_shift_pp (units: the input's
    units — pass to rates as fractions and compare against 0.05).
    """
    p, effect = C.permutation_two_sample_p(list(pre), list(post),
                                           n_permutations=n_permutations, seed=seed)
    shift_pp = effect * 100.0
    passed = (not math.isnan(p)) and p < P_GATE and shift_pp >= min_shift_pp
    return {
        "p_value": p,
        "shift_pp": shift_pp,
        "passed": passed,
        "gate": f"p<{P_GATE} and shift>={min_shift_pp}pp (pre-registered, A2)",
        "method": "0598 permutation two-sample (Variant B quadratic form)",
    }


def changepoint_trigger(
    series: Sequence[float],
    min_side: int = 3,
) -> Optional[dict[str, Any]]:
    """0236 changepoint trigger: scan all splits, return the max-|effect| split.

    The split is a PROPOSAL — it must still pass regime_gate() before any
    quarantine is applied (trigger proposes, gate disposes).
    """
    vals = [v for v in series if not math.isnan(v)]
    n = len(vals)
    if n < 2 * min_side:
        return None
    best = None
    for w in range(min_side, n - min_side + 1):
        pre, post = vals[:w], vals[w:]
        effect = abs(sum(post) / len(post) - sum(pre) / len(pre))
        if best is None or effect > best["effect"]:
            best = {"split_after": w, "effect": effect,
                    "pre_mean": sum(pre) / len(pre), "post_mean": sum(post) / len(post)}
    return best


def quarantine_weights(
    n_weeks: int,
    shift_after_week: Optional[int],
    weight: float = QUARANTINE_WEIGHT,
) -> list[float]:
    """1888-inverted: pre-shift weeks get x0.25 weight in current-regime stats.

    shift_after_week is a 1-based week index: weeks <= it are stale regime.
    None -> no confirmed shift -> uniform weights.
    """
    if shift_after_week is None:
        return [1.0] * n_weeks
    return [weight if (i + 1) <= shift_after_week else 1.0 for i in range(n_weeks)]


def detect_regime_shift(
    weekly_values: Sequence[float],
    min_shift_pp: float = MIN_SHIFT_PP,
) -> dict[str, Any]:
    """Full M04 pipeline: trigger -> gate -> quarantine plan.

    weekly_values: ordered weekly series (e.g. early_down_pass_rate), fractions.
    NaNs are dropped BEFORE the trigger so the split index aligns with the
    gated slices (a NaN-filtering bug here would misalign pre/post windows).
    """
    clean = [v for v in weekly_values if not math.isnan(v)]
    proposal = changepoint_trigger(clean)
    result: dict[str, Any] = {
        "proposal": proposal,
        "confirmed": False,
        "gate": None,
        "quarantine": None,
        "n_weeks_used": len(clean),
        "n_weeks_dropped_nan": len(weekly_values) - len(clean),
    }
    if proposal is None:
        return result
    w = proposal["split_after"]
    gate = regime_gate(clean[:w], clean[w:], min_shift_pp=min_shift_pp)
    result["gate"] = gate
    if gate["passed"]:
        result["confirmed"] = True
        result["quarantine"] = {
            "shift_after_index": w,
            "stale_weight": QUARANTINE_WEIGHT,
            "rule": "1888-inverted: pre-shift games x0.25 in current-regime tendency computation",
        }
    return result
