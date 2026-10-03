# PROVENANCE — gse-intelligence-build / staking / screening.py
# Dominant-asset / redundancy screen (buildable-systems.md SYS-05, from
# r24/1213 "rebalancing frequency considerations for Kelly-optimal").
# Rule: a new leg enters the portfolio only if E[(1+X_i)/(1+X_j)] <= 1
# against every existing leg j, evaluated on the calibrated outcome
# distribution. A leg that fails the screen is suppressed (strictly dominated:
# ratio <= 1 with no ruin states) or merged (highly correlated same-direction
# leg — e.g. spread + moneyline on the same side — folded into the
# higher-EV leg so the book is not double-counted).
# The 1213 result is the theorem itself (dominance <=> all-in is Kelly-optimal
# at every rebalancing frequency); the paper's empirical part only demonstrates
# when the condition triggers. Thresholds below are ledger choices, marked.
# Source docs:
#   ~/workspace/corpus-intelligence/deep/c10/buildable-systems.md (SYS-05)
#   ~/workspace/corpus-intelligence/deep/c10/syntheses.md (Pipeline 3)
#   ~/workspace/vendor/Sports/docs/arxiv-program/research/2026-09-21/arxiv-deep/
#     1213-rebalancing-frequency-considerations-for-kelly-optimal.md

"""1213 dominant-asset / redundancy screen for Kelly portfolios."""

import numpy as np

# Ledger-chosen operating parameters (not paper numbers — the paper gives the
# theorem, not thresholds).
CORR_MERGE_FLOOR = 0.80   # |corr| >= 0.80 -> redundant correlated pair -> merge
RATIO_TOL = 1e-9           # numerical tolerance on the E[(1+Xi)/(1+Xj)] <= 1 rule


def _fixture_distribution():
    """Calibrated fixture: favorite -3 (-110) spread + -150 moneyline.

    Joint margin distribution consistent with the engine's estimated edges
    (spread ev 0.05 -> fair spread-win p = 1.05/1.9091 = 0.55;
     ml ev 0.03 -> fair ml-win p = 1.03/1.6667 = 0.618):
      win by >= 4 : 0.550  (spread wins, ml wins)
      win by 1-3  : 0.068  (spread loses, ml wins)
      lose        : 0.382  (both lose)
    X = net return multiple per unit staked.
    """
    o_spread = 1.9091   # -110
    o_ml = 1.6667       # -150
    states = [
        {"prob": 0.550, "x": {"spread": o_spread - 1.0, "ml": o_ml - 1.0}},
        {"prob": 0.068, "x": {"spread": -1.0, "ml": o_ml - 1.0}},
        {"prob": 0.382, "x": {"spread": -1.0, "ml": -1.0}},
    ]
    return {"states": states,
            "legs": {"spread": {"odds": o_spread}, "ml": {"odds": o_ml}}}


def _resolve_distribution(calibrated_outcomes):
    if calibrated_outcomes == "fixture":
        return _fixture_distribution()
    if isinstance(calibrated_outcomes, dict) and "states" in calibrated_outcomes:
        return calibrated_outcomes
    raise ValueError("calibrated_outcomes must be 'fixture' or a "
                     "{states: [{prob, x: {leg: X}}]} distribution")


def _moments(states, leg_a, leg_b):
    """E[(1+Xa)/(1+Xb)] (+inf if Xb ruins on a state where Xa pays), corr(Xa,Xb).

    The dominance ratio follows the 1213/Cover convention: states where the
    existing leg is ruined (1+Xb = 0) contribute +inf when the candidate still
    pays there (the candidate is not dominated — it survives states the leg
    does not); states where both are ruined contribute nothing. Correlation is
    computed over the full joint distribution.
    """
    ratio = 0.0
    ruined = False
    exa = exb = exa2 = exb2 = exaxb = 0.0
    for s in states:
        p = s["prob"]
        xa, xb = s["x"][leg_a], s["x"][leg_b]
        exa += p * xa
        exb += p * xb
        exa2 += p * xa * xa
        exb2 += p * xb * xb
        exaxb += p * xa * xb
        denom = 1.0 + xb
        if denom <= 0.0:
            if (1.0 + xa) > 0.0:
                ruined = True
            continue
        ratio += p * (1.0 + xa) / denom
    vara = max(exa2 - exa ** 2, 1e-12)
    varb = max(exb2 - exb ** 2, 1e-12)
    corr = (exaxb - exa * exb) / np.sqrt(vara * varb)
    return (float("inf") if ruined else ratio), float(corr), exa, exb


def dominant_asset_screen(picks, calibrated_outcomes="fixture"):
    """1213 redundancy screen.

    picks: list of {"id": str, "ev": float, ...} in candidate order — the first
      pick enters; each later pick is screened against every entered leg.
    calibrated_outcomes: "fixture" or an explicit {states} distribution.

    Returns dict with:
      entering   : ids that enter the portfolio
      suppressed : ids strictly dominated (E[(1+Xi)/(1+Xj)] <= 1, no ruin states)
      merged     : ids folded into a higher-EV correlated leg (|corr| >= 0.80)
      rejected_no_edge : ids with ev <= 0 (never enter: edge-first discipline)
      details    : per-candidate ratio/correlation diagnostics

    Notes: screening is order-dependent — incumbents are kept, challengers are
    screened (portfolio-construction queue discipline). The ratio rule is the
    ledger's simplification of 1213 and is conservative for small independent
    edges; independent +EV legs of comparable edge always enter (Jensen:
    E[(1+Xa)/(1+Xb)] = (1+ev_a) E[1/(1+Xb)] > 1 when ev_a ~= ev_b).
    """
    dist = _resolve_distribution(calibrated_outcomes)
    states = dist["states"]
    entering, suppressed, merged, no_edge, details = [], [], [], [], {}
    for cand in picks:
        cid = cand["id"]
        ev = float(cand.get("ev", 0.0))
        if ev <= 0.0:
            no_edge.append(cid)   # no edge -> no stake, ever (1631 exclusion)
            continue
        verdict, why = "enter", "no redundancy found"
        for leg in entering:
            leg_ev = next(p["ev"] for p in picks if p["id"] == leg)
            ratio, corr, _, _ = _moments(states, cid, leg)
            details[f"{cid}_vs_{leg}"] = {
                "dominance_ratio": ratio, "correlation": corr}
            if ratio <= 1.0 + RATIO_TOL:
                verdict, why = "suppress", (
                    f"E[(1+X_{cid})/(1+X_{leg})]={ratio:.4f} <= 1: "
                    f"{cid} is dominated by {leg} (1213)")
                break
            if abs(corr) >= CORR_MERGE_FLOOR and ev <= leg_ev:
                verdict, why = "merge", (
                    f"corr({cid},{leg})={corr:.3f} >= {CORR_MERGE_FLOOR}: "
                    f"redundant correlated pair; {cid} folds into the "
                    f"higher-EV leg {leg}")
                break
        details[cid] = {"verdict": verdict, "reason": why}
        if verdict == "enter":
            entering.append(cid)
        elif verdict == "suppress":
            suppressed.append(cid)
        else:
            merged.append(cid)
    return {
        "entering": entering,
        "suppressed": suppressed,
        "merged": merged,
        "rejected_no_edge": no_edge,
        "details": details,
        "rule": ("new leg enters only if E[(1+X_i)/(1+X_j)] <= 1 vs every "
                 "existing leg (1213); |corr|>=0.80 same-direction pairs merge"),
        "data_basis": ("'fixture' = calibrated synthetic joint margin "
                       "distribution consistent with the picks' stated EVs; "
                       "not real market data"),
    }
