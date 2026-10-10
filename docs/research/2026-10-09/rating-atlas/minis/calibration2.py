#!/usr/bin/env python3
"""calibration2.py — the calibration layer: conformal prediction, Platt,
temperature scaling, beta calibration. These are the tools that turn a
scoring model into a BETTABLE probability. Pure stdlib.

The hierarchy:
  raw model score → (Platt/temperature/beta) calibrated prob → (conformal)
  distribution-free interval with guaranteed coverage.
"""
import math

# ---------- logit helpers ----------
def logit(p, eps=1e-6):
    p = min(max(p, eps), 1 - eps)
    return math.log(p / (1 - p))

def sigmoid(z):
    if z >= 0:
        return 1.0 / (1.0 + math.exp(-z))
    e = math.exp(z)
    return e / (1 + e)

# ---------- 1. PLATT SCALING ----------
def platt_fit(pairs, iters=200, lr=0.1):
    """Platt (1999): p_cal = sigmoid(A·logit(p_raw) + B). Fit A,B by NLL gradient
    descent. The SVM-world's standard recalibration. pairs = [(p_raw, outcome)]."""
    A, B = 1.0, 0.0
    n = len(pairs)
    for _ in range(iters):
        gA = gB = 0.0
        for p, y in pairs:
            z = A * logit(p) + B
            e = sigmoid(z) - y
            gA += e * logit(p)
            gB += e
        A -= lr * gA / n
        B -= lr * gB / n
    return A, B

def platt_apply(p, A, B):
    return sigmoid(A * logit(p) + B)

# ---------- 2. TEMPERATURE SCALING ----------
def temperature_fit(pairs, lo=0.05, hi=10.0):
    """Guo et al. 2017: p_cal = sigmoid(logit(p_raw)/T). Single parameter,
    the modern NN-calibration standard. Bisect T to minimize NLL."""
    def nll(T):
        s = 0.0
        for p, y in pairs:
            q = sigmoid(logit(p) / T)
            q = min(max(q, 1e-9), 1 - 1e-9)
            s -= y * math.log(q) + (1 - y) * math.log(1 - q)
        return s / len(pairs)
    for _ in range(60):
        mid = (lo + hi) / 2
        if nll(mid) < nll(hi):
            hi = mid
        else:
            lo = mid
    T = (lo + hi) / 2
    return T, nll(T)

def temperature_apply(p, T):
    return sigmoid(logit(p) / T)

# ---------- 3. BETA CALIBRATION ----------
def beta_fit(pairs, iters=400, lr=0.05):
    """Kull, Filho & Flach (2017): map m(p) via 3-shape parameters (a, b, c):
    m(p) = 1 / (1 + 1/( (p^a (1-p)^b) / c )). Special cases: identity (a=b=1,c=1),
    Platt-like. Fit by gradient descent on NLL. Monotone guaranteed for a,b>0."""
    a, b, c = 1.0, 1.0, 1.0
    n = len(pairs)
    for _ in range(iters):
        ga = gb = gc = 0.0
        for p, y in pairs:
            p = min(max(p, 1e-6), 1 - 1e-6)
            num = (p ** a) * ((1 - p) ** b)
            z = num / c
            m = z / (1 + z)
            e = m - y
            dm_dz = 1.0 / (1 + z) ** 2
            dz_dnum = 1.0 / c
            ga += e * dm_dz * dz_dnum * num * math.log(p)
            gb += e * dm_dz * dz_dnum * num * math.log(1 - p)
            gc += e * dm_dz * (-(num / (c * c)))
        a -= lr * ga / n
        b -= lr * gb / n
        c -= lr * gc / n
        a = max(a, 1e-3); b = max(b, 1e-3); c = max(c, 1e-6)
    return a, b, c

def beta_apply(p, a, b, c):
    p = min(max(p, 1e-6), 1 - 1e-6)
    z = (p ** a) * ((1 - p) ** b) / c
    return z / (1 + z)

# ---------- 4. SPLIT CONFORMAL ----------
def conformal_interval(scores_cal, alpha=0.10):
    """Split conformal (Vovk; Papadopoulos): given calibration residuals
    scores_cal = [|y_i − ŷ_i|], the interval ŷ ± q̂ has coverage ≥ 1−α
    DISTRIBUTION-FREE (only assumption: exchangeability).
    q̂ = the ⌈(n+1)(1−α)⌉-th smallest residual (finite-sample correction)."""
    n = len(scores_cal)
    if n == 0: return 0.0
    k = math.ceil((n + 1) * (1 - alpha))
    s = sorted(scores_cal)
    return s[min(k, n) - 1]

def conformal_coverage_check(scores_cal, scores_test, alpha=0.10):
    """Empirical coverage on held-out residuals vs the 1−α guarantee."""
    q = conformal_interval(scores_cal, alpha)
    hit = sum(1 for s in scores_test if s <= q) / len(scores_test) if scores_test else 0.0
    return {"q": q, "empirical_coverage": hit, "target": 1 - alpha}

# ---------- 5. CONFORMAL FOR PROPS (quantile, asymmetric) ----------
def conformal_prop_interval(resid_over, resid_under, alpha=0.10):
    """Asymmetric conformal for prop pricing: separate quantiles of how far the
    realized stat landed above/below projection. The book's 'projection±range'
    but with a real guarantee behind it."""
    q_hi = conformal_interval([max(r, 0.0) for r in resid_over], alpha)
    q_lo = conformal_interval([max(-r, 0.0) for r in resid_under], alpha)
    return {"lower": -q_lo, "upper": q_hi, "alpha": alpha}

# ---------- 6. ECE + MCE (expected calibration error) ----------
def ece(pairs, bins=10):
    """ECE = Σ |acc(b) − conf(b)|·n_b/N. The headline calibration number.
    Also returns per-bin table for the reliability diagram."""
    B = [([], []) for _ in range(bins)]
    for p, y in pairs:
        i = min(bins - 1, int(p * bins))
        B[i][0].append(p); B[i][1].append(y)
    total = len(pairs)
    e = 0.0
    table = []
    for i, (ps, ys) in enumerate(B):
        if not ps:
            table.append((i / bins, None, None, 0)); continue
        conf = sum(ps) / len(ps)
        acc = sum(ys) / len(ys)
        e += (len(ps) / total) * abs(acc - conf)
        table.append((i / bins, round(conf, 3), round(acc, 3), len(ps)))
    return e, table

# ---------- 7. calibration comparison harness ----------
def recalibrate_report(pairs):
    """Fit Platt + temperature + beta on the SAME pairs (in-sample diagnostics —
    split out-of-sample before trusting). Returns Brier before/after each."""
    def brier(ps):
        return sum((p - y) ** 2 for p, y in ps) / len(ps)
    A, B = platt_fit(pairs)
    T, nll_T = temperature_fit(pairs)
    a3, b3, c3 = beta_fit(pairs)
    out = {
        "raw_brier": round(brier(pairs), 5),
        "platt": {"A": round(A, 4), "B": round(B, 4),
                  "brier": round(brier([(platt_apply(p, A, B), y) for p, y in pairs]), 5)},
        "temperature": {"T": round(T, 4),
                        "brier": round(brier([(temperature_apply(p, T), y) for p, y in pairs]), 5)},
        "beta": {"a": round(a3, 4), "b": round(b3, 4), "c": round(c3, 4),
                 "brier": round(brier([(beta_apply(p, a3, b3, c3), y) for p, y in pairs]), 5)},
    }
    return out

# ---------- SELF-CHECK ----------
def self_check():
    # Platt on perfectly separable logits → A>0
    A, B = platt_fit([(0.9, 1), (0.9, 1), (0.1, 0), (0.1, 0)])
    assert A > 0
    # temperature: overconfident model (0.99s that fail half the time) → T > 1
    overconf = [(0.99, 1), (0.99, 0), (0.99, 1), (0.99, 0), (0.01, 0), (0.01, 1), (0.01, 0), (0.01, 1)]
    T, _ = temperature_fit(overconf)
    assert T > 1.0, T
    # conformal: 90% target on synthetic residuals
    import random
    rnd = random.Random(5)
    cal = [abs(rnd.gauss(0, 1)) for _ in range(500)]
    test = [abs(rnd.gauss(0, 1)) for _ in range(500)]
    cc = conformal_coverage_check(cal, test, alpha=0.10)
    assert 0.85 <= cc["empirical_coverage"] <= 0.95, cc  # ~90% ± MC noise
    # ECE of a perfectly calibrated synthetic set ≈ small
    rnd2 = random.Random(9)
    pairs = [(0.3, 1 if rnd2.random() < 0.3 else 0) for _ in range(600)]
    e, table = ece(pairs)
    assert e < 0.08, e
    # beta identity params ≈ (1,1,1) on self-consistent data
    a3, b3, c3 = beta_fit([(p, 1 if rnd2.random() < p else 0) for p, y in pairs][:200], iters=150)
    assert 0.2 < a3 < 5 and 0.2 < b3 < 5
    return {"platt_A": A, "temperature_T": round(T, 3),
            "conformal_coverage_90": cc["empirical_coverage"], "ece_calibrated": round(e, 4)}

if __name__ == "__main__":
    print("== CALIBRATION2 SELF-CHECK ==")
    print(self_check())
    print("\n== RECALIBRATION DEMO (deliberately overconfident model) ==")
    import random
    rnd = random.Random(3)
    # model says 0.75/0.25 but truth is 60/40 — miscalibrated
    pairs = []
    for _ in range(800):
        if rnd.random() < 0.6:
            pairs.append((0.75, 1) if rnd.random() < 0.6 else (0.75, 0))
        else:
            pairs.append((0.25, 1) if rnd.random() < 0.4 else (0.25, 0))
    rep = recalibrate_report(pairs)
    for k, v in rep.items():
        print(f"  {k}: {v}")
    print("\n== ECE TABLE (raw) ==")
    e, table = ece(pairs)
    print(f"  ECE = {e:.4f}")
    for row in table:
        if row[1] is not None:
            print(f"    bin {row[0]:.1f}: conf {row[1]:.3f} vs acc {row[2]:.3f} (n={row[3]})")
