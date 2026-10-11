import subprocess
import glob
import pandas as pd
import numpy as np

if not glob.glob('dfs/eq_harvest/raw/nflverse-data/games.csv'):
    r = subprocess.run(['curl', '-sL', '--max-time', '60',
        'https://github.com/nflverse/nflverse-data/releases/download/schedules/games.csv',
        '-o', 'dfs/eq_harvest/raw/nflverse-data/games.csv', '-w', '%{http_code} %{size_download}'],
        capture_output=True, text=True, timeout=120)
    print('games.csv:', r.stdout)

g = pd.read_csv('dfs/eq_harvest/raw/nflverse-data/games.csv', low_memory=False)
print(f'games: {len(g)} rows, seasons {sorted(g.season.unique())[-3:]}')
print('cols:', list(g.columns)[:22])
g26 = g[g.season == 2026]
print(f'2026 games: {len(g26)}')

# REST/TRAVEL EQUATION INPUTS: gameday, rest days, travel (timezone diff), short week
rest_cols = [c for c in g.columns if any(k in c.lower() for k in ['rest', 'travel', 'days', 'timezone', 'gameday'])]
print('rest/travel cols:', rest_cols)
