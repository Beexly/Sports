"""wf_models.py -- extra predictive families for the walk-forward margin harness.
DIAGNOSTIC ONLY.  mu = close on every component (no mean shift is fitted).
All parameters are MLE on residuals r = Y - close of STRICTLY EARLIER (season, week) games,
refitted every week.  CRPS is computed numerically: integral of (F(y) - 1{y >= x})^2 on a
grid whose cell boundary sits exactly at the observation x (midpoint rule, step H).
"""
import math
import numpy as np

H = 0.02          # integration step (points of margin)
HALF = 250.0      # integrate over x +- HALF
KEYS = (3, -3, 7, -7)
NU_GRID = (2.0, 2.5, 3.0, 4.0, 5.0, 6.0, 8.0, 10.0, 12.0, 15.0, 20.0, 30.0, 50.0, 100.0, 300.0)
SQRT2 = math.sqrt(2.0)
_erf = np.vectorize(math.erf, otypes=[float])


# ---------------- CDFs on residual z = y - mu ----------------
def cdf_laplace(z, b):
    z = np.asarray(z, float)
    return np.where(z < 0, 0.5 * np.exp(np.minimum(z, 0) / b), 1 - 0.5 * np.exp(-np.maximum(z, 0) / b))


_NGRID = np.linspace(-12, 12, 48001)
_NTAB = 0.5 * (1 + _erf(_NGRID / SQRT2))


def cdf_normal(z, s):
    return np.interp(np.asarray(z, float) / s, _NGRID, _NTAB, left=0.0, right=1.0)


def cdf_lap_mix(z, p):
    return p["pi"] * cdf_laplace(z, p["b1"]) + (1 - p["pi"]) * cdf_laplace(z, p["b2"])


def cdf_norm_mix(z, p):
    return p["pi"] * cdf_normal(z, p["s1"]) + (1 - p["pi"]) * cdf_normal(z, p["s2"])


# Student-t CDF via regularized incomplete beta (Lentz continued fraction), tabulated per nu.
def _betacf(a, b, x):
    tiny = 1e-300
    c, d = 1.0, 1.0 - (a + b) * x / (a + 1)
    d = 1 / (d if abs(d) > tiny else tiny); f = d
    for m in range(1, 400):
        m2 = 2 * m
        aa = m * (b - m) * x / ((a + m2 - 1) * (a + m2))
        d = 1 + aa * d; d = 1 / (d if abs(d) > tiny else tiny)
        c = 1 + aa / c if abs(1 + aa / c) > tiny else tiny
        f *= d * c
        aa = -(a + m) * (a + b + m) * x / ((a + m2) * (a + m2 + 1))
        d = 1 + aa * d; d = 1 / (d if abs(d) > tiny else tiny)
        c = 1 + aa / c if abs(1 + aa / c) > tiny else tiny
        dl = d * c; f *= dl
        if abs(dl - 1) < 1e-14:
            break
    return f


def _ibeta(a, b, x):
    if x <= 0: return 0.0
    if x >= 1: return 1.0
    lb = math.lgamma(a + b) - math.lgamma(a) - math.lgamma(b) + a * math.log(x) + b * math.log1p(-x)
    if x < (a + 1) / (a + b + 2):
        return math.exp(lb) * _betacf(a, b, x) / a
    return 1 - math.exp(lb) * _betacf(b, a, 1 - x) / b


def t_cdf_std(t, nu):
    x = nu / (nu + t * t)
    tail = 0.5 * _ibeta(nu / 2, 0.5, x)
    return tail if t < 0 else 1 - tail


_TT = {}
_TGRID = np.concatenate([-np.logspace(4, -4, 1200), [0.0], np.logspace(-4, 4, 1200)])


def cdf_t(z, p):
    nu, s = p["nu"], p["scale"]
    if nu not in _TT:
        _TT[nu] = np.array([t_cdf_std(float(t), nu) for t in _TGRID])
    return np.interp(np.asarray(z, float) / s, _TGRID, _TT[nu], left=0.0, right=1.0)


# ---------------- MLE fits (center fixed at 0 = close) ----------------
def fit_normal(r):
    return {"sigma": float(np.sqrt(np.mean(r * r)))}


def fit_lap_mix(r, iters=300):
    a = np.abs(r); b = a.mean(); pi, b1, b2 = 0.5, 0.6 * b, 1.5 * b
    for _ in range(iters):
        l1 = pi * np.exp(-a / b1) / (2 * b1); l2 = (1 - pi) * np.exp(-a / b2) / (2 * b2)
        g = l1 / (l1 + l2)
        pi = float(np.clip(g.mean(), 1e-4, 1 - 1e-4))
        b1 = float(max((g * a).sum() / g.sum(), 1e-3)); b2 = float(max(((1 - g) * a).sum() / (1 - g).sum(), 1e-3))
    if b1 > b2: pi, b1, b2 = 1 - pi, b2, b1
    ll = float(np.log(pi * np.exp(-a / b1) / (2 * b1) + (1 - pi) * np.exp(-a / b2) / (2 * b2)).sum())
    return {"pi": pi, "b1": b1, "b2": b2, "loglik": ll}


def fit_norm_mix(r, iters=300):
    q = r * r; s = math.sqrt(q.mean()); pi, v1, v2 = 0.5, (0.6 * s) ** 2, (1.4 * s) ** 2
    for _ in range(iters):
        l1 = pi * np.exp(-q / (2 * v1)) / np.sqrt(v1); l2 = (1 - pi) * np.exp(-q / (2 * v2)) / np.sqrt(v2)
        g = l1 / (l1 + l2)
        pi = float(np.clip(g.mean(), 1e-4, 1 - 1e-4))
        v1 = float(max((g * q).sum() / g.sum(), 1e-4)); v2 = float(max(((1 - g) * q).sum() / (1 - g).sum(), 1e-4))
    s1, s2 = math.sqrt(v1), math.sqrt(v2)
    if s1 > s2: pi, s1, s2 = 1 - pi, s2, s1
    ll = float(np.log((pi * np.exp(-q / (2 * s1 * s1)) / s1 + (1 - pi) * np.exp(-q / (2 * s2 * s2)) / s2) / math.sqrt(2 * math.pi)).sum())
    return {"pi": pi, "s1": s1, "s2": s2, "loglik": ll}


def _t_loglik(q, nu, s):
    n = len(q)
    return (n * (math.lgamma((nu + 1) / 2) - math.lgamma(nu / 2) - 0.5 * math.log(nu * math.pi) - math.log(s))
            - (nu + 1) / 2 * float(np.log1p(q / (nu * s * s)).sum()))


def fit_t(r, iters=200):
    q = r * r; best = None
    for nu in NU_GRID:
        v = q.mean()
        for _ in range(iters):
            w = (nu + 1) / (nu + q / v); v = float((w * q).mean())
        s = math.sqrt(v); ll = _t_loglik(q, nu, s)
        if best is None or ll > best["loglik"]:
            best = {"nu": nu, "scale": s, "loglik": ll}
    return best


# ---------------- key-number hybrid ----------------
def key_probs(Y_hist):
    """Symmetric key masses: p3 = freq(|Y|==3), p7 = freq(|Y|==7) over earlier games,
    split equally between +k and -k."""
    Y = np.abs(np.asarray(Y_hist, float)); n = len(Y)
    p3 = float((Y == 3).sum() / n); p7 = float((Y == 7).sum() / n)
    return {3: p3 / 2, -3: p3 / 2, 7: p7 / 2, -7: p7 / 2}


def hybrid_cdf(y, mu, cont_cdf, pk):
    """F(y) = (1 - sum p_k) * F_cont(y - mu) + sum_k p_k 1{y >= k}.  Continuous part keeps
    center mu = close; it puts zero mass on the key points (measure zero), so it is the
    'non-key' part.  Masses sit at fixed home margins, not relative to mu."""
    y = np.asarray(y, float); P = sum(pk.values())
    F = (1 - P) * cont_cdf(y - mu)
    for k, p in pk.items():
        F = F + p * (y >= k)
    return F


# ---------------- numeric CRPS ----------------
_OFF = (np.arange(int(HALF / H)) + 0.5) * H   # midpoints right of x; mirrored left


def crps_numeric(Fy, x):
    """Fy: function of absolute y -> CDF.  Cell boundary at x."""
    left = Fy(x - _OFF); right = Fy(x + _OFF)
    return float(H * ((left ** 2).sum() + ((1 - right) ** 2).sum()))


# ---------------- walk-forward over the extra families ----------------
CONT = {
    "gaussian_fitted_sigma": (fit_normal, lambda p: (lambda z: cdf_normal(z, p["sigma"]))),
    "laplace_mixture_2": (fit_lap_mix, lambda p: (lambda z: cdf_lap_mix(z, p))),
    "student_t": (fit_t, lambda p: (lambda z: cdf_t(z, p))),
    "normal_mixture_2": (fit_norm_mix, lambda p: (lambda z: cdf_norm_mix(z, p))),
}


def _weeks(rows):
    i = 0
    while i < len(rows):
        j = i
        while j < len(rows) and (rows[j]["season"], rows[j]["week"]) == (rows[i]["season"], rows[i]["week"]):
            j += 1
        yield rows[i:j]; i = j


def walk(rows, sigma_fixed, hybrid_base=None):
    """Returns per-model per-game CRPS lists (+ seasons) and final-window params."""
    rows = sorted(rows, key=lambda g: (g["season"], g["week"], g["game_id"]))
    warm = rows[0]["season"]
    R, Yh = [], []
    out = {k: [] for k in list(CONT) + ["gaussian_fixed_13.45"]}
    hyb, hyb_cover, hyb_shift, seasons = [], [], [], []
    last = {}
    for block in _weeks(rows):
        if block[0]["season"] != warm and R:
            r = np.array(R)
            fits = {k: f(r) for k, (f, _) in CONT.items()}
            pk = key_probs(Yh)
            last = {"fits": fits, "key_probs": pk, "n_train": len(R),
                    "train_through_season_week": list(prev)}
            for g in block:
                mu, x = g["S"], g["Y"]
                seasons.append(g["season"])
                for k, (_, mk) in CONT.items():
                    c = mk(fits[k]); out[k].append(crps_numeric(lambda y: c(y - mu), x))
                out["gaussian_fixed_13.45"].append(crps_numeric(lambda y: cdf_normal(y - mu, sigma_fixed), x))
                if hybrid_base:
                    c = (lambda z: cdf_normal(z, sigma_fixed)) if hybrid_base == "gaussian_fixed_13.45" else CONT[hybrid_base][1](fits[hybrid_base])
                    Fy = lambda y: hybrid_cdf(y, mu, c, pk)
                    hyb.append(crps_numeric(Fy, x))
                    hyb_cover.append(float(Fy(np.array([mu]))[0]))
                    P = sum(pk.values())
                    hyb_shift.append(sum(p * k for k, p in pk.items()) - P * mu)
        for g in block:
            R.append(g["Y"] - g["S"]); Yh.append(g["Y"])
        prev = (block[0]["season"], block[0]["week"])
    return {"crps": out, "hybrid": hyb, "hybrid_p_cover": hyb_cover, "hybrid_mean_shift": hyb_shift,
            "seasons": seasons, "final_window": last, "warm": warm}
