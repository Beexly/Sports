#!/usr/bin/env python3
"""gap_engines.py — the TRUE gaps from ENGINE_GAP_AUDIT.md, built 2026-10-10.
stdlib-only. Self-check on run. Engines:
  middles_arbs       (#49) 2-book middle/arb scan
  logistic_fit/apply (#55) IRLS logistic regression
  opinion_pool       (#45) linear/log/power pools
  margin_total_copula(#22) Gaussian copula joint spread∧total
  steam_rlm          (#46) snapshot-diff steam/RLM detector
  log_loss           (#35) standalone proper-scoring rule
"""
import math, itertools

# ---------------- 49. Middles & arbs ----------------
def amer_to_praw(a):
    a = float(a)
    return 100.0/(a+100.0) if a > 0 else (-a)/((-a)+100.0)

def _american(p):
    return round(100*p/(1-p)) if p >= 0.5 else round(-100*(1-p)/p)

def middles_arbs(mk1, mk2):
    """mk = (line, american_price) for the SAME market from two books.
    Returns middle windows + arb check. Lines in same units (spread or total)."""
    (l1, a1), (l2, a2) = mk1, mk2
    p1, p2 = amer_to_praw(a1), amer_to_praw(a2)
    out = {"line_gap": round(l2 - l1, 1), "arb": None, "middle": None}
    # ARB: opposite sides at the two books, both plus-money or sum of raw < 1
    if p1 + p2 < 1.0:
        stake = 100.0
        s1 = stake / p1 * (1 - p1)   # profit if leg1 wins
        out["arb"] = {"sideA": l1, "sideB": l2, "roi": round((s1 + stake * (p2 / (1 - p2) if False else 0)), 2),
                      "note": "p1+p2<1 — guaranteed profit pair exists; size stakes by p ratio"}
        out["arb"]["roi_pct"] = round((1.0 / (p1 + p2) - 1) * 100, 2)
    # MIDDLE: gap >= 2 on totals/spreads → win both if result lands strictly inside
    gap = abs(l2 - l1)
    if gap >= 2:
        # P(land in window) for NFL margin/total ~ N(mu, 13.45) — window = the gap
        mu = (l1 + l2) / 2.0
        # erf-based normal probability of the open window
        from math import erf, sqrt
        lo, hi = min(l1, l2), max(l1, l2)
        Phi = lambda x: 0.5 * (1 + erf((x - mu) / (13.45 * sqrt(2))))
        p_mid = max(Phi(hi) - Phi(lo), 1e-6)
        ev = p_mid * 100 - (1 - p_mid) * (p1 + p2) * 100 / 2  # rough 2-bet EV per 100
        out["middle"] = {"window": (lo, hi), "p_hit": round(p_mid, 4), "ev_note": "needs both-side prices for exact EV"}
    return out

# ---------------- 55. Logistic regression (IRLS) ----------------
def logistic_fit(X, y, iters=25, ridge=1e-6):
    """X: list of feature rows (bias added here). y: 0/1. Returns beta list."""
    n = len(X)
    d = len(X[0]) + 1
    beta = [0.0] * d
    Xb = [[1.0] + list(row) for row in X]
    for _ in range(iters):
        eta = [sum(b * x for b, x in zip(beta, row)) for row in Xb]
        p = [1 / (1 + math.exp(-e)) for e in eta]
        W = [max(pi * (1 - pi), 1e-9) for pi in p]
        # gradient = X'(y-p) - ridge*beta ; Hessian = X'WX + ridge*I (Gaussian elim)
        grad = [sum(Xb[i][j] * (y[i] - p[i]) for i in range(n)) - ridge * beta[j] for j in range(d)]
        H = [[sum(Xb[i][a] * W[i] * Xb[i][b] for i in range(n)) + (ridge if a == b else 0.0)
              for b in range(d)] for a in range(d)]
        # solve H delta = grad
        A = [row[:] + [grad[j]] for j, row in enumerate(H)]
        for col in range(d):
            piv = max(range(col, d), key=lambda r: abs(A[r][col]))
            A[col], A[piv] = A[piv], A[col]
            pv = A[col][col] or 1e-12
            A[col] = [v / pv for v in A[col]]
            for r in range(d):
                if r != col and A[r][col]:
                    f = A[r][col]
                    A[r] = [v - f * w for v, w in zip(A[r], A[col])]
        delta = [A[j][d] for j in range(d)]
        beta = [b + dd for b, dd in zip(beta, delta)]
    return beta

def logistic_apply(beta, row):
    xb = [1.0] + list(row)
    e = sum(b * x for b, x in zip(beta, xb))
    return 1 / (1 + math.exp(-e))

# ---------------- 45. Opinion pools ----------------
def opinion_pool(probs, weights=None, method="log", power=2.0):
    """probs: list of book/model fair probabilities for the SAME event.
    log pool = normalized geometric (product) — consensus of sharp books.
    linear pool = weighted mean (boundary-proof). power pool = generalized."""
    ps = [max(min(p, 1 - 1e-9), 1e-9) for p in probs]
    w = weights or [1.0] * len(ps)
    sw = sum(w)
    if method == "linear":
        return sum(wi * p for wi, p in zip(w, ps)) / sw
    if method == "log":
        s = sum(wi * math.log(p) for wi, p in zip(w, ps)) / sw
        s2 = sum(wi * math.log(1 - p) for wi, p in zip(w, ps)) / sw
        # normalized odds-ratio pool
        num = math.exp(s); den = math.exp(s) + math.exp(s2)
        return num / den
    if method == "power":
        s = sum(wi * (p ** power) for wi, p in zip(w, ps)) / sw
        return s
    raise ValueError(method)

# ---------------- 22. Margin-total copula ----------------
def _ncdf(x):
    return 0.5 * (1 + math.erf(x / math.sqrt(2)))

def margin_total_copula(p_cover, p_over, rho=0.35):
    """Joint P(spread cover AND total over) via Gaussian copula on the two marginals.
    rho = margin-total correlation (NFL empirical ~0.3-0.45; estimate from data, never assume 0).
    Returns joint, both-or-either, independence-comparison."""
    u, v = p_cover, p_over
    # bivariate normal CDF via series/drezner — use simple 2D gauss quadrature (stdlib)
    # P(U<z_u, V<z_v) with corr rho; integrate conditional
    z1 = _inv(u); z2 = _inv(v)
    # Drezner-Wesolowsky style: 1D integral over t
    n_steps = 120
    lo, hi = -8.0, z1
    h = (hi - lo) / n_steps
    s = 0.0
    for i in range(n_steps):
        t = lo + (i + 0.5) * h
        w = math.exp(-t * t / 2) / math.sqrt(2 * math.pi)
        cond = _ncdf((z2 - rho * t) / math.sqrt(1 - rho * rho))
        s += w * cond
    bvn = s * h
    joint = bvn  # P(cover ∧ over) = P(U<=z1, V<=z2) with marginals transformed
    indep = u * v
    return {"joint": round(joint, 4), "independent": round(indep, 4),
            "corr_premium": round(joint - indep, 4),
            "either": round(u + v - joint, 4)}

def _inv(p):
    """inverse normal CDF (Beasley-Springer/Moro-lite, bisection on erf)."""
    lo, hi = -8.0, 8.0
    for _ in range(60):
        mid = (lo + hi) / 2
        if _ncdf(mid) < p: lo = mid
        else: hi = mid
    return (lo + hi) / 2

# ---------------- 46. Steam & RLM ----------------
def steam_rlm(prev, cur, pct_public=None, min_move=0.5, max_age_min=180):
    """prev/cur: {'spread': line, 'total': line, 'ts': epoch_min} for one game+book.
    pct_public: optional % tickets on one side (None disables RLM check).
    Returns signals list."""
    out = []
    d_sp = round(cur["spread"] - prev["spread"], 1)
    d_tt = round(cur["total"] - prev["total"], 1)
    dt = cur["ts"] - prev["ts"]
    fresh = 0 < dt <= max_age_min
    if abs(d_sp) >= min_move and fresh:
        out.append({"mkt": "spread", "move": d_sp, "steam": True, "age_min": dt})
    if abs(d_tt) >= min_move and fresh:
        out.append({"mkt": "total", "move": d_tt, "steam": True, "age_min": dt})
    if pct_public is not None and abs(d_sp) >= min_move and fresh:
        # RLM: line moved TOWARD the public side (books retreating from sharp money)
        # convention: pct_public>50 = public on home... left to caller to map sign
        out.append({"mkt": "spread", "rlm_check": True, "move": d_sp, "public_pct": pct_public,
                    "note": "map public side sign to line direction at call site"})
    return out

# ---------------- 35. Log loss ----------------
def log_loss(pairs):
    """pairs: [(p, y)] -> mean log loss."""
    eps = 1e-12
    return -sum(y * math.log(max(p, eps)) + (1 - y) * math.log(max(1 - p, eps)) for p, y in pairs) / len(pairs)

# ---------------- self-check ----------------
def self_check():
    ok = []
    # middles: 2-point gap
    m = middles_arbs((44.0, -110), (46.0, -110))
    ok.append(m["middle"] is not None and 0 < m["middle"]["p_hit"] < 0.3)
    # logistic: separable 1D
    X = [[x] for x in range(10)]; y = [0]*5 + [1]*5
    b = logistic_fit(X, y, iters=40)
    ok.append(logistic_apply(b, [1]) < 0.5 and logistic_apply(b, [8]) > 0.5)
    # pools
    ok.append(0.5 < opinion_pool([0.55, 0.61], method="log") < 0.62)
    ok.append(abs(opinion_pool([0.6, 0.6], method="linear") - 0.6) < 1e-9)
    # copula: rho=0 -> joint == independent; rho=0.35 -> premium > 0
    j0 = margin_total_copula(0.6, 0.55, rho=0.0001)
    j1 = margin_total_copula(0.6, 0.55, rho=0.35)
    ok.append(abs(j0["joint"] - 0.33) < 0.01 and j1["corr_premium"] > 0.01)
    # steam
    sig = steam_rlm({"spread": -3.0, "total": 44.0, "ts": 100}, {"spread": -3.5, "total": 44.0, "ts": 130})
    ok.append(any(s["mkt"] == "spread" and s.get("steam") for s in sig))
    # log loss
    ok.append(abs(log_loss([(0.5, 1)]) - 0.6931) < 1e-3)
    print("GAP ENGINES SELF-CHECK:", "PASS " + str(sum(ok)) + "/" + str(len(ok)) if all(ok) else "FAIL " + str(ok))
    return all(ok)

if __name__ == "__main__":
    self_check()
    demo = margin_total_copula(0.60, 0.55, rho=0.35)
    print("demo copula:", demo)
    print("demo middle:", middles_arbs((44.0, -110), (46.0, -110))["middle"])
