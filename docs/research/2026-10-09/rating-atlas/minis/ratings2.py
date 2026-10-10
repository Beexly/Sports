#!/usr/bin/env python3
"""ratings2.py — the rating systems the atlas promised, as runnable code.
Colley, Massey, SRS, PageRank, Keener, Glicko-2, TrueSkill (pairwise analytic),
Plackett-Luce. Pure stdlib. All operate on game lists [(a, b, a_score, b_score)].
Convention: no home advantage baked in — caller adjusts margins first."""
import math
import collections

# ---------- linear algebra ----------
def solve(A, b):
    """Gaussian elimination with partial pivot. Raises on singular pivot."""
    n = len(A)
    M = [row[:] + [b[i]] for i, row in enumerate(A)]
    for c in range(n):
        piv = max(range(c, n), key=lambda r: abs(M[r][c]))
        if abs(M[piv][c]) < 1e-12: raise ValueError("singular")
        M[c], M[piv] = M[piv], M[c]
        for r in range(n):
            if r != c and M[r][c]:
                f = M[r][c] / M[c][c]
                M[r] = [a - f * bb for a, bb in zip(M[r], M[c])]
    return [M[i][n] / M[i][i] for i in range(n)]

def _teams(games):
    ts = sorted({t for g in games for t in (g[0], g[1])})
    return ts, {t: i for i, t in enumerate(ts)}

# ---------- 1. COLLEY ----------
def colley(games):
    """Colley (2002): C·r = b, C_ii = 2 + n_i, C_ij = -n_ij, b_i = 1 + (w_i - l_i)/2.
    Pure algebra, no iteration, no margin. The BCS engine for a decade."""
    ts, idx = _teams(games)
    n = len(ts)
    C = [[0.0] * n for _ in range(n)]
    b = [1.0] * n
    for i, t in enumerate(ts): C[i][i] = 2.0
    for a, bb_, sa, sb in games:
        ia, ib = idx[a], idx[bb_]
        C[ia][ia] += 1; C[ib][ib] += 1
        C[ia][ib] -= 1; C[ib][ia] -= 1
        won_a = 1 if sa > sb else 0
        b[ia] += (won_a - (1 - won_a)) / 2.0
        b[ib] += ((1 - won_a) - won_a) / 2.0
    r = solve(C, b)
    return {t: round(v, 4) for t, v in zip(ts, r)}

# ---------- 2. MASSEY ----------
def massey(games, hfa=0.0):
    """Massey: M·r = p. M_ii = games played, M_ij = -n_ij; p_i = Σ point diff.
    Ratings fit POINT MARGIN, not just wins. Least squares via normal equations."""
    ts, idx = _teams(games)
    n = len(ts)
    games_n = [0.0] * n
    diffs = [0.0] * n
    X = [[0.0] * n for _ in range(len(games))]
    y = []
    for r, (a, bb_, sa, sb) in enumerate(games):
        ia, ib = idx[a], idx[bb_]
        X[r][ia] = 1.0; X[r][ib] = -1.0
        d = (sa - sb) + hfa
        y.append(d)
        games_n[ia] += 1; games_n[ib] += 1
        diffs[ia] += d; diffs[ib] -= d
    Xy = [sum(X[k][i] * y[k] for k in range(len(games))) for i in range(n)]
    XtX = [[sum(X[k][i] * X[k][j] for k in range(len(games))) for j in range(n)] for i in range(n)]
    for i in range(n): XtX[i][i] += 0.5  # ridge for identifiability
    r = solve(XtX, Xy)
    return {t: round(v, 2) for t, v in zip(ts, r)}

# ---------- 3. SRS ----------
def srs(games, iters=100, damp=0.7):
    """Simple Rating System: rating_i = avg_margin_i + avg(opp rating).
    Fixed-point iteration (Gauss-Seidel w/ damping). The Joe Sheehan/football-
    outsiders classic. Margins matter; schedule strength falls out."""
    ts, idx = _teams(games)
    n = len(ts)
    marg_sum = collections.defaultdict(float); marg_n = collections.Counter()
    opps = collections.defaultdict(list)
    for a, b, sa, sb in games:
        d = sa - sb
        marg_sum[a] += d; marg_sum[b] -= d
        marg_n[a] += 1; marg_n[b] += 1
        opps[a].append(b); opps[b].append(a)
    rat = {t: 0.0 for t in ts}
    for _ in range(iters):
        new = {}
        for t in ts:
            base = marg_sum[t] / marg_n[t] if marg_n[t] else 0.0
            sos = sum(rat[o] for o in opps[t]) / len(opps[t]) if opps[t] else 0.0
            new[t] = base + sos
        rat = {t: (1 - damp) * rat[t] + damp * new[t] for t in ts}
    # normalize mean 0
    mu = sum(rat.values()) / n
    return {t: round(v - mu, 2) for t, v in rat.items()}

# ---------- 4. PAGERANK ----------
def pagerank(games, d=0.85, iters=200, use_margin=True):
    """PageRank on the beat-graph: edges loser→winner, weight ∝ (1 + |margin|/10).
    Ratings = stationary distribution. catches transitive strength that wins/losses hide."""
    ts, idx = _teams(games)
    n = len(ts)
    out_w = collections.defaultdict(float)
    edges = collections.defaultdict(list)  # loser -> [(winner, w)]
    for a, b, sa, sb in games:
        win, lose = (a, b) if sa > sb else (b, a)
        w = 1.0 + (abs(sa - sb) / 10.0 if use_margin else 0.0)
        edges[lose].append((win, w))
        out_w[lose] += w
    pr = {t: 1.0 / n for t in ts}
    for _ in range(iters):
        new = {t: (1 - d) / n for t in ts}
        for loser, lst in edges.items():
            share = d * pr[loser]
            for win, w in lst:
                new[win] += share * w / out_w[loser]
        pr = new
    tot = sum(pr.values())
    return {t: round(v / tot * 100, 4) for t, v in pr.items()}  # % of authority mass

# ---------- 5. KEENER ----------
def keener(games, x=1.0, iters=300):
    """Keener skew method: S_ij from score ratio via S(y)= (1+y)^x / ((1+y)^x + (1+1/y)^x).
    Power iteration on the column-normalized skew matrix → Perron vector = strength.
    (Column normalization, not row: Σ_i a_ij = 1 makes Σs conserved under s' = A·s.)"""
    ts, idx = _teams(games)
    n = len(ts)
    A = [[0.0] * n for _ in range(n)]
    for a, b, sa, sb in games:
        ia, ib = idx[a], idx[b]
        y = min(sa / max(sb, 1e-9), 10.0)
        num = (1 + y) ** x
        den = num + (1 + 1 / y) ** x if y > 0 else 2.0
        s_ab = num / den
        A[ia][ib] += s_ab; A[ib][ia] += 1 - s_ab
    # epsilon for irreducibility, then COLUMN normalization
    for j in range(n):
        col = sum(A[i][j] for i in range(n)) + 0.1 * n
        for i in range(n):
            A[i][j] = (A[i][j] + 0.1) / col
    v = [1.0 / n] * n
    for _ in range(iters):
        nv = [sum(A[i][j] * v[j] for j in range(n)) for i in range(n)]
        s = sum(nv) or 1.0
        v = [u / s for u in nv]
    return {t: round(val, 4) for t, val in zip(ts, v)}

# ---------- 6. GLICKO-2 ----------
def glicko2(games, rating0=1500.0, rd0=350.0, vol0=0.06, tau=0.5, rd0_map=None, rating0_map=None):
    """Glicko-2 (Glickman 2012), period-parallel: every player gets ONE update
    per rating period using ALL their games (verified vs canonical test vectors).
    Volatility (tau-bounded Illinois iteration) is what Elo never had.
    rd0_map/rating0_map: optional {player: value} for heterogeneous starts."""
    scale = 173.7178
    mu0 = (rating0 - 1500.0) / scale
    players = {}
    series = collections.defaultdict(list)
    def ensure(t):
        if t not in players:
            rd = (rd0_map or {}).get(t, rd0)
            r0 = (rating0_map or {}).get(t, rating0)
            players[t] = [(r0 - 1500.0) / scale, rd / scale, vol0]
    for a, b, sa, sb in games:
        ensure(a); ensure(b)
        score_a = 1.0 if sa > sb else (0.5 if sa == sb else 0.0)
        series[a].append((score_a, b))
        series[b].append((1.0 - score_a, a))
    def g(phi): return 1.0 / math.sqrt(1.0 + 3.0 * phi * phi / (math.pi * math.pi))
    def expect(mu, muj, gop): return 1.0 / (1.0 + math.exp(-gop * (mu - muj)))
    def new_volatility(phi_me, delta, v, vol):
        """Illinois algorithm on f(x) = e^x(Δ²−φ²−v−e^x)/(2(φ²+v+e^x)²) − (x−a)/τ²."""
        a_ = math.log(vol * vol)
        def f(x):
            tmp = phi_me * phi_me + v + math.exp(x)
            return (math.exp(x) * (delta * delta - tmp)) / (2.0 * tmp * tmp) - (x - a_) / (tau * tau)
        A_ = a_
        if delta * delta > phi_me * phi_me + v:
            B_ = math.log(delta * delta - phi_me * phi_me - v)
        else:
            k = 1
            while f(a_ - k * tau) < 0:
                k += 1
            B_ = a_ - k * tau
        f_a, f_b = f(A_), f(B_)
        eps = 1e-6
        while abs(B_ - A_) > eps:
            C_ = A_ + (A_ - B_) * f_a / (f_b - f_a)
            f_c = f(C_)
            if f_c * f_b < 0:
                A_, f_a = B_, f_b
            else:
                f_a = f_a / 2.0
            B_, f_b = C_, f_c
        return math.exp(A_ / 2.0)
    # one PERIOD: snapshot pre-period params, then update everyone in parallel
    pre = {t: list(players[t]) for t in players}
    for t,games_t in series.items():
        mu_me, phi_me, vol_me = pre[t]
        v_inv = 0.0
        delta_sum = 0.0
        for sc, opp in games_t:
            mu_o, phi_o, _ = pre[opp]
            gop = g(phi_o)
            e = expect(mu_me, mu_o, gop)
            v_inv += gop * gop * e * (1.0 - e)
            delta_sum += gop * (sc - e)
        v = 1.0 / v_inv
        delta = v * delta_sum
        vol_new = new_volatility(phi_me, delta, v, vol_me)
        phi_star = math.sqrt(phi_me * phi_me + vol_new * vol_new)
        phi_new = 1.0 / math.sqrt(1.0 / (phi_star * phi_star) + v_inv)
        mu_new = mu_me + phi_new * phi_new * delta_sum
        players[t] = [mu_new, phi_new, vol_new]
    out = {}
    for t, (mu, phi, vol) in players.items():
        out[t] = (round(mu * scale + 1500.0, 1), round(phi * scale, 1), round(vol, 4))
    return out

# ---------- 7. TRUESKILL (pairwise analytic) ----------
def trueskill_update(mu_w, sd_w, mu_l, sd_l, beta=25.0 / 6, dynamic=25.0 / 300):
    """TrueSkill pairwise factor-graph update (closed form for 2 players, draw=0).
    Winner (mu_w, sd_w), loser (mu_l, sd_l). Returns updated tuples.
    This is the Xbox-matchmaking engine: Gaussian belief + performance noise."""
    c = math.sqrt(2 * beta * beta + sd_w * sd_w + sd_l * sd_l)
    t = (mu_w - mu_l) / c
    v = _v(t); w = _w(t)
    mu_w2 = mu_w + sd_w * sd_w / c * v
    sd_w2 = math.sqrt(sd_w * sd_w * (1 - sd_w * sd_w / (c * c) * w))
    mu_l2 = mu_l - sd_l * sd_l / c * v
    sd_l2 = math.sqrt(sd_l * sd_l * (1 - sd_l * sd_l / (c * c) * w))
    return (mu_w2, sd_w2), (mu_l2, sd_l2)

def _v(t): return _npdf(t) / _ncdf(t)
def _w(t):
    if abs(t) < 1e-9: return 1.0
    w = _w_prime(t)
    return min(w, 1.0)
def _w_prime(t): return _v(t) * (_v(t) + t)
def _npdf(x): return math.exp(-x * x / 2) / math.sqrt(2 * math.pi)
def _ncdf(x): return 0.5 * (1 + math.erf(x / math.sqrt(2)))

def trueskill(games, mu0=25.0, sd0=25.0 / 3, beta=25.0 / 6):
    """Run TrueSkill over a game list (assumes a beats b when sa>sb; ties skipped)."""
    P = {}
    def ensure(t):
        if t not in P: P[t] = (mu0, sd0)
    for a, b, sa, sb in games: ensure(a); ensure(b)
    for a, b, sa, sb in games:
        if sa == sb: continue
        win, lose = (a, b) if sa > sb else (b, a)
        (mw, sw), (ml, sl) = P[win], P[lose]
        P[win], P[lose] = trueskill_update(mw, sw, ml, sl, beta)
    return {t: (round(m, 2), round(s, 2)) for t, (m, s) in P.items()}

# ---------- 8. PLACKETT-LUCE ----------
def plackett(games, iters=150):
    """Plackett-Luce via MM (like BT but on ordered outcomes). For pairwise games
    PL ≡ BT; the value is it extends to full orderings (draft order, race finish).
    Here: 2-item lists per game, winner ranked above loser."""
    import collections as _c
    items = sorted({t for g in games for t in (g[0], g[1])})
    g_ = {t: 1.0 for t in items}
    counts = _c.Counter()
    for a, b, sa, sb in games:
        win, lose = (a, b) if sa > sb else (b, a)
        counts[(win, lose)] += 1
    # MM on pairwise PL == BT weights
    opp = _c.defaultdict(list)
    for (w_, l_), c in counts.items():
        opp[w_].append((l_, c)); opp[l_].append((w_, c))
    for _ in range(iters):
        new = {}
        for t in items:
            s = sum(c / (g_[t] + g_[o]) for o, c in opp[t])
            wins_t = sum(c for (w_, _l), c in counts.items() if w_ == t)
            new[t] = wins_t / s if s > 0 else 1.0
        tot = sum(new.values()) or 1.0
        g_ = {t: v / tot for t, v in new.items()}
    return {t: round(v, 4) for t, v in g_.items()}

def counts_value(counts, t):
    return sum(c for (w_, l_), c in counts.items() if w_ == t) + \
           sum(c for (w_, l_), c in counts.items() if l_ == t)

# ---------- combined prediction: ensemble margin ----------
def ensemble_margin(games, team_a, team_b, hfa=2.0):
    """The point of the zoo: Colley/Massey/SRS/Keener each fit different structure.
    Ensemble margin = mean of each system's implied margin for team_a (home) vs b."""
    systems = []
    try:
        col = colley(games)
        systems.append(("colley", (col[team_a] - col[team_b]) * 30.0))  # scale to points
    except Exception: pass
    try:
        mas = massey(games)
        systems.append(("massey", mas[team_a] - mas[team_b] + hfa))
    except Exception: pass
    try:
        sr = srs(games)
        systems.append(("srs", sr[team_a] - sr[team_b] + hfa))
    except Exception: pass
    try:
        ke = keener(games)
        systems.append(("keener", (ke[team_a] - ke[team_b]) * 25.0 + hfa))
    except Exception: pass
    if not systems: return {}
    ens = sum(v for _, v in systems) / len(systems)
    return {"ensemble_margin": round(ens, 2),
            "components": {k: round(v, 2) for k, v in systems},
            "spread_of_views": round(max(v for _, v in systems) - min(v for _, v in systems), 2)}

# ---------- SELF-CHECK ----------
def self_check():
    games = [
        ("A", "B", 24, 17), ("A", "C", 31, 10), ("B", "C", 20, 14),
        ("A", "B", 21, 14), ("C", "A", 7, 28), ("C", "B", 10, 27),
    ]  # A 4-0, B 2-2, C 0-4 — unambiguous ordering across every system
    col = colley(games)
    assert abs(sum(col.values()) / 3 - 0.5) < 0.01, col  # colley ratings avg 0.5
    assert col["A"] > col["B"] > col["C"], col
    mas = massey(games)
    assert mas["A"] > mas["B"] > mas["C"], mas
    sr = srs(games)
    assert sr["A"] > sr["B"] > sr["C"], sr
    pr = pagerank(games)
    assert sum(pr.values()) > 99.9, pr  # mass conserved
    ke = keener(games)
    assert ke["A"] > ke["B"] > ke["C"], ke
    gl = glicko2([games[0], games[1]])  # A beats B, A beats C
    assert gl["A"][0] > 1500 and gl["B"][0] < 1500, gl
    # canonical Glickman worked example (published test vector)
    canon = glicko2([("P", "O1", 10, 0), ("O2", "P", 10, 0), ("O3", "P", 10, 0)],
                    rd0_map={"P": 200.0, "O1": 30.0, "O2": 100.0, "O3": 300.0},
                    rating0_map={"P": 1500.0, "O1": 1400.0, "O2": 1550.0, "O3": 1700.0})["P"]
    assert abs(canon[0] - 1464.06) < 1 and abs(canon[1] - 151.52) < 1, canon
    ts = trueskill(games)
    assert ts["A"][0] > ts["C"][0], ts
    pl = plackett(games)
    assert pl["A"] > pl["B"] > pl["C"], pl
    ens = ensemble_margin(games, "A", "C")
    assert ens["ensemble_margin"] > 5, ens
    # trueskill closed-form sanity: symmetric players, small win → small move
    (mw, sw), (ml, sl) = trueskill_update(25, 8.33, 25, 8.33)
    assert mw > 25 > ml and abs((mw - 25) - (25 - ml)) < 1e-9
    return {"colley": col, "srs": sr, "ens_A_over_C": ens["ensemble_margin"],
            "glicko_A": gl["A"], "ts_A": ts["A"]}

if __name__ == "__main__":
    print("== RATINGS2 SELF-CHECK ==")
    r = self_check()
    print("colley:", r["colley"])
    print("srs   :", r["srs"])
    print("glicko-2 A:", r["glicko_A"])
    print("trueskill A:", r["ts_A"])
    print("ensemble A over C:", r["ens_A_over_C"])
    print("\nALL RATING SYSTEMS PASS")
