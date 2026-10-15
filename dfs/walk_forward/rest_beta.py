#!/usr/bin/env python3
"""rest_beta.py -- rest-deficit scale modulator and cell-conditional key excess.
DIAGNOSTIC ONLY.

sigma = clip(13.45 * exp(beta * f), 8, 20),  f = |home_rest - away_rest| / 7
beta is fit on STRICTLY PRIOR weeks by minimizing mean energy-form CRPS.
|beta| <= 0.15 (pre-registered bound).

Excess mass at residual +-3, +-7 is estimated from prior residuals,
cell-conditional, with the numbered fail-closed fallback. No imputation.

Order of operations is FROZEN: (1) beta -> sigma, (2) excess under that sigma,
(3) overlay, (4) energy CRPS.
"""
import math

SIGMA_BASE = 13.45
SIGMA_LO, SIGMA_HI = 8.0, 20.0
BETA_BOUND = 0.15
MIN_HISTORY = 30
CELL_MIN = 30
BETA_GRID = [i / 1000.0 for i in range(-300, 301, 5)]  # -0.30 .. 0.30 step 0.005

REST_EDGES = [1.0, 7.0]
SPREAD_EDGES = [3.5, 7.5]
TOTAL_EDGES = [41.0, 45.0, 48.0]


def rest_feature(home_rest, away_rest):
    """f = |home_rest - away_rest| / 7. None if either field is absent -> fail closed."""
    if home_rest is None or away_rest is None:
        return None
    return abs(home_rest - away_rest) / 7.0


def modulated_sigma(sigma_base, beta, f):
    if f is None:
        return sigma_base
    return min(max(sigma_base * math.exp(beta * f), SIGMA_LO), SIGMA_HI)


def fit_rest_beta(history):
    """history: list of dicts with spread, margin, home_rest, away_rest.
    Every entry is STRICTLY PRIOR to any scored game. Returns None when the
    history is thinner than MIN_HISTORY or carries no usable rest field.
    """
    rows = [g for g in history
            if rest_feature(g.get("home_rest"), g.get("away_rest")) is not None]
    if len(rows) < MIN_HISTORY:
        return None
    import hybrid_crps as hc
    best_beta, best = None, None
    for beta in BETA_GRID:
        tot = 0.0
        for g in rows:
            sd = modulated_sigma(SIGMA_BASE, beta,
                                 rest_feature(g["home_rest"], g["away_rest"]))
            tot += hc.crps_energy(g["spread"], sd, 0.0, 0.0, g["margin"])
        m = tot / len(rows)
        if best is None or m < best:
            best, best_beta = m, beta
    return min(max(best_beta, -BETA_BOUND), BETA_BOUND)


def _bin(v, edges):
    for i, e in enumerate(edges):
        if v < e:
            return i
    return len(edges)


def _game_bins(g):
    """Cell coordinates for one history entry.

    Returns (None, None, None) when a required binning field is absent. A game
    that cannot be placed in any cell contributes ONLY to the level-3 global
    fallback -- it is never silently imputed into a cell.
    """
    spread = g.get("spread")
    total = g.get("total_line")
    if spread is None or total is None:
        return (None, None, None)
    f = rest_feature(g.get("home_rest"), g.get("away_rest"))
    rest_bin = None if f is None else _bin(f * 7.0, REST_EDGES)
    return (rest_bin, _bin(abs(spread), SPREAD_EDGES), _bin(total, TOTAL_EDGES))


def _resid_of(g):
    if "resid" in g:
        return g["resid"]
    return g["margin"] - g["spread"]


def excess_mass(history, rest_bin, spread_bin, total_bin, force_sigma=None):
    """Cell-conditional key excess with the numbered fail-closed fallback.

    Returns (fallback_level, p3, p7). fallback_level:
      0 = (rest x |spread| x total) cell
      1 = (rest x |spread|)
      2 = rest bin only
      3 = global prior residual
      4 = too thin even globally -> pure Gaussian (p3 = p7 = 0)

    `history` entries carry either `resid` (already Y - mu) or `spread` + `margin`.
    `force_sigma` is reserved for diagnostics and MUST NOT change the estimate; it
    exists only so a future caller can record which scale the excess was read at.
    """
    scored = [g for g in history if "resid" in g or "margin" in g]

    def counts(rows):
        if len(rows) < CELL_MIN:
            return None
        n = len(rows)
        p3 = sum(1 for g in rows if abs(round(_resid_of(g))) == 3) / n
        p7 = sum(1 for g in rows if abs(round(_resid_of(g))) == 7) / n
        return p3, p7

    bins = [(g, _game_bins(g)) for g in scored]

    # Level 0: rest x |spread| x total
    cell = [g for g, b in bins
            if b[0] == rest_bin and b[1] == spread_bin and b[2] == total_bin]
    r = counts(cell)
    if r is not None:
        return 0, r[0], r[1]
    # Level 1: rest x |spread|
    cell = [g for g, b in bins if b[0] == rest_bin and b[1] == spread_bin]
    r = counts(cell)
    if r is not None:
        return 1, r[0], r[1]
    # Level 2: rest bin only
    cell = [g for g, b in bins if b[0] == rest_bin]
    r = counts(cell)
    if r is not None:
        return 2, r[0], r[1]
    # Level 3: global prior residual
    r = counts(scored)
    if r is not None:
        return 3, r[0], r[1]
    # Level 4: too thin even globally -> pure Gaussian
    return 4, 0.0, 0.0
