"""EQ004 TEST — OU with the nflfastR exponential clock kernel.

mu_path(t) = close * exp(-k * t/3600), sweep k in {-2,-3,-4,-5,-6,-8}
Same 285 games, same 1,140 game×quarter rows, same close baseline (0.2167).
Comparison: v1 linear (Q1 0.3107 / Q2 0.2580 / Q3 0.1939 / Q4 0.1387),
            v2 empirical attractor (0.2438 / 0.2115 / 0.1704 / 0.1326).
"""
import pyarrow.parquet as pq
import pandas as pd
import numpy as np
import json, math, time, os

HERE = os.path.dirname(os.path.abspath(__file__))
GAME_LEN = 3600.0

t = pq.read_table(os.path.join(HERE, '..', 'intelligence', 'coaching', 'data', 'play_by_play_2025.parquet'),
    columns=['game_id', 'home_team', 'posteam', 'score_differential', 'spread_line',
             'game_seconds_remaining'])
df = t.to_pandas()
df['home_diff'] = [x if p == h else -x for x, p, h in
                   zip(df.score_differential, df.posteam, df.home_team)]
df = df.dropna(subset=['game_seconds_remaining', 'home_diff', 'spread_line'])
df['t_elapsed'] = GAME_LEN - df['game_seconds_remaining']

games = []
for gid, grp in df.groupby('game_id'):
    g = grp.sort_values('t_elapsed').drop_duplicates(subset=['t_elapsed'], keep='last')
    if len(g) < 40:
        continue
    games.append({'game_id': gid, 'close': float(g['spread_line'].iloc[0]),
                  't': g['t_elapsed'].values.astype(float),
                  'T': g['home_diff'].values.astype(float)})

def fit_and_grade(k):
    """OU with mu_path = close * exp(-k * t/3600)."""
    dT_all, gap_all, dt_all = [], [], []
    for g in games:
        T, t = g['T'], g['t']
        close = g['close']
        for i in range(1, len(T)):
            dt = t[i] - t[i-1]
            if dt <= 0 or dt > 300:
                continue
            mu = close * math.exp(-k * t[i-1] / GAME_LEN)
            dT_all.append(T[i] - T[i-1])
            gap_all.append(mu - T[i-1])
            dt_all.append(dt)
    X = np.array(gap_all) * np.array(dt_all)
    y = np.array(dT_all)
    theta = np.dot(X, y) / max(np.dot(X, X), 1e-9)
    resid = y - theta * X
    sigma = np.std(resid) / np.sqrt(np.mean(dt_all))
    # quarter RVC
    rvc = []
    for g in games:
        T, t, close = g['T'], g['t'], g['close']
        final_T = T[-1]
        for qtr_rem in [3600, 2700, 1800, 900]:
            elapsed = GAME_LEN - qtr_rem
            idx = min(np.searchsorted(t, elapsed), len(T) - 1)
            T_t, t_t = T[idx], t[idx]
            dt_rem = max(GAME_LEN - t_t, 1)
            mu_now = close * math.exp(-k * t_t / GAME_LEN)
            mu_end = close * math.exp(-k * (GAME_LEN - 1) / GAME_LEN)
            exp_final = mu_end + (T_t - mu_now) * math.exp(-theta * dt_rem)
            sd_final = sigma * math.sqrt((1 - math.exp(-2 * theta * dt_rem)) / (2 * theta))
            p_ou = 0.5 * (1 + math.erf(exp_final / (sd_final * math.sqrt(2))))
            p_close = 0.5 * (1 + math.erf(close / (13.3 * math.sqrt(2))))
            outcome = 1.0 if final_T > 0 else 0.0
            rvc.append({'qtr': qtr_rem, 'p_ou': p_ou, 'p_close': p_close, 'outcome': outcome})
    rvc = pd.DataFrame(rvc)
    by_q = {}
    for q in [3600, 2700, 1800, 900]:
        sub = rvc[rvc.qtr == q]
        by_q[q] = round(float((sub.p_ou - sub.outcome).pow(2).mean()), 4)
    overall = round(float((rvc.p_ou - rvc.outcome).pow(2).mean()), 4)
    hl = math.log(2) / theta / 60 if theta > 0 else 9999
    return {'k': k, 'theta': round(float(theta), 6), 'sigma': round(float(sigma), 4),
            'half_life_min': round(float(hl), 1), 'brier_overall': overall, 'by_quarter': by_q}

results = []
for k in [2, 3, 4, 5, 6, 8]:
    r = fit_and_grade(k)
    results.append(r)
    q = r['by_quarter']
    print(f"k={k}: overall {r['brier_overall']:.4f} | Q1 {q[3600]:.4f} Q2 {q[2700]:.4f} "
          f"Q3 {q[1800]:.4f} Q4 {q[900]:.4f} | θ={r['theta']:.6f} HL={r['half_life_min']:.0f}min")

best = min(results, key=lambda r: r['brier_overall'])
print(f"\nBEST: k={best['k']} overall {best['brier_overall']:.4f} (empirical attractor was 0.1896, close 0.2167)")

stamp = {
    'observed_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    'test': 'EQ004 — OU with nflfastR exponential clock kernel, k sweep',
    'spec': 'mu_path(t) = close * exp(-k * t/3600); nflfastR uses k=4 (10.4min kernel half-life)',
    'sweep': results,
    'baselines': {'close': 0.2167, 'v1_linear': 0.2283, 'v2_empirical_attractor': 0.1896},
    'best': best,
    'verdict': 'DIAGNOSTIC — the parametric kernel vs the empirical attractor: whichever wins becomes the live-WP base.',
    'label': 'DIAGNOSTIC',
}
json.dump(stamp, open(os.path.join(HERE, 'EQ004_EXP_KERNEL_TEST.json'), 'w'), indent=1)
print('landed EQ004_EXP_KERNEL_TEST.json')
