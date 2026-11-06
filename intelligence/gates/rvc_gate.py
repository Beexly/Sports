"""Residual-versus-close (RVC) gate — the fleet's clearance gate.

Doctrine (Reasoning Doctrine, 2026-10-05; fleet rule since 2026-09):
nothing reaches a live margin, pick, prop, parlay, or DFS recommendation
without residual-versus-close clearance on a FROZEN manifest. The market
close is Layer 1, the sharpest number available; a model earns the right
to be labeled a pick only by demonstrating, on a frozen held-out set it
never trained on, that its residuals against the close are not
systematically negative and that it scores better than the close itself.

This module is the evaluation. It is deliberately hard to satisfy:

  * No dataset            -> NOT_CLEARED.
  * Dataset manifest does not declare disjoint train/eval years
    (held-out discipline, intelligence/gates/heldout_check.py)
                          -> NOT_CLEARED.
  * Fewer than MIN_N paired rows
                          -> NOT_CLEARED.
  * Any criterion fails   -> NOT_CLEARED, with the numbers recorded.

Criteria (anchored to prediction-engine module 21's stated acceptance
bar in intelligence/gates/pe_modules/pe_modules_21_24.py, applied here
against the close itself rather than climatology alone):

  1. Brier(model) < Brier(close) on the frozen holdout.
  2. Brier skill score of the model vs climatology > 0.02.
  3. Residual-vs-close slope not significantly negative: regressing the
     outcome residual (outcome - model_prob) on the model's deviation
     from the close (model_prob - close_prob) must not yield a slope
     that is negative with a two-sided t-test p < 0.05. A significantly
     negative slope means the model's disagreements with the close are
     anti-predictive — the "edge" points the wrong way.

The verdict is computed, never assumed: this function returns CLEARED
only when every check passes on real supplied numbers. Callers stamp
their artifacts from this verdict (see gauntlet.derive_stamps); nothing
in this module labels anything a pick.
"""
from __future__ import annotations

import math
from typing import Any, Optional

MIN_N = 50
BSS_MIN = 0.02
SLOPE_ALPHA = 0.05


def _brier(probs: list[float], outcomes: list[int]) -> float:
    return sum((p - o) ** 2 for p, o in zip(probs, outcomes)) / len(probs)


def _ece(probs: list[float], outcomes: list[int], n_bins: int = 10) -> float:
    bins: dict[int, list[tuple[float, int]]] = {i: [] for i in range(n_bins)}
    for p, o in zip(probs, outcomes):
        bins[min(int(p * n_bins), n_bins - 1)].append((p, o))
    n = len(probs)
    total = 0.0
    for items in bins.values():
        if not items:
            continue
        acc = sum(o for _, o in items) / len(items)
        conf = sum(p for p, _ in items) / len(items)
        total += (len(items) / n) * abs(acc - conf)
    return total


def _slope_test(xs: list[float], ys: list[float]) -> dict[str, Any]:
    """OLS slope of ys on xs with a two-sided t-test on the slope.

    Returns {slope, t_stat, p_value, evaluated}. p_value is None when
    scipy is unavailable or the regression is degenerate; the caller
    treats an unevaluated slope test as a failed check (fail-closed).
    """
    n = len(xs)
    out: dict[str, Any] = {"slope": None, "t_stat": None, "p_value": None,
                           "evaluated": False}
    if n < 4:
        return out
    mx = sum(xs) / n
    my = sum(ys) / n
    sxx = sum((x - mx) ** 2 for x in xs)
    if sxx <= 0:
        return out
    sxy = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    slope = sxy / sxx
    resid = [y - (my + slope * (x - mx)) for x, y in zip(xs, ys)]
    dof = n - 2
    s2 = sum(r * r for r in resid) / dof if dof > 0 else 0.0
    se = math.sqrt(s2 / sxx) if s2 > 0 else 0.0
    out["slope"] = slope
    if se == 0.0:
        # Perfect fit: slope is exact; significance is total either way.
        out["t_stat"] = 0.0 if slope == 0.0 else math.copysign(float("inf"), slope)
        out["p_value"] = 1.0 if slope == 0.0 else 0.0
        out["evaluated"] = True
        return out
    t_stat = slope / se
    out["t_stat"] = t_stat
    try:
        from scipy import stats  # type: ignore

        out["p_value"] = float(2 * (1 - stats.t.cdf(abs(t_stat), dof)))
        out["evaluated"] = True
    except Exception:
        out["evaluated"] = False
    return out


def evaluate_rvc(
    dataset: Optional[list[dict[str, Any]]],
    dataset_manifest: Optional[dict[str, Any]],
    manifest_id: str = "",
) -> dict[str, Any]:
    """Evaluate residual-versus-close clearance on a frozen paired holdout.

    dataset rows: {"model_prob": float, "close_prob": float, "outcome": 0|1}
    dataset_manifest: {"train_years": [...], "eval_years": [...], ...}

    Returns a verdict dict. verdict is "CLEARED" only if every check
    passes; otherwise "NOT_CLEARED" with reasons and whatever numbers
    could honestly be computed.
    """
    try:
        from gates.heldout_check import check as heldout_errors
    except ImportError:  # repo-root import style
        from intelligence.gates.heldout_check import check as heldout_errors

    checks: list[dict[str, Any]] = []
    reasons: list[str] = []
    metrics: dict[str, Any] = {"n": 0}

    def record(name: str, passed: bool, detail: str) -> None:
        checks.append({"name": name, "pass": passed, "detail": detail})
        if not passed:
            reasons.append(f"{name}: {detail}")

    # 1. A dataset must exist.
    if not dataset:
        record("dataset_present", False, "no paired holdout dataset supplied")
        return {"verdict": "NOT_CLEARED", "label": "DIAGNOSTIC",
                "manifest_id": manifest_id,
                "metrics": metrics, "checks": checks, "reasons": reasons}
    record("dataset_present", True, f"{len(dataset)} paired rows supplied")
    metrics["n"] = len(dataset)

    # 2. Held-out discipline: the manifest must declare disjoint splits.
    if not dataset_manifest:
        record("heldout_discipline", False,
               "dataset manifest missing; train/eval split undeclared")
    else:
        errs = heldout_errors(dataset_manifest)
        declared = bool(dataset_manifest.get("train_years")) and bool(
            dataset_manifest.get("eval_years"))
        if errs:
            record("heldout_discipline", False, "; ".join(errs))
        elif not declared:
            record("heldout_discipline", False,
                   "train_years/eval_years not both declared on the manifest")
        else:
            record("heldout_discipline", True,
                   f"train {sorted(dataset_manifest['train_years'])} disjoint "
                   f"from eval {sorted(dataset_manifest['eval_years'])}")

    # 3. Sample size.
    n = len(dataset)
    record("sample_size", n >= MIN_N, f"n={n}, need >={MIN_N}")

    # Metrics are computed whenever the rows are well-formed, even when
    # the verdict is already determined — the numbers are the evidence.
    rows_ok = all(
        isinstance(r.get("model_prob"), (int, float))
        and isinstance(r.get("close_prob"), (int, float))
        and r.get("outcome") in (0, 1)
        for r in dataset
    )
    record("row_schema", rows_ok,
           "every row carries model_prob, close_prob, outcome in {0,1}"
           if rows_ok else "malformed rows present")
    if rows_ok and n > 0:
        model = [float(r["model_prob"]) for r in dataset]
        close = [float(r["close_prob"]) for r in dataset]
        outc = [int(r["outcome"]) for r in dataset]
        base_rate = sum(outc) / n
        b_model = _brier(model, outc)
        b_close = _brier(close, outc)
        clim = base_rate * (1 - base_rate)
        bss = (1.0 - b_model / clim) if clim > 0 else 0.0
        slope = _slope_test(
            [m - c for m, c in zip(model, close)],
            [o - m for m, o in zip(model, outc)],
        )
        metrics.update({
            "brier_model": round(b_model, 6),
            "brier_close": round(b_close, 6),
            "brier_skill_score_vs_climatology": round(bss, 6),
            "ece_model": round(_ece(model, outc), 6),
            "mean_residual_model_minus_close": round(
                sum(m - c for m, c in zip(model, close)) / n, 6),
            "residual_slope": (round(slope["slope"], 6)
                               if slope["slope"] is not None else None),
            "residual_slope_t": (round(slope["t_stat"], 4)
                                 if slope["t_stat"] is not None else None),
            "residual_slope_p": (round(slope["p_value"], 6)
                                 if slope["p_value"] is not None else None),
            "base_rate": round(base_rate, 6),
        })
        record("beats_close_brier", b_model < b_close,
               f"brier model {b_model:.6f} vs close {b_close:.6f}")
        record("brier_skill_score", bss > BSS_MIN,
               f"bss {bss:.6f}, need > {BSS_MIN}")
        if not slope["evaluated"]:
            record("residual_slope", False,
                   "slope test could not be evaluated (fail-closed)")
        else:
            sig_negative = (slope["slope"] < 0
                            and slope["p_value"] is not None
                            and slope["p_value"] < SLOPE_ALPHA)
            record("residual_slope", not sig_negative,
                   f"slope {slope['slope']:.6f}, p={slope['p_value']:.4f}; "
                   "significantly negative slope = model disagreements "
                   "with the close are anti-predictive")

    cleared = all(c["pass"] for c in checks)
    verdict = "CLEARED" if cleared else "NOT_CLEARED"
    return {"verdict": verdict,
            "label": "CLEARED" if cleared else "DIAGNOSTIC",
            "manifest_id": manifest_id, "metrics": metrics,
            "checks": checks, "reasons": reasons}
