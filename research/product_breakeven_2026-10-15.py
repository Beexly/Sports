#!/usr/bin/env python3
"""
Product break-even mapping — RULING-C1 owner decision 5.5(B) artifact.

Question: what CRPS improvement does a product need to break even, derived from
product economics (today's captured DraftKings prices), independent of any CRPS
result on any filter?

Data (all captured 2026-10-15, no invented prices):
  - Alternate ladders (OddsAPI/DraftKings, stamp 2026-10-15T18:29:17.979Z):
    line-archive-oddsapi-2026-10-15.jsonl  (SEA@DEN only — the 14-game claim in
    the tasking does not survive contact with the file: 178 rows, 1 game)
  - Main-line stamps (ESPN-public DK feed): line-archive-2026-10-15.jsonl
    Main-line prices paired with the ladder are the 18:13:47.984Z INTERIM stamp
    (closest stamp not after the 18:29Z ladder capture).

Conventions:
  M = home-team margin (DEN - SEA for tonight). mu is LOCKED at the archived
  main line (SPEC-A): mu_M = -2.5 (DEN +2.5). Total T, mu_T = 40.5.
  A "threshold t" (half-integer) splits the lattice: home line -t wins iff
  M > t; away line +t wins iff M < t. Both sides are quoted at every ladder
  threshold, so the book's hold at each rung is measured, not assumed.

Break-even identities (American price A, decimal o, raw implied q = 1/o):
  p_be = q                      (break-even win prob at the offered price)
  fair pi = q / (1 + h)         (proportional devig; h = q1 + q2 - 1)
  required edge vs fair = q - pi = q*h/(1+h)
  model breaks even on a side iff model probability >= q (raw).

CRPS bridge (labeled assumptions, see deliverable):
  On the integer lattice, E_{m~G}[CRPS(F, m)] = sum_k [(F(k)-G(k))^2 + G(k)(1-G(k))].
  Hence if the candidate distribution Q is taken as truth (self-consistent
  evaluation, assumption A1), its expected CRPS improvement over baseline P is
  exactly sum_k (P(k) - Q(k))^2. The r*-equivalent of a product = the minimum
  of that sum over all Q whose rung probabilities clear the captured raw
  implied prices at the product's traded rungs (assumptions A2-A4 in the
  deliverable). A correction at a single lattice threshold costs e^2.
"""

import json
import math
import statistics
import sys

ODDS = "/home/hatch/workspace/goals/gse-engine-v5-3-0-calibration-rebuild/hidden_files/line-archive-oddsapi-2026-10-15.jsonl"
MAIN = "/home/hatch/workspace/goals/gse-engine-v5-3-0-calibration-rebuild/hidden_files/line-archive-2026-10-15.jsonl"
GAME = "espn:americanfootball_nfl:401872995"  # SEA @ DEN, DEN home
LADDER_STAMP = "2026-10-15T18:29:17.979Z"
MAIN_STAMP = "2026-10-15T18:13:47.984Z"  # closest main stamp <= ladder stamp


def implied(a):
    """Raw implied probability from an American price."""
    return 100.0 / (a + 100.0) if a > 0 else (-a) / (-a + 100.0)


def phi(x):
    return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))


def load(path):
    return [json.loads(l) for l in open(path)]


odds = load(ODDS)
main = load(MAIN)

# ---------------------------------------------------------------- ladders
sp_home = {r["line"]: r["price"] for r in odds if r["market"] == "ALT_SPREAD" and r["side"] == "home"}
sp_away = {r["line"]: r["price"] for r in odds if r["market"] == "ALT_SPREAD" and r["side"] == "away"}
to_over = {r["line"]: r["price"] for r in odds if r["market"] == "ALT_TOTAL" and r["side"] == "over"}
to_under = {r["line"]: r["price"] for r in odds if r["market"] == "ALT_TOTAL" and r["side"] == "under"}

# main-line pair for tonight at MAIN_STAMP
ml = {}
for r in main:
    if r["gameId"] == GAME and r["capturedAt"] == MAIN_STAMP:
        ml[(r["market"], r["side"])] = (r["line"], r["price"])
main_spread_home = ml[("SPREAD", "home")]   # (+2.5, -108) DEN
main_spread_away = ml[("SPREAD", "away")]   # (-2.5, -112) SEA
main_total_over = ml[("TOTAL", "over")]     # (40.5, -115)
main_total_under = ml[("TOTAL", "under")]   # (40.5, -105)
main_ml_home = ml[("MONEYLINE", "home")]
main_ml_away = ml[("MONEYLINE", "away")]

MU_M = -2.5  # home line +2.5 (DEN) -> locked mean home margin
MU_T = 40.5

CAPPED = -10000  # book price cap: implied >= 0.99010 is censored, not a price


def spread_pair(t):
    """Return (home_price, away_price, source) for threshold t, or None.
    Home line -t (wins iff M > t); away line +t (wins iff M < t)."""
    if t == -2.5:  # the main line itself, from the main-line file
        return main_spread_home[1], main_spread_away[1], "main-line file " + MAIN_STAMP
    ph = sp_home.get(-t)
    pa = sp_away.get(t)
    if ph is None or pa is None:
        return None
    return ph, pa, "alt ladder " + LADDER_STAMP


def rung_stats(ph, pa):
    """Two-sided rung: raw implieds, hold, devigged fairs.
    side1 = 'above' bet (home/total-over analogue), side2 = 'below'."""
    q1, q2 = implied(ph), implied(pa)
    h = q1 + q2 - 1.0
    return {
        "price_side1": ph, "price_side2": pa,
        "q_side1": q1, "q_side2": q2,
        "hold": h,
        "fair_side1": q1 / (1.0 + h), "fair_side2": q2 / (1.0 + h),
    }


# Spread CDF from the ladder: Pi(t) = fair P(M <= t) = fair_side2.
thresholds = sorted({-l for l in sp_home} | {l for l in sp_away} | {-2.5})
cdf_rows = {}
for t in thresholds:
    pair = spread_pair(t)
    if pair is None:
        continue
    ph, pa, src = pair
    st = rung_stats(ph, pa)
    st.update({"t": t, "source": src, "capped": ph <= CAPPED or pa <= CAPPED})
    cdf_rows[t] = st

usable = [t for t, st in cdf_rows.items()
          if not st["capped"] and 0.02 <= st["fair_side2"] <= 0.98]


def fit_sigma(cdf, mu, ts):
    """Least-squares fit of Phi((t-mu)/sigma) to the devigged CDF."""
    def sse(s):
        return sum((cdf[t] - phi((t - mu) / s)) ** 2 for t in ts)
    lo, hi = 4.0, 40.0
    for _ in range(200):
        m1, m2 = lo + (hi - lo) / 3.0, hi - (hi - lo) / 3.0
        if sse(m1) < sse(m2):
            hi = m2
        else:
            lo = m1
    s = (lo + hi) / 2.0
    return s, sse(s)


fair_cdf = {t: cdf_rows[t]["fair_side2"] for t in usable}
SIGMA_M, _ = fit_sigma(fair_cdf, MU_M, usable)


def base_cdf(t, mu=MU_M, sigma=SIGMA_M):
    return phi((t - mu) / sigma)


# ---------------------------------------------------------------- totals CDF
total_lines = sorted(set(to_over) & set(to_under))
tot_rows = {}
for L in total_lines:
    st = rung_stats(to_over[L], to_under[L])
    st.update({"L": L, "capped": to_over[L] <= CAPPED or to_under[L] <= CAPPED})
    tot_rows[L] = st
tot_usable = [L for L, st in tot_rows.items()
              if not st["capped"] and 0.02 <= st["fair_side2"] <= 0.98]
fair_tcdf = {L: tot_rows[L]["fair_side2"] for L in tot_usable}
SIGMA_T, _ = fit_sigma(fair_tcdf, MU_T, tot_usable)


def base_tcdf(L):
    return phi((L - MU_T) / SIGMA_T)


# ---------------------------------------------------------------- outputs
out = {"meta": {
    "game": "SEA @ DEN (ESPN 401872995), DEN home, M = DEN - SEA margin",
    "ladder_stamp": LADDER_STAMP, "main_stamp_used": MAIN_STAMP,
    "mu_margin_locked": MU_M, "mu_total_locked": MU_T,
    "sigma_margin_fit": SIGMA_M, "sigma_total_fit": SIGMA_T,
    "n_ladder_rows": len(odds),
    "ladder_games_found": len({r["gameId"] for r in odds}),
}}

# --- hold summary: main lines tonight
def hold_of(p1, p2):
    return implied(p1) + implied(p2) - 1.0

out["tonight_main_holds"] = {
    "spread_2.5": hold_of(main_spread_home[1], main_spread_away[1]),
    "total_40.5": hold_of(main_total_over[1], main_total_under[1]),
    "moneyline": hold_of(main_ml_home[1], main_ml_away[1]),
    "prices": {"spread": [main_spread_home, main_spread_away],
               "total": [main_total_over, main_total_under],
               "moneyline": [main_ml_home, main_ml_away]},
}

# --- per-rung table at key thresholds
KEY_T = [-7.5, -6.5, -3.5, -2.5, 2.5, 3.5, 6.5, 7.5]
rung_table = []
for t in KEY_T:
    st = cdf_rows[t]
    P = base_cdf(t)                      # baseline P(M <= t)
    p_above, p_below = 1.0 - P, P        # baseline side probabilities
    g_above = p_above - st["q_side1"]    # model edge if betting home (M > t)
    g_below = p_below - st["q_side2"]    # model edge if betting away (M < t)
    g_best = max(g_above, g_below)
    e = max(0.0, -g_best)                # required CDF correction, prob points
    rung_table.append({
        "t": t, "home_price": st["price_side1"], "away_price": st["price_side2"],
        "q_home_above": st["q_side1"], "q_away_below": st["q_side2"],
        "hold": st["hold"], "fair_cdf_Pi": st["fair_side2"],
        "baseline_cdf_P": P, "best_side_gap": g_best,
        "required_edge_prob_pts": e * 100.0,
        "crps_equiv_single_rung": e * e,
        "source": st["source"],
    })
out["spread_key_rungs"] = rung_table
out["spread_keyset_crps_equiv"] = sum(r["crps_equiv_single_rung"] for r in rung_table)

# --------------------------------------------------------------------------
# CDF-space projections (the CRPS bridge, assumption A1: if candidate Q is
# the truth, its expected CRPS improvement over baseline P is exactly
# sum_t (P(t)-Q(t))^2 over the lattice thresholds). Each product's
# r*-equivalent = min of that sum over monotone Q meeting the product's
# break-even constraints. Solved by Dykstra alternating projections
# (monotone cone via PAVA; constraint sets via their exact projections).
# --------------------------------------------------------------------------
all_t = sorted(cdf_rows)
P_vec = [base_cdf(t) for t in all_t]


def pava(y):
    """Isotonic (non-decreasing) regression of y under L2 — pool adjacent violators."""
    blocks = [[v, 1.0, 1] for v in y]
    stack = []
    for b in blocks:
        stack.append(b)
        while len(stack) >= 2 and stack[-2][0] > stack[-1][0]:
            b2 = stack.pop()
            b1 = stack.pop()
            w = b1[1] + b2[1]
            stack.append([(b1[0] * b1[1] + b2[0] * b2[1]) / w, w, b1[2] + b2[2]])
    out_v = []
    for v, w, c in stack:
        out_v.extend([v] * c)
    return out_v


def dykstra(P0, proj_extra, n_iter=8000, tol=1e-12):
    """Projection of P0 onto {monotone} INTERSECT {set with projection proj_extra}."""
    n = len(P0)
    x = list(P0)
    p = [0.0] * n
    q = [0.0] * n
    for _ in range(n_iter):
        y = pava([x[i] + p[i] for i in range(n)])
        p = [x[i] + p[i] - y[i] for i in range(n)]
        xn = proj_extra([y[i] + q[i] for i in range(n)])
        q = [y[i] + q[i] - xn[i] for i in range(n)]
        agree = max(abs(xn[i] - y[i]) for i in range(n))
        x = xn
        if agree < tol:
            break
    return x


def bounds_feasible(bounds):
    """bounds: {index: ('ge'|'le', value)}. Necessary+sufficient check for a
    monotone sequence to exist: prefix-max of lower bounds <= suffix-min of
    upper bounds everywhere."""
    n = len(all_t)
    L = [-1e9] * n
    U = [1e9] * n
    for idx, (kind, b) in bounds.items():
        if kind == "ge":
            L[idx] = max(L[idx], b)
        else:
            U[idx] = min(U[idx], b)
    run_max = -1e9
    suf_min = [1e9] * (n + 1)
    for i in range(n - 1, -1, -1):
        suf_min[i] = min(suf_min[i + 1], U[i])
    for i in range(n):
        run_max = max(run_max, L[i])
        if run_max > suf_min[i] + 1e-12:
            return False
    return True


# --- QP-A: alternate spread lines over the key threshold set.
# At each key threshold the candidate must clear break-even on ONE side
# (its choice): 'ge' -> Q(t) >= q_below (back the below side), 'le' ->
# Q(t) <= 1 - q_above (back the above side). Thresholds where the baseline
# already clears are pinned to their clearing side so corrections elsewhere
# cannot silently un-clear them. Enumerate side assignments, keep the
# cheapest feasible projection.
fixed_bounds = {}
free_thresholds = []
for r in rung_table:
    t = r["t"]
    idx = all_t.index(t)
    st = cdf_rows[t]
    g_above = (1.0 - base_cdf(t)) - st["q_side1"]
    g_below = base_cdf(t) - st["q_side2"]
    if g_below >= 0 or g_above >= 0:
        # already clearing: pin the clearing side
        if g_below >= g_above:
            fixed_bounds[idx] = ("ge", st["q_side2"])
        else:
            fixed_bounds[idx] = ("le", 1.0 - st["q_side1"])
    else:
        free_thresholds.append((idx, st))

best = None
import itertools
for combo in itertools.product(("ge", "le"), repeat=len(free_thresholds)):
    bounds = dict(fixed_bounds)
    for (idx, st), kind in zip(free_thresholds, combo):
        bounds[idx] = (kind, st["q_side2"] if kind == "ge" else 1.0 - st["q_side1"])
    if not bounds_feasible(bounds):
        continue

    def proj_extra(y, bounds=bounds):
        z = list(y)
        for idx, (kind, b) in bounds.items():
            z[idx] = max(z[idx], b) if kind == "ge" else min(z[idx], b)
        return z

    Qv = dykstra(P_vec, proj_extra)
    cost = sum((Qv[i] - P_vec[i]) ** 2 for i in range(len(all_t)))
    if best is None or cost < best["cost"]:
        best = {"cost": cost, "Q": Qv, "bounds": bounds}
Q_vec = best["Q"]
mono_ok = all(Q_vec[i] <= Q_vec[i + 1] + 1e-9 for i in range(len(Q_vec) - 1))
cons_ok = all((Q_vec[idx] >= b - 1e-9) if kind == "ge" else (Q_vec[idx] <= b + 1e-9)
              for idx, (kind, b) in best["bounds"].items())
out["keyset_joint_crps_equiv"] = float(best["cost"])
out["keyset_joint_success"] = bool(mono_ok and cons_ok)
out["keyset_joint_corrected"] = {str(t): float(Q_vec[all_t.index(t)]) for t in KEY_T}
out["keyset_joint_side_choices"] = {
    str(all_t[idx]): (kind, b) for idx, (kind, b) in best["bounds"].items()}
# the independently-cheapest side choices are jointly INFEASIBLE tonight:
# t=+2.5 wants Q up (>=0.64413) while t=+3.5 wants Q down (<=0.64029).
out["keyset_independent_corrections_monotone"] = False

# --- full-shape reference: sum (P - Pi)^2 over usable ladder thresholds
out["full_shape_sum_sq"] = sum((base_cdf(t) - fair_cdf[t]) ** 2 for t in usable)
out["usable_thresholds"] = usable
# lattice reference: sum Pi(1-Pi) over integer lattice points (thresholds are
# the lattice CDF at integers: Pi(t) = P(M <= t-0.5)... sampled at half-integers
# t = k+0.5 -> F(k)). Missing thresholds -0.5/+0.5 interpolated; tails padded
# with the baseline-fitted Gaussian beyond the reliably priced region.
all_k = list(range(-40, 41))
def Pi_at(t):
    if t in fair_cdf:
        return fair_cdf[t]
    if t in cdf_rows and not cdf_rows[t]["capped"]:
        return cdf_rows[t]["fair_side2"]
    return None
pi_lattice = {}
prev_t, prev_v = None, None
for k in all_k:
    t = k + 0.5
    v = Pi_at(t)
    pi_lattice[k] = v
# interpolate missing interior points linearly in t between known neighbours
known = sorted(t for t in (kk + 0.5 for kk in all_k) if Pi_at(t) is not None)
for k in all_k:
    t = k + 0.5
    if pi_lattice[k] is None:
        lo = max([x for x in known if x < t], default=None)
        hi = min([x for x in known if x > t], default=None)
        if lo is not None and hi is not None:
            vlo, vhi = Pi_at(lo), Pi_at(hi)
            pi_lattice[k] = vlo + (vhi - vlo) * (t - lo) / (hi - lo)
        else:  # tail: fall back to baseline Gaussian CDF (labelled)
            pi_lattice[k] = base_cdf(t)
out["lattice_entropy_term"] = sum(v * (1.0 - v) for v in pi_lattice.values())
out["expected_crps_baseline_vs_market_truth"] = out["full_shape_sum_sq"] + out["lattice_entropy_term"]

# --- key-number atom masses (spread).
# Each SIDE's prices imply its own raw CDF at every threshold, hence its own
# raw mass at integer k: mass_side = CDF_side(k+0.5) - CDF_side(k-0.5), using
# ONE side consistently. The two sides bracket the devigged fair mass; the
# straddle width (their difference) is the hold the market embeds around the
# number. Break-even bar for a model backing the atom: model mass >= fair
# mass + width/2 (the acquisition-cost approximation: crossing the straddle
# costs, on average, half the width on the position). Two corrections are
# reported: delta_fair (reach the market's own valuation) and delta_be
# (clear break-even after the straddle cost). Either correction is a CDF move
# at exactly one threshold (t = k+0.5), so its CRPS cost is delta^2.
def raw_cdf_by_side(t):
    """{'home': raw P(M<=t) implied by home prices, 'away': same from away}."""
    pair = spread_pair(t)
    if pair is None:
        return None
    ph, pa, _ = pair
    return {"home": 1.0 - implied(ph), "away": implied(pa)}

atoms = {}
for k in (-7, -3, 3, 7):
    lo_t, hi_t = k - 0.5, k + 0.5
    fair_mass = cdf_rows[hi_t]["fair_side2"] - cdf_rows[lo_t]["fair_side2"]
    m_home = raw_cdf_by_side(hi_t)["home"] - raw_cdf_by_side(lo_t)["home"]
    m_away = raw_cdf_by_side(hi_t)["away"] - raw_cdf_by_side(lo_t)["away"]
    width = abs(m_home - m_away)
    base_mass = base_cdf(hi_t) - base_cdf(lo_t)
    bar_mass = fair_mass + width / 2.0
    d_fair = max(0.0, fair_mass - base_mass)
    d_be = max(0.0, bar_mass - base_mass)
    atoms[str(k)] = {"fair_mass": fair_mass, "mass_implied_home_side": m_home,
                     "mass_implied_away_side": m_away, "straddle_width": width,
                     "baseline_mass": base_mass, "breakeven_bar_mass": bar_mass,
                     "delta_to_fair": d_fair, "delta_to_breakeven": d_be,
                     "crps_equiv_to_fair": d_fair * d_fair,
                     "crps_equiv_to_breakeven": d_be * d_be}
out["spread_atoms"] = atoms
out["spread_atoms_crps_equiv_fair"] = sum(a["crps_equiv_to_fair"] for a in atoms.values())
out["spread_atoms_crps_equiv_breakeven"] = sum(a["crps_equiv_to_breakeven"] for a in atoms.values())

# --- QP-B: key-number atoms, exact projection. Constraint per atom k:
# Q(k+0.5) - Q(k-0.5) >= breakeven_bar_mass(k). The four atom pairs are
# disjoint threshold pairs, so the constraint-set projection is exact
# per pair (split the shortfall evenly). Dykstra against the monotone cone.
atom_pairs = []
for k in (-7, -3, 3, 7):
    lo_idx = all_t.index(k - 0.5)
    hi_idx = all_t.index(k + 0.5)
    atom_pairs.append((lo_idx, hi_idx, atoms[str(k)]["breakeven_bar_mass"]))


def proj_atoms(y):
    z = list(y)
    for lo_idx, hi_idx, bar in atom_pairs:
        short = bar - (z[hi_idx] - z[lo_idx])
        if short > 0:
            z[hi_idx] += short / 2.0
            z[lo_idx] -= short / 2.0
    return z


Qa = dykstra(P_vec, proj_atoms)
atoms_ok = all(Qa[hi] - Qa[lo] >= bar - 1e-9 for lo, hi, bar in atom_pairs)
atoms_mono = all(Qa[i] <= Qa[i + 1] + 1e-9 for i in range(len(Qa) - 1))
out["atoms_joint_crps_equiv"] = float(sum((Qa[i] - P_vec[i]) ** 2 for i in range(len(all_t))))
out["atoms_joint_success"] = bool(atoms_ok and atoms_mono)
out["atoms_joint_corrected"] = {str(t): float(Qa[all_t.index(t)]) for t in KEY_T}

# --- QP-C (supplementary): ONE candidate clearing BOTH product classes at
# once — QP-A's rung bounds AND QP-B's atom bars, three-set Dykstra
# (monotone, bounds, atoms), enumerated over the same side assignments.
def dykstra3(P0, proj_b, proj_c, n_iter=8000, tol=1e-12):
    n = len(P0)
    x = list(P0)
    pb = [0.0] * n
    pc = [0.0] * n
    pm = [0.0] * n
    for _ in range(n_iter):
        y = pava([x[i] + pm[i] for i in range(n)])
        pm = [x[i] + pm[i] - y[i] for i in range(n)]
        yb = proj_b([y[i] + pb[i] for i in range(n)])
        pb = [y[i] + pb[i] - yb[i] for i in range(n)]
        yc = proj_c([yb[i] + pc[i] for i in range(n)])
        pc = [yb[i] + pc[i] - yc[i] for i in range(n)]
        agree = max(abs(yc[i] - y[i]) for i in range(n))
        x = yc
        if agree < tol:
            break
    return x


best_c = None
for combo in itertools.product(("ge", "le"), repeat=len(free_thresholds)):
    bounds = dict(fixed_bounds)
    for (idx, st), kind in zip(free_thresholds, combo):
        bounds[idx] = (kind, st["q_side2"] if kind == "ge" else 1.0 - st["q_side1"])
    if not bounds_feasible(bounds):
        continue

    def proj_b(y, bounds=bounds):
        z = list(y)
        for idx, (kind, b) in bounds.items():
            z[idx] = max(z[idx], b) if kind == "ge" else min(z[idx], b)
        return z

    Qc = dykstra3(P_vec, proj_b, proj_atoms)
    ok_mono = all(Qc[i] <= Qc[i + 1] + 1e-9 for i in range(len(Qc) - 1))
    ok_b = all((Qc[idx] >= b - 1e-9) if kind == "ge" else (Qc[idx] <= b + 1e-9)
               for idx, (kind, b) in bounds.items())
    ok_a = all(Qc[hi] - Qc[lo] >= bar - 1e-9 for lo, hi, bar in atom_pairs)
    if not (ok_mono and ok_b and ok_a):
        continue
    cost = sum((Qc[i] - P_vec[i]) ** 2 for i in range(len(all_t)))
    if best_c is None or cost < best_c["cost"]:
        best_c = {"cost": cost, "Q": Qc, "bounds": bounds}
out["combined_joint_crps_equiv"] = float(best_c["cost"]) if best_c else None
out["combined_joint_success"] = bool(best_c)

# --- totals: holds at rungs near the line + key-integer masses
tot_rungs = []
for L in (37.5, 38.5, 39.5, 41.5, 42.5, 43.5, 44.5):
    st = tot_rows[L]
    P = base_tcdf(L)
    g_over = (1.0 - P) - st["q_side1"]
    g_under = P - st["q_side2"]
    e = max(0.0, -max(g_over, g_under))
    tot_rungs.append({"L": L, "over_price": st["price_side1"], "under_price": st["price_side2"],
                      "hold": st["hold"], "fair_cdf": st["fair_side2"], "baseline_cdf": P,
                      "required_edge_prob_pts": e * 100.0, "crps_equiv_single_rung": e * e})
out["total_key_rungs"] = tot_rungs

def tot_raw_cdf_by_side(L):
    """{'over': raw P(T<=L) from over prices, 'under': same from under}."""
    return {"over": 1.0 - implied(to_over[L]), "under": implied(to_under[L])}

tot_atoms = {}
for k in (37, 38, 39, 42, 43, 44):
    lo_L, hi_L = k - 0.5, k + 0.5
    fair_mass = tot_rows[hi_L]["fair_side2"] - tot_rows[lo_L]["fair_side2"]
    m_over = tot_raw_cdf_by_side(hi_L)["over"] - tot_raw_cdf_by_side(lo_L)["over"]
    m_under = tot_raw_cdf_by_side(hi_L)["under"] - tot_raw_cdf_by_side(lo_L)["under"]
    width = abs(m_over - m_under)
    base_mass = base_tcdf(hi_L) - base_tcdf(lo_L)
    bar_mass = fair_mass + width / 2.0
    d_be = max(0.0, bar_mass - base_mass)
    tot_atoms[str(k)] = {"fair_mass": fair_mass, "mass_implied_over_side": m_over,
                         "mass_implied_under_side": m_under, "straddle_width": width,
                         "baseline_mass": base_mass, "breakeven_bar_mass": bar_mass,
                         "delta_to_breakeven": d_be, "crps_equiv": d_be * d_be}
# 40 and 41 are not separable: the ladder skips the main line 40.5
fair_4041 = tot_rows[41.5]["fair_side2"] - tot_rows[39.5]["fair_side2"]
base_4041 = base_tcdf(41.5) - base_tcdf(39.5)
w_4041 = abs((tot_raw_cdf_by_side(41.5)["under"] - tot_raw_cdf_by_side(39.5)["under"])
             - (tot_raw_cdf_by_side(41.5)["over"] - tot_raw_cdf_by_side(39.5)["over"]))
tot_atoms["40+41_joint"] = {"fair_mass": fair_4041, "baseline_mass": base_4041,
                            "straddle_width": w_4041,
                            "breakeven_bar_mass": fair_4041 + w_4041 / 2.0,
                            "delta_to_breakeven": max(0.0, fair_4041 + w_4041 / 2.0 - base_4041)}
out["total_atoms"] = tot_atoms
out["total_full_shape_sum_sq"] = sum((base_tcdf(L) - fair_tcdf[L]) ** 2 for L in tot_usable)

# --- teasers: market fair cover prob at 6-pt teased lines (from the ladder)
def fair_P_M_le(t):
    return cdf_rows[t]["fair_side2"]
teaser = {
    "SEA_-2.5_teased_+3.5_fair_cover": fair_P_M_le(3.5),          # M <= 3
    "DEN_+2.5_teased_+8.5_fair_cover": 1.0 - fair_P_M_le(-8.5),  # M >= -8
    "total_over_40.5_teased_34.5_fair_cover": 1.0 - tot_rows[34.5]["fair_side2"],
    "total_under_40.5_teased_46.5_fair_cover": tot_rows[46.5]["fair_side2"],
}
# conditional per-leg break-even for a 2-leg teaser IF priced at -120 (NOT captured)
dec120 = 1.0 + 100.0 / 120.0
teaser["conditional_per_leg_be_at_-120_uncaptured_price"] = math.sqrt(1.0 / dec120)
out["teaser"] = teaser

# --- slate medians from the main-line file at MAIN_STAMP (14 games)
games = sorted({r["gameId"] for r in main if r["capturedAt"] == MAIN_STAMP})
slate = []
for g in games:
    rows = {(r["market"], r["side"]): (r["line"], r["price"])
            for r in main if r["gameId"] == g and r["capturedAt"] == MAIN_STAMP}
    sh, sa = rows[("SPREAD", "home")], rows[("SPREAD", "away")]
    to, tu = rows[("TOTAL", "over")], rows[("TOTAL", "under")]
    mh, ma = rows[("MONEYLINE", "home")], rows[("MONEYLINE", "away")]
    half_spread = abs(sh[0]) % 1 == 0.5
    half_total = abs(to[0]) % 1 == 0.5
    # best-side definition: the symmetric baseline prices each side at 0.5, so
    # the binding break-even is the CHEAPER side's raw implied minus 0.5.
    slate.append({
        "game": g, "spread_home_line": sh[0],
        "spread_hold": hold_of(sh[1], sa[1]),
        "total_hold": hold_of(to[1], tu[1]),
        "ml_hold": hold_of(mh[1], ma[1]),
        "half_point_spread": half_spread, "half_point_total": half_total,
        "required_edge_main_spread_prob_pts": (min(implied(sh[1]), implied(sa[1])) - 0.5) * 100.0 if half_spread else None,
        "required_edge_main_total_prob_pts": (min(implied(to[1]), implied(tu[1])) - 0.5) * 100.0 if half_total else None,
    })
out["slate_stamp"] = MAIN_STAMP
out["slate_n"] = len(slate)
out["slate_medians"] = {
    "spread_hold": statistics.median(s["spread_hold"] for s in slate),
    "total_hold": statistics.median(s["total_hold"] for s in slate),
    "ml_hold": statistics.median(s["ml_hold"] for s in slate),
    "required_edge_main_spread_prob_pts": statistics.median(
        s["required_edge_main_spread_prob_pts"] for s in slate if s["required_edge_main_spread_prob_pts"] is not None),
    "required_edge_main_total_prob_pts": statistics.median(
        s["required_edge_main_total_prob_pts"] for s in slate if s["required_edge_main_total_prob_pts"] is not None),
    "n_integer_spread_lines": sum(1 for s in slate if not s["half_point_spread"]),
    "n_integer_total_lines": sum(1 for s in slate if not s["half_point_total"]),
}
out["slate_games"] = slate

# --- full per-rung detail for the record
out["all_spread_rungs"] = [dict(cdf_rows[t], t=t) for t in sorted(cdf_rows)]
out["all_total_rungs"] = [dict(tot_rows[L], L=L) for L in sorted(tot_rows)]

# --- reference points from the record
out["record_references"] = {
    "current_gate_distance_from_baseline": 0.055021,   # 7.154021 -> 7.099, RULING-C1 s3.5
    "current_r_star_relative": 0.055021 / 7.154021,
    "sum_of_solo_deltas": 0.041164,                    # RULING-C1 s3.5
    "family2_solo_delta": 0.020822,
}

json.dump(out, open(sys.argv[1] if len(sys.argv) > 1 else "/tmp/be/results.json", "w"), indent=1)
print("sigma_M =", round(SIGMA_M, 3), " sigma_T =", round(SIGMA_T, 3))
print("tonight main holds:", {k: round(v, 4) for k, v in out["tonight_main_holds"].items() if isinstance(v, float)})
print("keyset CRPS equiv, independent sum (spread):", out["spread_keyset_crps_equiv"])
print("keyset CRPS equiv, joint QP (spread):", out["keyset_joint_crps_equiv"], "success:", out["keyset_joint_success"])
print("atoms CRPS equiv (spread): fair", out["spread_atoms_crps_equiv_fair"],
      "breakeven", out["spread_atoms_crps_equiv_breakeven"])
print("full shape sum sq (spread):", out["full_shape_sum_sq"])
print("slate medians:", {k: (round(v, 4) if isinstance(v, float) else v) for k, v in out["slate_medians"].items()})
print("teaser:", {k: round(v, 4) for k, v in teaser.items()})
