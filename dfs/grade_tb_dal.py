import json
import time
import pandas as pd

sig = {
    'observed_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    'event': 'TB@DAL Week 5 (Thursday, settled before London)',
    'closings': {'ats_result': {'TB': 17.5, 'DAL': -17.5}},
    'signatures_wk4': {
        'DAL': {'qb': 'Dak Prescott', 'cpoe': 4.74, 'pressured': 15},
        'TB': {'qb': 'Jalon Daniels [NAME-JOIN ARTIFACT]', 'cpoe': 3.94, 'pressured': 11},
    },
    'grade': {
        'read': 'Both wk4 signatures POSITIVE CPOE under pressure — no discrimination between teams. '
                'TB covered by 17.5, DAL failed by 17.5. One game, similar signatures, opposite outcomes '
                '— confirms the P1 honest refusal (signature is not a team-ATS discriminator).',
        'no_invented_edge': True,
    },
    'label': 'DIAGNOSTIC — single-game grade, confirms refusal',
}
json.dump(sig, open('dfs/TB_DAL_SIGNATURE_GRADE.json', 'w'), indent=1)
print('landed dfs/TB_DAL_SIGNATURE_GRADE.json')

# join artifact check
j = pd.read_csv('dfs/cpoe_x_pressure_2026.csv')
jd = j[j.player_display_name.str.contains('Daniels', na=False)]
print(jd[['player_display_name', 'team', 'week', 'attempts']].to_string(index=False))
# the name_key collision: 'jalondaniels' — Jalen Daniels vs Jalon Daniels?
# check the PFR side names containing 'daniels'
pfr = pd.read_parquet('dfs/eq_harvest/raw/nflverse-data/advstats_week_pass_2026.parquet')
pd_names = sorted(pfr[pfr.pfr_player_name.str.contains('Daniels', na=False)].pfr_player_name.unique())
print('PFR Daniels:', pd_names)
ngs = pd.read_parquet('dfs/ngs_passing.parquet')
nd = sorted(ngs[(ngs.season == 2026) & (ngs.player_display_name.str.contains('Daniels', na=False))].player_display_name.unique())
print('NGS Daniels 2026:', nd)
