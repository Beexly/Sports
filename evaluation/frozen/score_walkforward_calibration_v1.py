"""Immutable Frozen Walk-Forward Calibration Scorer v1 (`evaluation/frozen/score_walkforward_calibration_v1.py`).

Pure, side-effect-free scoring kernel mirrored & extended from Beexly/gse-gsi:
- Brier Score, Log-Loss, Equal-Width ECE, Equal-Mass ECE
- Paired Empirical-Bernstein Lower Confidence Bound (Maurer-Pontil / Promotion Gate Leg 1)
- Venn-ABERS finite-sample prediction interval midpoint & mean width (Vovk et al.)
- Composable logit temperature scaling + Barber conformal shrinkage transform
"""
from __future__ import annotations

import math
from typing import Any, Mapping, Sequence


def validate_binary_predictions(
    y_true: Sequence[int | float],
    y_prob: Sequence[float],
) -> tuple[list[float], list[float]]:
    if len(y_true) != len(y_prob):
        raise ValueError(f"Length mismatch: y_true={len(y_true)} vs y_prob={len(y_prob)}")
    if len(y_true) < 2:
        raise ValueError("Need at least 2 observations to score walk-forward calibration")
    yt_out: list[float] = []
    yp_out: list[float] = []
    for y_raw, p_raw in zip(y_true, y_prob):
        yv = float(y_raw)
        pv = float(p_raw)
        if not (math.isfinite(yv) and math.isfinite(pv)):
            raise ValueError("Non-finite observation or prediction encountered")
        if yv not in (0.0, 1.0):
            raise ValueError(f"Expected binary target in {{0,1}}, got {y_raw!r}")
        yt_out.append(yv)
        yp_out.append(min(1.0 - 1e-7, max(1e-7, pv)))
    return yt_out, yp_out


def brier_score(y_true: Sequence[int | float], y_prob: Sequence[float]) -> float:
    yt, yp = validate_binary_predictions(y_true, y_prob)
    return sum((p - y) ** 2 for y, p in zip(yt, yp)) / float(len(yt))


def log_loss(
    y_true: Sequence[int | float],
    y_prob: Sequence[float],
    eps: float = 1e-6,
) -> float:
    yt, yp = validate_binary_predictions(y_true, y_prob)
    total = 0.0
    for y, p_raw in zip(yt, yp):
        p = min(1.0 - eps, max(eps, p_raw))
        total += -(y * math.log(p) + (1.0 - y) * math.log(1.0 - p))
    return total / float(len(yt))


def expected_calibration_error(
    y_true: Sequence[int | float],
    y_prob: Sequence[float],
    n_bins: int = 10,
) -> float:
    """Equal-width [0,1] Expected Calibration Error with bin 0 and last bin closed."""
    if n_bins < 1:
        raise ValueError("n_bins must be >= 1")
    yt, yp = validate_binary_predictions(y_true, y_prob)
    n = len(yt)
    counts = [0] * n_bins
    p_sums = [0.0] * n_bins
    y_sums = [0.0] * n_bins
    for y, p in zip(yt, yp):
        idx = min(n_bins - 1, max(0, int(math.floor(p * n_bins))))
        counts[idx] += 1
        p_sums[idx] += p
        y_sums[idx] += y
    ece = 0.0
    for c, ps, ys in zip(counts, p_sums, y_sums):
        if c > 0:
            ece += (c / float(n)) * abs((ps / float(c)) - (ys / float(c)))
    return ece


def equal_mass_ece(
    y_true: Sequence[int | float],
    y_prob: Sequence[float],
    min_per_bin: int = 5,
) -> float:
    """Order-invariant adaptive equal-mass ECE with tie-pooling (`calibration-map.ts`)."""
    yt, yp = validate_binary_predictions(y_true, y_prob)
    n = len(yt)
    if n <= min_per_bin:
        return abs(sum(yp) / n - sum(yt) / n)
    order = sorted(range(n), key=lambda i: yp[i])
    groups: list[tuple[int, float, float]] = []
    i = 0
    while i < n:
        p0 = yp[order[i]]
        cnt = 0
        ps = 0.0
        ys = 0.0
        while i < n and yp[order[i]] == p0:
            cnt += 1
            ps += yp[order[i]]
            ys += yt[order[i]]
            i += 1
        groups.append((cnt, ps, ys))
    bins: list[tuple[int, float, float]] = []
    cur_c, cur_p, cur_y = 0, 0.0, 0.0
    for c, ps, ys in groups:
        cur_c += c
        cur_p += ps
        cur_y += ys
        if cur_c >= min_per_bin:
            bins.append((cur_c, cur_p, cur_y))
            cur_c, cur_p, cur_y = 0, 0.0, 0.0
    if cur_c > 0:
        if bins:
            pc, pp, py = bins[-1]
            bins[-1] = (pc + cur_c, pp + cur_p, py + cur_y)
        else:
            bins.append((cur_c, cur_p, cur_y))
    return sum((c / n) * abs(ps / c - ys / c) for c, ps, ys in bins)


def paired_brier_empirical_bernstein_lcb(
    y_true: Sequence[int | float],
    p_champion: Sequence[float],
    p_challenger: Sequence[float],
    alpha: float = 0.05,
) -> dict[str, float]:
    """Paired Maurer-Pontil Empirical-Bernstein LCB on `improvement_i = err_champ_i - err_chal_i`.

    Exact fixed point: if `p_challenger == p_champion` everywhere, `mean_improvement == 0.0`
    and `lcb == 0.0` (`<= 0`, never eligible).
    """
    yt, pc = validate_binary_predictions(y_true, p_champion)
    _, pk = validate_binary_predictions(y_true, p_challenger)
    n = len(yt)
    diffs = [((c - y) ** 2) - ((k - y) ** 2) for y, c, k in zip(yt, pc, pk)]
    mean_imp = sum(diffs) / float(n)
    if all(d == 0.0 for d in diffs):
        return {"n": float(n), "mean_improvement": 0.0, "eb_margin": 0.0, "lcb": 0.0}
    var = sum((d - mean_imp) ** 2 for d in diffs) / float(max(1, n - 1))
    std = math.sqrt(max(0.0, var))
    log_inv = math.log(2.0 / max(1e-12, alpha))
    # Paired Brier diff lies in [-1, 1], range <= 2.0
    margin = math.sqrt(2.0 * var * log_inv / float(n)) + (7.0 * 2.0 * log_inv) / (3.0 * float(max(1, n - 1)))
    return {
        "n": float(n),
        "mean_improvement": round(mean_imp, 6),
        "std": round(std, 6),
        "eb_margin": round(margin, 6),
        "lcb": round(mean_imp - margin, 6),
    }


def _fit_pava_pairs(pairs: Sequence[tuple[float, float]]) -> list[tuple[float, float, int]]:
    ordered = sorted(pairs, key=lambda kv: kv[0])
    blocks: list[list[float]] = []  # [sum_y, count, x_max]
    for x, y in ordered:
        blocks.append([float(y), 1.0, float(x)])
        while len(blocks) >= 2 and (blocks[-2][0] / blocks[-2][1]) > (blocks[-1][0] / blocks[-1][1]):
            b2 = blocks.pop()
            blocks[-1][0] += b2[0]
            blocks[-1][1] += b2[1]
            blocks[-1][2] = b2[2]
    return [(b[2], b[0] / b[1], int(b[1])) for b in blocks]


def _predict_pava(blocks: Sequence[tuple[float, float, int]], x: float) -> float:
    for x_max, val, _ in blocks:
        if x <= x_max:
            return val
    return blocks[-1][1] if blocks else x


def venn_abers_interval_width(
    train_p: Sequence[float],
    train_y: Sequence[int | float],
    test_p: Sequence[float],
) -> tuple[list[float], float]:
    """Inductive Venn-ABERS lower/upper probability interval & calibrated midpoint (Vovk et al.)."""
    ty, tp = validate_binary_predictions(train_y, train_p)
    base_pairs = list(zip(tp, ty))
    midpoints: list[float] = []
    widths: list[float] = []
    for x_raw in test_p:
        x = min(1.0 - 1e-7, max(1e-7, float(x_raw)))
        b0 = _fit_pava_pairs([*base_pairs, (x, 0.0)])
        b1 = _fit_pava_pairs([*base_pairs, (x, 1.0)])
        p0 = _predict_pava(b0, x)
        p1 = _predict_pava(b1, x)
        denom = (1.0 - p0) + p1
        p_mid = p1 / denom if denom > 1e-12 else 0.5 * (p0 + p1)
        midpoints.append(min(1.0 - 1e-7, max(1e-7, p_mid)))
        widths.append(max(0.0, p1 - p0))
    mean_width = sum(widths) / float(len(widths)) if widths else 0.0
    return midpoints, mean_width


def apply_calibration_transform(
    y_prob: Sequence[float],
    *,
    temp_scale: float = 1.0,
    conformal_shrinkage: float = 0.0,
    venn_abers_weight: float = 0.0,
    train_p: Sequence[float] | None = None,
    train_y: Sequence[int | float] | None = None,
) -> tuple[list[float], float]:
    """Apply logit temperature scaling, conformal shrinkage, and optional OOS Venn-ABERS blend."""
    out: list[float] = []
    shrink = min(0.5, max(0.0, float(conformal_shrinkage)))
    va_w = min(1.0, max(0.0, float(venn_abers_weight)))
    t_scale = max(1e-4, float(temp_scale))

    for p_raw in y_prob:
        p = min(1.0 - 1e-6, max(1e-6, float(p_raw)))
        logit = math.log(p / (1.0 - p))
        scaled = 1.0 / (1.0 + math.exp(-(logit * t_scale)))
        shrunk = (1.0 - shrink) * scaled + shrink * 0.5
        out.append(min(1.0 - 1e-7, max(1e-7, shrunk)))

    va_width = 0.0
    if train_p is not None and train_y is not None and len(train_p) >= 10:
        va_mid, va_width = venn_abers_interval_width(train_p, train_y, out)
        if va_w > 0.0:
            out = [
                min(1.0 - 1e-7, max(1e-7, (1.0 - va_w) * p + va_w * vm))
                for p, vm in zip(out, va_mid)
            ]
    return out, va_width


def score_predictions(
    y_true: Sequence[int | float],
    y_prob: Sequence[float],
    clv_values: Sequence[float] | None = None,
    config: Mapping[str, Any] | None = None,
) -> dict[str, float | int]:
    """Immutable calibration-first scoring matching `gse-gsi` frozen objective."""
    cfg = config or {}
    n_bins = int(cfg.get("n_bins", 10))
    clv_weight = float(cfg.get("clv_weight", 0.25))
    brier = brier_score(y_true, y_prob)
    ll = log_loss(y_true, y_prob)
    ece = expected_calibration_error(y_true, y_prob, n_bins=n_bins)
    em_ece = equal_mass_ece(y_true, y_prob)
    clv_mean = 0.0
    if clv_values is not None and len(clv_values) == len(y_true) and len(clv_values) > 0:
        finite_clv = [float(v) for v in clv_values if v is not None and math.isfinite(float(v))]
        if finite_clv:
            clv_mean = sum(finite_clv) / float(len(finite_clv))
    composite = brier + 0.5 * ece + 0.25 * ll - clv_weight * clv_mean
    return {
        "n": len(y_true),
        "brier": round(brier, 6),
        "log_loss": round(ll, 6),
        "ece": round(ece, 6),
        "equal_mass_ece": round(em_ece, 6),
        "clv_mean": round(clv_mean, 6),
        "composite_objective": round(composite, 6),
    }
