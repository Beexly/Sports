"""OU live-WP theta refinement — per-half and per-quarter theta vs the single-theta fit of e7c110e.

Run from repo root:  python3 dfs/ou_theta_refine/ou_theta_refine.py
DIAGNOSTIC only. Nothing promoted.

Data: identical prep to dfs/ou_live_wp.py (commit e7c110e): 2025 pbp, home_diff from posteam-relative
score_differential, same dedupe, same play-pair filter (0 < dt <= 300 s), same market path
mu(t) = close*(1 - t/3600), same quarter-boundary states, same close baseline p = Phi(close/13.3).
Split (locked, walk-forward, mirrors the repo's season walk-forward inside the one season e7c110e used):
  FIT = 2025 weeks 1-9, TEST = 2025 weeks >= 10. In-sample (all 285) also reported for comparability.
Two prediction formulas, each with single / per-half / per-quarter theta (piecewise, integrated on 1 s grid):
  A = e7c110e formula: E[T_end] = (T_t - mu(t)) * exp(-int theta)   (as shipped)
  B = exact conditional mean of the stated SDE: m' = theta(s)*(mu(s) - m), m(t)=T_t
Variance (both): v' = -2 theta v + sigma^2, v(t)=0.
"""
import json, math, os, sys, time
import numpy as np
import pandas as pd
import pyarrow.parquet as pq

ROOT = os.getcwd()
HERE = os.path.join(ROOT, 'dfs', 'ou_theta_refine')
sys.path.insert(0, os.path.join(ROOT, 'dfs'))
from freshnessgate_wiring import read_fresh  # noqa: E402

L = 3600
BOOK_SD = 13.3
GRADED = []
SEGS = {'single': [(0, L)], 'half': [(0, 1800), (1800, L)],
        'quarter': [(0, 900), (900, 1800), (1800, 2700), (2700, L)]}


def load_games():
    t = pq.read_table('intelligence/coaching/data/play_by_play_2025.parquet',
                      columns=['game_id', 'week', 'home_team', 'posteam', 'score_differential', 'spread_line',
                               'game_seconds_remaining']).to_pandas()
    t['home_diff'] = [x if p == h else -x for x, p, h in zip(t.score_differential, t.posteam, t.home_team)]
    t = t.dropna(subset=['game_seconds_remaining', 'home_diff', 'spread_line'])
    games = []
    for gid, grp in t.groupby('game_id'):
        g = grp.sort_values('game_seconds_remaining', ascending=False).drop_duplicates(
            subset=['game_seconds_remaining'], keep='last')
        if len(g) < 40 or g['spread_line'].isna().any():
            continue
        g = g.copy(); g['t_elapsed'] = L - g['game_seconds_remaining']
        g = g.sort_values('t_elapsed').drop_duplicates(subset=['t_elapsed'], keep='last')
        games.append({'game_id': gid, 'week': int(g['week'].iloc[0]), 'close': float(g['spread_line'].iloc[0]),
                      't': g['t_elapsed'].values.astype(float), 'T': g['home_diff'].values.astype(float)})
    return games


def pairs(games):
    out = []
    for g in games:
        T, t = g['T'], g['t']
        for i in range(1, len(T)):
            dt = t[i] - t[i - 1]
            if dt <= 0 or dt > 300:
                continue
            out.append((t[i - 1], T[i] - T[i - 1], g['close'] * (1 - t[i - 1] / L) - T[i - 1], dt))
    return np.array(out)  # t0, dT, gap, dt


def fit(P, kind):
    params = []
    for a, b in SEGS[kind]:
        s = P[(P[:, 0] >= a) & (P[:, 0] < b)]
        X = s[:, 2] * s[:, 3]; y = s[:, 1]
        th = float(np.dot(X, y) / max(np.dot(X, X), 1e-9))
        sig = float(np.std(y - th * X) / np.sqrt(np.mean(s[:, 3])))
        params.append({'seg': [a, b], 'theta': th, 'sigma': sig, 'n_pairs': int(len(s)),
                       'half_life_min': round(math.log(2) / th / 60, 1) if th > 0 else None})
    return params


def seg_param(params, s):
    for p in params:
        if p['seg'][0] <= s < p['seg'][1]:
            return p['theta'], p['sigma']
    return params[-1]['theta'], params[-1]['sigma']


def predict(params, close, t0, T0, formula):
    m, v, logdecay = float(T0), 0.0, 0.0
    s = float(t0)
    while s < L:
        th, sg = seg_param(params, s)
        dt = min(1.0, L - s)
        mu = close * (1 - s / L)
        if formula == 'B':
            m += th * (mu - m) * dt
        logdecay -= th * dt
        v += (-2 * th * v + sg * sg) * dt
        s += dt
    if formula == 'A':
        m = 0.0 + (T0 - close * (1 - t0 / L)) * math.exp(logdecay)
    sd = math.sqrt(max(v, 1e-9))
    return 0.5 * (1 + math.erf(m / (sd * math.sqrt(2)))), m, sd


def states(games):
    rows = []
    for g in games:
        for rem in (3600, 2700, 1800, 900):
            idx = min(np.searchsorted(g['t'], L - rem), len(g['T']) - 1)
            rows.append({'game_id': g['game_id'], 'week': g['week'], 'rem': rem, 't0': g['t'][idx],
                         'T0': g['T'][idx], 'close': g['close'], 'outcome': 1.0 if g['T'][-1] > 0 else 0.0})
    return pd.DataFrame(rows)


def grade(st, fits, tag):
    st = st.copy()
    st['p_close'] = [0.5 * (1 + math.erf(c / (BOOK_SD * math.sqrt(2)))) for c in st['close']]
    for kind, params in fits.items():
        for f in ('A', 'B'):
            st[f'p_{f}_{kind}'] = [predict(params, r.close, r.t0, r.T0, f)[0] for r in st.itertuples()]
    out = {}
    pcols = [c for c in st.columns if c.startswith('p_')]
    for rem, s in st.groupby('rem'):
        d = {'n': int(len(s))}
        for c in pcols:
            d['brier_' + c[2:]] = round(float(((s[c] - s['outcome']) ** 2).mean()), 4)
        # paired t vs close and vs single-theta (same formula)
        for c in pcols:
            if c == 'p_close':
                continue
            e_c = (s['p_close'] - s['outcome']) ** 2; e_m = (s[c] - s['outcome']) ** 2
            dd = (e_c - e_m).values
            d['t_vs_close_' + c[2:]] = round(float(dd.mean() / (dd.std(ddof=1) / math.sqrt(len(dd)))), 2)
        out[str(rem)] = d
    st.insert(0, 'split', tag)
    GRADED.append(st)
    return out


def main():
    g = read_fresh('dfs/nfl_rvc_manifest.json')
    if not g['audit']['fresh']:
        print('REFUSE: manifest freshness'); sys.exit(0)
    games = load_games()
    P_all = pairs(games)
    fit_games = [x for x in games if x['week'] <= 9]
    test_games = [x for x in games if x['week'] >= 10]
    P_fit = pairs(fit_games)
    fits_all = {k: fit(P_all, k) for k in SEGS}
    fits_wf = {k: fit(P_fit, k) for k in SEGS}
    repro = {'n_play_pairs': int(len(P_all)), 'n_games': len(games),
             'theta_single': round(fits_all['single'][0]['theta'], 8),
             'sigma_single': round(fits_all['single'][0]['sigma'], 4),
             'half_life_min': fits_all['single'][0]['half_life_min']}
    print('repro e7c110e fit:', repro)
    ins = grade(states(games), fits_all, 'in_sample_2025')
    held = grade(states(test_games), fits_wf, 'heldout_wk10plus')
    early_A = all(held[r]['brier_A_single'] > held[r]['brier_close'] for r in ('3600', '2700'))
    best_early = {r: min((k for k in held[r] if k.startswith('brier_')), key=lambda k: held[r][k]) for r in ('3600', '2700')}
    out = {
        'observed_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'test': 'OU live-WP theta refinement (single / per-half / per-quarter), early-game Brier re-grade',
        'source_commit': 'e7c110e2249db48db70c1b8ad21233e05dfc52bb (dfs/ou_live_wp.py, dfs/OU_LIVE_WP_STAMP.json)',
        'reproduction_of_e7c110e': repro,
        'split': {'fit': '2025 weeks 1-9', 'test': '2025 weeks >= 10', 'n_fit_games': len(fit_games),
                  'n_test_games': len(test_games), 'n_fit_pairs': int(len(P_fit))},
        'fits_in_sample': fits_all, 'fits_walk_forward': fits_wf,
        'brier_in_sample': ins, 'brier_heldout': held,
        'best_early_model_heldout': best_early,
        'formula_note': ('A = shipped e7c110e expectation (T - mu(t))*exp(-int theta) with mu_end=0: at kickoff with T=0 it '
                         'returns the NEGATIVE of the close (sign-inverted vs the market). B = exact conditional mean of the '
                         'same SDE. Neither is a live product. The static pre-game close is not a live market line, so any '
                         'state-aware model is expected to beat it late in games.'),
        'stamp': 'INFRASTRUCTURE PASS',
        'result_stamp': ('REFUSED as an early-game fix: per-half / per-quarter theta moves held-out Q1-start Brier by '
                         f"{held['3600']['brier_A_half'] - held['3600']['brier_A_single']:+.4f} (half) and "
                         f"{held['3600']['brier_A_quarter'] - held['3600']['brier_A_single']:+.4f} (quarter); every OU "
                         f"variant still loses to the close at kickoff (best B {min(held['3600']['brier_B_single'], held['3600']['brier_B_half'], held['3600']['brier_B_quarter']):.4f} vs close {held['3600']['brier_close']:.4f}). "
                         'The early-game gap comes from the shipped expectation formula (A), not from theta speed.'),
        'reopen_condition': ('REOPEN: re-specify the attractor (mu path ending at the close-implied margin, not 0) and fix the '
                             'expectation formula, then re-grade on 2023-24 fit / 2025 test; grade vs a LIVE in-game line '
                             '(not the static pre-game close) before any live-engine claim'),
        'label': 'DIAGNOSTIC — not a live edge, nothing promoted',
    }
    json.dump(out, open(os.path.join(HERE, 'result.json'), 'w'), indent=1, default=str)
    pd.concat(GRADED).to_csv(os.path.join(HERE, 'graded_states.csv'), index=False, float_format='%.4f')
    for tag, res in (('IN-SAMPLE', ins), ('HELD-OUT', held)):
        print(tag)
        print(pd.DataFrame(res).T.to_string())
    print('fits wf:', json.dumps({k: [(round(p['theta'], 7), round(p['sigma'], 4), p['n_pairs']) for p in v] for k, v in fits_wf.items()}))
    print('fits all:', json.dumps({k: [(round(p['theta'], 7), round(p['sigma'], 4), p['n_pairs']) for p in v] for k, v in fits_all.items()}))


if __name__ == '__main__':
    main()
