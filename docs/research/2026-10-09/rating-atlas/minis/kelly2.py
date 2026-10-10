#!/usr/bin/env python3
"""kelly2.py — portfolio-level Kelly, not the naive per-bet version.

1. simultaneous_kelly: maximize E[log(1 + Σf_i·X_i)] over correlated binary
   bets via Monte-Carlo gradient ascent (the Whitrow/Lemieux problem — naive
   per-bet Kelly overweights correlated portfolios).
2. risk_of_ruin: MC of bankroll paths with the Kelly fractions; P(hit floor),
   median drawdown, and the classical Dubins-Savage bound for comparison.
3. drawdown_stats: the survival side of growth-optimal sizing.
Pure stdlib.
"""
import math
import random

def _cholesky(A):
    """Cholesky–Banachiewicz for small PD matrices (pure stdlib)."""
    n = len(A)
    L = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(i + 1):
            s = sum(L[i][k] * L[j][k] for k in range(j))
            if i == j:
                L[i][j] = math.sqrt(max(A[i][i] - s, 1e-12))
            else:
                L[i][j] = (A[i][j] - s) / L[j][j]
    return L

def norm_cdf(x):
    return 0.5 * (1 + math.erf(x / math.sqrt(2)))

def _bet_payout(amer, win, stake_frac):
    """Per-unit-bet return: b if win, -1 if lose (b from american odds)."""
    b = (amer / 100.0) if amer > 0 else (100.0 / -amer)
    return stake_frac * (b if win else -1.0)

def _mv_normal(rho, n_sims, seed):
    """Simulate correlated Bernoulli pairs via Gaussian copula for a slate."""
    rnd = random.Random(seed)
    sr = math.sqrt(max(rho, 0.0)); s1 = math.sqrt(1 - max(rho, 0.0))
    draws = []
    for _ in range(n_sims):
        f = rnd.gauss(0, 1)
        draws.append((f, [sr * f + s1 * rnd.gauss(0, 1) for _ in range(1)]))
    return rnd

def simultaneous_kelly(bets, rho_matrix=None, n_sims=6000, iters=30, lr=0.5, cap=0.25, seed=11):
    """bets = [{'p','amer','name'}], rho_matrix = n×n correlation of outcomes.
    Gradient ascent on MC-estimated E[log growth]; projected to Σf ≤ cap.
    Returns optimal fractions + growth vs naive-Kelly comparison."""
    n = len(bets)
    if n == 0: return {"fractions": [], "growth": 0.0}
    rnd = random.Random(seed)
    # correlated Bernoulli slate via Gaussian copula + Cholesky (rho = latent/rank corr)
    A = rho_matrix if rho_matrix else [[1.0 if i == j else 0.0 for j in range(n)] for i in range(n)]
    L = _cholesky(A)
    mults = []  # mults[sim][i] = b_i if win else -1
    for _ in range(n_sims):
        x = [rnd.gauss(0, 1) for _ in range(n)]
        z = [sum(L[i][j] * x[j] for j in range(i + 1)) for i in range(n)]
        wins = tuple(norm_cdf(z[i]) < bets[i]["p"] for i in range(n))
        mults.append([((b["amer"] / 100.0) if b["amer"] > 0 else (100.0 / -b["amer"])) if w else -1.0
                      for w, b in zip(wins, bets)])
    def growth(fracs):
        g = 0.0
        for m in mults:
            ret = 0.0
            for f, mi in zip(fracs, m):
                if f > 0:
                    ret += f * mi
            g += math.log(1.0 + ret) if ret > -1.0 else math.log(1e-9)
        return g / len(mults)
    # naive per-bet Kelly as starting point, projected into the cap
    f = []
    for bet in bets:
        b = (bet["amer"] / 100.0) if bet["amer"] > 0 else (100.0 / -bet["amer"])
        f.append(max((b * bet["p"] - (1 - bet["p"])) / b, 0.0))
    s0 = sum(f)
    if s0 > cap:
        f = [x * cap / s0 for x in f]
    # projected gradient ascent with backtracking (monotone improvement)
    cur_g = growth(f)
    step = lr
    for _ in range(iters):
        eps = 0.0025
        grad = []
        for i in range(n):
            fp = f[:]; fp[i] = min(fp[i] + eps, 1.0)
            grad.append((growth(fp) - cur_g) / eps)
        improved = False
        for _try in range(6):
            cand = [fi + step * gi for fi, gi in zip(f, grad)]
            cand = [max(x, 0.0) for x in cand]
            s = sum(cand)
            if s > cap:
                cand = [x * cap / s for x in cand]
            g_new = growth(cand)
            if g_new > cur_g + 1e-7:
                f, cur_g = cand, g_new
                step = min(step * 1.3, 1.0)
                improved = True
                break
            step *= 0.5
        if not improved and step < 1e-4:
            break
    g_opt = growth(f)
    # compare: independent Kelly (uncapped) growth
    f_naive = []
    for bet in bets:
        b = (bet["amer"] / 100.0) if bet["amer"] > 0 else (100.0 / -bet["amer"])
        f_naive.append(max((b * bet["p"] - (1 - bet["p"])) / b, 0.0))
    g_naive = growth(f_naive)
    return {"fractions": [round(x, 4) for x in f],
            "growth_per_round": round(g_opt, 5),
            "naive_kelly_fractions": [round(x, 4) for x in f_naive],
            "naive_growth": round(g_naive, 5),
            "naive_total": round(sum(f_naive), 3), "opt_total": round(sum(f), 3)}

def risk_of_ruin(bets, fracs, bankroll=100.0, floor_frac=0.5, rounds=200, trials=500, seed=3):
    """MC: probability of drawing down to floor_frac×bankroll within `rounds` bets,
    median final bankroll, p5/p95. The survival side of the Kelly coin."""
    rnd = random.Random(seed)
    floor = bankroll * floor_frac
    ruined = 0
    finals = []
    for _ in range(trials):
        bank = bankroll
        hit = False
        for _ in range(rounds):
            ret = 0.0
            for f, bet in zip(fracs, bets):
                if f > 0:
                    w = rnd.random() < bet["p"]
                    ret += _bet_payout(bet["amer"], w, f)
            bank *= (1.0 + ret)
            if bank <= floor:
                hit = True
                break
        if hit: ruined += 1
        finals.append(bank)
    finals.sort()
    med = finals[len(finals) // 2]
    p5 = finals[max(0, int(0.05 * len(finals)) - 1)]
    p95 = finals[min(len(finals) - 1, int(0.95 * len(finals)))]
    return {"p_ruin": round(ruined / trials, 4), "floor": floor,
            "median_final": round(med, 2), "p5_final": round(p5, 2), "p95_final": round(p95, 2),
            "rounds": rounds, "trials": trials}

def classical_ruin_even_money(p, f, units=100.0):
    """Feller's gambler's-ruin for repeated even-money bets at fraction f:
    R = ((q/p)^(units/f) − 1)/((q/p)^(units/f) ... simplified: R ≈ (q/p)^(N)
    where N = number of units of risk. Reference point for the MC."""
    q = 1 - p
    if p <= q: return 1.0
    n_risk = units / max(f, 1e-9)
    return (q / p) ** n_risk

def drawdown_curve(bets, fracs, bankroll=100.0, rounds=200, trials=300, seed=8):
    """Max drawdown distribution — how deep the valleys go before the peaks."""
    rnd = random.Random(seed)
    dds = []
    for _ in range(trials):
        bank = bankroll
        peak = bank
        max_dd = 0.0
        for _ in range(rounds):
            ret = 0.0
            for f, bet in zip(fracs, bets):
                if f > 0:
                    w = rnd.random() < bet["p"]
                    ret += _bet_payout(bet["amer"], w, f)
            bank *= (1.0 + ret)
            peak = max(peak, bank)
            max_dd = max(max_dd, (peak - bank) / peak)
        dds.append(max_dd)
    dds.sort()
    return {"median_max_dd": round(dds[len(dds)//2], 3),
            "p95_max_dd": round(dds[int(0.95*len(dds))-1], 3),
            "worst": round(dds[-1], 3)}

if __name__ == "__main__":
    print("== SIMULTANEOUS KELLY (3 correlated same-game props) ==")
    bets = [
        {"p": 0.60, "amer": -110, "name": "A receptions o5.5"},
        {"p": 0.57, "amer": -115, "name": "A yards o59.5"},
        {"p": 0.55, "amer": +105, "name": "A anytime TD"},
    ]
    rho = [[1.0, 0.55, 0.30], [0.55, 1.0, 0.30], [0.30, 0.30, 1.0]]
    r = simultaneous_kelly(bets, rho, n_sims=8000, iters=40)
    print(f"  optimal fractions : {r['fractions']} (total {r['opt_total']})")
    print(f"  growth/round      : {r['growth_per_round']}")
    print(f"  naive fractions   : {r['naive_kelly_fractions']} (total {r['naive_total']})")
    print(f"  naive growth      : {r['naive_growth']}  <- overweights correlated slate")
    print("\n== RISK OF RUIN on the optimized fractions ==")
    rr = risk_of_ruin(bets, r["fractions"], bankroll=100.0, floor_frac=0.5, rounds=200)
    print(f"  {rr}")
    dd = drawdown_curve(bets, r["fractions"])
    print(f"  drawdown: {dd}")
    print("\n== CLASSICAL BOUND (single even-money p=0.55, f=half-Kelly, 100 units) ==")
    fk = (0.55 * 1.0 - 0.45) / 1.0  # b=1
    print(f"  full-Kelly f*={fk:.2f}; classical ruin at f=fk/2: "
          f"{classical_ruin_even_money(0.55, fk/2, units=100):.2e}")
    print(f"  classical ruin at f=2×full-Kelly: "
          f"{classical_ruin_even_money(0.55, min(fk*2, 0.99), units=100):.4f}")
