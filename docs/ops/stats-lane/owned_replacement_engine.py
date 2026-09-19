#!/usr/bin/env python3
"""Owned-module replacement engine — ports GSE forecast-skill e-process + logit-pool
+ market-anchored margin densities onto board-export. Replaces dead-end filters with
instruments we already own (forecast-skill-eprocess.ts, edge-lab/logit-pool.ts, skellam cover logic).

E-process (our code, not a guess):
  p~ = (1-eps)*p + eps*m  (eps=0.05), clamp [floor,1-floor]
  m^ = clamp(m, floor, 1-floor)
  E = p~/m^ if y=1 else (1-p~)/(1-m^)
  M = prod E; Ville threshold 1/alpha (default 20); verdict on max M

Logit-pool: IRLS on y ~ logit(m), logit(p) — beta on model logit; FIRE_NOTHING if n<50 or CI includes 0.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from statistics import mean, pstdev

sys.path.insert(0, str(Path(__file__).resolve().parent))
from stats_json import dumps_report, write_report  # noqa: E402
from sport_resolve import resolve_sport  # noqa: E402

FLOOR = 1e-6
EPS = 0.05
ALPHA = 0.05
THRESH = 1.0 / ALPHA


def fnum(x):
    try:
        if x is None or x == "":
            return None
        v = float(x)
        return v if math.isfinite(v) else None
    except Exception:
        return None


def clamp01(p):
    return min(1 - FLOOR, max(FLOOR, p))


def p_model(r):
    for key in ("independentTrueProb", "rankingP"):
        v = fnum(r.get(key))
        if v is not None and 0 < v < 1:
            return v
    c = fnum(r.get("confidence"))
    return c / 100.0 if c is not None else None


def y_and_p_m(r):
    if r.get("clvVerdict") not in ("BEAT_CLOSE", "LOST_TO_CLOSE", "MATCHED_CLOSE"):
        return None
    # For e-process skill we need our p of the PICK winning and market m of same event
    y = 1 if r.get("result") == "WIN" else (0 if r.get("result") == "LOSS" else None)
    if y is None:
        return None
    p = p_model(r)
    m = fnum(r.get("marketFairProb"))
    if p is None or m is None:
        return None
    return y, p, m


def eprocess(points, eps=EPS, floor=FLOOR, alpha=ALPHA):
    """points: list of (y, p, m) in settlement order."""
    log_m = 0.0
    max_log = 0.0
    factors = []
    for y, p, m in points:
        hi = 1 - floor
        m_h = clamp01(m)
        p_h = clamp01(p)
        p_s = clamp01((1 - eps) * p_h + eps * m_h)
        if y == 1:
            f = p_s / m_h
        else:
            f = (1 - p_s) / (1 - m_h)
        f = max(f, floor / (1 - floor))
        factors.append(f)
        log_m += math.log(f)
        max_log = max(max_log, log_m)
    m_path = math.exp(log_m)
    m_max = math.exp(max_log)
    n = len(points)
    if n == 0:
        return {"n": 0, "verdict": "insufficient", "logM": 0.0, "maxM": 1.0}
    return {
        "n": n,
        "epsilon": eps,
        "alpha": alpha,
        "evidence_threshold": 1 / alpha,
        "delivered_alpha": 1 / max(m_max, 1e-12) if m_max > 1 else None,
        "logM": log_m,
        "M_current": m_path,
        "M_max": m_max,
        "maxLogM": max_log,
        "mean_factor": mean(factors),
        "verdict": (
            "REJECT_H0_skill_vs_market"
            if m_max >= 1 / alpha
            else "FIRE_NOTHING_insufficient_evidence"
            if n < 30
            else "INSUFFICIENT_no_reject"
        ),
        "null": "outcomes ~ Bernoulli(market p); our p adds nothing",
        "source_module": "packages/prediction-engine/src/forecast-skill-eprocess.ts (ported)",
    }


def logit(x):
    x = clamp01(x)
    return math.log(x / (1 - x))


def sigmoid(z):
    return 1 / (1 + math.exp(-z))


def logit_pool(model_p, market_p, outcomes):
    n = len(outcomes)
    if n < 50:
        return {"n": n, "verdict": "FIRE_NOTHING", "reason": "n<50"}
    X = [[1.0, logit(market_p[i]), logit(model_p[i])] for i in range(n)]
    w = [0.0, 1.0, 0.0]
    converged = False
    for _ in range(80):
        grad = [0.0, 0.0, 0.0]
        hess = [[0.0] * 3 for _ in range(3)]
        for i in range(n):
            xi = X[i]
            z = w[0] * xi[0] + w[1] * xi[1] + w[2] * xi[2]
            mu = sigmoid(z)
            err = outcomes[i] - mu
            wt = max(mu * (1 - mu), 1e-10)
            for a in range(3):
                grad[a] += err * xi[a]
                for b in range(3):
                    hess[a][b] += wt * xi[a] * xi[b]
        # solve 3x3
        try:
            step = solve3(hess, grad)
        except Exception:
            return {"n": n, "verdict": "FIRE_NOTHING", "reason": "singular"}
        if step is None:
            return {"n": n, "verdict": "FIRE_NOTHING", "reason": "singular"}
        w = [w[i] + step[i] for i in range(3)]
        if max(abs(s) for s in step) < 1e-8:
            converged = True
            break
    # se of beta_model via inverse hess diagonal
    try:
        inv = invert3(hess)
        se = math.sqrt(max(inv[2][2], 0))
    except Exception:
        se = float("inf")
    beta = w[2]
    ci = (beta - 1.96 * se, beta + 1.96 * se)
    includes0 = ci[0] <= 0 <= ci[1]
    verdict = (
        "FIRE_NOTHING"
        if not converged or includes0 or not math.isfinite(se)
        else "MODEL_ADDS_INFORMATION"
    )
    return {
        "n": n,
        "beta_model_logit": beta,
        "se": se,
        "ci95": list(ci),
        "includesZero": includes0,
        "marketCoef": w[1],
        "intercept": w[0],
        "converged": converged,
        "verdict": verdict,
        "source_module": "packages/prediction-engine/src/edge-lab/logit-pool.ts (ported)",
    }


def solve3(A, b):
    import copy

    M = [A[i][:] + [b[i]] for i in range(3)]
    for i in range(3):
        piv = i
        for r in range(i + 1, 3):
            if abs(M[r][i]) > abs(M[piv][i]):
                piv = r
        if abs(M[piv][i]) < 1e-12:
            return None
        M[i], M[piv] = M[piv], M[i]
        for r in range(3):
            if r == i:
                continue
            f = M[r][i] / M[i][i]
            for c in range(i, 4):
                M[r][c] -= f * M[i][c]
    return [M[i][3] / M[i][i] for i in range(3)]


def invert3(A):
    n = 3
    I = [[1.0 if i == j else 0.0 for j in range(n)] for i in range(n)]
    M = [A[i][:] + I[i] for i in range(n)]
    for i in range(n):
        piv = max(range(i, n), key=lambda r: abs(M[r][i]))
        M[i], M[piv] = M[piv], M[i]
        d = M[i][i]
        M[i] = [x / d for x in M[i]]
        for r in range(n):
            if r == i:
                continue
            f = M[r][i]
            M[r] = [M[r][c] - f * M[i][c] for c in range(2 * n)]
    return [row[n:] for row in M]


def margin_density_replacement(rows):
    """Market-anchored Gaussian margin density + alternate-line pricing (skellam-cover analogue)."""
    by_sport = defaultdict(list)
    for r in rows:
        y = r.get("actualMargin")
        if y is None:
            hs, aw = fnum(r.get("homeScore")), fnum(r.get("awayScore"))
            if hs is not None and aw is not None:
                y = hs - aw
        mu = fnum(r.get("predictedMeanMargin"))
        if mu is None and str(r.get("pickType") or "").upper() == "SPREAD":
            line = fnum(r.get("line"))
            if line is not None:
                mu = -line
        if y is None or mu is None:
            continue
        sport = resolve_sport(r.get("sport"), r.get("espnEventId"), r.get("selection"))
        by_sport[sport].append({"y": float(y), "mu": float(mu), "line": fnum(r.get("line")), "pt": str(r.get("pickType") or "").upper()})

    out = {}
    for sport, rs in by_sport.items():
        if len(rs) < 30:
            out[sport] = {"n": len(rs), "status": "THIN"}
            continue
        res = [r["y"] - r["mu"] for r in rs]
        sig = max(pstdev(res), 0.25)
        mu_mean = mean(r["mu"] for r in rs)
        # CRPS
        def phi(z):
            return math.exp(-0.5 * z * z) / math.sqrt(2 * math.pi)

        def Phi(z):
            return 0.5 * (1 + math.erf(z / math.sqrt(2)))

        crps_vals = []
        for r in rs:
            z = (r["y"] - r["mu"]) / sig
            crps_vals.append(sig * (z * (2 * Phi(z) - 1) + 2 * phi(z) - 1 / math.sqrt(math.pi)))
        # alternate home-margin lines: cover prob P(Y > L) for L in grid
        alts = {}
        for L in [-7.5, -3.5, -1.5, 0, 1.5, 3.5, 7.5]:
            p_cover = 1 - Phi((L - mu_mean) / sig)
            alts[str(L)] = round(p_cover, 4)
        # key-number mass
        key_mass = {}
        for k in (3, 7, 10):
            # discrete approx density
            z = (k - mu_mean) / sig
            key_mass[str(k)] = round(phi(z) / sig, 4)
        out[sport] = {
            "n": len(rs),
            "mu_mean": mu_mean,
            "sigma": sig,
            "crps": mean(crps_vals),
            "mae": mean(abs(r["y"] - r["mu"]) for r in rs),
            "alternate_home_margin_cover_probs": alts,
            "key_number_density_3_7_10": key_mass,
            "product": "Full margin density prices every alternate spread — replacement for point-only K3 bands",
        }
    return out


def kelly_diagnostic(p, m, books=None):
    """Odds-implied decimal from de-vig m is not stakes — diagnostic EV at fair m as price proxy."""
    if p is None or m is None or m <= 0 or m >= 1:
        return None
    # if market fair is m, price implies decimal ~ 1/m including vig in reality; use 1/m as fair price
    b = 1 / m - 1
    edge = p * b - (1 - p)
    f = edge / b if b > 1e-9 else 0.0
    return {"p": p, "m": m, "edge_at_fair_price": edge, "kelly_f": f}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    path = Path(args.input)
    if not path.exists():
        write_report(Path(args.out), {"ok": False, "status": "DATA_BLOCKED"})
        return 2
    raw = [json.loads(l) for l in path.read_text(encoding="utf-8").splitlines() if l.strip()]

    def ts(r):
        try:
            return datetime.fromisoformat(str(r.get("settledAt") or r.get("commenceTime") or r.get("generatedAt") or "1970-01-01").replace("Z", "+00:00")).timestamp()
        except Exception:
            return 0

    raw.sort(key=ts)

    # --- e-process by pickType + books ---
    buckets = defaultdict(list)
    for r in raw:
        pt = str(r.get("pickType") or "UNK").upper()
        try:
            bc = int(r.get("bookmakerCount")) if r.get("bookmakerCount") not in (None, "") else -1
        except Exception:
            bc = -1
        buckets[f"ALL|{pt}"].append(r)
        buckets[f"books{bc}|{pt}"].append(r)
        buckets["ALL|ALL"].append(r)

    eproc = {}
    for name, rs in buckets.items():
        pts = []
        for r in rs:
            t = y_and_p_m(r)
            if t:
                pts.append(t)
        eproc[name] = eprocess(pts)

    # --- logit-pool on rows with p,m,y ---
    pts = []
    for r in raw:
        t = y_and_p_m(r)
        if t:
            pts.append(t)
    mp = [t[2] for t in pts]
    pp = [t[1] for t in pts]
    yy = [t[0] for t in pts]
    pool_all = logit_pool(pp, mp, yy)
    # by market
    pool_mkt = {}
    for pt in ("TOTAL", "MONEYLINE", "SPREAD"):
        sub = []
        for r in raw:
            if str(r.get("pickType") or "").upper() != pt:
                continue
            t = y_and_p_m(r)
            if t:
                sub.append(t)
        pool_mkt[pt] = logit_pool([t[1] for t in sub], [t[2] for t in sub], [t[0] for t in sub])

    # --- margin densities ---
    densities = margin_density_replacement(raw)

    # --- replacement product map ---
    tot_ep = eproc.get("ALL|TOTAL", {})
    ml_ep = eproc.get("ALL|MONEYLINE", {})
    replacement = {
        "K3_no_numeric_band": {
            "replaced_by": "Market-anchored margin DENSITY per sport (CRPS + alternate-line covers + key-number mass)",
            "why": "Static/rolling conformal bands OOT-capped ~0.76 on blowouts; density prices the whole ladder without fake 90% labels",
        },
        "ML_CLV_filter_failed": {
            "replaced_by": "Forecast-skill e-process vs market (Ville) + logit-pool beta + side-by-side p_model/marketFairProb",
            "ml_eprocess": ml_ep,
            "ml_logit_pool": pool_mkt.get("MONEYLINE"),
            "rule": "No beat-close claim on ML until e-process rejects H0 AND logit-pool MODEL_ADDS_INFORMATION",
        },
        "Totals_spine": {
            "totals_eprocess": tot_ep,
            "totals_logit_pool": pool_mkt.get("TOTAL"),
            "clv_context": "TOTAL non-push CLV 56.7% [52.2,61.1] — only cell near break-even",
        },
        "fantasy_props_next": {
            "owned_modules": [
                "edge-lab/props-* (many)",
                "edge-lab/logit-pool",
                "robust-kelly",
                "skellam cover",
            ],
            "action": "Wire props board to player_game_stats + injury cascade; score with logit-pool + e-process on prop hits vs market",
        },
    }

    report = {
        "ok": True,
        "n_export": len(raw),
        "n_with_p_m_y": len(pts),
        "eprocess_by_bucket": eproc,
        "logit_pool_all": pool_all,
        "logit_pool_by_market": pool_mkt,
        "margin_densities": densities,
        "replacement_product_map": replacement,
        "owned_source_modules": [
            "forecast-skill-eprocess.ts",
            "edge-lab/logit-pool.ts",
            "skellam.ts",
            "robust-kelly.ts",
            "dixon-coles.ts",
        ],
        "kill_lines": [
            "E-process skill claim only if M_max >= 1/alpha on pre-registered ordered ledger",
            "Model-adds-info only if logit-pool CI excludes 0 on OOF p",
            "Density model advances only if CRPS < widened-Gaussian baseline - 0.01 n>=150",
        ],
        "generatedAt": datetime.utcnow().isoformat() + "Z",
    }
    write_report(Path(args.out), report)
    print(
        dumps_report(
            {
                "ok": True,
                "out": str(args.out),
                "n_pts": len(pts),
                "ep_totals": tot_ep.get("verdict"),
                "ep_ml": ml_ep.get("verdict"),
                "pool_all": pool_all.get("verdict"),
                "pool_totals": pool_mkt.get("TOTAL", {}).get("verdict"),
                "pool_ml": pool_mkt.get("MONEYLINE", {}).get("verdict"),
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
