"""THE OU LIVE-WP STAMP — Ornstein-Uhlenbeck score-differential process, fitted and
residual-vs-close stamped on the frozen NFL manifest.

Model: dT = theta*(mu(state) - T)dt + sigma*dW
Discretized per play: T_{k+1} = T_k + theta*(mu_k - T_k)*dt + sigma*sqrt(dt)*N(0,1)
  T = home score differential (home minus away)
  mu(state) = the OU attractor — modeled as a linear-in-remaining-time path:
              mu(t) = close_margin * (t_remaining/game_len)  [market prior decaying to 0 at gun]
  theta = mean-reversion speed to the market path
  sigma = per-second diffusion vol

Fit: per-game discrete OU regression on pbp score paths (2025 season, n~285 games).
RVC: OU-implied final-margin distribution at each quarter boundary vs (a) the closing
spread and (b) the actual outcome. Brier/CRPS for quarter-state predictions vs close.
DIAGNOSTIC — nothing promoted.
"""
import pyarrow.parquet as pq
import pandas as pd
import numpy as np
import json, math, statistics, time, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from freshnessgate_wiring import read_fresh

GAME_LEN_S = 60 * 60  # 60 min regulation

# 1. load pbp paths (2025)
t = pq.read_table('intelligence/coaching/data/play_by_play_2025.parquet',
    columns=['game_id', 'home_team', 'posteam', 'score_differential', 'spread_line',
             'total_line', 'game_seconds_remaining', 'quarter_seconds_remaining',
             'total_home_score', 'total_away_score'])
df = t.to_pandas()
df['home_diff'] = [x if p == h else -x for x, p, h in
                   zip(df.score_differential, df.posteam, df.home_team)]
df = df.dropna(subset=['game_seconds_remaining', 'home_diff', 'spread_line'])
print('pbp rows 2025 w/ time+score:', len(df))

# 2. freeze manifest reference
m = read_fresh('dfs/nfl_rvc_manifest.json', max_age_hours=1e9)
print('frozen manifest read:', m['audit']['failure_mode'] or 'PASS')

# 3. build per-game paths: (t_sec_remaining, T) sorted by t descending (earliest first)
games = []
for gid, grp in df.groupby('game_id'):
    g = grp.sort_values('game_seconds_remaining', ascending=False).drop_duplicates(
        subset=['game_seconds_remaining'], keep='last')
    if len(g) < 40 or g['spread_line'].isna().any():
        continue
    close_margin = float(g['spread_line'].iloc[0])
    # time vector: seconds ELAPSED = GAME_LEN - seconds_remaining
    g = g.copy()
    g['t_elapsed'] = GAME_LEN_S - g['game_seconds_remaining']
    g = g.sort_values('t_elapsed')
    # dedupe: keep last score state per elapsed second
    g = g.drop_duplicates(subset=['t_elapsed'], keep='last')
    games.append({'game_id': gid, 'close': close_margin,
                  't': g['t_elapsed'].values.astype(float),
                  'T': g['home_diff'].values.astype(float),
                  'qtr': g['game_seconds_remaining'].values})
print('games w/ usable paths:', len(games))

# 4. FIT OU: discrete regression  dT = theta*(mu - T)*dt + sigma*sqrt(dt)*eps
#    mu(t) = close * (1 - t/3600)  [market path: starts at close margin, decays to 0 at gun]
#    => dT = theta*(close*(1-t/3600) - T)*dt + sigma*sqrt(dt)*eps
#    Linear: dT = [theta*close*(1-t/3600)]*dt - theta*T*dt + noise
#    => regress dT/dt on (mu - T): dT/dt = theta*(mu-T) + noise_term
all_dT, all_gap, all_dt = [], [], []
for g in games:
    T, t = g['T'], g['t']
    for i in range(1, len(T)):
        dt = t[i] - t[i-1]
        if dt <= 0 or dt > 300:  # skip huge gaps (quarters/halves)
            continue
        dT = T[i] - T[i-1]
        mu = g['close'] * (1 - t[i-1] / GAME_LEN_S)
        all_dT.append(dT)
        all_gap.append(mu - T[i-1])
        all_dt.append(dt)
X = np.array(all_gap) * np.array(all_dt)
y = np.array(all_dT)
theta_hat = np.dot(X, y) / max(np.dot(X, X), 1e-9)
resid = y - theta_hat * X
sigma_hat = np.std(resid) / np.sqrt(np.mean(all_dt))
print(f'\nOU fit (n={len(all_dT)} play-pairs):')
print(f'  theta = {theta_hat:.6f} /s (mean-reversion speed to market path)')
print(f'  sigma = {sigma_hat:.4f} /sqrt(s) (diffusion vol)')
half_life = math.log(2) / theta_hat if theta_hat > 0 else float('inf')
print(f'  half-life to market path: {half_life:.0f}s ({half_life/60:.1f} min)')

# 5. RVC: at each quarter boundary, OU-implied final margin distribution vs close vs outcome
#    OU from state (t, T): final T ~ Normal(mu_final, sd_final)
#    mu_final = T + (close*(1-t/3600) - T)*(1 - exp(-theta*(3600-t)))/theta ... simplified:
#    E[T_final] = mu_path(3600) + (T_t - mu_path(t))*exp(-theta*(3600-t))
#    where mu_path(t) = close*(1-t/3600), mu_path(3600)=0
#    sd_final = sigma*sqrt((1-exp(-2*theta*dt_rem))/(2*theta))
print('\nRVC: quarter-state OU predictions vs close vs outcomes')
rvc_rows = []
for g in games:
    T, t, close = g['T'], g['t'], g['close']
    final_T = T[-1]
    # quarter boundaries: find state at each quarter start (seconds remaining 3600/2700/1800/900/0)
    for qtr_rem in [3600, 2700, 1800, 900]:
        elapsed = GAME_LEN_S - qtr_rem
        # find nearest pbp state
        idx = np.searchsorted(t, elapsed)
        if idx >= len(T):
            idx = len(T) - 1
        T_t, t_t = T[idx], t[idx]
        dt_rem = max(GAME_LEN_S - t_t, 1)
        mu_path_now = close * (1 - t_t / GAME_LEN_S)
        mu_path_end = 0.0
        # OU expected final value
        exp_final = mu_path_end + (T_t - mu_path_now) * math.exp(-theta_hat * dt_rem)
        sd_final = sigma_hat * math.sqrt((1 - math.exp(-2 * theta_hat * dt_rem)) / (2 * theta_hat))
        # close prediction: final T ~ Normal(close, book_sd)
        book_sd = 13.3
        # Brier-like: P(home wins) from each
        p_ou = 0.5 * (1 + math.erf(exp_final / (sd_final * math.sqrt(2))))
        p_close = 0.5 * (1 + math.erf(close / (book_sd * math.sqrt(2))))
        outcome = 1.0 if final_T > 0 else 0.0
        rvc_rows.append({'game_id': g['game_id'], 'qtr_remaining': qtr_rem,
                         'T_state': T_t, 'close': close, 'exp_final_ou': round(exp_final, 2),
                         'sd_final_ou': round(sd_final, 2), 'p_ou': round(p_ou, 4),
                         'p_close': round(p_close, 4), 'outcome': outcome})
rvc = pd.DataFrame(rvc_rows)
print(f'RVC rows (game × quarter): {len(rvc)}')

# Brier scores
brier_ou = (rvc.p_ou - rvc.outcome).pow(2).mean()
brier_close = (rvc.p_close - rvc.outcome).pow(2).mean()
print(f'Brier OU (quarter-state): {brier_ou:.4f}')
print(f'Brier close:              {brier_close:.4f}')
print(f'delta (close - OU):       {brier_close - brier_ou:+.4f} '
      f'({"OU better" if brier_ou < brier_close else "close better"})')
by_q = rvc.groupby('qtr_remaining').apply(
    lambda x: pd.Series({'n': len(x),
                         'brier_ou': (x.p_ou - x.outcome).pow(2).mean(),
                         'brier_close': (x.p_close - x.outcome).pow(2).mean()}), include_groups=False)
print(by_q.to_string())

stamp = {
    'observed_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    'test': 'OU live-WP equation stamped on frozen NFL manifest',
    'model': 'dT = theta*(mu_path(t) - T)dt + sigma*dW; mu_path = close*(1-t/3600)',
    'fit': {'theta_per_s': round(float(theta_hat), 6), 'sigma_per_sqrt_s': round(float(sigma_hat), 4),
            'half_life_s': round(float(half_life), 0), 'n_play_pairs': len(all_dT),
            'n_games': len(games)},
    'rvc': {'n_rows': len(rvc), 'brier_ou': round(float(brier_ou), 4),
            'brier_close': round(float(brier_close), 4),
            'delta_close_minus_ou': round(float(brier_close - brier_ou), 4),
            'by_quarter': {str(int(k)): {'n': int(v['n']),
                           'brier_ou': round(float(v['brier_ou']), 4),
                           'brier_close': round(float(v['brier_close']), 4)}
                           for k, v in by_q.iterrows()}},
    'verdict': ('DIAGNOSTIC — OU quarter-state predictions compete with the close; '
                'the delta decides. Nothing promoted.'),
    'label': 'DIAGNOSTIC',
}
json.dump(stamp, open(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                    'OU_LIVE_WP_STAMP.json'), 'w'), indent=1)
rvc.to_csv(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ou_rvc_rows.csv'), index=False)
print('landed OU_LIVE_WP_STAMP.json + ou_rvc_rows.csv')
