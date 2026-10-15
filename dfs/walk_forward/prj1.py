#!/usr/bin/env python3
"""prj1.py -- PRJ-1: pre-registered candidate #1 (RULING-C1, 2026-10-15).

SPEC: RULING-C1 section 1 (freeze-ready pre-registration text). One composed
distribution, one specification per role:

  support     integer lattice L = {-80, ..., 80}                      (from F1)
  scale       F2's landed heteroscedastic sigma mechanism:
              sigma_g = 13.45 * exp(clip(beta_T * (total/44), -0.45, 0.45))
              via pit_round2.hetero_sd -- imported, not re-derived
  kernel      Student-t, variance-matched: s_g = sigma_g*sqrt((nu-2)/nu),
              nu = infinity -> Gaussian (s_g = sigma_g, T_inf = Phi)
  excess mass F2's landed key-number atoms on ABSOLUTE margins
              {-7, -3, +3, +7} with weights p7/2, p3/2, p3/2, p7/2
              via pit_round2.keynum_components -- imported, not re-derived

  P_g(k) = (1 - W_g) * B_g(k) + sum_a w_{a,g} * 1{k = a}
  B_g(k) = [T_nu((k+1/2-c_g)/s_g) - T_nu((k-1/2-c_g)/s_g)] / Z_g

MEAN LOCK (exact): c_g is the unique root of sum_k k*P_g(k) = mu_g, solved by
bisection. Atoms do not depend on c_g, so the root is taken on the kernel mean
m* = (mu_g - sum_a a*w_a) / (1 - W_g); total mean is then mu_g identically.

FITTING (section 1.4): all parameters fit JOINTLY by minimizing the mean, over
the point-in-time training set, of the evaluator's exact discrete CRPS
(pit_round2.crps_discrete -- the exact integer-support CRPS, P4) applied to the
PRJ-1 pmf. For each nu in the fixed grid G, L-BFGS-B over (beta_T, p3, p7);
init is F2's own landed fit on the same training set; selected nu is the
argmin, ties to the larger nu. If every nu fails to converge: fall back to
week w-1's parameters and write an INTEGRITY entry. The weekly fitting
procedure (including discrete nu selection) is PART OF the candidate and must
be covered by the gate's multiplicity correction at scoring time
(Grok WO-7 change 1; recorded in PRJ1-FREEZE.json).

This module performs NO file I/O, reads NO outcomes file, and scores NOTHING
in this build. It consumes stamped game inputs (mu, total_line at emission
time) and training rows supplied by the caller, and produces per-game pmfs.
Tests run on synthetic inputs only. Emission: ZERO_OBJECT.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pit_round2 as R2  # noqa: E402  (landed, tested implementations)

# Vectorised CDF evaluation for the kernel only. The ruling specifies the
# distribution, not a CDF routine; scipy.special.stdtr is the standard t CDF
# and agrees with pit_round2's tested scalar implementation to ~1e-12. If
# scipy/numpy are unavailable we fall back to the landed scalar functions.
# (scipy is already a hard dependency of the candidate: section 1.4 names
# L-BFGS-B as the optimizer.)
try:
    import numpy as _np
    from scipy import special as _spspecial
    _HAVE_VECTOR_CDF = True
except ImportError:  # pragma: no cover
    _np = None
    _spspecial = None
    _HAVE_VECTOR_CDF = False

# ------------------------------------------------------------------ config
# Frozen constants (mirrored in prj1_config.json; a test asserts equality).
SIGMA0 = R2.SIGMA0                      # 13.45, inherited from F2
LATTICE_MIN, LATTICE_MAX = -80, 80
LATTICE = tuple(range(LATTICE_MIN, LATTICE_MAX + 1))
NU_GRID = (3, 4, 5, 6, 8, 10, 12, 15, 20, 30, 50, math.inf)
BETA_T_BOUNDS = (-0.20, 0.20)           # F2's own bounds (BETA_GRID range)
P_BOUNDS = (0.0, 0.5)                   # per-parameter box; joint W cap below
W_MAX = 0.5                             # ruling 1.3: W_g <= 0.5
FTOL = 1e-12                            # pinned in config; see prj1_config.json
MEAN_TOL = 1e-12
BISECTION_BRACKET = (-300.0, 300.0)
BISECTION_MAX_ITER = 200
EMISSION = "ZERO_OBJECT"

CONFIG = {
    "candidate": "PRJ-1",
    "spec_source": "RULING-C1 (2026-10-15), section 1",
    "sigma0": SIGMA0,
    "lattice": {"min": LATTICE_MIN, "max": LATTICE_MAX},
    "nu_grid": [3, 4, 5, 6, 8, 10, 12, 15, 20, 30, 50, "inf"],
    "beta_T_bounds": list(BETA_T_BOUNDS),
    "p_bounds": list(P_BOUNDS),
    "w_max": W_MAX,
    "atom_set": [-7, -3, 3, 7],
    "atom_weight_structure": "w(+/-3) = p3/2 each; w(+/-7) = p7/2 each "
                             "(F2 landed: pit_round2.keynum_components)",
    "mean_lock": {"method": "bisection on kernel centre c_g; root of "
                              "sum_k k*P(k) = mu_g",
                  "bracket": list(BISECTION_BRACKET),
                  "max_iter": BISECTION_MAX_ITER, "mean_tol": MEAN_TOL},
    "fit": {
        "objective": "mean over the point-in-time training set of the exact "
                     "discrete CRPS (pit_round2.crps_discrete) of the PRJ-1 pmf",
        "optimizer": "L-BFGS-B (scipy.optimize.minimize), per-nu, over "
                     "(beta_T, p3, p7)",
        "ftol": FTOL,
        "ftol_note": "RULING-C1 section 1.4 states an ftol of the form "
                     "1e-<exp>; the fleet capture of the ruling truncates the "
                     "exponent. 1e-12 is pinned here and hashed; confirm "
                     "against the untruncated ruling at FREEZE-1 (changing "
                     "it re-hashes this config).",
        "init": "F2's own landed fit on the same training set (grid argmin "
                "of pit_round2.crps_keynum over BETA_GRID x P_GRID x P_GRID), "
                "run as-is",
        "nu_selection": "argmin of the per-nu minimized objective; ties go "
                        "to the larger nu",
        "failure_fallback": "if every nu fails to converge: use week w-1's "
                            "parameters and write an INTEGRITY entry",
        "refit_cadence": "weekly, at t_w = earliest emission time among "
                         "week w's games",
        "training_set": "every regular-season game with a final-result "
                        "timestamp strictly before t_w; frozen-filter games "
                        "appear as training labels only (SPEC-A 4.3)",
        "fitting_procedure_in_candidate": True,
        "multiplicity_covers_fitting": "REQUIRED-AT-SPEC-A-FREEZE",
    },
    "theta_A_bounds_note": "RULING-C1 section 1.3 imports F2's bounds for "
                           "theta_sigma explicitly and states theta_A's "
                           "constraints separately (w >= 0, W <= 0.5). F2's "
                           "P_GRID cap of 0.08 is therefore NOT imported as "
                           "a fit bound; p3, p7 carry box bounds [0, 0.5] "
                           "with the joint W <= 0.5 constraint enforced in "
                           "the objective. Documented reading, flagged in "
                           "the freeze deliverable.",
    "shadows": {
        "S-G": {"weight": 0,
                "definition": "PRJ-1 with nu fixed at infinity (lattice "
                              "Gaussian, hetero sigma + atoms)"},
        "S-F2": {"weight": 0,
                 "definition": "F2's own landed code "
                               "(pit_round2.keynum_components / crps_keynum), "
                               "refit point-in-time"},
        "S-ALL4": {"weight": 0,
                   "definition": "PRJ-1 with sigma_g multiplied by F4's "
                                 "per-game scale factor, normalized to mean "
                                 "1 on training games; factor supplied by "
                                 "caller from F4's landed procedure"},
        "S-F1": {"weight": 0,
                 "definition": "F1 alone: lattice homoscedastic Gaussian "
                               "(pit_round2.int_support_probs at sigma0)"},
    },
    "emission": EMISSION,
}


# ------------------------------------------------------------------ pieces

def atom_weights(p3, p7):
    """F2's landed atom set/weights: {+3: p3/2, -3: p3/2, +7: p7/2, -7: p7/2}
    on ABSOLUTE margins. Sourced from pit_round2.keynum_components so the
    frozen candidate cannot drift from the landed structure."""
    _, _, atoms = R2.keynum_components(0.0, 1.0, p3, p7)
    out = {}
    for a, q in atoms:
        out[int(a)] = out.get(int(a), 0.0) + q
    return out


def t_cdf(u, nu):
    """Student-t CDF T_nu; nu = infinity is the standard normal CDF."""
    if nu == math.inf:
        return R2._Phi(u)
    return R2._student_t_cdf(u, nu)


def variance_matched_scale(sigma, nu):
    """s = sigma * sqrt((nu-2)/nu) for finite nu; s = sigma for nu = inf,
    so that Var of the continuous kernel equals sigma^2."""
    if nu == math.inf:
        return sigma
    if nu <= 2.0:
        raise ValueError("variance matching requires nu > 2")
    return sigma * math.sqrt((nu - 2.0) / nu)


def sigma_g(beta_T, total_line):
    """F2's landed heteroscedastic sigma mechanism (imported). Note the
    landed fallback: total_line None -> 44.0 inside pit_round2.hetero_sd."""
    return R2.hetero_sd(beta_T, total_line)


def _bin_masses(c, s, nu):
    """Unit-bin masses T_nu((k+1/2-c)/s) - T_nu((k-1/2-c)/s) over the lattice,
    computed tail-stably: where both standardised edges are positive the mass
    is a difference of SURVIVAL values (accurate in float64 far into the
    tail), where both are negative a difference of CDF values, else a direct
    difference. Identical mathematics to the plain CDF difference; the plain
    form collapses to exactly 0 when the centre is many scales off-lattice
    because the CDF saturates to 1.0."""
    if _HAVE_VECTOR_CDF:
        lat = _np.asarray(LATTICE, dtype=float)
        hi = (lat + 0.5 - c) / s
        lo = (lat - 0.5 - c) / s
        if nu == math.inf:
            cdf, sf = _spspecial.ndtr, lambda u: _spspecial.ndtr(-u)
        else:
            cdf = lambda u: _spspecial.stdtr(nu, u)
            sf = lambda u: _spspecial.stdtr(nu, -u)
        mass = _np.where(hi <= 0.0, cdf(hi) - cdf(lo),
                         _np.where(lo >= 0.0, sf(lo) - sf(hi),
                                   cdf(hi) - cdf(lo)))
        return [float(m) for m in mass]
    out = []
    for k in LATTICE:
        u_hi, u_lo = (k + 0.5 - c) / s, (k - 0.5 - c) / s
        if u_hi <= 0.0:
            out.append(t_cdf(u_hi, nu) - t_cdf(u_lo, nu))
        elif u_lo >= 0.0:
            out.append(t_cdf(-u_lo, nu) - t_cdf(-u_hi, nu))
        else:
            out.append(t_cdf(u_hi, nu) - t_cdf(u_lo, nu))
    return out


def kernel_probs(c, s, nu):
    """B(k) over the lattice: t-CDF unit-bin masses centred at c with scale
    s, renormalised by Z over the lattice (ruling 1.2)."""
    if s <= 0:
        raise ValueError("kernel scale must be positive")
    raw = _bin_masses(c, s, nu)
    Z = sum(raw)
    if Z <= 0:
        raise ValueError("kernel has no mass on the lattice")
    return [r / Z for r in raw]


def _pmf_mean(ps):
    return sum(k * p for k, p in zip(LATTICE, ps))


def solve_center(mu, sigma, nu, p3, p7):
    """c_g: the unique root of sum_k k*P_g(k) = mu_g. The atoms are constant
    in c, so solve the kernel mean m* = (mu - sum_a a*w_a) / (1 - W) by
    bisection; kernel mean is strictly increasing in c."""
    atoms = atom_weights(p3, p7)
    W = sum(atoms.values())
    if W >= 1.0:
        raise ValueError("atom mass W must be < 1 for the mean lock")
    atom_mean = sum(a * w for a, w in atoms.items())
    m_star = (mu - atom_mean) / (1.0 - W)
    if not (LATTICE_MIN < m_star < LATTICE_MAX):
        raise ValueError("no mean-lock root on the lattice for this mu/W")
    s = variance_matched_scale(sigma, nu)
    lo, hi = BISECTION_BRACKET
    f_lo = _pmf_mean(kernel_probs(lo, s, nu)) - m_star
    f_hi = _pmf_mean(kernel_probs(hi, s, nu)) - m_star
    if f_lo > 0 or f_hi < 0:
        raise ValueError("mean-lock root not bracketed")
    for _ in range(BISECTION_MAX_ITER):
        mid = 0.5 * (lo + hi)
        f_mid = _pmf_mean(kernel_probs(mid, s, nu)) - m_star
        if abs(f_mid) < MEAN_TOL or (hi - lo) < 1e-13:
            return mid
        if f_mid < 0:
            lo = mid
        else:
            hi = mid
    return 0.5 * (lo + hi)


def _build_pmf_with_sigma(mu, sigma, nu, p3, p7):
    if p3 < 0 or p7 < 0:
        raise ValueError("atom parameters must be >= 0")
    atoms = atom_weights(p3, p7)
    W = sum(atoms.values())
    if W > W_MAX:
        raise ValueError("atom mass W exceeds the ruling 1.3 cap of 0.5")
    c = solve_center(mu, sigma, nu, p3, p7)
    s = variance_matched_scale(sigma, nu)
    B = kernel_probs(c, s, nu)
    ps = [(1.0 - W) * b for b in B]
    for a, w in atoms.items():
        ps[a - LATTICE_MIN] += w
    return list(LATTICE), ps


def build_pmf(mu, total_line, beta_T, p3, p7, nu):
    """PRJ-1 pmf for one game from stamped inputs (mu, total_line at
    emission time) and parameters (beta_T, p3, p7, nu). Returns (ks, ps)
    on the lattice {-80..80}; sum(ps) == 1 and sum(k*ps) == mu exactly
    (to bisection tolerance)."""
    if not (BETA_T_BOUNDS[0] <= beta_T <= BETA_T_BOUNDS[1]):
        raise ValueError("beta_T outside F2's bounds")
    if nu not in NU_GRID:
        raise ValueError("nu outside the frozen grid G")
    sigma = sigma_g(beta_T, total_line)
    return _build_pmf_with_sigma(mu, sigma, nu, p3, p7)


def crps_pmf(ks, ps, y):
    """The evaluator's exact discrete CRPS of an integer-support pmf
    (pit_round2.crps_discrete; prerequisite P4)."""
    return R2.crps_discrete(ks, ps, y)


def crps_prj1(mu, total_line, beta_T, p3, p7, nu, y):
    ks, ps = build_pmf(mu, total_line, beta_T, p3, p7, nu)
    return crps_pmf(ks, ps, y)


# ------------------------------------------------------------------ fitting

def f2_initial_fit(train_rows):
    """F2's own landed fit on the given training rows, run as-is: the grid
    point (beta_T, p3, p7) in BETA_GRID x P_GRID x P_GRID minimising mean
    pit_round2.crps_keynum over the rows. Deterministic (first-min wins)."""
    if not train_rows:
        return None
    best, best_c = None, None
    for b in R2.BETA_GRID:
        for p3 in R2.P_GRID:
            for p7 in R2.P_GRID:
                tot = 0.0
                for r in train_rows:
                    tot += R2.crps_keynum(r["spread_line"],
                                          R2.hetero_sd(b, r["total_line"]),
                                          p3, p7, r["margin"])
                c = tot / len(train_rows)
                if best_c is None or c < best_c:
                    best, best_c = (b, p3, p7), c
    return best


def _objective(theta, nu, train_rows):
    beta_T, p3, p7 = theta
    W = p3 + p7
    if W > W_MAX:
        return 1e6 + 1e6 * (W - W_MAX)
    try:
        tot = 0.0
        for r in train_rows:
            tot += crps_prj1(r["spread_line"], r["total_line"],
                             beta_T, p3, p7, nu, r["margin"])
    except (ValueError, OverflowError):
        return 1e9
    return tot / len(train_rows)


def _select_fit(results):
    """results: list of (nu, objective, theta). Argmin objective; ties go to
    the larger nu (inf is largest). None if empty."""
    if not results:
        return None
    best_obj = min(r[1] for r in results)
    tied = [r for r in results if r[1] == best_obj]
    tied.sort(key=lambda r: r[0])
    nu, obj, theta = tied[-1]
    return {"nu": nu, "beta_T": theta[0], "p3": theta[1], "p7": theta[2],
            "objective": obj}


def fit_week(train_rows):
    """The weekly joint fit (ruling 1.4) on a caller-supplied point-in-time
    training set. Returns the selected parameter dict, or None if every nu
    fails to converge (caller applies the fallback)."""
    if not train_rows:
        return None
    init = f2_initial_fit(train_rows)
    if init is None:
        return None
    try:
        from scipy.optimize import minimize
    except ImportError:
        return None
    results = []
    for nu in NU_GRID:
        try:
            res = minimize(_objective, list(init), args=(nu, train_rows),
                           method="L-BFGS-B",
                           bounds=[BETA_T_BOUNDS, P_BOUNDS, P_BOUNDS],
                           options={"ftol": FTOL, "maxiter": 1000})
        except Exception:
            continue
        if res is not None and math.isfinite(res.fun) and res.fun < 1e6:
            results.append((nu, float(res.fun),
                            tuple(float(x) for x in res.x)))
    return _select_fit(results)


def fit_with_fallback(train_rows, prev_params, integrity_log):
    """Ruling 1.4 failure fallback: if the weekly fit fails entirely, use
    week w-1's parameters and write an INTEGRITY entry (appended to the
    caller-supplied list). Returns (params_or_None, used_fallback)."""
    params = fit_week(train_rows)
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


def predict_game(game, params):
    """pmf for one stamped game input {"mu"/"spread_line", "total_line"}
    under fitted params. No outcomes are read or scored."""
    mu = game["mu"] if "mu" in game else game["spread_line"]
    return build_pmf(mu, game.get("total_line"), params["beta_T"],
                     params["p3"], params["p7"], params["nu"])


# ------------------------------------------------------------------ shadows
# Definitions only (weight 0). Nothing here is scored in this build.

def shadow_sg_pmf(game, params):
    """S-G: PRJ-1 with nu fixed at infinity."""
    mu = game["mu"] if "mu" in game else game["spread_line"]
    return build_pmf(mu, game.get("total_line"), params["beta_T"],
                     params["p3"], params["p7"], math.inf)


def shadow_sf2_components(game, params):
    """S-F2: F2's own landed construction (continuous kernel + atoms),
    refit point-in-time. Returns the landed keynum_components triple
    (continuous_mass w, centre c, atoms); its scorer is
    pit_round2.crps_keynum. Definition hook only."""
    mu = game["mu"] if "mu" in game else game["spread_line"]
    sd = sigma_g(params["beta_T"], game.get("total_line"))
    return R2.keynum_components(mu, sd, params["p3"], params["p7"])


def shadow_sall4_pmf(game, params, f4_factor):
    """S-ALL4: PRJ-1 with sigma_g multiplied by F4's per-game scale factor
    (normalised to mean 1 on the training games; the factor is computed by
    the caller from F4's landed empirical-quantile procedure)."""
    mu = game["mu"] if "mu" in game else game["spread_line"]
    sigma = sigma_g(params["beta_T"], game.get("total_line")) * f4_factor
    return _build_pmf_with_sigma(mu, sigma, params["nu"],
                                 params["p3"], params["p7"])


def shadow_sf1_pmf(game):
    """S-F1: F1 alone -- lattice homoscedastic Gaussian, F1's landed
    construction (pit_round2.int_support_probs at sigma0)."""
    mu = game["mu"] if "mu" in game else game["spread_line"]
    return R2.int_support_probs(mu, SIGMA0)


SHADOWS = {
    "S-G": {"weight": 0, "constructor": "shadow_sg_pmf"},
    "S-F2": {"weight": 0, "constructor": "shadow_sf2_components"},
    "S-ALL4": {"weight": 0, "constructor": "shadow_sall4_pmf"},
    "S-F1": {"weight": 0, "constructor": "shadow_sf1_pmf"},
}
