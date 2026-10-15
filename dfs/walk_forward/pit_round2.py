#!/usr/bin/env python3
"""pit_round2.py -- the unscored families, under the same locks.

Motivation: 7.142622 is a MEASURED result for ONE joint, not a ceiling. Several
families have never been scored on the frozen n=2462 expanding-window filter:

  1. Integer-support discretized Gaussian (unit bins, mean locked by symmetry)
  2. Mean-preserving key-number atoms on top of the heteroscedastic Gaussian
  3. Student-t with a single shape parameter fit on prior rows only
  4. Non-parametric (empirical-quantile) scale on total only, since beta_S
     collapsed to 0 in the joint

All four honour the locks:
  - mu == spread_line for every game, never shifted
  - expanding window, fitted on strictly prior rows
  - mean locked by SYMMETRY (atoms/unit bins) or by RECENTERING (Student-t)
  - full-filter mean DeltaCRPS >= 0 is a terminal refusal

DIAGNOSTIC ONLY. Writes its own result JSON. Never touches walk_forward.json.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gse_location_locked_harness as H  # noqa: E402

MIN_PRIOR = 25
SIGMA0 = 13.45
GATE = 7.099
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                   "pit_round2_result.json")
BASELINE = 7.154021
SQRT2 = math.sqrt(2.0)
SQRTPI = math.sqrt(math.pi)


# ------------------------------------------------------------------ families

def _student_t_cdf(u, nu):
    """P(T <= u) for standard Student-t, via the regularised incomplete beta.

    Correct two-sided form:
        P(T <= u) = 1 - 0.5 * I_x(nu/2, 1/2)   for u > 0
        P(T <= u) =     0.5 * I_x(nu/2, 1/2)   for u < 0
        x = nu / (nu + u^2)

    An earlier version applied the +/- sign OUTSIDE the 0.5*(1 + I_x) expression,
    which double-counts the tail and produced CRPS ~397 instead of ~3.87.
    Verified against 300k-draw Monte Carlo (3.865957 vs 3.87 after the fix).
    """
    x = nu / (nu + u * u)
    ib = _betainc_reg(nu / 2.0, 0.5, x)
    return (1.0 - 0.5 * ib) if u > 0 else (0.5 * ib)


def crps_student_t(mu, sd, nu, y):
    """CRPS of Student-t(mu, sd, nu) at y, by numerical integration of the
    closed form CRPS(F, y) = INT (F(u) - 1{u >= y})^2 du.

    Requires nu > 2 for a finite mean. The grid spans +-60 sd, which is ample
    for nu >= 3.
    """
    if nu <= 2.0:
        raise ValueError("Student-t CRPS requires nu > 2 for a finite mean")
    # Midpoint rule split at z. The earlier left-endpoint grid (du=0.05, no
    # split at the indicator jump) carried an O(sd*du) error of ~0.1-0.2 and
    # disagreed with the closed form; it is reference-only (tests).
    z = (y - mu) / sd
    lo, hi = -60.0, 60.0
    z = min(max(z, lo), hi)
    tot = 0.0
    for a, b, ind in ((lo, z, 0.0), (z, hi, 1.0)):
        steps = 6000
        du = (b - a) / steps
        for i in range(steps):
            F = _student_t_cdf(a + (i + 0.5) * du, nu)
            tot += (F - ind) ** 2 * du
    return sd * tot


def _betainc_reg(a, b, x):
    """Regularised incomplete beta I_x(a,b) by continued fraction (Lentz)."""
    if x <= 0.0:
        return 0.0
    if x >= 1.0:
        return 1.0
    # Lentz continued fraction only converges for x < (a+1)/(a+b+2); use the
    # symmetry I_x(a,b) = 1 - I_{1-x}(b,a) otherwise. Without this switch the
    # Student-t CDF was wrong near u=0 for large nu (0.5701 vs 0.5398 at u=0.1,
    # nu=1e6), which biased both the numerical and closed-form t CRPS.
    if x > (a + 1.0) / (a + b + 2.0):
        return 1.0 - _betainc_reg(b, a, 1.0 - x)
    lbeta = math.lgamma(a) + math.lgamma(b) - math.lgamma(a + b)
    front = math.exp(math.log(x) * a + math.log(1.0 - x) * b - lbeta) / a
    f, c, d = 1.0, 1.0, 0.0
    for i in range(0, 300):
        m = i // 2
        if i == 0:
            numerator = 1.0
        elif i % 2 == 0:
            numerator = (m * (b - m) * x) / ((a + 2.0 * m - 1.0) * (a + 2.0 * m))
        else:
            numerator = -((a + m) * (a + b + m) * x) / ((a + 2.0 * m) * (a + 2.0 * m + 1.0))
        d = 1.0 + numerator * d
        if abs(d) < 1e-30:
            d = 1e-30
        d = 1.0 / d
        c = 1.0 + numerator / c
        if abs(c) < 1e-30:
            c = 1e-30
        delta = c * d
        f *= delta
        if abs(delta - 1.0) < 1e-12:
            break
    return front * (f - 1.0)



def _Phi(z):
    return 0.5 * (1.0 + math.erf(z / SQRT2))


def _phi(z):
    return math.exp(-0.5 * z * z) / math.sqrt(2.0 * math.pi)


# ---- 1. integer-support discretized Gaussian ---------------------------

def int_support_probs(mu, sd, span_sd=12.0):
    """Unit-bin masses P(k) = Phi((k+.5-mu)/sd) - Phi((k-.5-mu)/sd) on a span
    symmetric about mu. No atoms, no renormalisation fudge. For sd >= 1 the
    lattice mean error is exp(-2 pi^2 sd^2)-small; truncation at 12 sd is
    below double precision."""
    span = int(math.ceil(span_sd * sd))
    lo, hi = int(math.floor(mu)) - span, int(math.ceil(mu)) + span
    ks = list(range(lo, hi + 1))
    ps = [_Phi((k + 0.5 - mu) / sd) - _Phi((k - 0.5 - mu) / sd) for k in ks]
    return ks, ps


def crps_discrete(ks, ps, y):
    """Exact CRPS of a distribution on consecutive integers ks at any real y:
    INT (F(u) - 1{u >= y})^2 du with F a step function constant on [k, k+1)."""
    tot = 0.0
    F = 0.0
    for i, k in enumerate(ks):
        F += ps[i]
        nxt = ks[i + 1] if i + 1 < len(ks) else k + 1
        # segment [k, nxt): F constant; split at y if inside
        a, b = float(k), float(nxt)
        if y <= a:
            tot += (F - 1.0) ** 2 * (b - a)
        elif y >= b:
            tot += F * F * (b - a)
        else:
            tot += F * F * (y - a) + (F - 1.0) ** 2 * (b - y)
    # left tail below ks[0] has F=0: contributes (y - ks[0]) if y < ks[0]
    if y < ks[0]:
        tot += ks[0] - y
    return tot


def crps_integer_support(mu, sd, y):
    ks, ps = int_support_probs(mu, sd)
    return crps_discrete(ks, ps, y)


# ---- 2. hetero-Gaussian + key-number overlay ---------------------------

KEYS = (3.0, 7.0)


def keynum_components(mu, sd, p3, p7):
    """Atoms on ABSOLUTE margins +-3 (p3/2 each) and +-7 (p7/2 each), i.e.
    residual atoms at k - close. The continuous part has mass w = 1-p3-p7.
    Atom mean is 0 (symmetric pairs about 0, not about mu), so the continuous
    centre is c = mu / w so that E[X] == mu exactly (mean lock). With
    p3=p7=0 this is N(mu, sd)."""
    w = 1.0 - p3 - p7
    atoms = [(3.0, p3 / 2), (-3.0, p3 / 2), (7.0, p7 / 2), (-7.0, p7 / 2)]
    atoms = [(a, q) for a, q in atoms if q > 0]
    return w, mu / w, atoms


def mixture_mean(mu, sd, p3, p7):
    w, c, atoms = keynum_components(mu, sd, p3, p7)
    return w * c + sum(a * q for a, q in atoms)


def _e_abs_g(c, sd, x):
    """E|G - x| for G ~ N(c, sd)."""
    z = (x - c) / sd
    return sd * (z * (2.0 * _Phi(z) - 1.0) + 2.0 * _phi(z))


def crps_keynum(mu, sd, p3, p7, y):
    """Energy-form CRPS E|X-y| - 0.5 E|X-X'| with all three cross terms."""
    w, c, atoms = keynum_components(mu, sd, p3, p7)
    e1 = w * _e_abs_g(c, sd, y) + sum(q * abs(a - y) for a, q in atoms)
    e2 = w * w * 2.0 * sd / SQRTPI
    e2 += 2.0 * w * sum(q * _e_abs_g(c, sd, a) for a, q in atoms)
    e2 += sum(qi * qj * abs(ai - aj) for ai, qi in atoms for aj, qj in atoms)
    return e1 - 0.5 * e2


def hetero_sd(beta_T, total_line):
    xT = (total_line if total_line is not None else 44.0) / 44.0
    return SIGMA0 * math.exp(max(-0.45, min(0.45, beta_T * xT)))


# ---- 3. Student-t (closed form) ----------------------------------------

def _t_pdf(z, nu):
    lc = math.lgamma((nu + 1) / 2) - math.lgamma(nu / 2) - 0.5 * math.log(nu * math.pi)
    return math.exp(lc - (nu + 1) / 2 * math.log1p(z * z / nu))


def _lbeta(a, b):
    return math.lgamma(a) + math.lgamma(b) - math.lgamma(a + b)


def crps_student_t_closed(mu, scale, nu, y):
    """Closed-form CRPS of mu + scale*T_nu (Jordan, Krueger & Lerch 2019):
    z(2F-1) + 2f (nu+z^2)/(nu-1) - 2 sqrt(nu) B(1/2,nu-1/2) / ((nu-1) B(1/2,nu/2)^2).
    Verified in tests against the numerical-integral crps_student_t."""
    z = (y - mu) / scale
    F = _student_t_cdf(z, nu) if z != 0 else 0.5
    f = _t_pdf(z, nu)
    k = 2.0 * math.sqrt(nu) * math.exp(_lbeta(0.5, nu - 0.5) - 2.0 * _lbeta(0.5, nu / 2.0)) / (nu - 1.0)
    return scale * (z * (2.0 * F - 1.0) + 2.0 * f * (nu + z * z) / (nu - 1.0) - k)


def t_scale_var_matched(nu):
    """scale such that SD(mu + scale*T_nu) == SIGMA0 (single shape parameter)."""
    return SIGMA0 * math.sqrt((nu - 2.0) / nu)


NU_GRID = (3.0, 4.0, 5.0, 6.0, 8.0, 10.0, 15.0, 30.0)


# ---- 4. empirical-quantile scale on total -------------------------------

def _quantile(xs, q):
    s = sorted(xs)
    if not s:
        return None
    pos = q * (len(s) - 1)
    lo = int(math.floor(pos))
    hi = min(lo + 1, len(s) - 1)
    return s[lo] + (s[hi] - s[lo]) * (pos - lo)


# ------------------------------------------------------------------ drivers

def week_key(r):
    return (r["season"], r["week"])


def prior_index(rows):
    """For each row, the number of rows with a STRICTLY earlier (season, week).
    Rows must be sorted by (season, week). Same-week games are NOT prior."""
    out, first = [], {}
    for i, r in enumerate(rows):
        first.setdefault(week_key(r), i)
        out.append(first[week_key(r)])
    return out


def pit_select(rows, table, min_prior=MIN_PRIOR):
    """table[j][i] = CRPS of parameter j on row i. For each row choose the j
    minimising mean CRPS over strictly-prior rows (running sums: O(n*J)).
    Rows with < min_prior prior rows return (None, None) -> baseline (beta=0)."""
    J = len(table)
    pidx = prior_index(rows)
    cums = [[0.0] for _ in range(J)]
    for j in range(J):
        acc = 0.0
        for v in table[j]:
            acc += v
            cums[j].append(acc)
    picks = []
    for i in range(len(rows)):
        n = pidx[i]
        if n < min_prior:
            picks.append(None)
            continue
        picks.append(min(range(J), key=lambda j: cums[j][n]))
    return picks


def summarise(label, rows, crps_with, flagged, extra=None):
    base = [H.crps_gaussian(r["spread_line"], SIGMA0, r["margin"]) for r in rows]
    d = [a - b for a, b in zip(crps_with, base)]
    n = len(d)
    md = sum(d) / n
    var = sum((x - md) ** 2 for x in d) / max(1, n - 1)
    se = math.sqrt(var / n)
    crps = sum(crps_with) / n
    out = {"label": label, "n": n, "crps": round(crps, 6),
           "mean_delta": round(md, 6), "se": round(se, 6),
           "t": round(md / se, 3) if se > 0 else None,
           "rows_at_baseline_flagged": flagged,
           "gate": GATE, "gate_met": False,
           "verdict": ("REFUSED (full-filter DeltaCRPS >= 0, terminal)" if md >= 0
                       else ("improves solo; misses gate by %.6f" % (crps - GATE)
                             if crps > GATE else
                             "improves solo; at/under gate number -- NOT a clear, DIAGNOSTIC only"))}
    if extra:
        out.update(extra)
    return out


def family_integer(rows):
    w = [crps_integer_support(r["spread_line"], SIGMA0, r["margin"]) for r in rows]
    mean_err = 0.0
    for r in rows:
        ks, ps = int_support_probs(r["spread_line"], SIGMA0)
        m = sum(k * p for k, p in zip(ks, ps)) / sum(ps)
        mean_err = max(mean_err, abs(m - r["spread_line"]))
    return summarise("integer-support discretized Gaussian sigma=13.45 (no fitted params)",
                     rows, w, 0, {"max_mean_error_vs_line": mean_err,
                                  "mean_lock_ok": mean_err < 1e-12})


BETA_GRID = tuple(round(-0.20 + 0.02 * i, 2) for i in range(21))
P_GRID = (0.0, 0.01, 0.02, 0.03, 0.05, 0.08)


def family_hetero_keys(rows):
    params = [(b, p3, p7) for b in BETA_GRID for p3 in P_GRID for p7 in P_GRID]
    table = [[crps_keynum(r["spread_line"], hetero_sd(b, r["total_line"]), p3, p7, r["margin"])
              for r in rows] for (b, p3, p7) in params]
    picks = pit_select(rows, table)
    w, flagged, chosen, merr = [], 0, {}, 0.0
    for i, r in enumerate(rows):
        if picks[i] is None:
            flagged += 1
            w.append(H.crps_gaussian(r["spread_line"], SIGMA0, r["margin"]))
            continue
        b, p3, p7 = params[picks[i]]
        chosen[str((b, p3, p7))] = chosen.get(str((b, p3, p7)), 0) + 1
        merr = max(merr, abs(mixture_mean(r["spread_line"], hetero_sd(b, r["total_line"]), p3, p7)
                             - r["spread_line"]))
        w.append(table[picks[i]][i])
    return summarise("hetero-Gaussian sigma0*exp(beta_T*T/44) + key-number atoms (beta_T,p3,p7 PIT)",
                     rows, w, flagged, {"param_grid": {"beta_T": BETA_GRID, "p3": P_GRID, "p7": P_GRID},
                                        "chosen_param_counts": chosen,
                                        "max_mean_error_vs_line": merr,
                                        "mean_lock_ok": merr < 1e-12,
                                        "mean_lock_method": "continuous centre c=mu/(1-p3-p7); atoms on absolute margins +-3,+-7"})


def family_student_t(rows):
    table = [[crps_student_t_closed(r["spread_line"], t_scale_var_matched(nu), nu, r["margin"])
              for r in rows] for nu in NU_GRID]
    picks = pit_select(rows, table)
    w, flagged, chosen = [], 0, {}
    for i, r in enumerate(rows):
        if picks[i] is None:
            flagged += 1
            w.append(H.crps_gaussian(r["spread_line"], SIGMA0, r["margin"]))
        else:
            chosen[str(NU_GRID[picks[i]])] = chosen.get(str(NU_GRID[picks[i]]), 0) + 1
            w.append(table[picks[i]][i])
    return summarise("Student-t, nu PIT-fit, variance-matched to sigma0=13.45, mean=line by symmetry",
                     rows, w, flagged, {"nu_grid": NU_GRID, "chosen_nu_counts": chosen,
                                        "mean_lock_ok": True})


def family_empirical_total(rows, nbins=4):
    """Bin edges = prior-only quantiles of total_line; sigma = median|resid| / 0.67449
    over prior games in the row's bin. <25 in bin or missing total -> baseline."""
    pidx = prior_index(rows)
    w, flagged, sds = [], 0, []
    for i, r in enumerate(rows):
        prior = rows[:pidx[i]]
        T = r["total_line"]
        ok = len(prior) >= MIN_PRIOR and T is not None
        sd = None
        if ok:
            tots = [p["total_line"] for p in prior if p["total_line"] is not None]
            edges = [_quantile(tots, q / nbins) for q in range(1, nbins)]
            b = sum(1 for e in edges if T >= e)
            pool = [abs(p["margin"] - p["spread_line"]) for p in prior
                    if p["total_line"] is not None and sum(1 for e in edges if p["total_line"] >= e) == b]
            if len(pool) >= MIN_PRIOR:
                sd = _quantile(pool, 0.5) / 0.6744897501960817
        if sd is None or sd <= 0:
            flagged += 1
            w.append(H.crps_gaussian(r["spread_line"], SIGMA0, r["margin"]))
        else:
            sds.append(sd)
            w.append(H.crps_gaussian(r["spread_line"], sd, r["margin"]))
    return summarise("empirical-quantile scale on total (prior quartile bins, median|resid|/0.6745)",
                     rows, w, flagged, {"sd_min": min(sds) if sds else None,
                                        "sd_max": max(sds) if sds else None,
                                        "mean_lock_ok": True})


def main():
    rows, skipped = H.load_frozen()
    base = H.score_baseline(rows)
    if not (base["n"] == 2462 and abs(base["crps"] - BASELINE) <= 5e-7):
        print("STOP: baseline not reproduced", base, "target n=2462 crps", BASELINE)
        sys.exit(2)
    print("baseline reproduced n=%d crps=%.6f" % (base["n"], base["crps"]), flush=True)
    cands = []
    for name, fn in (("1", family_integer), ("2", family_hetero_keys),
                     ("3", family_student_t), ("4", family_empirical_total)):
        print(name, "...", flush=True)
        c = fn(rows)
        cands.append(c)
        print("  %-80s n=%d crps=%.6f d=%+.6f se=%.6f %s" % (c["label"][:80], c["n"], c["crps"],
              c["mean_delta"], c["se"], c["verdict"]), flush=True)
    improvers = [c for c in cands if c["mean_delta"] < 0]
    json.dump({
        "label": "DIAGNOSTIC", "promotion": "NONE",
        "filter": "REG 2017 W1 - 2026 W5 (frozen), n=2462",
        "data_path": "GAMES_CSV (nflverse games.csv)",
        "baseline": {"n": base["n"], "crps": round(base["crps"], 6), "sigma": SIGMA0},
        "locks": {"mu": "spread_line (nflverse sign, never flipped)",
                  "pit": "expanding window, strictly earlier (season,week); <25 prior -> baseline (beta=0), flagged",
                  "refusal": "full-filter mean DeltaCRPS >= 0 is terminal"},
        "candidates": cands,
        "improvers": len(improvers),
        "joint_scored": False,
        "joint_note": "not scored in this run; task scoped to the four solos",
        "gate": GATE, "gate_cleared": False, "passed": False,
        "emission": "ZERO_OBJECT (0 picks / 0 parlays / 0 DFS)",
        "walk_forward_json_touched": False,
    }, open(OUT, "w", encoding="utf-8"), indent=1)
    print("written", OUT)
    return cands


if __name__ == "__main__":
    main()
