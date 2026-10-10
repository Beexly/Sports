#!/usr/bin/env python3
"""
nfl_situational_graph.py — INVENTED METRIC #1: micro-state situational transition
graph. Every play = dense state vector; transitions + drive outcomes conditioned on
the FULL state INCLUDING leverage (score-diff x time) — where standard EP models stop
at (down, distance, ytg), this conditions on game situation.

Novel outputs:
  1. EP_state(state) — mean drive-end points conditioned on full state
  2. Leverage delta — EP(state) tight-game vs blowout at IDENTICAL (down,dist,ytg)
  3. Transition class distribution per state (TD/FG/turnover/punt/continue)
  4. State-conditional aggression payoff: go-vs-punt EPA by state
Streaming over nflfastR 2023-2025 (all REG plays).
"""
import csv, gzip, statistics, json
from collections import defaultdict

DATA = "/var/minis/workspace/nfl/data"
YEARS = [2023, 2024, 2025]

def dist_bin(d):
    if d is None: return None
    d = float(d)
    return "1-2" if d <= 2 else "3-6" if d <= 6 else "7-10" if d <= 10 else "11-15" if d <= 15 else "16+"

def ytg_bin(y):
    if y is None: return None
    y = float(y)
    return "goal" if y <= 2 else "1-10" if y <= 10 else "11-20" if y <= 20 else "21-40" if y <= 40 else "41-60" if y <= 60 else "61-80" if y <= 80 else "81-100"

def score_bin(sd):
    if sd is None: return None
    if sd <= -21: return "down21+"
    if sd <= -8: return "down8-20"
    if sd <= -1: return "down1-7"
    if sd == 0: return "tied"
    if sd <= 7: return "up1-7"
    if sd <= 20: return "up8-20"
    return "up21+"

def _num(x):
    try: return int(float(x))
    except (TypeError, ValueError): return None

def state_key(r):
    d, dist = _num(r.get("down")), r.get("ydstogo")
    ytg = r.get("yardline_100")
    q = _num(r.get("qtr"))
    if d is None or ytg in ("", "NA", None) or q not in (1, 2, 3, 4):
        return None
    db, yb, sb = dist_bin(dist), ytg_bin(ytg), score_bin(F(r.get("score_differential")))
    if not (db and yb and sb): return None
    gsr = F(r.get("game_seconds_remaining"))
    two_min = "late" if gsr is not None and ((q == 2 and gsr <= 120) or (q == 4 and gsr <= 300)) else "reg"
    return f"{d}|{db}|{yb}|{sb}|{q}|{two_min}"

def F(x): return float(x) if x not in ("", "NA", None) else None

def main():
    # drive points accumulation: (game, drive) -> points by posteam
    drive_pts = defaultdict(float)
    states_seen = {}       # play index -> state (first play of each drive is the "state")
    drives_first_state = {}
    trans = defaultdict(lambda: defaultdict(int))     # state -> outcome class -> n
    ep_rows = defaultdict(lambda: [0.0, 0])           # state -> [pts_sum, n]
    go = defaultdict(lambda: [0, 0, 0.0, 0.0])        # state -> [go_n, punt_n, go_epa, punt_epa]
    leverage = defaultdict(lambda: defaultdict(lambda: [0.0, 0]))  # (d,db,yb) -> sb -> [pts,n]

    n_plays = 0
    for season in YEARS:
        try:
            fh = gzip.open(f"{DATA}/pbp_{season}.csv.gz", "rt")
        except FileNotFoundError:
            continue
        for r in csv.DictReader(fh):
            if r.get("season_type") != "REG" or not r.get("posteam"):
                continue
            n_plays += 1
            dk = (r.get("game_id"), r.get("drive"))
            pt = r.get("play_type") or ""
            # drive points scored by posteam
            if r.get("td_team") == r.get("posteam"):
                drive_pts[dk] += 6.8
            elif r.get("field_goal_result") == "made":
                drive_pts[dk] += 3.0
            # mark first state of drive
            if dk not in drives_first_state:
                sk = state_key(r)
                if sk:
                    drives_first_state[dk] = sk
            # transitions from scrimmage plays
            if pt in ("run", "pass"):
                sk = state_key(r)
                if sk:
                    if sk not in states_seen:
                        states_seen[sk] = True
                    # leverage-conditional EP (collapsed by half-state for n)
                    half = f"{r['down']}|{db_or(r)}|{yb_or(r)}"
                    result_cls = None
                    if r.get("td_team") == r.get("posteam"): result_cls = "TD"
                    elif r.get("field_goal_result") == "made": result_cls = "FG_made"  # drive continues mostly
            # drive-end: when next play has new drive or game end — handled below
        fh.close()

    # EP per first-drive-state
    for dk, sk in drives_first_state.items():
        pts = drive_pts.get(dk, 0.0)
        ep_rows[sk][0] += pts
        ep_rows[sk][1] += 1
        parts = sk.split("|")
        half = f"{parts[0]}|{parts[1]}|{parts[2]}"
        leverage[half][parts[3]][0] += pts
        leverage[half][parts[3]][1] += 1

    # leverage deltas: identical (down,dist,ytg) across score bins
    print(f"[DATA] {n_plays:,} plays, {len(drives_first_state):,} drives, {len(ep_rows)} distinct states")
    print("\n[1] LEVERAGE-ADJUSTED EP — the invented delta (mean drive points by score state)")
    print(f"{'down|dist|ytg':<22}{'down8-20':>10}{'down1-7':>10}{'tied':>8}{'up1-7':>8}{'up8-20':>9}{'up21+':>8}  spread")
    deltas_out = []
    for half in sorted(leverage, key=lambda h: -sum(v[1] for v in leverage[h].values())):
        bins = leverage[half]
        if sum(v[1] for v in bins.values()) < 400: continue
        vals = {}
        for sb in ("down8-20", "down1-7", "tied", "up1-7", "up8-20", "up21+"):
            if sb in bins and bins[sb][1] >= 30:
                vals[sb] = bins[sb][0] / bins[sb][1]
        if len(vals) >= 4:
            spread = max(vals.values()) - min(vals.values())
            row = {"state": half, **{k: round(v, 3) for k, v in vals.items()}, "spread": round(spread, 3)}
            deltas_out.append(row)
            print(f"{half:<22}" + "".join(f"{vals.get(s, float('nan')):>10.2f}" for s in
                  ("down8-20", "down1-7", "tied", "up1-7", "up8-20", "up21+")) + f"  {spread:+.2f}")
    json.dump(deltas_out, open(f"{DATA}/situational_ep_leverage_2023_2025.json", "w"), indent=1)
    print(f"\n[SAVED] situational_ep_leverage_2023_2025.json ({len(deltas_out)} states)")
    print("[NEXT] transition matrix full dump + go/punt payoff by state = v1 of the graph")

def db_or(r): return dist_bin(r.get("ydstogo"))
def yb_or(r): return ytg_bin(r.get("yardline_100"))

if __name__ == "__main__":
    main()
