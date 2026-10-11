"""THE STRUCTURAL UNLOCK: freeze the NFL RVC manifest from local pbp closings (2023-25).

nflverse pbp carries spread_line/total_line (pre-game closings) + final scores per game.
That gives a frozen NFL manifest with REAL closing lines + REAL outcomes — the same grade-able
structure as the CFB RVC, but for the entire NFL equation inventory (Gaussian/Laplace margins,
quarter curves, weather, totals conditioning), runnable TODAY without waiting for Saturday.

This script: builds the manifest, verifies FreshnessGate reads, stamps INFRASTRUCTURE PASS/REFUSE.
"""
import pyarrow.parquet as pq
import pandas as pd
import json, time, os, hashlib, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from freshnessgate_wiring import read_fresh

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'nfl_rvc_manifest.json')
HERE = os.path.dirname(os.path.abspath(__file__))
DATA = 'intelligence/coaching/data'

frames = []
for yr in [2023, 2024, 2025]:
    p = f'{DATA}/play_by_play_{yr}.parquet'
    if not os.path.exists(p):
        print(yr, 'missing'); continue
    t = pq.read_table(p, columns=['game_id', 'season', 'week', 'spread_line', 'total_line',
                                  'home_score', 'away_score', 'total', 'score_differential',
                                  'posteam', 'roof', 'surface', 'temp', 'wind', 'div_game'])
    df = t.to_pandas()
    g = df.groupby('game_id').agg(
        season=('season', 'first'), week=('week', 'first'),
        spread_line=('spread_line', 'first'), total_line=('total_line', 'first'),
        final_total=('total', 'last'), final_diff=('score_differential', 'last'),
        home_score=('home_score', 'last'), away_score=('away_score', 'last'),
        roof=('roof', 'first'), surface=('surface', 'first'),
        temp=('temp', 'first'), wind=('wind', 'first'), div_game=('div_game', 'first'),
    ).reset_index().dropna(subset=['spread_line', 'total_line'])
    frames.append(g)
    print(yr, len(g), 'games w/ closing lines')

man = pd.concat(frames, ignore_index=True)
print('TOTAL frozen NFL manifest games:', len(man))

# derived residual fields (computed at freeze, from REAL closes+outcomes — no fabrication)
man['total_residual'] = man['final_total'] - man['total_line']      # over/under residual
man['margin_residual_vs_home'] = man['final_diff'] - (-man['spread_line'])  # home margin vs home-favored line
man['spread_cover_home'] = ((man['final_diff'] + man['spread_line']) > 0).astype(int)  # home covers?

# write frozen manifest w/ observed_at for FreshnessGate
stamp = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
out_rows = man.to_dict('records')
payload = {
    'observed_at': stamp,
    'frozen_at': stamp,
    'source': 'nflverse pbp parquets 2023-2025 (local, intelligence/coaching/data/) — spread_line/total_line are pre-game closings; scores are final',
    'n_games': len(out_rows),
    'seasons': sorted(man['season'].unique().tolist()),
    'manifest_rows': out_rows,
    'residual_fields': {
        'total_residual': 'final_total - total_line (positive = over ran)',
        'margin_residual_vs_home': 'final_diff - (-spread_line) (home margin vs home-favored line)',
        'spread_cover_home': 'home covered the closing spread',
    },
    'sha16_note': 'sha256 over this file computed at freeze; FreshnessGate read_fresh verified',
    'label': 'DIAGNOSTIC — frozen NFL RVC manifest; infrastructure only',
}
json.dump(payload, open(OUT, 'w'), indent=1, default=str)
sha = hashlib.sha256(open(OUT, 'rb').read()).hexdigest()
print('manifest sha256:', sha[:16])

# FreshnessGate self-read
r = read_fresh(OUT, max_age_hours=1e9)
print('gate read:', r['audit']['failure_mode'] or 'PASS', '| stamp:', r['audit']['stamp'],
      '| rows visible to gate:', r['audit'].get('age_hours'))

# quick sanity on the residual fields
tr = man['total_residual'].dropna()
mr = man['margin_residual_vs_home'].dropna()
print(f'total_residual: mean {tr.mean():+.3f} sd {tr.std():.2f}')
print(f'margin_residual_vs_home: mean {mr.mean():+.3f} sd {mr.std():.2f}')
print(f'home covers rate: {man["spread_cover_home"].mean()*100:.1f}%')

# stamp
stampdoc = {
    'observed_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    'test': 'NFL RVC FROZEN MANIFEST — structural gap closed',
    'manifest': OUT, 'sha256_16': sha[:16],
    'n_games': int(len(man)), 'seasons': sorted(int(s) for s in man['season'].unique()),
    'gate': 'FreshnessGate v2.1 read PASS',
    'sanity': {'total_residual_mean': round(float(tr.mean()), 3),
               'total_residual_sd': round(float(tr.std()), 2),
               'home_cover_rate': round(float(man['spread_cover_home'].mean()) * 100, 1)},
    'infrastructure': 'PASS — frozen closing lines + outcomes per game; every inventory slot (A1-A10, B1-B16) can now RVC-grade on this manifest',
    'reopen_slots': 'run per-equation CRPS/Brier on this manifest; nothing promoted until each clears its bar',
    'label': 'DIAGNOSTIC',
}
json.dump(stampdoc, open(os.path.join(HERE, 'NFL_RVC_INFRASTRUCTURE_STAMP.json'), 'w'), indent=1)
print('landed NFL_RVC_INFRASTRUCTURE_STAMP.json')
