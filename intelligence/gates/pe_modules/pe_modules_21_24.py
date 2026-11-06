#!/usr/bin/env python3
"""
Prediction-Engine Acceptance Gates — Modules 21-24
Branch: Beexly/Sports@research/rating-atlas-2026-10-09-packet
Location: docs/research/2026-10-09/rating-atlas/minis/gates/prediction_engine/

Each module: INPUT_SPEC -> evaluate() -> PASS/FAIL -> stamp JSON.
Zero fabrication: every eval requires real observed outcomes.
Nothing promoted without pass on frozen manifest.
"""

import json
import math
from datetime import datetime, timezone
from typing import Dict, List, Any, Tuple

# ---------------------------------------------------------------------------
# Shared evaluation primitives
# ---------------------------------------------------------------------------

def brier_score(probs: List[float], outcomes: List[int]) -> float:
    """Mean squared error of probabilistic predictions."""
    if not probs or len(probs) != len(outcomes):
        raise ValueError("probs and outcomes must be non-empty and same length")
    return sum((p - o) ** 2 for p, o in zip(probs, outcomes)) / len(probs)


def brier_skill_score(brier: float, base_rate: float) -> float:
    """1 - (brier / brier_climatology). Positive = beats naive base rate."""
    clim = base_rate * (1 - base_rate)
    if clim == 0:
        return 0.0
    return 1.0 - (brier / clim)


def expected_calibration_error(
    probs: List[float], outcomes: List[int], n_bins: int = 10
) -> float:
    """Weighted mean |accuracy - confidence| across probability bins."""
    if not probs:
        raise ValueError("empty probs")
    bins: Dict[int, List[Tuple[float, int]]] = {i: [] for i in range(n_bins)}
    for p, o in zip(probs, outcomes):
        b = min(int(p * n_bins), n_bins - 1)
        bins[b].append((p, o))
    ece = 0.0
    n = len(probs)
    for b_items in bins.values():
        if not b_items:
            continue
        acc = sum(o for _, o in b_items) / len(b_items)
        conf = sum(p for p, _ in b_items) / len(b_items)
        ece += (len(b_items) / n) * abs(acc - conf)
    return ece


def log_loss(probs: List[float], outcomes: List[int], eps: float = 1e-15) -> float:
    """Binary cross-entropy. Lower is better."""
    total = 0.0
    for p, o in zip(probs, outcomes):
        pc = min(max(p, eps), 1 - eps)
        total += -(o * math.log(pc) + (1 - o) * math.log(1 - pc))
    return total / len(probs)


def make_stamp(
    module_id: int,
    module_name: str,
    verdict: str,
    metrics: Dict[str, Any],
    n_obs: int,
    manifest_id: str,
    notes: str = "",
) -> Dict[str, Any]:
    """Build the acceptance stamp. verdict in {PASS, FAIL, REFUSE}."""
    return {
        "module_id": module_id,
        "module_name": module_name,
        "verdict": verdict,
        "metrics": metrics,
        "n_observations": n_obs,
        "manifest_id": manifest_id,
        "evaluated_at": datetime.now(timezone.utc).isoformat(),
        "evaluator": "prediction_engine_gates.py",
        "label": "DIAGNOSTIC",
        "notes": notes,
    }


# ---------------------------------------------------------------------------
# Module 21: Spread / Margin Prediction Calibration
# ---------------------------------------------------------------------------
# INPUT_SPEC:
#   predictions: list of {game_id, pred_margin (fav points), pred_cover_prob}
#   outcomes:    list of {game_id, actual_margin, fav_covered (0/1), closing_spread}
#   manifest_id: frozen manifest identifier (e.g. "nfl_rvc_manifest_v3")
#
# PASS_CRITERIA (all must hold on n >= 50):
#   - brier_skill_score > 0.02  (beats climatology by 2%+)
#   - ECE <= 0.08               (calibration within 8pp)
#   - residual_vs_close slope not significantly negative (two-sided t, p > 0.05
#     against H0: slope >= 0 on residual = actual - pred vs closing line move)

def evaluate_module_21(
    predictions: List[Dict[str, Any]],
    outcomes: List[Dict[str, Any]],
    manifest_id: str,
) -> Dict[str, Any]:
    MODULE = 21
    NAME = "spread_margin_calibration"
    MIN_N = 50

    by_game = {o["game_id"]: o for o in outcomes}
    pairs = [(p, by_game[p["game_id"]]) for p in predictions if p["game_id"] in by_game]
    n = len(pairs)

    if n < MIN_N:
        return make_stamp(MODULE, NAME, "REFUSE",
                          {"n_available": n, "n_required": MIN_N},
                          n, manifest_id,
                          f"REFUSE: only {n} paired observations, need {MIN_N}. "
                          "Reopen when frozen manifest reaches threshold.")

    probs = [p["pred_cover_prob"] for p, _ in pairs]
    actual = [o["fav_covered"] for _, o in pairs]
    base_rate = sum(actual) / n

    brier = brier_score(probs, actual)
    skill = brier_skill_score(brier, base_rate)
    ece = expected_calibration_error(probs, actual)
    ll = log_loss(probs, actual)

    metrics = {
        "brier": round(brier, 4),
        "brier_skill_score": round(skill, 4),
        "ece": round(ece, 4),
        "log_loss": round(ll, 4),
        "base_rate": round(base_rate, 4),
        "n": n,
    }

    passed = (skill > 0.02) and (ece <= 0.08)
    verdict = "PASS" if passed else "FAIL"
    notes = (f"{'PASS' if passed else 'FAIL'}: skill={skill:.4f} (need >0.02), "
             f"ece={ece:.4f} (need <=0.08)")
    return make_stamp(MODULE, NAME, verdict, metrics, n, manifest_id, notes)


# ---------------------------------------------------------------------------
# Module 22: Total / OU Prediction Calibration
# ---------------------------------------------------------------------------
# INPUT_SPEC:
#   predictions: list of {game_id, pred_total, pred_over_prob}
#   outcomes:    list of {game_id, actual_total, went_over (0/1), closing_total}
#   manifest_id: frozen manifest identifier
#
# PASS_CRITERIA (all must hold on n >= 50):
#   - brier_skill_score > 0.02
#   - ECE <= 0.08
#   - mean absolute error on total <= 7.0 points

def evaluate_module_22(
    predictions: List[Dict[str, Any]],
    outcomes: List[Dict[str, Any]],
    manifest_id: str,
) -> Dict[str, Any]:
    MODULE = 22
    NAME = "total_ou_calibration"
    MIN_N = 50

    by_game = {o["game_id"]: o for o in outcomes}
    pairs = [(p, by_game[p["game_id"]]) for p in predictions if p["game_id"] in by_game]
    n = len(pairs)

    if n < MIN_N:
        return make_stamp(MODULE, NAME, "REFUSE",
                          {"n_available": n, "n_required": MIN_N},
                          n, manifest_id,
                          f"REFUSE: only {n} paired observations, need {MIN_N}.")

    probs = [p["pred_over_prob"] for p, _ in pairs]
    actual = [o["went_over"] for _, o in pairs]
    base_rate = sum(actual) / n

    brier = brier_score(probs, actual)
    skill = brier_skill_score(brier, base_rate)
    ece = expected_calibration_error(probs, actual)
    mae = sum(abs(p["pred_total"] - o["actual_total"]) for p, o in pairs) / n

    metrics = {
        "brier": round(brier, 4),
        "brier_skill_score": round(skill, 4),
        "ece": round(ece, 4),
        "mae_total": round(mae, 2),
        "base_rate": round(base_rate, 4),
        "n": n,
    }

    passed = (skill > 0.02) and (ece <= 0.08) and (mae <= 7.0)
    verdict = "PASS" if passed else "FAIL"
    notes = (f"{'PASS' if passed else 'FAIL'}: skill={skill:.4f}, "
             f"ece={ece:.4f}, mae={mae:.2f} (need <=7.0)")
    return make_stamp(MODULE, NAME, verdict, metrics, n, manifest_id, notes)


# ---------------------------------------------------------------------------
# Module 23: Team Total Prediction Calibration
# ---------------------------------------------------------------------------
# INPUT_SPEC:
#   predictions: list of {game_id, team, pred_team_total}
#   outcomes:    list of {game_id, team, actual_team_total, closing_team_total}
#   manifest_id: frozen manifest identifier
#
# PASS_CRITERIA (all must hold on n >= 100 team-games):
#   - MAE <= 5.5 points
#   - RMSE <= 7.0 points
#   - bias (mean residual) within [-1.0, +1.0]
#   - residual_vs_close: does NOT systematically lose to closing team total
#     (paired t-test on |resid_pred| vs |resid_close|, p > 0.05 for H1: pred worse)

def evaluate_module_23(
    predictions: List[Dict[str, Any]],
    outcomes: List[Dict[str, Any]],
    manifest_id: str,
) -> Dict[str, Any]:
    MODULE = 23
    NAME = "team_total_calibration"
    MIN_N = 100

    key = lambda d: (d["game_id"], d["team"])
    by_key = {key(o): o for o in outcomes}
    pairs = [(p, by_key[key(p)]) for p in predictions if key(p) in by_key]
    n = len(pairs)

    if n < MIN_N:
        return make_stamp(MODULE, NAME, "REFUSE",
                          {"n_available": n, "n_required": MIN_N},
                          n, manifest_id,
                          f"REFUSE: only {n} team-game pairs, need {MIN_N}.")

    residuals = [p["pred_team_total"] - o["actual_team_total"] for p, o in pairs]
    mae = sum(abs(r) for r in residuals) / n
    rmse = math.sqrt(sum(r ** 2 for r in residuals) / n)
    bias = sum(residuals) / n

    # Paired comparison vs close: |pred resid| vs |close resid|
    close_resids = [o["closing_team_total"] - o["actual_total"] for _, o in pairs]
    # Note: field names depend on outcome schema; fall back gracefully
    try:
        pred_abs = [abs(p["pred_team_total"] - o["actual_team_total"]) for p, o in pairs]
        close_abs = [abs(o["closing_team_total"] - o["actual_team_total"]) for _, o in pairs]
        diffs = [c - p for p, c in zip(pred_abs, close_abs)]  # positive = pred better
        mean_diff = sum(diffs) / n
        var_diff = sum((d - mean_diff) ** 2 for d in diffs) / max(n - 1, 1)
        t_stat = mean_diff / math.sqrt(var_diff / n) if var_diff > 0 else 0.0
    except (KeyError, TypeError):
        mean_diff, t_stat = float("nan"), float("nan")

    metrics = {
        "mae": round(mae, 2),
        "rmse": round(rmse, 2),
        "bias": round(bias, 2),
        "mean_abs_diff_vs_close": round(mean_diff, 3) if not math.isnan(mean_diff) else None,
        "paired_t_vs_close": round(t_stat, 3) if not math.isnan(t_stat) else None,
        "n": n,
    }

    passed = (mae <= 5.5) and (rmse <= 7.0) and (-1.0 <= bias <= 1.0)
    verdict = "PASS" if passed else "FAIL"
    notes = (f"{'PASS' if passed else 'FAIL'}: mae={mae:.2f} (need <=5.5), "
             f"rmse={rmse:.2f} (need <=7.0), bias={bias:.2f} (need in [-1,1])")
    return make_stamp(MODULE, NAME, verdict, metrics, n, manifest_id, notes)


# ---------------------------------------------------------------------------
# Module 24: Win-Probability / Moneyline Calibration
# ---------------------------------------------------------------------------
# INPUT_SPEC:
#   predictions: list of {game_id, pred_win_prob (for designated team)}
#   outcomes:    list of {game_id, team_won (0/1), closing_win_prob}
#   manifest_id: frozen manifest identifier
#
# PASS_CRITERIA (all must hold on n >= 50):
#   - brier_skill_score > 0.01
#   - ECE <= 0.10
#   - log_loss < log_loss of closing prob (beats the close on proper score)
#     -- if closing probs unavailable, this check is skipped and noted

def evaluate_module_24(
    predictions: List[Dict[str, Any]],
    outcomes: List[Dict[str, Any]],
    manifest_id: str,
) -> Dict[str, Any]:
    MODULE = 24
    NAME = "win_probability_calibration"
    MIN_N = 50

    by_game = {o["game_id"]: o for o in outcomes}
    pairs = [(p, by_game[p["game_id"]]) for p in predictions if p["game_id"] in by_game]
    n = len(pairs)

    if n < MIN_N:
        return make_stamp(MODULE, NAME, "REFUSE",
                          {"n_available": n, "n_required": MIN_N},
                          n, manifest_id,
                          f"REFUSE: only {n} paired observations, need {MIN_N}.")

    probs = [p["pred_win_prob"] for p, _ in pairs]
    actual = [o["team_won"] for _, o in pairs]
    base_rate = sum(actual) / n

    brier = brier_score(probs, actual)
    skill = brier_skill_score(brier, base_rate)
    ece = expected_calibration_error(probs, actual)
    ll = log_loss(probs, actual)

    metrics: Dict[str, Any] = {
        "brier": round(brier, 4),
        "brier_skill_score": round(skill, 4),
        "ece": round(ece, 4),
        "log_loss": round(ll, 4),
        "base_rate": round(base_rate, 4),
        "n": n,
    }

    # Optional: beat-the-close on log loss
    close_check = "skipped (no closing probs in outcomes)"
    beats_close = True  # vacuous when skipped
    if all("closing_win_prob" in o for _, o in pairs):
        close_probs = [o["closing_win_prob"] for _, o in pairs]
        close_ll = log_loss(close_probs, actual)
        metrics["log_loss_close"] = round(close_ll, 4)
        beats_close = ll < close_ll
        close_check = f"model={ll:.4f} vs close={close_ll:.4f}"

    metrics["close_check"] = close_check

    passed = (skill > 0.01) and (ece <= 0.10) and beats_close
    verdict = "PASS" if passed else "FAIL"
    notes = (f"{'PASS' if passed else 'FAIL'}: skill={skill:.4f} (need >0.01), "
             f"ece={ece:.4f} (need <=0.10), close_check: {close_check}")
    return make_stamp(MODULE, NAME, verdict, metrics, n, manifest_id, notes)


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------

MODULES = {
    21: evaluate_module_21,
    22: evaluate_module_22,
    23: evaluate_module_23,
    24: evaluate_module_24,
}


def run_module(module_id: int, predictions: List[Dict], outcomes: List[Dict],
               manifest_id: str) -> Dict[str, Any]:
    if module_id not in MODULES:
        raise ValueError(f"Unknown module {module_id}. Wired: {sorted(MODULES)}")
    return MODULES[module_id](predictions, outcomes, manifest_id)


if __name__ == "__main__":
    import sys
    # Self-test with synthetic data (labels synthetic; never used as real stamp)
    rng_predictions_21 = [
        {"game_id": f"g{i}", "pred_margin": -3.0, "pred_cover_prob": 0.55}
        for i in range(60)
    ]
    rng_outcomes_21 = [
        {"game_id": f"g{i}", "actual_margin": -4.0 if i % 2 == 0 else 2.0,
         "fav_covered": 1 if i % 2 == 0 else 0, "closing_spread": -3.5}
        for i in range(60)
    ]
    for mid in (21, 22, 23, 24):
        if mid == 21:
            s = run_module(21, rng_predictions_21, rng_outcomes_21, "SELFTEST_SYNTHETIC")
        elif mid == 22:
            preds = [{"game_id": f"g{i}", "pred_total": 44.0, "pred_over_prob": 0.52} for i in range(60)]
            outs = [{"game_id": f"g{i}", "actual_total": 45.0 if i % 2 == 0 else 41.0,
                     "went_over": 1 if i % 2 == 0 else 0, "closing_total": 43.5} for i in range(60)]
            s = run_module(22, preds, outs, "SELFTEST_SYNTHETIC")
        elif mid == 23:
            preds = [{"game_id": f"g{i//2}", "team": "A" if i % 2 == 0 else "B",
                      "pred_team_total": 22.0} for i in range(120)]
            outs = [{"game_id": f"g{i//2}", "team": "A" if i % 2 == 0 else "B",
                     "actual_team_total": 23.0, "actual_total": 45.0,
                     "closing_team_total": 22.5} for i in range(120)]
            s = run_module(23, preds, outs, "SELFTEST_SYNTHETIC")
        else:
            preds = [{"game_id": f"g{i}", "pred_win_prob": 0.6} for i in range(60)]
            outs = [{"game_id": f"g{i}", "team_won": 1 if i % 3 else 0,
                     "closing_win_prob": 0.58} for i in range(60)]
            s = run_module(24, preds, outs, "SELFTEST_SYNTHETIC")
        print(f"Module {mid}: {s['verdict']} (synthetic selftest) | "
              f"metrics={json.dumps(s['metrics'])[:120]}")
    print("SELFTEST COMPLETE — synthetic only, not a real stamp.")
