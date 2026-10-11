"""EMPIRICAL OU ATTRACTOR — replace the linear-decay mu_path with the data-driven one.

Step 1: fit E[home margin path | closing spread] from the frozen manifest (pbp 2025).
        Bucket by closing spread magnitude; the attractor at time t is the mean home margin
        across games in the bucket at elapsed t.
Step 2: re-run the OU quarter-boundary RVC with the empirical attractor.
        Same 285 games, same 1,140 game×quarter rows, same close baseline.
Step 3: stamp. Q1/Q2 are the test — the linear-decay spec failed there.

Zero fabrication: attractor estimated from real pbp paths; same outcomes as before.
"""
import pyarrow.parquet as pq
import pandas as pd
import numpy as np
import json, math, time, os

HERE = os.path.dirname(os.path.abspath(__file__))
GAME_LEN = 3600.0

# ---------- load pbp paths (2025, same as v1) ----------
t = pq.read_table(os.path.join(HERE, '..', 'intelligence', 'coaching', 'data', 'play_by_play_2025.parquet'),
    columns=['game_id', 'home_team', 'posteam', 'score_differential', 'spread_line',
             'game_seconds_remaining'])
df = t.to_pandas()
df['home_diff'] = [x if p == h else -x for x, p, h in
                   zip(df.score_differential, df.posteam, df.home_team)]
df = df.dropna(subset=['game_seconds_remaining', 'home_diff', 'spread_line'])
df['t_elapsed'] = GAME_LEN - df['game_seconds_remaining']

# ---------- build per-game paths ----------
games = []
for gid, grp in df.groupby('game_id'):
    g = grp.sort_values('t_elapsed').drop_duplicates(subset=['t_elapsed'], keep='last')
    if len(g) < 40:
        continue
    games.append({'game_id': gid, 'close': float(g['spread_line'].iloc[0]),
                  't': g['t_elapsed'].values.astype(float),
                  'T': g['home_diff'].values.astype(float)})
print(f'games: {len(games)}')

# ---------- STEP 1: empirical attractor ----------
# Grid: 36 cells of 100 elapsed-seconds. Attractor(cell, spread_bucket) = mean T across games.
# Spread buckets by |close|: small (<3), mid (3-7), big (7-14), huge (14+)
def spread_bucket(c):
    a = abs(c)
    if a < 3: return 'small'
    if a < 7: return 'mid'
    if a < 14: return 'big'
    return 'huge'

# signed convention: home margin vs home-favored close.
# manifest spread_line: negative = home favored (matches earlier verify: -7.5 home fav)
cells = {}   # (bucket, cell) -> list of T
for g in games:
    b = spread_bucket(g['close'])
    for i, tt in enumerate(g['t']):
        cell = min(int(tt // 100), 35)
        cells.setdefault((b, cell), []).append(g['T'][i])

# attractor curve per bucket: interpolate across cells
attractor = {}
for (b, cell), vals in cells.items():
    attractor.setdefault(b, {})[cell] = float(np.mean(vals))

def attractor_at(b, t_elapsed):
    """Empirical attractor at elapsed time for spread bucket b (linear interp between cells)."""
    curve = attractor.get(b)
    if not curve:
        return 0.0
    cell = t_elapsed / 100.0
    c0 = int(cell)
    if c0 >= 35:
        return curve.get(35, 0.0)
    v0 = curve.get(c0, 0.0)
    v1 = curve.get(c0 + 1, v0)
    w = cell - c0
    return v0 + w * (v1 - v0)

# attractor summary
print('\nEmpirical attractor (mean home margin by elapsed time, by spread bucket):')
for b in ['small', 'mid', 'big', 'huge']:
    curve = attractor.get(b, {})
    pts = [f'{c*100}s:{curve[c]:+.1f}' for c in sorted(curve) if c in (0, 9, 18, 27, 30, 33, 35)]
    n_cells = len(curve)
    print(f'  {b:5s} ({n_cells:2d} cells): ' + ' '.join(pts))

# fit theta against the EMPIRICAL attractor (same regression as v1, new mu)
dT_all, gap_all, dt_all = [], [], []
for g in games:
    b = spread_bucket(g['close'])
    T, t = g['T'], g['t']
    for i in range(1, len(T)):
        dt = t[i] - t[i-1]
        if dt <= 0 or dt > 300:
            continue
        mu_emp = attractor_at(b, t[i-1])
        dT_all.append(T[i] - T[i-1])
        gap_all.append(mu_emp - T[i-1])
        dt_all.append(dt)
X = np.array(gap_all) * np.array(dt_all)
y = np.array(dT_all)
theta = np.dot(X, y) / max(np.dot(X, X), 1e-9)
resid = y - theta * X
sigma = np.std(resid) / np.sqrt(np.mean(dt_all))
hl = math.log(2) / theta if theta > 0 else float('inf')
print(f'\nOU fit vs EMPIRICAL attractor: theta={theta:.6f}/s sigma={sigma:.4f}/√s '
      f'half-life={hl/60:.0f}min n={len(dT_all)}')

# ---------- STEP 2: quarter-boundary RVC with empirical attractor ----------
# At quarter boundary: E[T_final] = attractor_at(b, 3600) + (T_t - attractor_at(b, t_t)) * exp(-theta*dt_rem)
# sd same OU formula. Attractor at 3600 = the empirical mean FINAL margin for that bucket.
rvc = []
for g in games:
    b = spread_bucket(g['close'])
    T, t, close = g['T'], g['t'], g['close']
    final_T = T[-1]
    for qtr_rem in [3600, 2700, 1800, 900]:
        elapsed = GAME_LEN - qtr_rem
        idx = min(np.searchsorted(t, elapsed), len(T) - 1)
        T_t, t_t = T[idx], t[idx]
        dt_rem = max(GAME_LEN - t_t, 1)
        mu_now = attractor_at(b, t_t)
        mu_end = attractor_at(b, GAME_LEN - 1)
        exp_final = mu_end + (T_t - mu_now) * math.exp(-theta * dt_rem)
        sd_final = sigma * math.sqrt((1 - math.exp(-2 * theta * dt_rem)) / (2 * theta))
        p_ou = 0.5 * (1 + math.erf(exp_final / (sd_final * math.sqrt(2))))
        p_close = 0.5 * (1 + math.erf(close / (13.3 * math.sqrt(2))))
        outcome = 1.0 if final_T > 0 else 0.0
        rvc.append({'qtr': qtr_rem, 'p_ou': p_ou, 'p_close': p_close, 'outcome': outcome})
rvc = pd.DataFrame(rvc)
b_ou = (rvc.p_ou - rvc.outcome).pow(2).mean()
b_cl = (rvc.p_close - rvc.outcome).pow(2).mean()
print(f'\nRVC v2 (empirical attractor), {len(rvc)} rows:')
print(f'  Brier OU-empirical: {b_ou:.4f}')
print(f'  Brier close:        {b_cl:.4f}')
print(f'  delta:              {b_cl - b_ou:+.4f} ({"OU wins" if b_ou < b_cl else "close wins"})')
for q in [3600, 2700, 1800, 900]:
    sub = rvc[rvc.qtr == q]
    bo = (sub.p_ou - sub.outcome).pow(2).mean()
    bc = (sub.p_close - sub.outcome).pow(2).mean()
    print(f'  Q@{q}s: OU {bo:.4f} close {bc:.4f} → {"OU wins" if bo < bc else "close wins"} ({bc-bo:+.4f})')

# compare vs v1 (linear decay) numbers: Q1 0.3107 Q2 0.2580 Q3 0.1939 Q4 0.1387
v1 = {3600: 0.3107, 2700: 0.2580, 1800: 0.1939, 900: 0.1387}
print('\nv1 (linear decay) → v2 (empirical):')
for q in [3600, 2700, 1800, 900]:
    sub = rvc[rvc.qtr == q]
    bo = (sub.p_ou - sub.outcome).pow(2).mean()
    print(f'  Q@{q}s: {v1[q]:.4f} → {bo:.4f} ({bo - v1[q]:+.4f})')

# ---------- STEP 3: stamp ----------
stamp = {
    'observed_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    'test': 'OU v2 — empirical attractor replaces linear-decay mu_path',
    'attractor': {
        'spec': 'E[home margin | elapsed t, |close| bucket] from 285 pbp game paths, 100s cells, 4 spread buckets',
        'buckets': {b: {str(int(c*100)): round(v, 2) for c, v in sorted(curve.items()) if c in (0, 9, 18, 27, 35)}
                    for b, curve in attractor.items()},
    },
    'fit': {'theta_per_s': round(float(theta), 6), 'sigma_per_sqrt_s': round(float(sigma), 4),
            'half_life_min': round(float(hl) / 60, 1), 'n_play_pairs': len(dT_all), 'n_games': len(games)},
    'rvc_v2': {'n_rows': len(rvc), 'brier_ou': round(float(b_ou), 4), 'brier_close': round(float(b_cl), 4),
               'by_quarter': {str(q): {'brier_ou': round(float((rvc[rvc.qtr == q].p_ou - rvc[rvc.qtr == q].outcome).pow(2).mean()), 4),
                                        'brier_close': round(float((rvc[rvc.qtr == q].p_close - rvc[rvc.qtr == q].outcome).pow(2).mean()), 4)}
                              for q in [3600, 2700, 1800, 900]}},
    'v1_linear_for_comparison': {'Q1': 0.3107, 'Q2': 0.2580, 'Q3': 0.1939, 'Q4': 0.1387, 'overall_ou': 0.2283},
    'verdict': 'DIAGNOSTIC — empirical attractor vs linear decay: the by-quarter deltas decide. Nothing promoted.',
    'label': 'DIAGNOSTIC',
}
json.dump(stamp, open(os.path.join(HERE, 'OU_EMPIRICAL_ATTRACTOR_STAMP.json'), 'w'), indent=1)
rvc.to_csv(os.path.join(HERE, 'ou_v2_rvc_rows.csv'), index=False)
print('\nlanded OU_EMPIRICAL_ATTRACTOR_STAMP.json + ou_v2_rvc_rows.csv')
