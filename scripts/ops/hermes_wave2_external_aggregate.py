import pyarrow.parquet as pq
import json, csv, collections, os

WT = r"C:\Users\Garrett\Sports-worktrees\hermes-sunday-watch-2026-11-15"
DATA = os.path.join(WT, "intelligence", "coaching", "data")
SCRATCH = r"C:\Users\Garrett\AppData\Local\hermes\cache\scratch"
TEAMS = ["NE","DET","BUF","NYJ","CAR","NO","HOU","CLE","JAX","TEN","KC","ATL",
         "LAC","BAL","LAR","ARI","MIA","IND","MIN","GB","PIT","CIN","SEA","LV","SF","DAL"]

pbp = pq.read_table(os.path.join(DATA,"play_by_play_2026.parquet"),
    columns=["play_id","game_id","week","qtr","posteam","defteam","drive","order_sequence",
             "game_seconds_remaining","half_seconds_remaining","pass","rush","sack","qb_hit",
             "score_differential","pass_oe","xpass","down","play_type"]).to_pylist()
ftn = pq.read_table(os.path.join(DATA,"ftn_charting_2026.parquet"),
    columns=["nflverse_play_id","week","n_defense_box","n_blitzers","is_no_huddle",
             "is_play_action","is_rpo","is_screen_pass","is_qb_fault_sack"]).to_pylist()
print("pbp rows", len(pbp), "ftn rows", len(ftn), "ftn weeks", sorted({r['week'] for r in ftn}))

pidx = {r["play_id"]: r for r in pbp if r["play_id"] is not None}
def is_snaps(r): return r["play_type"] in ("pass","run") and (r["pass"]==1 or r["rush"]==1)

# ---- per-offense-team PBP metrics (weeks 1-7 mirror) ----
off = {t: dict(n=0, passes=0, h1_n=0, h1_pass=0, sacks=0, hits=0, poe=[], poe_neutral=[],
               pace_deltas=[], go4_n=0, go4_att=0) for t in TEAMS}
by_game_drive = collections.defaultdict(list)
for r in pbp:
    t = r["posteam"]
    if t not in off: continue
    if r["down"] == 4:
        off[t]["go4_n"] += 1
        if r["play_type"] in ("pass","run"): off[t]["go4_att"] += 1
    if not is_snaps(r): continue
    o = off[t]; o["n"] += 1
    p = 1 if r["pass"]==1 else 0
    o["passes"] += p
    if r["qtr"] is not None and r["qtr"] <= 2:
        o["h1_n"] += 1; o["h1_pass"] += p
    o["sacks"] += int(r["sack"] or 0); o["hits"] += int(r["qb_hit"] or 0)
    if r["pass_oe"] is not None:
        o["poe"].append(r["pass_oe"])
        sd = r["score_differential"]
        if sd is not None and abs(sd) <= 7 and (r["qtr"] or 5) <= 3:
            o["poe_neutral"].append(r["pass_oe"])
    by_game_drive[(r["game_id"], r["drive"])].append(r)
for key, rows in by_game_drive.items():
    rows.sort(key=lambda r: r["order_sequence"] or 0)
    for a, b in zip(rows, rows[1:]):
        t = b["posteam"]
        if t not in off: continue
        if a["game_seconds_remaining"] is None or b["game_seconds_remaining"] is None: continue
        d = a["game_seconds_remaining"] - b["game_seconds_remaining"]
        sd = b["score_differential"]; q = b["qtr"] or 5
        neutral = sd is not None and abs(sd) <= 7 and q <= 3 and not (q==2 and (b["half_seconds_remaining"] or 999) <= 120)
        if neutral and 0 < d <= 45:
            off[t]["pace_deltas"].append(d)

def mean(x): return sum(x)/len(x) if x else None
out_off = {}
for t, o in off.items():
    surv = 1 - o["sacks"]/(o["hits"]+o["sacks"]) if (o["hits"]+o["sacks"])>0 else None
    out_off[t] = dict(
        window="pbp weeks 1-7 local mirror", n_snaps=o["n"],
        pass_rate_all=o["passes"]/o["n"] if o["n"] else None,
        pass_rate_1h=o["h1_pass"]/o["h1_n"] if o["h1_n"] else None,
        proe_pass_oe_mean=mean(o["poe"]), proe_neutral_mean=mean(o["poe_neutral"]),
        neutral_pace_sec=mean(o["pace_deltas"]), n_pace_samples=len(o["pace_deltas"]),
        pressure_to_sack_survival_proxy=surv, sacks=o["sacks"], qb_hits=o["hits"],
        go4_rate=o["go4_att"]/o["go4_n"] if o["go4_n"] else None)

# ---- FTN joined to PBP: box/blitz per defense, tempo flags per offense ----
defbox = {t: dict(box=[], heavy=0, light=0, n_rush=0, blitz_n=0, blitz_pass=0, n_pass=0) for t in TEAMS}
offlag = {t: dict(n=0, no_huddle=0, pa=0, rpo=0, screen=0, qb_fault_sack=0, sacks=0) for t in TEAMS}
joined = 0
for f in ftn:
    p = pidx.get(f["nflverse_play_id"])
    if not p: continue
    joined += 1
    dt, ot = p["defteam"], p["posteam"]
    if dt in defbox:
        d = defbox[dt]
        if p["rush"]==1 and f["n_defense_box"] is not None:
            b = f["n_defense_box"]; d["box"].append(b); d["n_rush"] += 1
            if b >= 8: d["heavy"] += 1
            if b <= 6: d["light"] += 1
        if p["pass"]==1:
            d["n_pass"] += 1
            if f["n_blitzers"] is not None and f["n_blitzers"] > 0: d["blitz_n"] += 1
    if ot in offlag:
        o = offlag[ot]; o["n"] += 1
        for k, col in [("no_huddle","is_no_huddle"),("pa","is_play_action"),("rpo","is_rpo"),("screen","is_screen_pass")]:
            if f[col]: o[k] += 1
        if p["sack"]==1:
            o["sacks"] += 1
            if f["is_qb_fault_sack"]: o["qb_fault_sack"] += 1
print("ftn joined to pbp:", joined, "of", len(ftn))
out_def = {}
for t, d in defbox.items():
    out_def[t] = dict(window="FTN charting joined to pbp weeks 1-7",
        mean_box_defenders=mean(d["box"]), heavy_box_rate_ge8=d["heavy"]/d["n_rush"] if d["n_rush"] else None,
        light_box_rate_le6=d["light"]/d["n_rush"] if d["n_rush"] else None, n_rush_charted=d["n_rush"],
        blitz_rate=d["blitz_n"]/d["n_pass"] if d["n_pass"] else None, n_pass_charted=d["n_pass"])
out_offlag = {}
for t, o in offlag.items():
    n = o["n"] or 1
    out_offlag[t] = dict(window="FTN charting weeks 1-7", n_charted=o["n"],
        no_huddle_rate=o["no_huddle"]/n, play_action_rate=o["pa"]/n, rpo_rate=o["rpo"]/n,
        screen_rate=o["screen"]/n, qb_fault_sack_share=o["qb_fault_sack"]/o["sacks"] if o["sacks"] else None)

# ---- coaching CSV mirrors, 2026 rows ----
def csv26(name):
    rows = {}
    with open(os.path.join(DATA,name), encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r.get("season")=="2026" and r.get("team") in TEAMS: rows[r["team"]]=r
    return rows
proe_csv = csv26("proe_early_neutral.csv")
offt_csv = csv26("off_tendencies.csv")
deft_csv = csv26("def_tendencies.csv")
elas_csv = csv26("script_elasticity.csv")
print("csv26 counts:", len(proe_csv), len(offt_csv), len(deft_csv), len(elas_csv))
print("def_tendencies 2026 man_rate sample:", {t: deft_csv[t].get("man_rate") for t in list(deft_csv)[:4]})

# ---- statyx man/zone YPRR (week10) mapped to teams via dossier rosters ----
name2team = {}
import glob
for fp in glob.glob(os.path.join(WT,"data","engine","connected_workflow_dossier_*_week10.json")):
    d = json.load(open(fp, encoding="utf-8"))
    for p in d.get("stage0_roster_and_board_allowlist",{}).get("roster",[]):
        nm = p.get("player") or p.get("name") or p.get("player_display_name")
        tm = p.get("team") or p.get("recent_team")
        if nm and tm: name2team[nm]=tm
    for nm, p in d.get("stage0_roster_and_board_allowlist",{}).get("verified_board_athletes",{}).items():
        tm = p.get("team") or p.get("recent_team")
        if tm: name2team[nm]=tm
print("name2team size:", len(name2team))
mz = {t: dict(man_routes=0, zone_routes=0, man_yds=0.0, zone_yds=0.0, players=[]) for t in TEAMS}
unmapped=[]
with open(os.path.join(WT,"docs","research","2026-11-12","full-tables","statyx-man-vs-zone-splits-week10-2026.csv"), encoding="utf-8") as f:
    for r in csv.DictReader(f):
        t = name2team.get(r["player"])
        if not t or t not in mz: unmapped.append(r["player"]); continue
        m = mz[t]
        mr, zr = float(r["man_routes"] or 0), float(r["zone_routes"] or 0)
        m["man_routes"] += mr; m["zone_routes"] += zr
        m["man_yds"] += mr*float(r["yprr_man"] or 0); m["zone_yds"] += zr*float(r["yprr_zone"] or 0)
        m["players"].append(r["player"])
out_mz = {}
for t, m in mz.items():
    out_mz[t] = dict(window="statyx week10 splits (2026-11-12), roster-mapped",
        yprr_man=m["man_yds"]/m["man_routes"] if m["man_routes"] else None,
        yprr_zone=m["zone_yds"]/m["zone_routes"] if m["zone_routes"] else None,
        man_routes=m["man_routes"], zone_routes=m["zone_routes"], n_players=len(m["players"]))
print("statyx unmapped players:", len(unmapped), unmapped[:8])

# ---- pff yards per rush vs 8+ box (week10 snapshot) ----
NFLNAME = {"Steelers":"PIT","Chiefs":"KC","Bills":"BUF","Jets":"NYJ","Panthers":"CAR","Saints":"NO",
 "Texans":"HOU","Browns":"CLE","Jaguars":"JAX","Titans":"TEN","Falcons":"ATL","Chargers":"LAC",
 "Ravens":"BAL","Rams":"LAR","Cardinals":"ARI","Dolphins":"MIA","Colts":"IND","Vikings":"MIN",
 "Packers":"GB","Bengals":"CIN","Seahawks":"SEA","Raiders":"LV","49ers":"SF","Cowboys":"DAL",
 "Patriots":"NE","Lions":"DET","Eagles":"PHI","Giants":"NYG","Commanders":"WAS","Bears":"CHI",
 "Broncos":"DEN","Buccaneers":"TB"}
box8 = {t: [] for t in TEAMS}
with open(os.path.join(WT,"docs","research","2026-11-14","full-tables","pff-yards-per-rush-vs-8box-2026.csv"), encoding="utf-8") as f:
    for r in csv.DictReader(f):
        t = NFLNAME.get(r["team"])
        if t in box8: box8[t].append((r["player"], float(r["ypr"])))
out_box8 = {t: dict(window="PFF vs 8+ box, 2026-11-14 snapshot",
                    players=[{"player":p,"ypr":y} for p,y in sorted(v,key=lambda x:-x[1])[:5]]) for t,v in box8.items()}

# ---- gridiron matchup cards (13 games) ----
cards = {}
for fp in glob.glob(os.path.join(WT,"docs","research","2026-11-14","full-tables","gridiron-matchup-*-2026.csv")):
    rows = list(csv.DictReader(open(fp, encoding="utf-8")))
    if rows: cards[rows[0]["matchup"]] = rows
print("matchup cards:", len(cards))

result = dict(off_pbp=out_off, def_ftn=out_def, off_ftn_flags=out_offlag,
              proe_csv26=proe_csv, off_tendencies_csv26=offt_csv, def_tendencies_csv26=deft_csv,
              elasticity_csv26=elas_csv, man_zone_week10=out_mz, box8_week10=out_box8,
              matchup_cards=cards)
json.dump(result, open(os.path.join(SCRATCH,"wave2_external_metrics.json"),"w"), indent=1)
print("saved wave2_external_metrics.json")
for t in ["NE","DET"]:
    print(t, "pbp:", {k:(round(v,4) if isinstance(v,float) else v) for k,v in out_off[t].items()})
    print(t, "ftn def:", {k:(round(v,4) if isinstance(v,float) else v) for k,v in out_def[t].items()})