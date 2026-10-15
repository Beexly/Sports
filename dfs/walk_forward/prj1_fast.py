#!/usr/bin/env python3
"""prj1_fast.py -- batched-construction fast path for PRJ-1 (RULING-C1).

WHY THIS FILE EXISTS
--------------------
PRJ1-FREEZE.json flags the ruled weekly fitting procedure as compute-heavy
at full training-set scale: the frozen reference module (prj1.py) rebuilds
every game's pmf with a scalar bisection mean-lock (~50 kernel evaluations
per game) inside every L-BFGS-B objective evaluation, one game at a time.
This module performs the SAME construction batched across games and across
the nu grid where the mathematics allows it:

  * kernel bin masses for all games at once as (n_games, 161) arrays,
    using the identical tail-stable branch formula and the identical
    scipy.special CDFs (stdtr / ndtr) as prj1._bin_masses;
  * the mean-lock solve batched across games as a REPLAY of prj1's
    bisection: a secant solve first pins the exact root, the early
    bisection steps are then replayed symbolically (their midpoint
    signs are determined by the root's position, with a guard band),
    and the final steps run as true batched kernel evaluations under
    prj1's exact loop -- same bracket [-300, 300], same stop rules,
    same returned midpoint (the frozen solver's stopping slack is
    part of its output and is reproduced, not improved away);
  * the exact discrete CRPS (pit_round2.crps_discrete semantics) computed
    from the batched cumulative sums;
  * F2's initial grid fit (pit_round2.crps_keynum) vectorised over the
    full BETA_GRID x P_GRID x P_GRID x games array, with the selection
    loop replayed in prj1.f2_initial_fit's exact nesting order and
    strict-< first-min-wins rule;
  * the weekly joint fit uses the identical optimizer (scipy L-BFGS-B,
    same bounds, same options dict, same acceptance rule) and the
    identical selection code (prj1._select_fit, imported).

THE MATHEMATICS IS UNCHANGED. Equivalence with the frozen reference is
the contract and is pinned by test_prj1_fast_equiv.py: pmf entries and
CRPS objective values agree to <= 1e-12, fitted parameters to <= 1e-12,
on the frozen suite's fixtures plus a randomized suite of >= 200
synthetic games spanning the full nu grid.

THE SWITCH
----------
prj1.py remains the reference implementation and is NOT modified. A
caller opts into the fast path by importing this module and calling the
mirrored entry points:

    prj1.build_pmf(mu, total, b, p3, p7, nu)   ->  prj1_fast.build_pmf_fast(...)
    prj1.fit_week(rows)                        ->  prj1_fast.fit_week_fast(rows)
    prj1.fit_with_fallback(rows, prev, log)    ->  prj1_fast.fit_with_fallback_fast(...)
    prj1.f2_initial_fit(rows)                  ->  prj1_fast.f2_initial_fit_fast(rows)
    prj1.crps_prj1(...)                        ->  prj1_fast.crps_prj1_fast(...)

Batched forms (build_pmfs_fast / crps_pmfs_fast / predict_pmfs_fast)
return numpy arrays for callers that want whole slates at once. Which
path binds at the FINAL freeze is a freeze decision; until then the
frozen module's hashes are canonical.

This module performs NO file I/O and scores NOTHING real: it consumes
caller-supplied synthetic/stamped inputs exactly like prj1.py.
Emission: ZERO_OBJECT.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402
from scipy import special as _spspecial  # noqa: E402

import pit_round2 as R2  # noqa: E402
import prj1  # noqa: E402  (the frozen reference; imported, never modified)

# ------------------------------------------------------------ constants
# Mirrored from prj1 (frozen). The equivalence suite asserts these match.
LATTICE_MIN, LATTICE_MAX = prj1.LATTICE_MIN, prj1.LATTICE_MAX
N_LAT = LATTICE_MAX - LATTICE_MIN + 1
_K = np.arange(LATTICE_MIN, LATTICE_MAX + 1, dtype=np.float64)
_K_HI = _K + 0.5
_K_LO = _K - 0.5
_ATOM_INDEX = {a: a - LATTICE_MIN for a in (-7, -3, 3, 7)}

# Phase-1 root estimates stop at |f| < 1e-13 (tighter than the frozen
# bisection's 1e-12) so r_hat is never the less accurate point.
_FAST_F_TOL = 1e-13
_MAX_ITER = 200  # same cap as prj1.BISECTION_MAX_ITER; never approached
# Bisection-replay guards (see solve_centers_fast): a symbolic midpoint
# stays at least _REPLAY_GUARD from r_hat, where even a saturated
# kernel's slope (dE/dc >= ~0.05) keeps |f| > 1e-9 >> prj1's 1e-12 stop;
# the true-evaluation phase takes over below _REPLAY_SWITCH bracket
# width, long before prj1's 1e-13 width stop can trigger.
_REPLAY_GUARD = 2e-9
_REPLAY_SWITCH = 5e-10


# ------------------------------------------------------------ kernel mass

def _cdf(u, nu):
    if nu == math.inf:
        return _spspecial.ndtr(u)
    return _spspecial.stdtr(nu, u)


def _kernel_mass(c, s, nu):
    """(n, 161) unit-bin masses, unnormalised. c, s are (n,) arrays.

    Elementwise identical values to prj1._bin_masses (tail-stable branch
    selection on the standardised edges, same scipy CDFs), evaluated for
    all games at once. prj1 selects per element between a CDF difference
    (hi <= 0 or middle) and a survival difference sf(lo) - sf(hi) with
    sf(u) = CDF(-u) (lo >= 0); both branches are a difference of the same
    CDF at two points, so the two points are gathered per element and the
    CDF is evaluated once on the stacked (2, n, 161) point array instead
    of four times on (n, 161)."""
    c = np.asarray(c, dtype=np.float64)
    s = np.asarray(s, dtype=np.float64)
    hi = (_K_HI[None, :] - c[:, None]) / s[:, None]
    lo = (_K_LO[None, :] - c[:, None]) / s[:, None]
    use_sf = lo >= 0.0
    p1 = np.where(use_sf, -lo, hi)
    p2 = np.where(use_sf, -hi, lo)
    vals = _cdf(np.stack((p1, p2)), nu)
    return vals[0] - vals[1]


def _mean_var(mass):
    """Per-row (Z, mean, var) of the lattice distribution with these
    (unnormalised) masses."""
    Z = mass.sum(axis=1)
    mean = (mass @ _K) / Z
    var = (mass @ (_K * _K)) / Z - mean * mean
    return Z, mean, var


def _neumaier_sum_rows(A):
    """Row-wise sums replicating CPython's built-in sum() over floats
    (Neumaier compensated summation, left to right) bit-for-bit, with
    the compensation carried per row. Element operations are IEEE
    doubles in the same order prj1's sum(...) calls perform them."""
    s = np.zeros(A.shape[0])
    comp = np.zeros(A.shape[0])
    for j in range(A.shape[1]):
        x = A[:, j]
        t = s + x
        big = np.abs(s) >= np.abs(x)
        comp += np.where(big, (s - t) + x, (x - t) + s)
        s = t
    return s + comp


def _frozen_mean(mass):
    """The kernel mean exactly as prj1 computes it: Z = sum(raw) over
    the unnormalised masses, ps = raw / Z, mean = sum(k * ps) -- with
    both sums replicated bit-for-bit (_neumaier_sum_rows). Used where
    prj1's stop/sign decisions must be reproduced exactly (the
    bisection replay); the steering phases use _mean_var instead.
    Returns (Z, mean)."""
    Z = _neumaier_sum_rows(mass)
    ps = mass / Z[:, None]
    mean = _neumaier_sum_rows(ps * _K[None, :])
    return Z, mean


# ------------------------------------------------------------ mean lock

def _root_estimates(mu, m_star, s, nu):
    """Phase 1: a tight estimate r_hat of each game's mean-lock root,
    by safeguarded secant iteration from c = m_star. The lattice mean
    satisfies dE/dc = 1 to within ~2e-3 inside the lattice (measured),
    so the derivative-1 step c <- c - f contracts f by ~|1 - dE/dc| and
    the secant step through the last two points is faster still; steps
    are clipped to the running sign bracket. Stops at |f| < 1e-13.
    Used ONLY to steer the bisection replay in solve_centers_fast --
    the returned centres come from the replay, not from here."""
    lo = np.full(mu.shape, prj1.BISECTION_BRACKET[0])
    hi = np.full(mu.shape, prj1.BISECTION_BRACKET[1])
    c = m_star.copy()
    c_prev = np.full(mu.shape, np.nan)
    f_prev = np.full(mu.shape, np.nan)
    active = np.ones(mu.shape, dtype=bool)
    for _ in range(_MAX_ITER):
        if not active.any():
            break
        idx = np.nonzero(active)[0]
        _, mean, _ = _mean_var(_kernel_mass(c[idx], s[idx], nu))
        f = mean - m_star[idx]
        done = np.abs(f) < _FAST_F_TOL
        neg = f < 0
        lo[idx] = np.where(neg, c[idx], lo[idx])
        hi[idx] = np.where(neg, hi[idx], c[idx])
        if done.all():
            active[idx] = False
            break
        denom = f - f_prev[idx]
        secant = c[idx] - f * (c[idx] - c_prev[idx]) / np.where(
            denom != 0.0, denom, 1.0)
        step = np.where(np.isfinite(secant) & (denom != 0.0), secant,
                        c[idx] - f)
        mid = 0.5 * (lo[idx] + hi[idx])
        inside = (step > lo[idx]) & (step < hi[idx])
        nxt = np.where(inside, step, mid)
        f_prev[idx] = f
        c_prev[idx] = c[idx]
        keep = idx[~done]
        c[keep] = nxt[~done]
        active[idx[done]] = False
    return c


def solve_centers_fast(mu, sigma, nu, p3, p7):
    """Batched form of prj1.solve_center: for each game, the centre c with
    kernel mean == m* = (mu - sum_a a*w_a) / (1 - W).

    prj1 returns the first bisection midpoint (bracket [-300, 300]) at
    which |mean - m*| < 1e-12, or the bracket width falls below 1e-13 --
    a point that can sit up to ~1e-12 from the exact root (the frozen
    solver's own stopping slack). Matching the frozen OUTPUT to 1e-12
    therefore means reproducing that returned midpoint, not the exact
    root. This function replays prj1's bisection exactly:

      phase 1 -- a secant solve (see _root_estimates) pins the exact
        root r_hat to |f| < 1e-13; it steers, but returns nothing.
      phase 2 -- the bisection is replayed symbolically: while the
        midpoint is more than _REPLAY_GUARD from r_hat, the sign of f
        there equals sign(mid - r_hat) with certainty (f is smooth,
        monotone, and |f| there exceeds 1e-9 -- far from prj1's stop
        threshold 1e-12, and the bracket is still far wider than the
        1e-13 width stop), so the bracket update is prj1's, computed
        without a kernel evaluation.
      phase 3 -- once the bracket is narrower than _REPLAY_SWITCH or a
        midpoint falls within _REPLAY_GUARD of r_hat, the replay
        continues with true batched kernel evaluations under prj1's
        exact loop: same midpoint sequence, same stop checks
        (|f| < prj1.MEAN_TOL or width < 1e-13), same update rule, same
        200-iteration cap, same final-midpoint return. The kernel mean
        in this phase is computed with prj1's own summation arithmetic
        replicated bit-for-bit (_frozen_mean), because a ~1e-15 mean
        difference could otherwise flip a stop/sign decision at a
        midpoint where |f| grazes 0 or the 1e-12 threshold.

    mu, sigma: (n,) arrays. Returns (n,) centres. Raises ValueError
    under exactly the conditions prj1.solve_center raises."""
    atoms = prj1.atom_weights(p3, p7)
    W = sum(atoms.values())
    if W >= 1.0:
        raise ValueError("atom mass W must be < 1 for the mean lock")
    atom_mean = sum(a * w for a, w in atoms.items())
    mu = np.asarray(mu, dtype=np.float64)
    sigma = np.asarray(sigma, dtype=np.float64)
    m_star = (mu - atom_mean) / (1.0 - W)
    if np.any(~((LATTICE_MIN < m_star) & (m_star < LATTICE_MAX))):
        raise ValueError("no mean-lock root on the lattice for this mu/W")
    s = np.array([prj1.variance_matched_scale(sg, nu) for sg in sigma])

    lo = np.full(mu.shape, prj1.BISECTION_BRACKET[0])
    hi = np.full(mu.shape, prj1.BISECTION_BRACKET[1])
    Z_lo, mean_lo = _frozen_mean(_kernel_mass(lo, s, nu))
    Z_hi, mean_hi = _frozen_mean(_kernel_mass(hi, s, nu))
    if np.any(Z_lo <= 0) or np.any(Z_hi <= 0):
        raise ValueError("kernel has no mass on the lattice")
    if np.any(mean_lo - m_star > 0) or np.any(mean_hi - m_star < 0):
        raise ValueError("mean-lock root not bracketed")

    r_hat = _root_estimates(mu, m_star, s, nu)

    # ---- phase 2: symbolic replay (no kernel evaluations). A game
    # leaves this phase when its next midpoint would come within
    # _REPLAY_GUARD of r_hat or its bracket is narrower than
    # _REPLAY_SWITCH; its bracket is then frozen for phase 3.
    symbolic = np.ones(mu.shape, dtype=bool)
    for _ in range(_MAX_ITER):
        if not symbolic.any():
            break
        idx = np.nonzero(symbolic)[0]
        mid = 0.5 * (lo[idx] + hi[idx])
        switch = (np.abs(mid - r_hat[idx]) <= _REPLAY_GUARD) | \
                 ((hi[idx] - lo[idx]) <= _REPLAY_SWITCH)
        stay = idx[~switch]
        m_stay = mid[~switch]
        neg = m_stay < r_hat[stay]
        lo[stay] = np.where(neg, m_stay, lo[stay])
        hi[stay] = np.where(neg, hi[stay], m_stay)
        symbolic[idx[switch]] = False

    # ---- phase 3: true-evaluation replay of prj1's loop tail. The
    # symbolic steps consumed the head of the same bisection sequence;
    # from any bracket this tail needs at most ~20 further steps (the
    # width stop alone bounds it), far under prj1's 200 cap, so the cap
    # and the final-midpoint return below mirror prj1's.
    out = np.zeros(mu.shape)
    active = np.ones(mu.shape, dtype=bool)
    for _ in range(_MAX_ITER):
        if not active.any():
            break
        idx = np.nonzero(active)[0]
        mid = 0.5 * (lo[idx] + hi[idx])
        Z_mid, mean = _frozen_mean(_kernel_mass(mid, s[idx], nu))
        if np.any(Z_mid <= 0):
            raise ValueError("kernel has no mass on the lattice")
        f = mean - m_star[idx]
        ret = (np.abs(f) < prj1.MEAN_TOL) | ((hi[idx] - lo[idx]) < 1e-13)
        out[idx[ret]] = mid[ret]
        neg = f < 0
        lo[idx] = np.where(neg, mid, lo[idx])
        hi[idx] = np.where(neg, hi[idx], mid)
        active[idx[ret]] = False
    if active.any():
        out[active] = 0.5 * (lo[active] + hi[active])
    return out


# ------------------------------------------------------------ pmf build

def _sigma_array(beta_T, total):
    """pit_round2.hetero_sd per game, called directly: np.exp differs
    from math.exp by 1 ulp on ~26% of inputs, and a 1-ulp sigma would
    break the bit-identical pmf construction this module contracts for.
    A scalar loop over games is ~1 us/game -- negligible next to the
    kernel evaluations."""
    return np.array([R2.hetero_sd(beta_T, t) for t in total],
                    dtype=np.float64)


def build_pmfs_with_sigma_fast(mu, sigma, nu, p3, p7):
    """Batched prj1._build_pmf_with_sigma. mu, sigma: (n,) arrays.
    Returns (n, 161) pmf array on prj1's lattice."""
    if p3 < 0 or p7 < 0:
        raise ValueError("atom parameters must be >= 0")
    atoms = prj1.atom_weights(p3, p7)
    W = sum(atoms.values())
    if W > prj1.W_MAX:
        raise ValueError("atom mass W exceeds the ruling 1.3 cap of 0.5")
    mu = np.asarray(mu, dtype=np.float64)
    sigma = np.asarray(sigma, dtype=np.float64)
    c = solve_centers_fast(mu, sigma, nu, p3, p7)
    s = np.array([prj1.variance_matched_scale(sg, nu) for sg in sigma])
    mass = _kernel_mass(c, s, nu)
    # Z with prj1's own summation (kernel_probs: Z = sum(raw)) replicated
    # bit-for-bit, so the normalised pmf is bit-identical to prj1's.
    Z = _neumaier_sum_rows(mass)
    if np.any(Z <= 0):
        raise ValueError("kernel has no mass on the lattice")
    pmf = (1.0 - W) * (mass / Z[:, None])
    for a, w in atoms.items():
        pmf[:, _ATOM_INDEX[int(a)]] += w
    return pmf


def build_pmfs_fast(mu, total, beta_T, p3, p7, nu):
    """Batched prj1.build_pmf. mu, total: (n,) arrays (total may hold
    None). Returns (n, 161) pmf array."""
    if not (prj1.BETA_T_BOUNDS[0] <= beta_T <= prj1.BETA_T_BOUNDS[1]):
        raise ValueError("beta_T outside F2's bounds")
    if nu not in prj1.NU_GRID:
        raise ValueError("nu outside the frozen grid G")
    sigma = _sigma_array(beta_T, np.asarray(total, dtype=object))
    return build_pmfs_with_sigma_fast(mu, sigma, nu, p3, p7)


def build_pmf_fast(mu, total_line, beta_T, p3, p7, nu):
    """Single-game drop-in for prj1.build_pmf: returns (ks, ps) lists."""
    pmf = build_pmfs_fast(np.array([mu], dtype=np.float64),
                          np.array([total_line], dtype=object),
                          beta_T, p3, p7, nu)
    return list(prj1.LATTICE), [float(x) for x in pmf[0]]


# ------------------------------------------------------------ CRPS

def crps_pmfs_fast(pmf, y):
    """Batched pit_round2.crps_discrete for pmfs on prj1's lattice
    (consecutive integers -80..80, unit segment widths). pmf: (n, 161);
    y: (n,) outcomes (any real). Returns (n,) CRPS values.

    This is a column-loop replica of the landed loop, not a re-derived
    formula: F accumulates ps[i] in lattice order and each segment's
    contribution is added to the running total in the same order with
    the same arithmetic expressions, so per-game values are
    bit-identical to crps_discrete's (the branch conditions and the
    y < ks[0] left-tail term included). The loop is over the 161
    lattice columns; games batch across rows."""
    pmf = np.asarray(pmf, dtype=np.float64)
    y = np.asarray(y, dtype=np.float64)
    F = np.zeros(pmf.shape[0])
    tot = np.zeros(pmf.shape[0])
    for j in range(N_LAT):
        F = F + pmf[:, j]
        a = _K[j]
        b = a + 1.0
        below = y <= a
        above = y >= b
        seg = np.where(below, (F - 1.0) * (F - 1.0),
                       np.where(above, F * F,
                                F * F * (y - a) + (F - 1.0) * (F - 1.0) * (b - y)))
        tot = tot + seg
    tot = tot + np.where(y < _K[0], _K[0] - y, 0.0)
    return tot


def crps_prj1_fast(mu, total_line, beta_T, p3, p7, nu, y):
    """Single-game drop-in for prj1.crps_prj1."""
    _, ps = build_pmf_fast(mu, total_line, beta_T, p3, p7, nu)
    return float(crps_pmfs_fast(np.array([ps]), np.array([y], dtype=np.float64))[0])


# ------------------------------------------------------------ row arrays

def rows_to_arrays(train_rows):
    mu = np.array([r["spread_line"] for r in train_rows], dtype=np.float64)
    total = np.array([r["total_line"] for r in train_rows], dtype=object)
    y = np.array([r["margin"] for r in train_rows], dtype=np.float64)
    return mu, total, y


# ------------------------------------------------------------ F2 init fit

def _e_abs_g_fast(c, sd, x):
    """pit_round2._e_abs_g vectorised: E|G - x| for G ~ N(c, sd).
    c, sd, x broadcastable arrays."""
    z = (x - c) / sd
    return sd * (z * (2.0 * _spspecial.ndtr(z) - 1.0)
                 + 2.0 * np.exp(-0.5 * z * z) / math.sqrt(2.0 * math.pi))


def f2_initial_fit_fast(train_rows):
    """Batched prj1.f2_initial_fit: identical grid, identical objective
    (mean pit_round2.crps_keynum), identical selection (first strict min
    in BETA_GRID x P_GRID x P_GRID nesting order)."""
    if not train_rows:
        return None
    mu, total, y = rows_to_arrays(train_rows)
    t = np.where(total == None, 44.0, total).astype(np.float64)  # noqa: E711
    betas = np.array(R2.BETA_GRID, dtype=np.float64)
    # sd per (beta, game): (21, n)
    sd = R2.SIGMA0 * np.exp(np.clip(betas[:, None] * (t[None, :] / 44.0),
                                    -0.45, 0.45))
    atom_pts = np.array([3.0, -3.0, 7.0, -7.0])
    best, best_c = None, None
    for bi, b in enumerate(R2.BETA_GRID):
        sd_b = sd[bi]                                   # (n,)
        for p3 in R2.P_GRID:
            for p7 in R2.P_GRID:
                w = 1.0 - p3 - p7
                c = mu / w                              # keynum_components
                qw = np.array([p3 / 2, p3 / 2, p7 / 2, p7 / 2])
                e1 = w * _e_abs_g_fast(c, sd_b, y)
                e1 = e1 + sum(qw[j] * np.abs(atom_pts[j] - y) for j in range(4))
                e2 = w * w * 2.0 * sd_b / R2.SQRTPI
                e2 = e2 + 2.0 * w * sum(
                    qw[j] * _e_abs_g_fast(c, sd_b, np.float64(atom_pts[j]))
                    for j in range(4))
                e2 = e2 + float(sum(
                    qw[i] * qw[j] * abs(atom_pts[i] - atom_pts[j])
                    for i in range(4) for j in range(4)))
                val = float(np.mean(e1 - 0.5 * e2))
                if best_c is None or val < best_c:
                    best, best_c = (b, p3, p7), val
    return best


# ------------------------------------------------------------ weekly fit

def _objective_fast(theta, nu, mu, total, y):
    """prj1._objective with identical penalty/branch semantics, batched."""
    beta_T, p3, p7 = theta
    W = p3 + p7
    if W > prj1.W_MAX:
        return 1e6 + 1e6 * (W - prj1.W_MAX)
    try:
        pmf = build_pmfs_fast(mu, total, beta_T, p3, p7, nu)
        vals = crps_pmfs_fast(pmf, y)
    except (ValueError, OverflowError):
        return 1e9
    # prj1._objective accumulates tot += crps(row) in row order and
    # divides by len -- replicated exactly (not np.mean), so the value
    # the optimizer sees is bit-identical to the frozen objective's.
    tot = 0.0
    for v in vals:
        tot += float(v)
    return tot / len(vals)


def fit_week_fast(train_rows):
    """Batched prj1.fit_week: identical init (F2 grid fit), identical
    L-BFGS-B configuration per nu, identical acceptance rule, identical
    selection via prj1._select_fit. Reads prj1.NU_GRID at call time, so
    the frozen suite's grid monkeypatching behaves the same way."""
    if not train_rows:
        return None
    init = f2_initial_fit_fast(train_rows)
    if init is None:
        return None
    try:
        from scipy.optimize import minimize
    except ImportError:
        return None
    mu, total, y = rows_to_arrays(train_rows)
    results = []
    for nu in prj1.NU_GRID:
        try:
            res = minimize(_objective_fast, list(init),
                           args=(nu, mu, total, y),
                           method="L-BFGS-B",
                           bounds=[prj1.BETA_T_BOUNDS, prj1.P_BOUNDS,
                                   prj1.P_BOUNDS],
                           options={"ftol": prj1.FTOL, "maxiter": 1000})
        except Exception:
            continue
        if res is not None and math.isfinite(res.fun) and res.fun < 1e6:
            results.append((nu, float(res.fun),
                            tuple(float(x) for x in res.x)))
    return prj1._select_fit(results)


def fit_with_fallback_fast(train_rows, prev_params, integrity_log):
    """Batched prj1.fit_with_fallback (identical INTEGRITY entry text)."""
    params = fit_week_fast(train_rows)
    if params is not None:
        params = dict(params, n_train=len(train_rows))
        return params, False
    integrity_log.append({
        "type": "INTEGRITY",
        "event": "PRJ1_FIT_FAILURE",
        "detail": "every nu in G failed to converge on the weekly joint "
                  "CRPS fit; fell back to week w-1 parameters" if prev_params
                  else "every nu in G failed to converge and no prior-week "
                       "parameters exist; no prediction issued",
        "n_train": len(train_rows),
    })
    if prev_params is not None:
        return dict(prev_params), True
    return None, True


def predict_pmfs_fast(games, params):
    """Batched prj1.predict_game: games are dicts with mu/spread_line and
    total_line. Returns (n, 161) pmf array."""
    mu = np.array([g["mu"] if "mu" in g else g["spread_line"] for g in games],
                  dtype=np.float64)
    total = np.array([g.get("total_line") for g in games], dtype=object)
    return build_pmfs_fast(mu, total, params["beta_T"], params["p3"],
                           params["p7"], params["nu"])


def predict_game_fast(game, params):
    """Single-game drop-in for prj1.predict_game: returns (ks, ps)."""
    pmf = predict_pmfs_fast([game], params)
    return list(prj1.LATTICE), [float(x) for x in pmf[0]]
