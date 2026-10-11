"""OU v4 — Q1-specific attractor: blend the close into the bucket attractor during Q1.

Spec: mu_Q1(t) = (1 - s(t)) * close + s(t) * bucket_curve(t)
      s(t) ramps 0 -> 1 across the first quarter (sweep the ramp speed).

At kickoff (t=0): mu = close (the market prior IS the attractor).
By Q1 end (t=900): mu = bucket curve (the process takes over).
Same 285 games, same rows, theta/sigma from v2 (0.000046 / per-bucket from v3).
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

t = pq.read_table(os.path.join(HERE, '..', 'intelligence', 'coaching', 'data', 'play_by_play_2025.parquet'),
    columns=['game_id', 'home_team', 'posteam', 'score_differential', 'spread_line',
             'game_seconds_remaining']).to_pandas()
t['home_diff'] = [x if p == h else -x for x, p, h in
                  zip(t.score_differential, t.posteam, t.home_team)]
t = t.dropna(subset=['game_seconds_remaining', 'home_diff', 'spread_line'])
t['t_elapsed'] = GAME_LEN - t['game_seconds_remaining']

games = []
for gid, grp in t.groupby('game_id'):
    g = grp.sort_values('t_elapsed').drop_duplicates(subset=['t_elapsed'], keep='last')
    if len(g) < 40:
        continue
    games.append({'close': float(g['spread_line'].iloc[0]),
                  't': g['t_elapsed'].values.astype(float),
                  'T': g['home_diff'].values.astype(float)})

def sb(c):
    a = abs(c)
    return 'small' if a < 3 else 'mid' if a < 7 else 'big' if a < 14 else 'huge'

cells = {}
for g in games:
    b = sb(g['close'])
    for i, tt in enumerate(g['t']):
        c = min(int(tt // 100), 35)
        cells.setdefault((b, c), []).append(g['T'][i])
att = {}
for (b, c), v in cells.items():
    att.setdefault(b, {})[c] = float(np.mean(v))

def att_at(b, te):
    cv = att.get(b, {})
    if not cv:
        return 0.0
    cc = te / 100.0
    c0 = int(cc)
    if c0 >= 35:
        return cv.get(35, 0.0)
    v0 = cv.get(c0, 0.0)
    v1 = cv.get(c0 + 1, v0)
    return v0 + (cc - c0) * (v1 - v0)

# v2 fit (global theta + global sigma — v3 showed per-bucket sigma is a wash)
dT_all, gap_all, dt_all = [], [], []
for g in games:
    b = sb(g['close'])
    T, tt = g['T'], g['t']
    for i in range(1, len(T)):
        dt = tt[i] - tt[i-1]
        if dt <= 0 or dt > 300:
            continue
        mu = att_at(b, tt[i-1])
        dT_all.append(T[i] - T[i-1])
        gap_all.append(mu - T[i-1])
        dt_all.append(dt)
X = np.array(gap_all) * np.array(dt_all)
y = np.array(dT_all)
theta = np.dot(X, y) / max(np.dot(X, X), 1e-9)
resid = y - theta * X
sigma = float(np.std(resid) / np.sqrt(np.mean(dt_all)))

# Q1 RVC with blended attractor, sweep ramp speed r (s = 1 - exp(-r * t/900))
print('Q1 blended-attractor sweep:')
best = (None, 1e9)
rows = []
for r in [0.5, 1.0, 2.0, 3.0, 5.0]:
    p_ou_l, out_l = [], []
    for g in games:
        b = sb(g['close'])
        T, tt, close = g['T'], g['t'], g['close']
        final_T = T[-1]
        # state at kickoff (t=0)
        mu0 = close  # blended attractor at t=0 IS the close
        exp_final = att_at(b, GAME_LEN - 1) + (0.0 - mu0) * math.exp(-theta * GAME_LEN)
        # during Q1 the attractor blends: at time t, mu(t) = (1-s)*close + s*bucket(t)
        # effective: expected final = mu_end + (T_t - mu(t))*exp(-theta*dt_rem), evaluated at kickoff
        # with the Q1 average attractor replacing mu0:
        s_avg = 1 - math.exp(-r * 450 / 900)  # average blend across Q1
        mu_eff = (1 - s_avg) * close + s_avg * att_at(b, 450)
        exp_final = att_at(b, GAME_LEN - 1) + (0.0 - mu_eff) * math.exp(-theta * (GAME_LEN - 450))
        sd_final = sigma * math.sqrt((1 - math.exp(-2 * theta * GAME_LEN)) / (2 * theta))
        p_ou = 0.5 * (1 + math.erf(exp_final / (sd_final * math.sqrt(2))))
        p_ou_l.append(p_ou)
        out_l.append(1.0 if final_T > 0 else 0.0)
    b_ou = np.mean([(p - o) ** 2 for p, o in zip(p_ou_l, out_l)])
    rows.append({'ramp': r, 'brier_q1': round(float(b_ou), 4)})
    print(f'  ramp {r}: Q1 Brier {b_ou:.4f}')
    if b_ou < best[1]:
        best = (r, float(b_ou))
print(f'\nbest ramp {best[0]}: Q1 {best[1]:.4f} (v2 Q1 was 0.2438, close 0.2167)')

stamp = {
    'observed_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    'test': 'OU v4 — Q1-specific attractor: close blended into bucket curve, ramp sweep',
    'spec': 'mu_Q1(t) = (1-s)*close + s*bucket_curve(t), s = 1 - exp(-r*t/900)',
    'sweep': rows,
    'best': {'ramp': best[0], 'brier_q1': best[1]},
    'baselines': {'v2_q1': 0.2438, 'pure_close_q1': 0.2167},
    'verdict': 'DIAGNOSTIC',
}
json.dump(stamp, open(os.path.join(HERE, 'OU_V4_Q1_ATTRACTOR.json'), 'w'), indent=1)
print('\nlanded OU_V4_Q1_ATTRACTOR.json')
