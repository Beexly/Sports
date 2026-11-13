#!/usr/bin/env python3
"""WP-6 — Purged/embargoed OOF Logit-Shift + Temperature calibration fit.

p_cal = sigmoid(a + b * logit(p_raw)),  0 < b <= 1.0
Ridge lambda=25.0 toward prior (a0=-0.22, b0=0.78).

Data: settled fixture-deduplicated picks (WIN/LOSS/PUSH) joined to game
kickoff time. 7-day PURGE+EMBARGO: a row is predicted by a map fitted only
on rows whose kickoff is > 7 days away from it (both sides). Rows sharing a
kickoff DATE share one fit (same train set).

3-class Push EV: y=1 WIN / 0 LOSS / 0.5 PUSH for calibration; EV accounting
refunds pushes explicitly: EV = p_win*profit - p_loss, p_push empirical per
pickType, profit from clvLockPrice (American) else -110 default.

Placebo: 100 runs with kickoff times shuffled across rows (destroys temporal
structure), same OOF pipeline, selection p_cal > 0.5238 (-110 breakeven),
mean normalized CLV of selected rows must satisfy |mean CLV| <= 0.005.

CLV normalization to probability units (DISCLOSED modeling constants):
  - ML with both lock+close prices: exact implied-prob delta.
  - POINTS kind: clvValue * 0.025  (standard NFL ~2.5% win-prob per point).
  - CENTS kind without prices: clvValue * 0.004 (near-even-odds approx).

Acceptance (hard): Brier_oof < Brier_raw, ECE_oof < 0.035, placebo pass.
Reported (soft, data-decided): raw 70/100 -> p_cal (directive expects ~64-66).

Usage: DATABASE_URL=... python scripts/ops/fit_oof_logit_temp_2026.py [--placebo-runs 100]
Artifact: data/engine/oof_calibration_2026_11_13.json
"""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import psycopg2
import psycopg2.extras
from scipy.optimize import minimize

ROOT = Path(__file__).resolve().parents[2]
ARTIFACT = ROOT / "data" / "engine" / "oof_calibration_2026_11_13.json"
A0, B0, LAM = -0.22, 0.78, 25.0
PURGE_DAYS = 7.0
BREAKEVEN = 0.5238
PLACEBO_THRESHOLD = 0.005
POINTS_TO_PROB = 0.025
CENTS_TO_PROB = 0.004


def sigmoid(z):
    return 1.0 / (1.0 + np.exp(-np.clip(z, -30, 30)))


def logit(p):
    p = np.clip(p, 0.01, 0.99)
    return np.log(p / (1.0 - p))


def fit_map(x: np.ndarray, y: np.ndarray) -> tuple[float, float]:
    """Ridge least-squares logit-shift+temperature, b in (0, 1]."""
    def loss(theta):
        a, b = theta
        r = y - sigmoid(a + b * x)
        return float(r @ r + LAM * ((a - A0) ** 2 + (b - B0) ** 2))

    def grad(theta):
        a, b = theta
        s = sigmoid(a + b * x)
        r = y - s
        d = -2.0 * r * s * (1.0 - s)
        return np.array([d.sum() + 2 * LAM * (a - A0), d @ x + 2 * LAM * (b - B0)])

    res = minimize(loss, x0=np.array([A0, B0]), jac=grad, method="L-BFGS-B",
                   bounds=[(-3.0, 3.0), (0.05, 1.0)], options={"maxiter": 200, "ftol": 1e-12})
    return float(res.x[0]), float(res.x[1])


def oof_predict(times_days: np.ndarray, x: np.ndarray, y: np.ndarray) -> np.ndarray:
    """Grouped by unique day; train = |t_train - t_test| > PURGE_DAYS."""
    days = np.unique(times_days)
    pred = np.empty_like(x)
    for d in days:
        test_mask = times_days == d
        train_mask = np.abs(times_days - d) > PURGE_DAYS
        if train_mask.sum() < 50:
            # not enough history — fall back to the prior map (disclosed)
            a, b = A0, B0
        else:
            a, b = fit_map(x[train_mask], y[train_mask])
        pred[test_mask] = sigmoid(a + b * x[test_mask])
    return pred


def ece(p: np.ndarray, y: np.ndarray, bins: int = 10) -> float:
    edges = np.linspace(0.0, 1.0, bins + 1)
    total = 0.0
    for lo, hi in zip(edges[:-1], edges[1:]):
        m = (p >= lo) & (p < hi) if hi < 1.0 else (p >= lo) & (p <= hi)
        if m.sum() == 0:
            continue
        total += m.sum() * abs(float(y[m].mean()) - float(p[m].mean()))
    return total / len(p)


def american_to_profit(price: float | None) -> float:
    if price is None:
        return 100.0 / 110.0
    p = float(price)
    return p / 100.0 if p > 0 else 100.0 / abs(p)


def implied_prob(price: float | None) -> float | None:
    if price is None:
        return None
    p = float(price)
    return abs(p) / (abs(p) + 100.0) if p < 0 else 100.0 / (p + 100.0)


def norm_clv(row: dict) -> float | None:
    v = row["clvValue"]
    if v is None:
        return None
    kind = (row["clvKind"] or "").upper()
    if kind == "CENTS" or (row["clvLockPrice"] is not None and row["clvClosePrice"] is not None):
        pl, pc = implied_prob(row["clvLockPrice"]), implied_prob(row["clvClosePrice"])
        if pl is not None and pc is not None:
            # beating the close = lock price better than close price.
            # For the bettor, CLV>0 when the line moved toward their side after lock.
            return float(pl - pc) if row["clvPositive"] else float(pc - pl) if row["clvPositive"] is False else float(v) * CENTS_TO_PROB
        return float(v) * CENTS_TO_PROB
    if kind == "POINTS":
        return float(v) * POINTS_TO_PROB
    return float(v) * CENTS_TO_PROB


def main() -> int:
    runs = 100
    if "--placebo-runs" in sys.argv:
        runs = int(sys.argv[sys.argv.index("--placebo-runs") + 1])
    url = os.environ.get("DATABASE_URL", "").strip()
    if not url:
        print("DATABASE_URL required", file=sys.stderr)
        return 2
    conn = psycopg2.connect(url)
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("""
        SELECT p.id, p."gameId", p."pickType", p.confidence, p.result,
               p."settledAt", g."commenceTime",
               p."clvValue", p."clvKind", p."clvLockPrice", p."clvClosePrice", p."clvPositive"
        FROM picks p JOIN games g ON g.id = p."gameId"
        WHERE p.result IN ('WIN','LOSS','PUSH') AND p.confidence IS NOT NULL
          AND g."commenceTime" IS NOT NULL
        ORDER BY g."commenceTime"
    """)
    rows = cur.fetchall()
    conn.close()

    # fixture dedup: one row per (gameId, pickType), latest settled wins
    dedup: dict[tuple, dict] = {}
    for r in rows:
        k = (r["gameId"], r["pickType"])
        if k not in dedup or (r["settledAt"] and r["settledAt"] > (dedup[k]["settledAt"] or datetime.min.replace(tzinfo=timezone.utc))):
            dedup[k] = r
    rows = sorted(dedup.values(), key=lambda r: r["commenceTime"])
    n = len(rows)
    if n < 200:
        print(f"FATAL: only {n} settled rows — refusing to fit", file=sys.stderr)
        return 1

    t0 = rows[0]["commenceTime"]
    times = np.array([(r["commenceTime"] - t0).total_seconds() / 86400.0 for r in rows])
    p_raw = np.array([float(r["confidence"]) / 100.0 for r in rows])
    y = np.array([1.0 if r["result"] == "WIN" else 0.5 if r["result"] == "PUSH" else 0.0 for r in rows])
    x = logit(p_raw)

    print(f"[fit] {n} dedup settled rows, {rows[0]['commenceTime']:%Y-%m-%d} .. {rows[-1]['commenceTime']:%Y-%m-%d}")
    p_cal = oof_predict(times, x, y)
    a_full, b_full = fit_map(x, y)

    brier_raw = float(np.mean((y - p_raw) ** 2))
    brier_oof = float(np.mean((y - p_cal) ** 2))
    ece_oof = ece(p_cal, y)
    raw70 = float(sigmoid(a_full + b_full * logit(np.array([0.70])))[0])

    # 3-class push EV (explicit refund)
    push_rate: dict[str, float] = {}
    for pt in {r["pickType"] for r in rows}:
        sub = [r for r in rows if r["pickType"] == pt]
        push_rate[pt] = sum(1 for r in sub if r["result"] == "PUSH") / len(sub)
    ev_raw, ev_cal = [], []
    for i, r in enumerate(rows):
        pp = push_rate[r["pickType"]]
        profit = american_to_profit(r["clvLockPrice"])
        pw = float(p_cal[i])
        ev_cal.append(pw * profit - (1.0 - pw - pp))
        pr = float(p_raw[i])
        ev_raw.append(pr * profit - (1.0 - pr - pp))

    # CLV vector (normalized, disclosed constants)
    clv = np.array([norm_clv(r) if norm_clv(r) is not None else np.nan for r in rows])
    has_clv = ~np.isnan(clv)

    def selected_mean_clv(pc: np.ndarray) -> float | None:
        m = (pc > BREAKEVEN) & has_clv
        if m.sum() < 10:
            return None
        return float(clv[m].mean())

    real_sel_clv = selected_mean_clv(p_cal)

    # Placebo: shuffle kickoff times, same pipeline
    rng = np.random.default_rng(20261113)
    placebo_means = []
    for k in range(runs):
        perm = rng.permutation(n)
        t_shuf = times[perm]
        pc = oof_predict(t_shuf, x, y)
        mc = selected_mean_clv(pc)
        if mc is not None:
            placebo_means.append(mc)
        if (k + 1) % 20 == 0:
            print(f"[placebo] {k+1}/{runs}")
    placebo_abs = [abs(v) for v in placebo_means]
    placebo_mean_abs = float(np.mean(placebo_abs)) if placebo_abs else float("nan")
    placebo_max_abs = float(np.max(placebo_abs)) if placebo_abs else float("nan")
    placebo_pass = bool(placebo_abs and placebo_max_abs <= PLACEBO_THRESHOLD)

    brier_pass = brier_oof < brier_raw
    ece_pass = ece_oof < 0.035
    hard_pass = brier_pass and ece_pass and placebo_pass

    artifact = {
        "schema": "gse.oof_logit_temp_calibration.v1",
        "fitted_at": datetime.now(timezone.utc).isoformat(),
        "n_rows": n,
        "window": [str(rows[0]["commenceTime"]), str(rows[-1]["commenceTime"])],
        "purge_embargo_days": PURGE_DAYS,
        "ridge": {"lambda": LAM, "a0": A0, "b0": B0},
        "global_map": {"a": a_full, "b": b_full},
        "oof": {"brier_raw": brier_raw, "brier_oof": brier_oof, "ece_oof": ece_oof},
        "raw70_calibrated": raw70,
        "push_ev": {"push_rate_by_type": push_rate,
                     "mean_ev_raw": float(np.mean(ev_raw)), "mean_ev_cal": float(np.mean(ev_cal))},
        "clv_normalization": {"POINTS_TO_PROB": POINTS_TO_PROB, "CENTS_TO_PROB": CENTS_TO_PROB,
                               "ml_exact_implied_delta": True, "breakeven": BREAKEVEN},
        "real_time_selected_mean_clv": real_sel_clv,
        "placebo": {"runs": runs, "valid_runs": len(placebo_means),
                     "mean_abs_mean_clv": placebo_mean_abs, "max_abs_mean_clv": placebo_max_abs,
                     "threshold": PLACEBO_THRESHOLD, "pass": placebo_pass},
        "acceptance": {"brier_oof_lt_raw": brier_pass, "ece_oof_lt_0_035": ece_pass,
                        "placebo_pass": placebo_pass, "hard_pass": hard_pass,
                        "raw70_target_64_66": 0.64 <= raw70 <= 0.66},
    }
    ARTIFACT.parent.mkdir(parents=True, exist_ok=True)
    ARTIFACT.write_text(json.dumps(artifact, indent=2, default=str) + "\n", encoding="utf-8")
    print(json.dumps(artifact["oof"] | {"raw70": raw70, "a": a_full, "b": b_full,
                                          "placebo_max_abs": placebo_max_abs,
                                          "real_sel_clv": real_sel_clv, "hard_pass": hard_pass}, indent=2))
    print(f"WROTE {ARTIFACT}")
    return 0 if hard_pass else 1


if __name__ == "__main__":
    raise SystemExit(main())