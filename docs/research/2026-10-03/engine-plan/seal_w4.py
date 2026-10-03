"""Seal 2026 W4 independent predictions (Elo + per-QB EPA) before Sunday kickoffs. Hash = sha256 of the canonical JSON."""
import io, contextlib, runpy, json, hashlib, datetime as dt
import numpy as np, pandas as pd
with contextlib.redirect_stdout(io.StringIO()):
    P = runpy.run_path('perqb.py')
df, fit, lg, pred, qb_rating, recs = P['df'], P['fit'], P['lg'], P['pred'], P['qb_rating'], P['recs']
tr = df[df.season >= 2019]
w, se = fit(np.column_stack([lg(tr.elo.values), tr.x.values]), tr.y.values.astype(float))
g = pd.read_csv('games.csv', low_memory=False)
w4 = g[(g.season == 2026) & (g.week == 4) & g.result.isna()]
out = []
for r in w4.itertuples():
    rec = recs[r.game_id]
    if pd.isna(r.home_qb_id) or pd.isna(r.away_qb_id):
        out.append(dict(game_id=r.game_id, withheld='starter unknown')); continue
    x = qb_rating(r.home_qb_id, r.gameday) - qb_rating(r.away_qb_id, r.gameday)
    p = float(pred(w, np.array([[lg(np.array([rec['p_elo']]))[0], x]]))[0])
    out.append(dict(game_id=r.game_id, kickoff=f"{r.gameday} {r.gametime} ET", home=r.home_team, away=r.away_team,
                    home_qb=r.home_qb_name, away_qb=r.away_qb_name, p_home_independent=round(p, 4),
                    p_home_elo_only=round(rec['p_elo'], 4), q_home_market_at_seal=None if rec['q'] is None else round(rec['q'], 4)))
doc = dict(sealed_at_utc=dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds'), model='logit(elo)+qb_epa16 diff, fit 2019-2026W4TNF',
           coef=[round(float(c), 5) for c in w], note='Independent model. Not a pick. Score Monday vs the de-vigged close: log loss, Brier.', games=out)
canon = json.dumps(doc, sort_keys=True, separators=(',', ':'))
h = hashlib.sha256(canon.encode()).hexdigest()
open('w4_2026_sealed.json', 'w').write(canon); open('w4_2026_sealed.sha256', 'w').write(h + '  w4_2026_sealed.json\n')
print(h); print(json.dumps(out, indent=0)[:3000])
