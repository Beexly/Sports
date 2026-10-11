"""OU v3 — close-scaled diffusion (sigma by |close| bucket) on the empirical attractor.

Same 285 games, same 1,140 game x quarter rows, same baselines:
  close 0.2167 | v1 linear 0.2283 | v2 empirical 0.1896 (Q1 0.2438 / Q2 0.2115 / Q3 0.1704 / Q4 0.1326)

Change: sigma estimated PER |close| BUCKET (small/mid/big/huge) instead of global.
Hypothesis: big-close games (blowout priors) have wider margin diffusion; the global sigma
underestimates uncertainty in high-spread games, inflating OU confidence in early quarters.
"""
import pyarrow.parquet as pq
import pandas as pd
import numpy as np
import json
import math
import time
import os

HERE = os.path.dirname(os.path.abspath(__file__))
GAME_LEN = 3600.0

# ---------- load identical to v2 ----------
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

def spread_bucket(c):
    a = abs(c)
    if a < 3: return 'small'
    if a < 7: return 'mid'
    if a < 14: return 'big'
    return 'huge'

# ---------- empirical attractor (identical to v2) ----------
cells = {}
for g in games:
    b = spread_bucket(g['close'])
    for i, tt in enumerate(g['t']):
        cell = min(int(tt // 100), 35)
        cells.setdefault((b, cell), []).append(g['T'][i])
attractor = {}
for (b, cell), vals in cells.items():
    attractor.setdefault(b, {})[cell] = float(np.mean(vals))

def attractor_at(b, t_elapsed):
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

# ---------- fit: theta global (as v2), sigma PER BUCKET ----------
dT_all, gap_all, dt_all, bucket_all = [], [], [], []
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
        bucket_all.append(b)
X = np.array(gap_all) * np.array(dt_all)
y = np.array(dT_all)
theta = np.dot(X, y) / max(np.dot(X, X), 1e-9)
resid = y - theta * X
# per-bucket sigma
dfit = pd.DataFrame({'bucket': bucket_all, 'resid': resid, 'dt': dt_all})
sig_by = dfit.groupby('bucket').apply(
    lambda x: float(np.std(x.resid) / np.sqrt(np.mean(x.dt))), include_groups=False)
print('sigma by bucket:')
print(sig_by.round(4).to_string())
global_sigma = float(np.std(resid) / np.sqrt(np.mean(dt_all)))
print(f'(global sigma was {global_sigma:.4f})')

# ---------- quarter RVC with per-bucket sigma ----------
rvc = []
for g in games:
    b = spread_bucket(g['close'])
    T, t, close = g['T'], g['t'], g['close']
    final_T = T[-1]
    sig = sig_by.get(b, global_sigma)
    for qtr_rem in [3600, 2700, 1800, 900]:
        elapsed = GAME_LEN - qtr_rem
        idx = min(np.searchsorted(t, elapsed), len(T) - 1)
        T_t, t_t = T[idx], t[idx]
        dt_rem = max(GAME_LEN - t_t, 1)
        mu_now = attractor_at(b, t_t)
        mu_end = attractor_at(b, GAME_LEN - 1)
        exp_final = mu_end + (T_t - mu_now) * math.exp(-theta * dt_rem)
        sd_final = sig * math.sqrt((1 - math.exp(-2 * theta * dt_rem)) / (2 * theta))
        p_ou = 0.5 * (1 + math.erf(exp_final / (sd_final * math.sqrt(2))))
        p_close = 0.5 * (1 + math.erf(close / (13.3 * math.sqrt(2))))
        outcome = 1.0 if final_T > 0 else 0.0
        rvc.append({'qtr': qtr_rem, 'p_ou': p_ou, 'p_close': p_close, 'outcome': outcome})
rvc = pd.DataFrame(rvc)
b_ou = (rvc.p_ou - rvc.outcome).pow(2).mean()
b_cl = (rvc.p_close - rvc.outcome).pow(2).mean()
print(f'\nRVC v3 (per-bucket sigma), {len(rvc)} rows:')
print(f'  Brier OU v3: {b_ou:.4f} (v2 was 0.1896)')
print(f'  Brier close: {b_cl:.4f}')
for q in [3600, 2700, 1800, 900]:
    sub = rvc[rvc.qtr == q]
    bo = (sub.p_ou - sub.outcome).pow(2).mean()
    v2 = {3600: 0.2438, 2700: 0.2115, 1800: 0.1704, 900: 0.1326}[q]
    bc = (sub.p_close - sub.outcome).pow(2).mean()
    print(f'  Q@{q}s: v3 {bo:.4f} (v2 {v2:.4f}, {bo-v2:+.4f}) close {bc:.4f}')

stamp = {
    'observed_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    'test': 'OU v3 — close-scaled diffusion (sigma per |close| bucket) on empirical attractor',
    'sigma_by_bucket': {k: round(v, 4) for k, v in sig_by.items()},
    'global_sigma_v2': round(global_sigma, 4),
    'theta': round(float(theta), 6),
    'rvc_v3': {'brier_overall': round(float(b_ou), 4), 'brier_close': round(float(b_cl), 4),
               'v2_overall': 0.1896,
               'by_quarter': {str(q): round(float((rvc[rvc.qtr == q].p_ou - rvc[rvc.qtr == q].outcome).pow(2).mean()), 4)
                              for q in [3600, 2700, 1800, 900]}},
    'label': 'DIAGNOSTIC',
}
json.dump(stamp, open(os.path.join(HERE, 'OU_V3_SCALED_DIFFUSION.json'), 'w'), indent=1)
rvc.to_csv(os.path.join(HERE, 'ou_v3_rvc_rows.csv'), index=False)
print('\nlanded OU_V3_SCALED_DIFFUSION.json')
