import json
from pathlib import Path

repo = Path(r"c:\Users\Garrett\Sports")

# 8 target games:
# 1. HOU @ JAX (401872996)
# 2. CHI @ ATL (401872999)
# 3. CAR @ PHI (401872998)
# 4. ARI @ LAR (401873004)
# 5. LAC @ KC  (401873006)
# 6. BUF @ LV  (401873005)
# 7. DAL @ GB  (401873007)
# 8. WSH @ SF  (401873008)

target_games = {
    "401872996": "HOU @ JAX",
    "401872999": "CHI @ ATL",
    "401872998": "CAR @ PHI",
    "401873004": "ARI @ LAR",
    "401873006": "LAC @ KC",
    "401873005": "BUF @ LV",
    "401873007": "DAL @ GB",
    "401873008": "WSH @ SF",
}

archive_dir = repo / "docs" / "data-sources" / "research" / "props-archive"
inj_path = repo / "docs" / "data-sources" / "research" / "2026-10-18" / "injuries" / "espn_nfl_injuries_week6.json"
inj_data = json.loads(inj_path.read_text(encoding="utf-8"))

inj_status = {}
for t in inj_data.get("teams", []):
    for i in t.get("injuries", []):
        inj_status[(i.get("athlete", "").lower(), t.get("team"))] = i.get("status")

print("Checking 8 target games:")
for gid, matchup in target_games.items():
    fpath = archive_dir / f"{gid}_20261018T09.json"
    if not fpath.exists():
        print(f"File missing for {matchup} ({gid})")
        continue
    data = json.loads(fpath.read_text(encoding="utf-8"))
    print(f"\n==========================================")
    print(f"Game: {matchup} ({data.get('game')}) - {gid}")
    
    # Collect key QBs and WRs
    players = {}
    for l in data.get("lines", []):
        pname = l.get("playerName")
        m = l.get("propMarket", "")
        if not pname:
            continue
        if any(k in m for k in ["Passing Yards", "Passing Touchdowns", "Receiving Yards", "Receptions", "Rushing Yards"]):
            if pname not in players:
                players[pname] = {}
            if m not in players[pname]:
                players[pname][m] = (l.get("line"), l.get("openLine"), l.get("lineMoved"))
    
    for p, props in sorted(players.items()):
        # Show if QB or top WR/RB
        has_pass = any("Passing" in k for k in props)
        has_rec = any("Receiving Yards" in k for k in props)
        if has_pass or has_rec:
            print(f"  Player: {p}")
            for k, val in props.items():
                print(f"    - {k}: line={val[0]} (open={val[1]}, moved={val[2]})")
