#!/usr/bin/env python3
"""engine_math.py — probability engines behind the books, runnable stdlib.

Spread convention (all files in this packet):
  listed_spread = the book home number (favorite negative, -3.5).
  mu_margin = -listed_spread. A fair -3.5 is home margin ~ N(+3.5, 13.45).
  Cover of listed line L: home margin + L > 0 (pushes ignored here).

Part 4 names are math.* so the module imports. market_strengths is
least squares (normal equations), not a square Gaussian elimination.
Brier reliability uses the bin mean forecast, not the bin midpoint.
"""
import math

# ============ 1. BRADLEY-TERRY ============
def bt_prob(ra, rb, scale=400.0):
    """Elo IS Bradley-Terry run online: P = 1/(1+10^((rb-ra)/400))."""
    return 1.0 / (1.0 + 10 ** ((rb - ra) / scale))

def elo_update(ra, rb, score_a, k=20.0):
    e = bt_prob(ra, rb)
    return ra + k * (score_a - e), rb - k * (score_a - e)

def bt_fit(games, iters=150):
    """MM-algorithm MLE for static BT from win list [(winner, loser), ...]."""
    import collections
    teams = {t for g in games for t in g}
    wins = collections.Counter(w for w, _ in games)
    opp = collections.defaultdict(list)
    for w, l in games:
        opp[w].append(l)
        opp[l].append(w)
    pi = {t: 1.0 for t in teams}
    for _ in range(iters):
        new = {}
        for t in teams:
            s = sum(1.0 / (pi[t] + pi[o]) for o in opp[t])
            new[t] = wins[t] / s if s > 0 else 1.0
        tot = sum(new.values()) or 1.0
        pi = {t: v / tot for t, v in new.items()}
    return pi

# ============ 2. DIXON-COLES ============
def pois(k, lam):
    return math.exp(-lam) * lam ** k / math.factorial(k)

def dc_tau(x, y, lam, mu, rho):
    if x == 0 and y == 0:
        return 1 - lam * mu * rho
    if x == 0 and y == 1:
        return 1 + lam * rho
    if x == 1 and y == 0:
        return 1 + mu * rho
    if x == 1 and y == 1:
        return 1 - rho
    return 1.0

def dc_prob(x, y, lam, mu, rho=-0.05):
    return dc_tau(x, y, lam, mu, rho) * pois(x, lam) * pois(y, mu)

def dc_grid(lam, mu, rho=-0.05, maxg=8):
    margin, total = {}, {}
    for x in range(maxg + 1):
        for y in range(maxg + 1):
            p = dc_prob(x, y, lam, mu, rho)
            margin[x - y] = margin.get(x - y, 0.0) + p
            total[x + y] = total.get(x + y, 0.0) + p
    return margin, total

# ============ 3. NORMAL-MARGIN MODEL ============
def norm_cdf(x, mu=0.0, sd=1.0):
    return 0.5 * (1 + math.erf((x - mu) / (sd * math.sqrt(2))))

def prob_from_american(amer):
    amer = float(amer)
    return (100 / (amer + 100)) if amer > 0 else ((-amer) / ((-amer) + 100))

def amer_from_prob(p):
    p = min(max(p, 0.01), 0.99)
    return (100 * p / (1 - p)) if p > 0.5 else (-100 * (1 - p) / p)

def mu_from_listed(listed_spread):
    """Book home number (favorite negative) -> expected home margin."""
    return -float(listed_spread)

def alt_ladder(listed_spread, sd=13.45, step=0.5, n=4):
    """Fair alt ladder. Main line cover is ~50% when mu = -listed_spread."""
    mu = mu_from_listed(listed_spread)
    p_win = 1 - norm_cdf(0.0, mu, sd)
    out = [
        f"listed {listed_spread:+.1f} -> mu_margin {mu:+.1f}",
        f"P(home win) = {p_win * 100:.1f}%",
        "alt ladder (fair, pre-tax, pushes ignored):",
    ]
    for i in range(-n, n + 1):
        line = listed_spread + i * step
        # cover if margin + line > 0
        p = 1 - norm_cdf(-line, mu, sd)
        out.append(f"  {line:+5.1f}: P(cover) {p * 100:5.1f}%  fair {amer_from_prob(p):+5.0f}")
    return "\n".join(out)

# ============ 4. SKELLAM ============
def skellam_pmf(k, lam, mu, terms=30):
    b = 2 * math.sqrt(lam * mu)
    def bi(n, x):
        s = 0.0
        for m in range(terms):
            s += (x / 2) ** (n + 2 * m) / (math.factorial(m) * math.factorial(n + m))
        return s
    return math.exp(-(lam + mu)) * (lam / mu) ** (k / 2) * bi(abs(k), b)

# ============ 5. BRIER + ISOTONIC ============
def brier_decompose(pairs):
    """Murphy: BS = reliability - resolution + uncertainty.
    Reliability uses the bin mean forecast, not the bin midpoint."""
    n = len(pairs)
    if n == 0:
        return 0.0, 0.0, 0.0, 0.0
    bs = sum((p - o) ** 2 for p, o in pairs) / n
    pbar = sum(o for _, o in pairs) / n
    bins = {}
    for p, o in pairs:
        bins.setdefault(min(9, int(max(0.0, min(p, 0.999)) * 10)), []).append((p, o))
    rel = res = 0.0
    for v in bins.values():
        nk = len(v)
        mean_p = sum(p for p, _ in v) / nk
        mean_o = sum(o for _, o in v) / nk
        rel += (nk / n) * (mean_o - mean_p) ** 2
        res += (nk / n) * (mean_o - pbar) ** 2
    return bs, rel, res, pbar * (1 - pbar)

def isotonic(pairs):
    """PAV. Returns (left edge of block, calibrated rate)."""
    blocks = [[p, [o]] for p, o in sorted(pairs)]
    def mean(b):
        return sum(b[1]) / len(b[1])
    i = 0
    while i < len(blocks) - 1:
        if mean(blocks[i]) >= mean(blocks[i + 1]):
            blocks[i][1] += blocks[i + 1][1]
            del blocks[i + 1]
            while i > 0 and mean(blocks[i - 1]) > mean(blocks[i]):
                blocks[i - 1][1] += blocks[i][1]
                del blocks[i]
                i -= 1
        else:
            i += 1
    return [(p, sum(ys) / len(ys)) for p, ys in blocks]

# ============ 6. KELLY ============
def kelly_binary(p, amer):
    b = (amer / 100) if amer > 0 else (100 / -amer)
    q = 1 - p
    return (b * p - q) / b

def kelly_ev_growth(p, amer, f, n=1000, trials=200, seed=1):
    import random
    rnd = random.Random(seed)
    b = (amer / 100) if amer > 0 else (100 / -amer)
    g = 0.0
    for _ in range(trials):
        bank = 1.0
        for _ in range(n):
            bank *= (1 + f * b) if rnd.random() < p else (1 - f)
            if bank <= 0:
                bank = 1e-12
                break
        g += math.log(bank)
    return g / trials

# ============ 7. SHIN / KALMAN / PROPS / TEASERS ============
def shin_devig(pi1, pi2):
    """Shin (1993) closed form used by the implied-probability literature:
    p_i(z) = (sqrt(z² + 4(1−z) π_i² / Σπ) − z) / (2(1−z)),
    z bisected so Σp = 1.
    The pasted inversion used the wrong quadratic branch, so z collapsed to 0.
    Iterating S = Σp² inside that wrong branch never crosses 1 either.
    Symmetric books land on 0.5/0.5 with z > 0. Asymmetric books put a higher
    fair price on the favorite than multiplicative (juice comes off the longshot).
    Sub-1 books fall back to multiplicative."""
    s = pi1 + pi2
    if s <= 1.0 + 1e-12:
        return 0.0, pi1 / s, pi2 / s

    def probs(z):
        out = []
        for pi in (pi1, pi2):
            disc = z * z + 4 * (1 - z) * pi * pi / s
            out.append((math.sqrt(disc) - z) / (2 * (1 - z)))
        return out

    lo, hi = 1e-6, 0.5
    if sum(probs(hi)) > 1:
        hi = 0.9
    for _ in range(60):
        z = (lo + hi) / 2
        if sum(probs(z)) > 1:
            lo = z
        else:
            hi = z
    z = (lo + hi) / 2
    ps = probs(z)
    if not all(p > 0 for p in ps) or abs(sum(ps) - 1) > 0.02:
        return 0.0, pi1 / s, pi2 / s
    tot = sum(ps)
    return z, ps[0] / tot, ps[1] / tot

def fair(p1, p2, method="mult"):
    s = p1 + p2
    if method == "mult":
        return p1 / s, p2 / s
    if method == "add":
        return p1 - (s - 1) / 2, p2 - (s - 1) / 2
    lo, hi = 0.01, 2.0
    for _ in range(60):
        k = (lo + hi) / 2
        if p1 ** k + p2 ** k > 1:
            lo = k
        else:
            hi = k
    k = (lo + hi) / 2
    return p1 ** k, p2 ** k

def kalman_ratings(games, hfa=2.0, q=1.0, r_sd=13.45, init_sd=9.0):
    mu, P = {}, {}
    def ensure(t):
        if t not in mu:
            mu[t] = 0.0
            P[t] = init_sd ** 2
    for a, b, marg in games:
        ensure(a)
        ensure(b)
        P[a] += q
        P[b] += q
        innov = marg - (mu[a] - mu[b] + hfa)
        S = P[a] + P[b] + r_sd ** 2
        for t in (a, b):
            h = 1.0 if t == a else -1.0
            K = P[t] * h / S
            mu[t] += K * innov
            P[t] = max(1.0, P[t] * (1 - K * h))
    return {t: (round(mu[t], 2), round(P[t] ** 0.5, 2)) for t in mu}

def inv_norm(u, lo=-6.0, hi=6.0):
    u = min(max(u, 1e-9), 1 - 1e-9)
    for _ in range(48):
        m = (lo + hi) / 2
        if norm_cdf(m) < u:
            lo = m
        else:
            hi = m
    return (lo + hi) / 2

def prop_price(proj, sd, line, book_amer=-110):
    p_over = 1 - norm_cdf(line, proj, sd)
    ladder = {q: inv_norm(q) * sd + proj for q in (0.10, 0.25, 0.50, 0.75, 0.90)}
    fair_amer = amer_from_prob(p_over)
    # edge vs the book's implied probability, not a fake hold
    book_p = prob_from_american(book_amer)
    return {"p_over": p_over, "fair_amer": fair_amer, "book": book_amer,
            "quantiles": ladder, "edge_vs_book_p": p_over - book_p}

def teaser_mc(mu1, mu2, pts=6.0, sd=13.45, rho_games=0.0, book=-110, n=20000, seed=7):
    """2-leg teaser. Push on one leg reduces to the other leg (common book rule).
    Both-push is removed from the denominator. mu is home margin, not listed spread."""
    import random
    rnd = random.Random(seed)
    sqrt_r = math.sqrt(max(rho_games, 0.0))
    sqrt_1 = math.sqrt(1 - max(rho_games, 0.0))
    wins = both_push = 0
    for _ in range(n):
        f = rnd.gauss(0, 1)
        def leg(mu):
            m = mu + sd * (sqrt_r * f + sqrt_1 * rnd.gauss(0, 1)) + pts
            return "w" if m > 0.25 else ("p" if m > -0.25 else "l")
        r1, r2 = leg(mu1), leg(mu2)
        if r1 == "p" and r2 == "p":
            both_push += 1
        elif r1 == "p":
            wins += 1 if r2 == "w" else 0
        elif r2 == "p":
            wins += 1 if r1 == "w" else 0
        elif r1 == "w" and r2 == "w":
            wins += 1
    eff = n - both_push
    p_win = wins / eff if eff else 0.0
    b = (book / 100) if book > 0 else (100 / -book)
    breakeven = 1 / (1 + b)
    return {"p_win": p_win, "fair_amer": amer_from_prob(p_win), "book": book,
            "breakeven_p": breakeven, "edge": p_win - breakeven}

def live_repricing(lead, t_frac, base_mu, sd=13.45):
    """Remaining time fraction tau. Conditional final margin ~ N(lead + base_mu*tau, sd*sqrt(tau))."""
    tau = max(min(t_frac, 1.0), 0.02)
    final_mu = lead + base_mu * tau
    final_sd = sd * math.sqrt(tau)
    p_win = 1 - norm_cdf(0.0, final_mu, final_sd)
    return {"final_mu": round(final_mu, 2), "final_sd": round(final_sd, 2),
            "p_win": round(p_win, 4), "fair_live_ml": amer_from_prob(p_win)}

def wp_in_game(lead, t_frac, field_pos=0.5, timeouts_diff=0):
    z = 0.20 * lead / math.sqrt(max(t_frac, 0.02)) + 1.1 * (field_pos - 0.5) + 0.12 * timeouts_diff
    return 1 / (1 + math.exp(-z))

def weather_adj(total, wind_mph=0.0, precip=None):
    adj = 0.0
    if wind_mph >= 10:
        adj -= (wind_mph - 9) * 0.25
    if precip == "rain":
        adj -= 1.5
    if precip == "snow":
        adj -= 2.5
    return {"adjusted_total": round(total + adj, 1), "delta": round(adj, 2)}

def injury_adj(listed_spread, pos, out=True):
    """Adds points to the listed home number (positive = home less favored). Published ranges, not fit."""
    drops = {"QB": 5.5, "LT": 2.0, "WR1": 1.5, "CB1": 1.5, "EDGE": 1.2, "S": 0.8, "K": 0.5, "RB": 1.0}
    return listed_spread + (drops.get(pos, 1.0) if out else 0)

def situational_adj(listed_spread, days_rest_diff=0, tz_shift=None, altitude_home=False):
    adj = 0.25 * max(-1.0, min(1.0, days_rest_diff))
    if tz_shift == "we":
        adj -= 0.4
    if tz_shift == "ew":
        adj += 0.4
    if altitude_home:
        adj += 0.3
    return round(listed_spread + adj, 2)

# ============ 8. VERIFICATION + MARKET INVERSION ============
def phi_pdf(x):
    return math.exp(-x * x / 2) / math.sqrt(2 * math.pi)

def crps_gaussian(mu, sd, x):
    """Point CRPS of Normal(mu, sd) at x. Gneiting 2005.
    crps_gaussian(0, 1, 0) = (sqrt(2)-1)/sqrt(pi) ≈ 0.2337, not 1/sqrt(pi)."""
    z = (x - mu) / sd
    return sd * (z * (2 * norm_cdf(z) - 1) + 2 * phi_pdf(z) - 1 / math.sqrt(math.pi))

def pit_histogram(mu_s, sd_s, x_s, bins=10):
    counts = [0] * bins
    for mu, sd, x in zip(mu_s, sd_s, x_s):
        p = min(max(norm_cdf(x, mu, sd), 1e-9), 1 - 1e-9)
        counts[min(bins - 1, int(p * bins))] += 1
    n = len(x_s) or 1
    return [round(c / n, 3) for c in counts], [round(1 / bins, 3)] * bins

def deflated_sharpe(sr, n, trials, skew=0.0, kurt=3.0):
    g = 0.5772156649
    var_sr = (1 - skew * sr + (kurt - 1) / 4 * sr * sr) / max(n - 1, 1)
    sd_sr = math.sqrt(max(var_sr, 1e-12))
    T = max(trials, 2)
    sr0 = sd_sr * ((1 - g) * inv_norm(1 - 1 / T) + g * inv_norm(1 - 1 / (T * math.e)))
    denom = math.sqrt(max(1 - skew * sr + (kurt - 1) / 4 * sr * sr, 1e-9))
    z = (sr - sr0) * math.sqrt(max(n - 1, 1)) / denom
    return norm_cdf(z), sr0

def gauss_solve(A, b):
    """Square GE with partial pivot. Raises on a singular pivot."""
    n = len(A)
    if n == 0 or any(len(row) != n for row in A) or len(b) != n:
        raise ValueError("gauss_solve requires a square system")
    M = [row[:] + [b[i]] for i, row in enumerate(A)]
    for c in range(n):
        piv = max(range(c, n), key=lambda r: abs(M[r][c]))
        if abs(M[piv][c]) < 1e-12:
            raise ValueError("singular pivot")
        M[c], M[piv] = M[piv], M[c]
        pivv = M[c][c]
        for r in range(n):
            if r != c and M[r][c]:
                f = M[r][c] / pivv
                M[r] = [a - f * bb for a, bb in zip(M[r], M[c])]
    return [M[i][n] / M[i][i] for i in range(n)]

def market_strengths(slate, margins, hfa=1.5, ridge=1.0):
    """Least squares on closing home margins. a is home.
    margins are home margin (not listed spread). Strengths identified up to a constant;
    ridge pulls the mean toward 0."""
    teams = sorted({t for g in slate for t in g})
    idx = {t: i for i, t in enumerate(teams)}
    n = len(teams)
    # normal equations
    xtx = [[ridge if i == j else 0.0 for j in range(n)] for i in range(n)]
    xty = [0.0] * n
    for (a, b), m in zip(slate, margins):
        y = m - hfa
        ia, ib = idx[a], idx[b]
        xtx[ia][ia] += 1
        xtx[ib][ib] += 1
        xtx[ia][ib] -= 1
        xtx[ib][ia] -= 1
        xty[ia] += y
        xty[ib] -= y
    s = gauss_solve(xtx, xty)
    fits = [s[idx[a]] - s[idx[b]] + hfa for (a, b), _ in zip(slate, margins)]
    return {t: round(v, 2) for t, v in zip(teams, s)}, fits

def stack_with_market(p_model, p_market, w):
    """p* = sigmoid(w*logit(model) + (1-w)*logit(market))."""
    def lg(p):
        p = min(max(p, 1e-6), 1 - 1e-6)
        return math.log(p / (1 - p))
    z = w * lg(p_model) + (1 - w) * lg(p_market)
    return 1 / (1 + math.exp(-z))

def hmm2_fit(x, iters=30, m0=(-3.0, 3.0), sd0=10.0):
    T = len(x)
    A = [[0.85, 0.15], [0.15, 0.85]]
    mu = list(m0)
    sd = sd0
    p = [0.5, 0.5]
    def dens(t, s):
        return math.exp(-((x[t] - mu[s]) ** 2) / (2 * sd * sd)) / math.sqrt(2 * math.pi * sd * sd)
    g = [[0.5, 0.5] for _ in range(T)]
    for _ in range(iters):
        al = [[p[s] * dens(0, s) for s in (0, 1)]]
        cs = [sum(al[0]) or 1e-12]
        al[0] = [a / cs[0] for a in al[0]]
        for t in range(1, T):
            row = [sum(al[t - 1][j] * A[j][s] for j in (0, 1)) * dens(t, s) for s in (0, 1)]
            c = sum(row) or 1e-12
            al.append([v / c for v in row])
            cs.append(c)
        be = [[1.0, 1.0] for _ in range(T)]
        for t in range(T - 2, -1, -1):
            for j in (0, 1):
                be[t][j] = sum(A[j][s] * dens(t + 1, s) * be[t + 1][s] for s in (0, 1))
        g = [[al[t][s] * be[t][s] for s in (0, 1)] for t in range(T)]
        g = [[v / (sum(r) or 1e-12) for v in r] for r in g]
        for s in (0, 1):
            w = sum(g[t][s] for t in range(T)) or 1e-12
            mu[s] = sum(g[t][s] * x[t] for t in range(T)) / w
        var = sum(g[t][s] * (x[t] - mu[s]) ** 2 for t in range(T) for s in (0, 1)) / T
        sd = math.sqrt(max(var, 1e-4))
        for j in (0, 1):
            den = sum(g[t][j] for t in range(T - 1)) or 1e-12
            for s in (0, 1):
                num = sum(al[t][j] * A[j][s] * dens(t + 1, s) * be[t + 1][s] / (cs[t + 1] or 1e-12)
                          for t in range(T - 1))
                A[j][s] = max(0.01, min(0.99, num / den))
            tot = sum(A[j])
            A[j] = [v / tot for v in A[j]]
    filt = [g[t][1] for t in range(T)]
    return {"mu": [round(v, 2) for v in mu], "sd": round(sd, 2),
            "A": [[round(v, 2) for v in row] for row in A],
            "hot_prob_last": round(filt[-1], 3),
            "path": [round(v, 2) for v in filt[-8:]]}

def self_check():
    assert abs(bt_prob(1650, 1500) - 0.703) < 0.01
    z, p1, p2 = shin_devig(0.52381, 0.52381)  # -110/-110
    assert z > 0.01 and abs(p1 - 0.5) < 0.01 and abs(p2 - 0.5) < 0.01
    z_fav, fav, dog = shin_devig(0.6667, 0.3704)  # about -200 / +170
    mult_fav = 0.6667 / (0.6667 + 0.3704)
    assert z_fav > 0.01 and abs(fav + dog - 1) < 1e-9
    assert fav > mult_fav  # Shin pulls juice off the longshot, not the favorite
    z0, a, b = shin_devig(0.48, 0.48)  # sub-1 book
    assert z0 == 0.0 and abs(a - 0.5) < 1e-9
    crps = crps_gaussian(0, 1, 0)
    assert abs(crps - (math.sqrt(2) - 1) / math.sqrt(math.pi)) < 1e-6
    assert abs(inv_norm(0.975) - 1.96) < 0.01
    strengths, fits = market_strengths([("A", "B"), ("B", "C"), ("A", "C")], [3.0, 1.0, 4.0])
    assert set(strengths) == {"A", "B", "C"}
    bs, rel, res, unc = brier_decompose([(0.9, 1), (0.2, 0), (0.6, 1)])
    assert abs(bs - (rel - res + unc)) < 1e-9
    text = alt_ladder(-3.5)
    assert "mu_margin +3.5" in text
    return {"shin_even": (round(z, 4), round(p1, 4), round(p2, 4)),
            "shin_fav": (round(z_fav, 4), round(fav, 4), round(dog, 4), round(mult_fav, 4)),
            "crps0": round(crps, 4), "strengths": strengths, "brier_ok": True}

if __name__ == "__main__":
    print(self_check())
    print(alt_ladder(-3.5))
    print("stack", round(stack_with_market(0.6, 0.52, 0.3), 3))
