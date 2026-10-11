"""Expected-metric layer — conditional residual-vs-close on the frozen NFL manifest.

Run from repo root:  python3 dfs/expected_metric_conditional_rvc/em_conditional_rvc.py
DIAGNOSTIC only. Nothing here is a live edge or a promotion.

Reuses the B7 pipeline (dfs/b7_cpoe_rvc/b7_cpoe_rvc.py): same manifest read through FreshnessGate v2,
same residual (home ATS residual = (home_score - away_score) - spread_line, from raw scores and closes;
the defective manifest columns margin_residual_vs_home / spread_cover_home are NOT used), same
point-in-time rule (prior game only, same season), same walk-forward HonestyGate.

Metrics (native columns only, nothing invented):
  CPOE  = mean native nflfastR `cpoe` per team-game (B7).
  YACOE = mean(yards_after_catch - xyac_mean_yardage) over completions; nflfastR native xYAC model.
  NOT INCLUDED: "GSE-RYOE" / "GSE-xYAC" do not exist in the repo. Native NGS RYOE exists only in
  minis/re/genie-acquisition-2026-10-10/ngs_rushing.csv.gz (.csv.gz: FreshnessGate cannot read it;
  qualifier-only rows, not the manifest's source), so it is excluded.
Feature: last-game metric diff (home - away), pre-specified (B7's form).
Axes: (1) close total tercile (cutpoints from the manifest's total_line); (2) score state of the plays
  the metric is built from: all plays vs neutral (|score_differential| <= 8).
Family: 2 metrics x 2 states x (3 terciles + pooled) = 16 tests; Bonferroni and Holm reported.
"""
import json, math, os, sys, time, hashlib
import numpy as np
import pandas as pd
import pyarrow.parquet as pq

ROOT = os.getcwd()
HERE = os.path.join(ROOT, 'dfs', 'expected_metric_conditional_rvc')
sys.path.insert(0, os.path.join(ROOT, 'dfs'))
sys.path.insert(0, os.path.join(ROOT, 'dfs', 'b7_cpoe_rvc'))
sys.path.insert(0, os.path.join(ROOT, 'docs/research/2026-10-09/rating-atlas/minis'))
from freshnessgate_wiring import read_fresh          # noqa: E402
from doctrine import HonestyGate                     # noqa: E402
from b7_cpoe_rvc import ols                          # noqa: E402

MANIFEST = os.path.join(ROOT, 'dfs', 'nfl_rvc_manifest.json')
PBP = 'intelligence/coaching/data/play_by_play_{}.parquet'
ALPHA = 0.05


def p_two(t):
    return math.erfc(abs(t) / math.sqrt(2)) if t is not None else None


def refuse(reason):
    json.dump({'observed_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'stamp': 'REFUSE',
               'reason': reason, 'label': 'DIAGNOSTIC'}, open(os.path.join(HERE, 'result.json'), 'w'), indent=1)
    print('REFUSE:', reason); sys.exit(0)


def holm(ps):
    order = sorted(range(len(ps)), key=lambda i: ps[i])
    m = len(ps); surv = [False] * m
    for rank, i in enumerate(order):
        if ps[i] <= ALPHA / (m - rank):
            surv[i] = True
        else:
            break
    return surv


def main():
    g = read_fresh(MANIFEST)
    if not g['audit']['fresh']:
        refuse(f"FreshnessGate refused manifest: {g['audit']['failure_mode']}")
    sha16 = hashlib.sha256(open(MANIFEST, 'rb').read()).hexdigest()[:16]
    m = pd.DataFrame(g['data']['manifest_rows'])
    m['home_margin'] = m['home_score'] - m['away_score']
    m['ats_resid_home'] = m['home_margin'] - m['spread_line']
    if not m['spread_line'].corr(m['home_margin']) > 0:
        refuse('spread sign sanity failed')
    p = m['game_id'].str.split('_'); m['away_team'] = p.str[2]; m['home_team'] = p.str[3]
    q1, q2 = m['total_line'].quantile([1 / 3, 2 / 3]).tolist()
    m['total_bin'] = np.where(m['total_line'] <= q1, 'low', np.where(m['total_line'] <= q2, 'mid', 'high'))

    gids = set(m['game_id'])
    fr = []
    for y in (2023, 2024, 2025):
        t = pq.read_table(PBP.format(y), columns=['game_id', 'posteam', 'cpoe', 'complete_pass',
                          'yards_after_catch', 'xyac_mean_yardage', 'score_differential']).to_pandas()
        fr.append(t[t['game_id'].isin(gids) & t['posteam'].notna()])
    pbp = pd.concat(fr, ignore_index=True)
    pbp['yacoe'] = np.where(pbp['complete_pass'] == 1, pbp['yards_after_catch'] - pbp['xyac_mean_yardage'], np.nan)
    pbp['neutral'] = pbp['score_differential'].abs() <= 8

    meta = m[['game_id', 'season', 'week']]
    feats = {}
    coverage = {}
    for metric in ('cpoe', 'yacoe'):
        for state in ('all', 'neutral'):
            d = pbp if state == 'all' else pbp[pbp['neutral']]
            tg = d.dropna(subset=[metric]).groupby(['game_id', 'posteam'])[metric].mean().reset_index()
            tg.columns = ['game_id', 'team', 'v']
            tg = tg.merge(meta, on='game_id').sort_values(['team', 'season', 'week'])
            tg['last_v'] = tg.groupby(['team', 'season'])['v'].shift(1)
            key = f'{metric}_{state}'
            coverage[key] = {'team_games': int(len(tg)), 'games_both_sides': int((tg.groupby('game_id').size() == 2).sum())}
            feats[key] = tg.set_index(['game_id', 'team'])['last_v']
    if coverage['cpoe_all']['games_both_sides'] != len(m) or coverage['yacoe_all']['games_both_sides'] != len(m):
        refuse(f'pbp join incomplete: {coverage}')

    rows, table_rows = [], []
    tab = m[['game_id', 'season', 'week', 'home_team', 'away_team', 'spread_line', 'total_line', 'total_bin',
             'home_score', 'away_score', 'home_margin', 'ats_resid_home']].copy()
    for key, s in feats.items():
        h = s.reindex(list(zip(tab.game_id, tab.home_team))).values
        a = s.reindex(list(zip(tab.game_id, tab.away_team))).values
        tab[f'x_{key}'] = h - a
    tab.round(4).to_csv(os.path.join(HERE, 'residual_table.csv'), index=False)

    for key in feats:
        x = f'x_{key}'
        for cell in ('pooled', 'low', 'mid', 'high'):
            c = tab.dropna(subset=[x])
            if cell != 'pooled':
                c = c[c['total_bin'] == cell]
            ins = ols(c[x], c['ats_resid_home'])
            seasons = {int(s): ols(cs[x], cs['ats_resid_home'])['t'] for s, cs in c.groupby('season')}
            folds, fits = [], {}
            for ts in (2024, 2025):
                tr, te = c[c['season'] < ts], c[c['season'] == ts]
                f = ols(tr[x], tr['ats_resid_home'])
                k, shift, sig = f['slope'], float(tr[x].mean()), float(tr['ats_resid_home'].std())
                fits[ts] = {'k': k, 'shift': round(shift, 4), 'close_sigma': round(sig, 3), 'n_train': f['n']}
                for _, r in te.iterrows():
                    folds.append({'fold_id': r.game_id, 'decision_t': 0, 'outcome': float(r.home_margin),
                                  'close_mu': float(r.spread_line), 'close_sigma': sig,
                                  'x': float(r[x]), 'k': k, 'shift': shift})
            gate = HonestyGate(folds, f'em_{key}_{cell}_wf_2024_2025')

            class Cand:
                def identity(self): return {'model': f'em_{key}_{cell}', 'fits': fits}
                def predict(self, f): return f['close_mu'] + f['k'] * (f['x'] - f['shift']), f['close_sigma']
            v = gate.evaluate(Cand())
            dlt = np.array(list(v.detail.values()))
            td = float(dlt.mean() / (dlt.std(ddof=1) / math.sqrt(len(dlt))))
            rows.append({'metric_state': key, 'cell': cell, 'n': ins['n'], 'slope': ins['slope'], 't': ins['t'],
                         'ci95': ins['ci95'], 'p_in_sample': p_two(ins['t']), 't_by_season': seasons,
                         'gate_n': v.n_folds, 'close_crps': round(v.baseline_crps, 4),
                         'cand_crps': round(v.candidate_crps, 4), 'gate_raw': v.verdict,
                         'paired_t': round(td, 3), 'p_gate': p_two(td), 'folds_won': int((dlt > 0).sum()),
                         'manifest_sha': v.manifest_sha[:16], 'fits': fits})
    n_tests = len(rows)
    for col in ('p_in_sample', 'p_gate'):
        ps = [r[col] for r in rows]
        hs = holm(ps)
        for r, hv in zip(rows, hs):
            r[col.replace('p_', 'bonf_') + '_survives'] = r[col] <= ALPHA / n_tests
            r[col.replace('p_', 'holm_') + '_survives'] = hv
    for r in rows:
        r['p_in_sample'] = round(r['p_in_sample'], 5); r['p_gate'] = round(r['p_gate'], 5)
    cells = pd.DataFrame([{k: (json.dumps(v) if isinstance(v, (dict, list)) else v) for k, v in r.items()} for r in rows])
    cells.to_csv(os.path.join(HERE, 'cells.csv'), index=False)

    gate_survivors = [r for r in rows if r['holm_gate_survives'] and r['paired_t'] > 0]
    ins_survivors = [f"{r['metric_state']}/{r['cell']}" for r in rows if r['holm_in_sample_survives']]
    result = ('CANDIDATE (not promoted): ' + ', '.join(f"{r['metric_state']}/{r['cell']}" for r in gate_survivors)
              if gate_survivors else
              f'REFUSED: 0/{n_tests} cells survive Holm or Bonferroni on the held-out paired CRPS t')
    out = {
        'observed_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'test': 'Expected-metric layer (CPOE, nflfastR xYAC->YACOE) last-game diff -> next-week ATS residual vs close, conditional cells',
        'stamp': 'INFRASTRUCTURE PASS',
        'stamp_basis': 'manifest FreshnessGate v2 PASS; all 855 games joined both sides for CPOE and YACOE; raw-score residual; walk-forward HonestyGate per cell; 16 tests corrected',
        'result_stamp': result,
        'manifest': {'path': 'dfs/nfl_rvc_manifest.json', 'sha256_16': sha16, 'gate_audit': g['audit']},
        'total_tercile_cutpoints': [q1, q2],
        'neutral_rule': '|score_differential| <= 8 (posteam-relative, absolute)',
        'coverage': coverage,
        'not_included': {
            'GSE-RYOE': 'not in repo; native NGS RYOE only in minis/re/genie-acquisition-2026-10-10/ngs_rushing.csv.gz (.gz unreadable by FreshnessGate; qualifier-only rows; not the manifest source) -> excluded',
            'GSE-xYAC': 'not in repo; nflfastR native xyac_mean_yardage used instead (labelled YACOE)',
            'pressure_proxy': 'derivable (qb_hit/sack per dropback) but not a third axis here to keep the family at 16',
        },
        'n_tests': n_tests, 'alpha': ALPHA,
        'in_sample_holm_survivors': ins_survivors,
        'cells': rows,
        'proposed_kill_ledger_row': {
            'feature': 'expected_metric_conditional_ats', 'test': 'frozen NFL manifest 2023-25, 16 cells, walk-forward 2024+2025',
            'result': result,
            'reopen_condition': ('REOPEN: 2026 frozen weekly folds appended to the manifest and a single pre-registered cell '
                                 'reaching paired CRPS-delta t >= 1.96 after Holm over the registered family; or prop-level '
                                 'closes (completions / receiving-YAC ladders) captured on a frozen manifest for a direct metric-vs-prop residual')},
        'label': 'DIAGNOSTIC — not a live edge, no promotion',
    }
    json.dump(out, open(os.path.join(HERE, 'result.json'), 'w'), indent=1, default=str)
    print(cells[['metric_state', 'cell', 'n', 'slope', 't', 'ci95', 'close_crps', 'cand_crps', 'paired_t',
                 'p_gate', 'holm_gate_survives', 'holm_in_sample_survives']].to_string())
    print(result, '| in-sample Holm survivors:', ins_survivors, '| cut', q1, q2, coverage)


if __name__ == '__main__':
    main()
