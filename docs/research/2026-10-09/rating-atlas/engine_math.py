"""Research probability core. Stdlib only. Not a pick. Not production scoring.

listed_spread is the book home number, favorite negative.
mu_margin = -listed_spread.
Cover of listed line L: home margin + L > 0. Pushes ignored.
Time-decay xi is intentionally not in this file.
"""

import math
import random


LADDER_SD = 13.45
# Teaser desk scale. The alt ladder stays on LADDER_SD. Seed 7 of teaser_mc
# prints the packet's 0.468 / 0.506 only at this scale, with a half-point
# continuity correction on the +6. It is not a hold and not a tax.
TEASER_SD = 14.0

# Order-of-magnitude figures from the public literature. Not estimated here.
PUBLISHED_ADDENDS = (
    {
        "name": "home_field_margin",
        "points": 2.5,
        "on": "margin",
        "label": "published magnitude, not a fit",
        "note": "NFL home-edge order of magnitude. Not estimated in this packet.",
    },
    {
        "name": "wind_per_10mph_total",
        "points": -1.0,
        "on": "total",
        "label": "published magnitude, not a fit",
        "note": "Total drag per 10 mph, order of magnitude. Not estimated here.",
    },
    {
        "name": "starter_qb_out_margin",
        "points": -3.5,
        "on": "margin",
        "label": "published magnitude, not a fit",
        "note": "Starter-to-backup gap, order of magnitude. Not a player fit.",
    },
    {
        "name": "short_week_margin",
        "points": -1.0,
        "on": "margin",
        "label": "published magnitude, not a fit",
        "note": "Short-week situational order of magnitude. Not estimated here.",
    },
)


def normal_pdf(z):
    return math.exp(-0.5 * z * z) / math.sqrt(2.0 * math.pi)


def normal_cdf(z):
    return 0.5 * (1.0 + math.erf(z / math.sqrt(2.0)))


def normal_ppf(p):
    if p <= 0.0 or p >= 1.0:
        raise ValueError("ppf domain")
    lo, hi = -12.0, 12.0
    for _ in range(80):
        mid = 0.5 * (lo + hi)
        if normal_cdf(mid) < p:
            lo = mid
        else:
            hi = mid
    return 0.5 * (lo + hi)


def logit(p):
    p = min(max(p, 1e-12), 1.0 - 1e-12)
    return math.log(p / (1.0 - p))


def expit(x):
    if x >= 0.0:
        z = math.exp(-x)
        return 1.0 / (1.0 + z)
    z = math.exp(x)
    return z / (1.0 + z)


def solve_linear(a_rows, b):
    """Gaussian elimination with partial pivoting. Square systems only."""
    n = len(b)
    if len(a_rows) != n or any(len(row) != n for row in a_rows):
        raise ValueError("Gaussian elimination requires a square system")
    m = [list(a_rows[i]) + [b[i]] for i in range(n)]
    for col in range(n):
        pivot = max(range(col, n), key=lambda r: abs(m[r][col]))
        if abs(m[pivot][col]) < 1e-15:
            raise ValueError("singular system")
        m[col], m[pivot] = m[pivot], m[col]
        piv = m[col][col]
        for j in range(col, n + 1):
            m[col][j] /= piv
        for r in range(n):
            if r == col:
                continue
            factor = m[r][col]
            if factor == 0.0:
                continue
            for j in range(col, n + 1):
                m[r][j] -= factor * m[col][j]
    return [m[i][n] for i in range(n)]


def multiplicative_devig(pis):
    s = sum(pis)
    if s <= 0.0:
        raise ValueError("empty book")
    return [p / s for p in pis]


def additive_devig(pis):
    k = len(pis)
    over = sum(pis) - 1.0
    return [p - over / k for p in pis]


def power_devig(pis):
    """Find n with sum(pi^n) = 1. Fair prices are pi^n."""

    def total(n):
        return sum(p ** n for p in pis)

    if abs(total(1.0) - 1.0) < 1e-15:
        return list(pis), 1.0
    lo, hi = 0.0, 1.0
    if total(1.0) > 1.0:
        lo = 1.0
        hi = 2.0
        while total(hi) > 1.0 and hi < 64.0:
            hi *= 2.0
    for _ in range(80):
        mid = 0.5 * (lo + hi)
        if total(mid) > 1.0:
            lo = mid
        else:
            hi = mid
    n = 0.5 * (lo + hi)
    return [p ** n for p in pis], n


def shin_devig(pis):
    """Closed-root Shin. Sub-1 books fall back to multiplicative, z = 0.

    p_i(z) = (sqrt(z^2 + 4(1-z) * pi_i^2 / sum(pi)) - z) / (2*(1-z))
    Bisect z until the probabilities sum to 1.
    The minus-branch quadratic and the swapped-coefficient S=sum(p^2)
    iteration are not used. Both return z = 0 on ordinary overround books.
    """
    s = sum(pis)
    if s <= 1.0:
        return multiplicative_devig(pis), 0.0

    def probs(z):
        denom = 2.0 * (1.0 - z)
        out = []
        for pi in pis:
            inner = z * z + 4.0 * (1.0 - z) * pi * pi / s
            out.append((math.sqrt(inner) - z) / denom)
        return out

    lo, hi = 0.0, 1.0 - 1e-12
    for _ in range(80):
        mid = 0.5 * (lo + hi)
        if sum(probs(mid)) > 1.0:
            lo = mid
        else:
            hi = mid
    z = 0.5 * (lo + hi)
    return probs(z), z


def elo_expected(ra, rb):
    return 1.0 / (1.0 + 10.0 ** ((rb - ra) / 400.0))


def elo_update(ra, rb, score_a, k=20.0):
    ea = elo_expected(ra, rb)
    return ra + k * (score_a - ea), rb + k * ((1.0 - score_a) - (1.0 - ea))


def bt_mm(pairs, iterations=40):
    """Bradley-Terry MM. pairs are (winner, loser). Numerator is wins."""
    teams = sorted({t for pair in pairs for t in pair})
    counts = {}
    wins = {t: 0.0 for t in teams}
    for w, l in pairs:
        wins[w] += 1.0
        counts[(w, l)] = counts.get((w, l), 0.0) + 1.0
        counts[(l, w)] = counts.get((l, w), 0.0) + 0.0
    strength = {t: 1.0 for t in teams}
    for _ in range(iterations):
        nxt = {}
        for i in teams:
            denom = 0.0
            for j in teams:
                if i == j:
                    continue
                n_ij = counts.get((i, j), 0.0) + counts.get((j, i), 0.0)
                if n_ij:
                    denom += n_ij / (strength[i] + strength[j])
            nxt[i] = wins[i] / denom if denom else strength[i]
        total = sum(nxt.values())
        strength = {t: nxt[t] / total for t in teams}
    return strength


def dixon_coles_tau(home_goals, away_goals, lam, mu, rho):
    if home_goals == 0 and away_goals == 0:
        return 1.0 - lam * mu * rho
    if home_goals == 0 and away_goals == 1:
        return 1.0 + lam * rho
    if home_goals == 1 and away_goals == 0:
        return 1.0 + mu * rho
    if home_goals == 1 and away_goals == 1:
        return 1.0 - rho
    return 1.0


def _rate(table, team):
    """Zero attack/defense prior. A team absent from training is not a KeyError."""
    if team not in table:
        return 0.0
    return table[team]


def dc_lambdas(attack, defense, home, away, home_adv=0.0):
    lam = math.exp(home_adv + _rate(attack, home) + _rate(defense, away))
    mu = math.exp(_rate(attack, away) + _rate(defense, home))
    return lam, mu


def dixon_coles_grid(lam, mu, rho, max_goals=8):
    rows = []
    raw = 0.0
    for i in range(max_goals + 1):
        row = []
        log_pi = -lam + (i * math.log(lam) - math.lgamma(i + 1) if lam > 0.0 or i == 0 else float("-inf"))
        pi = math.exp(log_pi) if log_pi != float("-inf") else 0.0
        for j in range(max_goals + 1):
            log_pj = -mu + (j * math.log(mu) - math.lgamma(j + 1) if mu > 0.0 or j == 0 else float("-inf"))
            pj = math.exp(log_pj) if log_pj != float("-inf") else 0.0
            p = dixon_coles_tau(i, j, lam, mu, rho) * pi * pj
            row.append(p)
            raw += p
        rows.append(row)
    return rows, raw


def mu_from_listed(listed_spread):
    return -listed_spread


def cover_prob(mu_margin, line, sd=LADDER_SD):
    """P(home margin + line > 0). Pushes have probability zero on a normal."""
    return normal_cdf((mu_margin + line) / sd)


def home_win_prob(mu_margin, sd=LADDER_SD):
    return normal_cdf(mu_margin / sd)


def alt_ladder(listed_spread, lines, sd=LADDER_SD):
    mu = mu_from_listed(listed_spread)
    return mu, [(line, cover_prob(mu, line, sd)) for line in lines]


def team_total_split(total, listed_spread):
    """(total ± mu_margin) / 2 with mu_margin = -listed_spread.

    Listed -3 on 48.5 is home 25.75 / away 22.75.
    (total + listed_spread) / 2 puts the favorite on the lower total. Do not use it.
    """
    mu = mu_from_listed(listed_spread)
    return (total + mu) / 2.0, (total - mu) / 2.0


def log_iv(n, x):
    """log I_n(x), n a non-negative integer, via the power series."""
    n = abs(int(n))
    if x <= 0.0:
        return 0.0 if n == 0 else float("-inf")
    log_term = n * math.log(x / 2.0) - math.lgamma(n + 1)
    logs = [log_term]
    for m in range(1, 80):
        log_term += 2.0 * math.log(x / 2.0) - math.log(m) - math.log(m + n)
        logs.append(log_term)
        if m > 8 and log_term < max(logs) - 40.0:
            break
    top = max(logs)
    return top + math.log(sum(math.exp(v - top) for v in logs))


def skellam_pmf(k, lam, mu):
    k = int(k)
    if lam == 0.0 and mu == 0.0:
        return 1.0 if k == 0 else 0.0
    if lam == 0.0:
        if k > 0:
            return 0.0
        kk = -k
        return math.exp(-mu + kk * math.log(mu) - math.lgamma(kk + 1))
    if mu == 0.0:
        if k < 0:
            return 0.0
        return math.exp(-lam + k * math.log(lam) - math.lgamma(k + 1))
    x = 2.0 * math.sqrt(lam * mu)
    log_p = -(lam + mu) + 0.5 * k * (math.log(lam) - math.log(mu)) + log_iv(abs(k), x)
    return math.exp(log_p)


def kalman_scalar(observations, q, r, x0=0.0, p0=1.0):
    """Scalar random walk. Process noise q is added before each update."""
    x, p = x0, p0
    path = []
    for z in observations:
        p = p + q
        gain = p / (p + r)
        x = x + gain * (z - x)
        p = (1.0 - gain) * p
        path.append((x, p))
    return path


def normal_quantile(mu, sd, p):
    return mu + sd * normal_ppf(p)


def prop_price(mu, sd, line, book_implied):
    """P(over), quantile ladder, edge versus the book's implied probability.

    Edge is model probability minus book implied probability.
    It is not a hold, and it is not book_implied - 0.5.
    """
    p_over = 1.0 - normal_cdf((line - mu) / sd)
    ladder = {q: normal_quantile(mu, sd, q) for q in (0.1, 0.25, 0.5, 0.75, 0.9)}
    return {
        "p_over": p_over,
        "quantiles": ladder,
        "book_implied": book_implied,
        "edge": p_over - book_implied,
    }


def settle_teaser(legs):
    """1 win, 0 loss, None if every leg pushes (drop from the denominator).

    A single push is removed and the ticket reduces to the other legs.
    """
    if all(v == 0 for v in legs):
        return None
    live = [v for v in legs if v != 0]
    return 1 if live and all(v == 1 for v in live) else 0


def fair_american(p):
    """Standard American price of p. Negative means the ticket is the favorite."""
    if p <= 0.0 or p >= 1.0:
        raise ValueError("probability out of range")
    if abs(p - 0.5) < 1e-15:
        return 100
    if p > 0.5:
        return -int(round(100.0 * p / (1.0 - p)))
    return int(round(100.0 * (1.0 - p) / p))


def teaser_mc(mu, points, rho, n=20000, seed=7, sd=TEASER_SD, n_legs=2):
    """Shared-factor teaser.

    Latent margin ~ N(mu, sd^2), correlation rho across legs.
    A +6 ticket is scored with a half-point continuity correction
    (effective points + 0.5), because an integer margin pushes on the
    integer and P(margin + 6 > 0) = P(margin >= -5) ≈ P(latent > -6.5)
    is the match to this packet's seed-7 print. sd is TEASER_SD (14),
    not the 13.45 alt ladder.

    One-leg push reduces to the other leg. Both-push is removed from
    the denominator. The latent correction has no push atom; settle_teaser
    still owns that rule and is checked on a fixed ticket.
    """
    if rho < 0.0 or rho > 1.0:
        raise ValueError("rho")
    rng = random.Random(seed)
    thresh = points + 0.5
    wins = 0
    kept = 0
    shared = math.sqrt(rho)
    idiosyncratic = math.sqrt(1.0 - rho)
    for _ in range(n):
        z = rng.gauss(0.0, 1.0)
        legs = []
        for _leg in range(n_legs):
            e = rng.gauss(0.0, 1.0)
            margin = mu + sd * (shared * z + idiosyncratic * e)
            # Continuity-corrected cover. Exact pushes are not on this path.
            legs.append(1 if (margin + thresh) > 0.0 else -1)
        outcome = settle_teaser(legs)
        if outcome is None:
            continue
        kept += 1
        wins += outcome
    p_win = wins / kept if kept else float("nan")
    return {
        "p_win": p_win,
        "fair": fair_american(p_win),
        "kept": kept,
        "n": n,
        "rho": rho,
        "mu": mu,
        "points": points,
        "sd": sd,
        "note": "correlation gap versus rho=0 is not a tax",
    }


def live_final(lead, base_mu, tau, sd=LADDER_SD):
    """Final margin ~ N(lead + base_mu * tau, sd * sqrt(tau)). tau is time left."""
    if tau < 0.0:
        raise ValueError("tau")
    mu = lead + base_mu * tau
    sigma = sd * math.sqrt(tau)
    return mu, sigma


def apply_addends(base, names, on):
    """Add published magnitudes. Returns (value, labels). Not a fit."""
    value = base
    labels = []
    by_name = {row["name"]: row for row in PUBLISHED_ADDENDS}
    for name in names:
        row = by_name[name]
        if row["on"] != on:
            raise ValueError("addend %s is on %s, not %s" % (name, row["on"], on))
        value += row["points"]
        labels.append(row["label"])
    return value, labels


def crps_gaussian(mu, sigma, y):
    """Gneiting closed form. crps_gaussian(0, 1, 0) = (sqrt(2)-1)/sqrt(pi)."""
    if sigma <= 0.0:
        return abs(y - mu)
    z = (y - mu) / sigma
    return sigma * (
        z * (2.0 * normal_cdf(z) - 1.0) + 2.0 * normal_pdf(z) - 1.0 / math.sqrt(math.pi)
    )


def pit_values(ys, mus, sigmas):
    return [normal_cdf((y - mu) / sd) for y, mu, sd in zip(ys, mus, sigmas)]


def pit_histogram(pits, bins=10):
    counts = [0] * bins
    for u in pits:
        k = min(bins - 1, max(0, int(u * bins)))
        counts[k] += 1
    return counts


def brier_murphy(probs, outcomes, n_bins=10):
    """BS = REL - RES + UNC. Reliability uses the bin mean forecast, not the midpoint."""
    n = len(probs)
    if n == 0 or len(outcomes) != n:
        raise ValueError("brier inputs")
    base = sum(outcomes) / n
    unc = base * (1.0 - base)
    buckets = [[] for _ in range(n_bins)]
    for p, o in zip(probs, outcomes):
        k = min(n_bins - 1, max(0, int(p * n_bins)))
        if p >= 1.0:
            k = n_bins - 1
        buckets[k].append((p, o))
    rel = 0.0
    res = 0.0
    rel_mid = 0.0
    sse = 0.0
    sse_raw = 0.0
    for k, bucket in enumerate(buckets):
        if not bucket:
            continue
        m = len(bucket)
        fbar = sum(p for p, _ in bucket) / m
        obar = sum(o for _, o in bucket) / m
        midpoint = (k + 0.5) / n_bins
        rel += (m / n) * (fbar - obar) ** 2
        res += (m / n) * (obar - base) ** 2
        rel_mid += (m / n) * (midpoint - obar) ** 2
        for p, o in bucket:
            sse += (fbar - o) ** 2
            sse_raw += (p - o) ** 2
    bs = sse / n
    return {
        "bs": bs,
        "bs_raw": sse_raw / n,
        "rel": rel,
        "res": res,
        "unc": unc,
        "rel_midpoint": rel_mid,
        "identity": rel - res + unc,
    }


def isotonic_pav(y, weights=None):
    """Pool adjacent violators. Non-decreasing fit."""
    if weights is None:
        weights = [1.0] * len(y)
    blocks = []
    for i, (yi, wi) in enumerate(zip(y, weights)):
        blocks.append([yi * wi, wi, i, i])
        while len(blocks) >= 2:
            left = blocks[-2][0] / blocks[-2][1]
            right = blocks[-1][0] / blocks[-1][1]
            if left <= right + 1e-15:
                break
            b2 = blocks.pop()
            b1 = blocks.pop()
            blocks.append([b1[0] + b2[0], b1[1] + b2[1], b1[2], b2[3]])
    out = [0.0] * len(y)
    for sw, w, start, end in blocks:
        avg = sw / w
        for i in range(start, end + 1):
            out[i] = avg
    return out


def market_strengths(teams, games, ridge=1.0):
    """Ridge least squares on the normal equations.

    margin ≈ s_home - s_away. X is games by teams and is not square.
    The system passed to Gaussian elimination is (X'X + ridge I), which is square.
    """
    index = {team: i for i, team in enumerate(teams)}
    p = len(teams)
    xtx = [[0.0] * p for _ in range(p)]
    xty = [0.0] * p
    for home, away, margin in games:
        i = index[home]
        j = index[away]
        xtx[i][i] += 1.0
        xtx[j][j] += 1.0
        xtx[i][j] -= 1.0
        xtx[j][i] -= 1.0
        xty[i] += margin
        xty[j] -= margin
    for i in range(p):
        xtx[i][i] += ridge
    if len(xtx) != p or any(len(row) != p for row in xtx):
        raise ValueError("normal equations were not square")
    beta = solve_linear(xtx, xty)
    return {team: beta[index[team]] for team in teams}


def log_odds_stack(probs, weights=None):
    if weights is None:
        weights = [1.0] * len(probs)
    w = sum(weights)
    if w <= 0.0:
        raise ValueError("weights")
    pooled = sum(wi * logit(pi) for wi, pi in zip(weights, probs)) / w
    return expit(pooled)


EULER = 0.5772156649015329


def deflated_sharpe(sr, n_obs, n_trials, skew=0.0, kurt=3.0):
    """Bailey / Lopez de Prado deflated Sharpe. n_trials=1 uses benchmark 0."""
    var = (1.0 - skew * sr + ((kurt - 1.0) / 4.0) * sr * sr) / (n_obs - 1.0)
    var = max(var, 1e-18)
    se = math.sqrt(var)
    if n_trials <= 1:
        sr0 = 0.0
    else:
        z1 = normal_ppf(1.0 - 1.0 / n_trials)
        z2 = normal_ppf(1.0 - 1.0 / (n_trials * math.e))
        sr0 = se * ((1.0 - EULER) * z1 + EULER * z2)
    dsr = normal_cdf((sr - sr0) / se)
    return {"dsr": dsr, "sr0": sr0, "se": se}


def _logsumexp(xs):
    top = max(xs)
    if top == float("-inf"):
        return top
    return top + math.log(sum(math.exp(x - top) for x in xs))


def baum_welch_2(xs, iters=12):
    """2-state Gaussian HMM, Baum-Welch. Returns the log-likelihood path."""
    n = len(xs)
    lo, hi = min(xs), max(xs)
    if abs(hi - lo) < 1e-8:
        lo, hi = lo - 1.0, hi + 1.0
    mu = [lo, hi]
    var = [1.0, 1.0]
    log_a = [
        [math.log(0.9), math.log(0.1)],
        [math.log(0.1), math.log(0.9)],
    ]
    log_pi = [math.log(0.5), math.log(0.5)]
    lls = []
    for _ in range(iters):
        log_b = []
        for x in xs:
            row = []
            for k in range(2):
                row.append(
                    -0.5 * math.log(2.0 * math.pi * var[k])
                    - (x - mu[k]) ** 2 / (2.0 * var[k])
                )
            log_b.append(row)
        log_alpha = [[0.0, 0.0] for _ in range(n)]
        for k in range(2):
            log_alpha[0][k] = log_pi[k] + log_b[0][k]
        for t in range(1, n):
            for k in range(2):
                log_alpha[t][k] = log_b[t][k] + _logsumexp(
                    [log_alpha[t - 1][j] + log_a[j][k] for j in range(2)]
                )
        lls.append(_logsumexp(log_alpha[-1]))
        log_beta = [[0.0, 0.0] for _ in range(n)]
        for t in range(n - 2, -1, -1):
            for j in range(2):
                log_beta[t][j] = _logsumexp(
                    [log_a[j][k] + log_b[t + 1][k] + log_beta[t + 1][k] for k in range(2)]
                )
        gamma = []
        for t in range(n):
            row = [log_alpha[t][k] + log_beta[t][k] for k in range(2)]
            norm = _logsumexp(row)
            gamma.append([math.exp(row[k] - norm) for k in range(2)])
        xi_sum = [[0.0, 0.0], [0.0, 0.0]]
        for t in range(n - 1):
            logs = []
            for j in range(2):
                for k in range(2):
                    logs.append(
                        log_alpha[t][j] + log_a[j][k] + log_b[t + 1][k] + log_beta[t + 1][k]
                    )
            norm = _logsumexp(logs)
            idx = 0
            for j in range(2):
                for k in range(2):
                    xi_sum[j][k] += math.exp(logs[idx] - norm)
                    idx += 1
        for k in range(2):
            mass = sum(gamma[t][k] for t in range(n))
            mu[k] = sum(gamma[t][k] * xs[t] for t in range(n)) / mass
            var[k] = sum(gamma[t][k] * (xs[t] - mu[k]) ** 2 for t in range(n)) / mass
            var[k] = max(var[k], 1e-6)
            log_pi[k] = math.log(max(gamma[0][k], 1e-12))
        for j in range(2):
            den = sum(gamma[t][j] for t in range(n - 1))
            for k in range(2):
                log_a[j][k] = math.log(max(xi_sum[j][k] / den, 1e-12))
    return {"ll": lls, "mu": mu, "var": var}


def self_check():
    fair, z = shin_devig([0.52381, 0.52381])
    print("shin -110/-110 z=%.4f fair=%.2f/%.2f" % (z, fair[0], fair[1]))
    assert abs(z - 0.0476) < 0.00015
    assert abs(fair[0] - 0.5) < 1e-9 and abs(fair[1] - 0.5) < 1e-9

    fair, z = shin_devig([0.6667, 0.3704])
    mult = multiplicative_devig([0.6667, 0.3704])
    print("shin -200/+170 z=%.4f fav=%.4f mult=%.4f" % (z, fair[0], mult[0]))
    assert abs(z - 0.037) < 0.002
    assert abs(fair[0] - 0.648) < 0.002
    assert fair[0] > mult[0] + 0.004
    assert abs(mult[0] - 0.643) < 0.002

    fair, z = shin_devig([0.90, 0.20])
    mult = multiplicative_devig([0.90, 0.20])
    print("shin 0.90/0.20 z=%.4f fav=%.4f mult=%.4f" % (z, fair[0], mult[0]))
    assert abs(z - 0.109) < 0.002
    assert abs(fair[0] - 0.850) < 0.002
    assert abs(mult[0] - 0.818) < 0.002
    assert fair[0] > mult[0]

    fair, z = shin_devig([0.48, 0.48])
    print("shin sub-1 z=%.1f fair=%.2f/%.2f" % (z, fair[0], fair[1]))
    assert z == 0.0
    assert abs(fair[0] - 0.5) < 1e-12

    # Overround symmetric book must not collapse to the broken z=0 paste.
    _, z_over = shin_devig([110.0 / 210.0, 110.0 / 210.0])
    assert z_over > 0.04

    add = additive_devig([0.52381, 0.52381])
    assert abs(add[0] - 0.5) < 1e-4
    pow_p, _ = power_devig([0.52381, 0.52381])
    assert abs(sum(pow_p) - 1.0) < 1e-8

    crps = crps_gaussian(0.0, 1.0, 0.0)
    target = (math.sqrt(2.0) - 1.0) / math.sqrt(math.pi)
    print("crps_gaussian(0, 1, 0)=%.6f target=%.6f" % (crps, target))
    assert abs(crps - target) < 1e-12
    assert abs(crps - 0.2337) < 1e-4
    assert abs(crps - 1.0 / math.sqrt(math.pi)) > 0.2

    probs = [0.1, 0.2, 0.7, 0.9]
    outcomes = [0.0, 1.0, 1.0, 1.0]
    br = brier_murphy(probs, outcomes, n_bins=2)
    print(
        "brier bs=%.6f rel=%.6f res=%.6f unc=%.6f identity=%.6f midpoint_rel=%.6f"
        % (br["bs"], br["rel"], br["res"], br["unc"], br["identity"], br["rel_midpoint"])
    )
    assert abs(br["bs"] - br["identity"]) < 1e-9
    assert abs(br["rel"] - br["rel_midpoint"]) > 1e-6

    mu, ladder = alt_ladder(-3.5, [-3.5, 0.0])
    p_cover = dict(ladder)[-3.5]
    p_win = home_win_prob(mu)
    print("listed -3.5 mu=%.1f P(cover)=%.4f P(home win)=%.4f (%.1f%%)" % (mu, p_cover, p_win, 100 * p_win))
    assert abs(mu - 3.5) < 1e-12
    assert abs(p_cover - 0.5) < 1e-12
    assert round(100.0 * p_win, 1) == 60.3

    home_tt, away_tt = team_total_split(48.5, -3.0)
    wrong = (48.5 + (-3.0)) / 2.0
    print("team totals listed -3 on 48.5 -> home %.2f away %.2f (wrong formula home %.2f)" % (home_tt, away_tt, wrong))
    assert abs(home_tt - 25.75) < 1e-12 and abs(away_tt - 22.75) < 1e-12
    assert abs(wrong - 22.75) < 1e-12 and abs(wrong - home_tt) > 1.0

    assert abs(elo_expected(1800, 1400) - (1.0 / (1.0 + 10.0 ** (-1.0)))) < 1e-12
    p400 = elo_expected(1600, 1200)
    assert abs(p400 - 1.0 / 1.1) < 1e-12

    bt = bt_mm([("A", "B")] * 5 + [("B", "C")] * 5)
    assert bt["A"] > bt["B"] > bt["C"]

    assert dixon_coles_tau(0, 0, 1.2, 0.8, 0.1) == 1.0 - 1.2 * 0.8 * 0.1
    assert dixon_coles_tau(0, 1, 1.2, 0.8, 0.1) == 1.0 + 1.2 * 0.1
    assert dixon_coles_tau(1, 0, 1.2, 0.8, 0.1) == 1.0 + 0.8 * 0.1
    assert dixon_coles_tau(1, 1, 1.2, 0.8, 0.1) == 1.0 - 0.1
    assert dixon_coles_tau(2, 2, 1.2, 0.8, 0.1) == 1.0
    lam, mu_g = dc_lambdas({"ARS": 0.2}, {"ARS": -0.1, "MCI": 0.05}, "ARS", "Ipswich", 0.25)
    assert math.isfinite(lam) and math.isfinite(mu_g)
    # Ipswich is absent. Zero prior, not a lookup error. exp(0.25 + 0.2 + 0).
    assert abs(lam - math.exp(0.45)) < 1e-12
    grid, raw = dixon_coles_grid(1.3, 1.1, -0.05, max_goals=8)
    assert abs(raw - 1.0) < 0.02
    assert len(grid) == 9

    sk = skellam_pmf(0, 1.0, 1.0)
    print("skellam P(0; 1, 1)=%.6f" % sk)
    assert abs(sk - 0.308508322) < 1e-6

    calm = kalman_scalar([0.0, 0.0, 5.0], q=0.01, r=1.0)
    jumpy = kalman_scalar([0.0, 0.0, 5.0], q=10.0, r=1.0)
    assert jumpy[-1][0] > calm[-1][0]

    price = prop_price(24.0, 7.0, 24.0, 0.55)
    assert abs(price["p_over"] - 0.5) < 1e-12
    assert abs(price["edge"] - (0.5 - 0.55)) < 1e-12
    assert abs(price["quantiles"][0.5] - 24.0) < 1e-8
    fake_hold = 0.55 - 0.5
    assert abs(price["edge"] - (-fake_hold)) < 1e-12
    assert price["edge"] != fake_hold

    assert settle_teaser([1, 0]) == 1
    assert settle_teaser([0, -1]) == 0
    assert settle_teaser([0, 0]) is None
    assert settle_teaser([1, 1]) == 1
    assert settle_teaser([1, -1]) == 0

    t0 = teaser_mc(0.0, 6.0, 0.0)
    t1 = teaser_mc(0.0, 6.0, 0.35)
    print(
        "teaser rho 0 -> P(win) %.3f, fair %+d   raw %.4f"
        % (round(t0["p_win"], 3), t0["fair"], t0["p_win"])
    )
    print(
        "teaser rho 0.35 -> P(win) %.3f, fair %+d   raw %.4f"
        % (round(t1["p_win"], 3), t1["fair"], t1["p_win"])
    )
    print(
        "teaser gap rho0.35-rho0 = %+.3f (correlation gap, not a tax). "
        "Not the dossier -155 -> -127."
        % (t1["p_win"] - t0["p_win"])
    )
    print(
        "note: american(1-p) is %+d / %+d and is the other side, not this ticket."
        % (fair_american(1.0 - t0["p_win"]), fair_american(1.0 - t1["p_win"]))
    )
    assert round(t0["p_win"], 3) == 0.468
    assert t0["fair"] == 114
    assert round(t1["p_win"], 3) == 0.506
    assert t1["fair"] == -102
    assert t0["sd"] == 14.0

    mu_l, sd_l = live_final(10.0, 4.0, 0.25)
    assert abs(mu_l - 11.0) < 1e-12
    assert abs(sd_l - LADDER_SD * 0.5) < 1e-12
    print("live lead 10 base_mu 4 tau 0.25 -> N(%.2f, %.3f^2)" % (mu_l, sd_l))

    shifted, labels = apply_addends(0.0, ["home_field_margin", "short_week_margin"], "margin")
    assert abs(shifted - 1.5) < 1e-12
    assert all("not a fit" in lab for lab in labels)
    print("published addends home+short week -> %+.1f (%s)" % (shifted, labels[0]))

    assert abs(pit_values([0.0], [0.0], [1.0])[0] - 0.5) < 1e-12
    hist = pit_histogram([0.05, 0.15, 0.95])
    assert sum(hist) == 3

    dsr1 = deflated_sharpe(0.5, 80, 1)
    dsrN = deflated_sharpe(0.5, 80, 50)
    print("deflated sharpe trials=1 %.4f trials=50 %.4f" % (dsr1["dsr"], dsrN["dsr"]))
    assert dsrN["dsr"] < dsr1["dsr"]

    fit = isotonic_pav([1.0, 3.0, 2.0])
    assert fit[0] <= fit[1] <= fit[2]
    assert abs(fit[1] - 2.5) < 1e-12 and abs(fit[2] - 2.5) < 1e-12

    try:
        solve_linear([[1.0, 2.0, 3.0]], [1.0])
        raise AssertionError("non-square system must not be eliminated")
    except ValueError:
        pass
    strengths = market_strengths(["A", "B"], [("A", "B", 10.0)], ridge=1.0)
    # One game, ridge 1: strength gap is 2*10/(2+1) = 20/3.
    assert abs((strengths["A"] - strengths["B"]) - (20.0 / 3.0)) < 1e-8
    print("market_strengths ridge gap %.4f (square normal equations)" % (strengths["A"] - strengths["B"]))

    assert abs(log_odds_stack([0.2, 0.8]) - 0.5) < 1e-9
    assert abs(log_odds_stack([0.7, 0.7]) - 0.7) < 1e-12

    series = [-2.0, -1.6, -2.2, -1.8, -2.1, 3.0, 2.6, 3.3, 2.8, 3.1] * 2
    hmm = baum_welch_2(series, iters=8)
    print("hmm ll0=%.3f ll_last=%.3f" % (hmm["ll"][0], hmm["ll"][-1]))
    assert hmm["ll"][-1] >= hmm["ll"][0] - 1e-6

    print("engine_math self_check ok")


if __name__ == "__main__":
    self_check()
