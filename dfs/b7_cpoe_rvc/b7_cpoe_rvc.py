"""B7 RVC — CPOE persistence -> next-week ATS residual vs the close, on the frozen NFL manifest.

Run from repo root:  python3 dfs/b7_cpoe_rvc/b7_cpoe_rvc.py
DIAGNOSTIC only. Nothing here is a live edge or a promotion.

Inputs (no substitutes):
  - dfs/nfl_rvc_manifest.json   (frozen 855 games 2023-25; read through FreshnessGate v2 read_fresh)
  - intelligence/coaching/data/play_by_play_{2023,2024,2025}.parquet  (native nflfastR `cpoe`;
    same parquets the manifest was frozen from. The gate cannot read .parquet, same as the
    manifest builder, so these are read directly and joined only to manifest game_ids.)
CPOE: native per-play `cpoe` (the r=0.9659 proxy-vs-native validation is recorded at
  docs/research/2026-10-09/rating-atlas/minis/RUNNING_LOG.md:129 and
  .../minis/DIAGNOSTIC_compute_missing_metrics_2025.json). Native is the validated reference.

Residual: home ATS residual = (home_score - away_score) - spread_line, from the manifest's own
  scores and closes. nflverse spread_line > 0 = home favoured. NOTE: the manifest's precomputed
  `margin_residual_vs_home` / `spread_cover_home` fields are NOT used (see result.json
  manifest_defect: final_diff is posteam-relative and the sign convention is inverted).

Gate: repo HonestyGate (minis/doctrine.py) — close-anchored Gaussian CRPS, walk-forward
  (fit on prior seasons, test on next season), mu = close + k*(x - shift). Pooled bar: t >= 1.96.
"""
import json, math, os, sys, time, hashlib
import numpy as np
import pandas as pd
import pyarrow.parquet as pq

ROOT = os.getcwd()
HERE = os.path.join(ROOT, 'dfs', 'b7_cpoe_rvc')
sys.path.insert(0, os.path.join(ROOT, 'dfs'))
sys.path.insert(0, os.path.join(ROOT, 'docs/research/2026-10-09/rating-atlas/minis'))
from freshnessgate_wiring import read_fresh          # noqa: E402
from doctrine import HonestyGate, crps_gaussian      # noqa: E402

MANIFEST = os.path.join(ROOT, 'dfs', 'nfl_rvc_manifest.json')
PBP = 'intelligence/coaching/data/play_by_play_{}.parquet'
T_BAR = 1.96


def ols(x, y):
    x = np.asarray(x, float); y = np.asarray(y, float)
    n = len(x)
    if n < 3 or np.var(x) == 0:
        return {'n': int(n), 'slope': None, 'se': None, 't': None, 'r': None}
    xm, ym = x.mean(), y.mean()
    sxx = ((x - xm) ** 2).sum()
    b = ((x - xm) * (y - ym)).sum() / sxx
    a = ym - b * xm
    res = y - (a + b * x)
    se = math.sqrt((res ** 2).sum() / (n - 2) / sxx)
    r = float(np.corrcoef(x, y)[0, 1])
    return {'n': int(n), 'slope': round(float(b), 4), 'se': round(se, 4),
            't': round(float(b / se), 3), 'r': round(r, 4),
            'ci95': [round(float(b - 1.96 * se), 4), round(float(b + 1.96 * se), 4)]}


def refuse(reason, extra=None):
    out = {'observed_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
           'test': 'B7 CPOE persistence -> next-week ATS residual vs close',
           'stamp': 'REFUSE', 'reason': reason, 'label': 'DIAGNOSTIC'}
    out.update(extra or {})
    json.dump(out, open(os.path.join(HERE, 'result.json'), 'w'), indent=1)
    print('REFUSE:', reason)
    sys.exit(0)


def main():
    # ---- 1. frozen manifest through the gate --------------------------------------------
    g = read_fresh(MANIFEST)  # default 6h
    if not g['audit']['fresh']:
        refuse(f"FreshnessGate refused manifest: {g['audit']['failure_mode']} {g['audit'].get('detail')}")
    man_sha16 = hashlib.sha256(open(MANIFEST, 'rb').read()).hexdigest()[:16]
    m = pd.DataFrame(g['data']['manifest_rows'])
    if len(m) != g['data']['n_games']:
        refuse('manifest row count mismatch')
    m['home_margin'] = m['home_score'] - m['away_score']
    m['ats_resid_home'] = m['home_margin'] - m['spread_line']
    sign_r = float(m['spread_line'].corr(m['home_margin']))
    if not sign_r > 0:
        refuse(f'spread_line sign sanity failed (corr with home margin {sign_r:.3f})')
    parts = m['game_id'].str.split('_')
    m['away_team'] = parts.str[2]; m['home_team'] = parts.str[3]
    # manifest defect audit (derived fields not used)
    true_cover = (m['ats_resid_home'] > 0).astype(int)
    defect = {
        'manifest_margin_residual_vs_home_equals_true': float((m['margin_residual_vs_home'] == m['ats_resid_home']).mean()),
        'manifest_spread_cover_home_agrees_with_true': round(float((m['spread_cover_home'] == true_cover).mean()), 4),
        'final_diff_equals_home_margin_share': round(float((m['final_diff'] == m['home_margin']).mean()), 4),
        'note': ("build_nfl_rvc_manifest.py takes final_diff = last-play score_differential, which is "
                 "posteam-relative (matches home margin only ~60%), and computes final_diff + spread_line "
                 "although nflverse spread_line>0 means HOME favoured. Use (home_score-away_score)-spread_line."),
    }

    # ---- 2. team-game CPOE from native pbp cpoe ------------------------------------------
    gids = set(m['game_id'])
    frames = []
    for y in (2023, 2024, 2025):
        p = PBP.format(y)
        if not os.path.exists(p):
            refuse(f'missing input {p}')
        t = pq.read_table(p, columns=['game_id', 'posteam', 'cpoe']).to_pandas()
        frames.append(t[t['game_id'].isin(gids)])
    pbp = pd.concat(frames, ignore_index=True)
    pbp = pbp.dropna(subset=['cpoe', 'posteam'])
    tg = pbp.groupby(['game_id', 'posteam'])['cpoe'].agg(['mean', 'size']).reset_index()
    tg.columns = ['game_id', 'team', 'cpoe', 'att']
    meta = m[['game_id', 'season', 'week', 'home_team', 'away_team']]
    tg = tg.merge(meta, on='game_id', how='inner')
    missing_games = sorted(gids - set(tg['game_id']))
    cnt = tg.groupby('game_id').size()
    one_side = int((cnt < 2).sum())
    if len(missing_games) > 0 or one_side > 0:
        refuse(f'pbp CPOE join incomplete: {len(missing_games)} games missing, {one_side} one-sided',
               {'missing_games': missing_games[:20]})

    # ---- 3. point-in-time features (prior games only, same season) ----------------------
    tg = tg.sort_values(['team', 'season', 'week']).reset_index(drop=True)
    rows = []
    for (team, season), grp in tg.groupby(['team', 'season']):
        cum_w, cum_a = 0.0, 0
        prev = None
        for _, r in grp.iterrows():
            rows.append({'game_id': r.game_id, 'team': team, 'season': season, 'week': int(r.week),
                         'cpoe': r.cpoe, 'att': int(r.att),
                         'last_cpoe': prev['cpoe'] if prev is not None else np.nan,
                         'last_week': prev['week'] if prev is not None else np.nan,
                         'std_cpoe': (cum_w / cum_a) if cum_a else np.nan,
                         'n_prior': int(cum_a)})
            cum_w += r.cpoe * r.att; cum_a += int(r.att)
            prev = {'cpoe': r.cpoe, 'week': int(r.week)}
    tf = pd.DataFrame(rows)

    # persistence: this game's CPOE vs previous game's (same team-season)
    pp = tf.dropna(subset=['last_cpoe'])
    pers_all = ols(pp['last_cpoe'], pp['cpoe'])
    pp1 = pp[(pp['week'] - pp['last_week']) == 1]
    pers_consec = ols(pp1['last_cpoe'], pp1['cpoe'])

    # ---- 4. game-level next-week residual table -----------------------------------------
    h = tf.rename(columns=lambda c: 'h_' + c if c not in ('game_id',) else c)
    a = tf.rename(columns=lambda c: 'a_' + c if c not in ('game_id',) else c)
    gm = m.merge(h, left_on=['game_id', 'home_team'], right_on=['game_id', 'h_team']) \
          .merge(a, left_on=['game_id', 'away_team'], right_on=['game_id', 'a_team'])
    gm['x_last'] = gm['h_last_cpoe'] - gm['a_last_cpoe']
    gm['x_std'] = gm['h_std_cpoe'] - gm['a_std_cpoe']
    tab = gm.dropna(subset=['x_last', 'x_std']).copy()
    tab = tab.sort_values(['season', 'week', 'game_id'])
    cols = ['game_id', 'season', 'week', 'home_team', 'away_team', 'spread_line', 'home_score',
            'away_score', 'home_margin', 'ats_resid_home', 'h_last_cpoe', 'a_last_cpoe', 'x_last',
            'h_std_cpoe', 'a_std_cpoe', 'x_std', 'h_n_prior', 'a_n_prior']
    tab[cols].round(4).to_csv(os.path.join(HERE, 'residual_table.csv'), index=False)

    in_sample = {
        'last_week_cpoe_diff': ols(tab['x_last'], tab['ats_resid_home']),
        'season_to_date_cpoe_diff': ols(tab['x_std'], tab['ats_resid_home']),
    }
    per_season = {}
    for s, gs in tab.groupby('season'):
        per_season[int(s)] = {'last': ols(gs['x_last'], gs['ats_resid_home']),
                              'std': ols(gs['x_std'], gs['ats_resid_home'])}
    per_week = []
    for (s, w), gw in tab.groupby(['season', 'week']):
        cl = np.corrcoef(gw['x_last'], gw['ats_resid_home'])[0, 1] if len(gw) > 2 else np.nan
        cs = np.corrcoef(gw['x_std'], gw['ats_resid_home'])[0, 1] if len(gw) > 2 else np.nan
        per_week.append({'season': int(s), 'week': int(w), 'n': int(len(gw)),
                         'r_last': None if np.isnan(cl) else round(float(cl), 3),
                         'r_std': None if np.isnan(cs) else round(float(cs), 3)})
    pd.DataFrame(per_week).to_csv(os.path.join(HERE, 'per_week.csv'), index=False)

    # ---- 5. walk-forward HonestyGate (fit prior seasons -> test next season) ------------
    gates = {}
    for feat in ('x_last', 'x_std'):
        folds, deltas = [], []
        fits = {}
        for test_season in (2024, 2025):
            tr = tab[tab['season'] < test_season]
            te = tab[tab['season'] == test_season]
            fit = ols(tr[feat], tr['ats_resid_home'])
            k = fit['slope']; shift = float(tr[feat].mean())
            sig = float(tr['ats_resid_home'].std())
            fits[test_season] = {'k': k, 'shift': round(shift, 4), 'close_sigma': round(sig, 3),
                                 'n_train': fit['n']}
            for _, r in te.iterrows():
                folds.append({'fold_id': r.game_id, 'decision_t': 0, 'outcome': float(r.home_margin),
                              'close_mu': float(r.spread_line), 'close_sigma': sig,
                              'x': float(r[feat]), 'k': k, 'shift': shift})
        gate = HonestyGate(folds, f'b7_cpoe_{feat}_wf_2024_2025')

        class Cand:
            name = f'b7_cpoe_{feat}_close_anchored'
            def identity(self): return {'model': self.name, 'fits': fits}
            def predict(self, f): return f['close_mu'] + f['k'] * (f['x'] - f['shift']), f['close_sigma']
        v = gate.evaluate(Cand())
        d = np.array(list(v.detail.values()))  # baseline - candidate (>0 = candidate better)
        t_d = float(d.mean() / (d.std(ddof=1) / math.sqrt(len(d))))
        gates[feat] = {'gate_id': v.gate_id, 'verdict_raw': v.verdict, 'n_folds': v.n_folds,
                       'close_crps': round(v.baseline_crps, 4), 'cand_crps': round(v.candidate_crps, 4),
                       'mean_delta_close_minus_cand': round(float(d.mean()), 5),
                       't_delta': round(t_d, 3), 'folds_won': int((d > 0).sum()),
                       'manifest_sha': v.manifest_sha[:16], 'fits': fits}

    # ---- 6. stamp ----------------------------------------------------------------------
    best_t = max(abs(in_sample['last_week_cpoe_diff']['t'] or 0), abs(in_sample['season_to_date_cpoe_diff']['t'] or 0))
    gate_clear = any(gg['verdict_raw'] == 'PROMOTED' and gg['t_delta'] >= T_BAR for gg in gates.values())
    result_verdict = ('SIGNAL-CANDIDATE (not promoted; needs CLV n>=10 + 2026 frozen folds)'
                      if gate_clear else 'REFUSED — no CPOE->next-week ATS residual signal at t>=1.96 on walk-forward folds')
    out = {
        'observed_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'test': 'B7 CPOE persistence -> next-week ATS residual vs close (frozen NFL manifest)',
        'stamp': 'INFRASTRUCTURE PASS',
        'stamp_basis': ('manifest read via FreshnessGate v2 read_fresh PASS; all 855 manifest games joined to '
                        'native pbp cpoe (both teams); point-in-time features; repo HonestyGate ran on '
                        'walk-forward folds. INFRASTRUCTURE PASS is not an edge.'),
        'result_verdict': result_verdict,
        'manifest': {'path': 'dfs/nfl_rvc_manifest.json', 'sha256_16': man_sha16,
                     'gate_audit': g['audit'], 'n_games': int(len(m)),
                     'spread_sign_check_corr_spread_vs_home_margin': round(sign_r, 4)},
        'manifest_defect': defect,
        'cpoe_source': 'native nflfastR cpoe, pbp 2023-25; proxy-vs-native r=0.9659 (n=16,609) at docs/research/2026-10-09/rating-atlas/minis/RUNNING_LOG.md:129',
        'persistence': {'prev_game_to_next_game': pers_all, 'consecutive_weeks_only': pers_consec},
        'n_games_with_prior_cpoe': int(len(tab)),
        'in_sample_ols_ats_resid_home_on_cpoe_diff': in_sample,
        'per_season': per_season,
        'walk_forward_gate': gates,
        'bar': f'pooled walk-forward gate PROMOTED and paired CRPS-delta t >= {T_BAR}',
        'max_abs_in_sample_t': best_t,
        'proposed_kill_ledger_row': {
            'feature': 'b7_cpoe_persistence_ats', 'test': 'frozen NFL manifest 2023-25, walk-forward 2024+2025',
            'result': result_verdict,
            'reopen_condition': ('REOPEN: (a) completion-prop closes (DK completion-% / completions ladders) '
                                 'captured on a frozen manifest -> CPOE-based p vs book-implied p residual; or '
                                 '(b) 2026 frozen weekly folds added and pooled paired CRPS-delta t >= 1.96')},
        'artifacts': ['dfs/b7_cpoe_rvc/b7_cpoe_rvc.py', 'dfs/b7_cpoe_rvc/residual_table.csv',
                      'dfs/b7_cpoe_rvc/per_week.csv', 'dfs/b7_cpoe_rvc/result.json'],
        'label': 'DIAGNOSTIC — not a live edge, no promotion',
    }
    json.dump(out, open(os.path.join(HERE, 'result.json'), 'w'), indent=1, default=str)
    print(json.dumps({k: out[k] for k in ('stamp', 'result_verdict', 'persistence', 'n_games_with_prior_cpoe',
                                          'in_sample_ols_ats_resid_home_on_cpoe_diff', 'per_season',
                                          'walk_forward_gate')}, indent=1, default=str))


if __name__ == '__main__':
    main()
