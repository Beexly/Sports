import json
from pathlib import Path
from collections import Counter

repo = Path(r"c:\Users\Garrett\Sports")

grid_path = repo / "docs" / "data-sources" / "research" / "2026-10-13" / "linestar" / "linestar_slate_grid_2026-10-13.json"
grid = json.loads(grid_path.read_text(encoding="utf-8"))

dc_path = repo / "docs" / "data-sources" / "research" / "2026-10-13" / "depthcharts" / "espn-depthcharts-2026.json"
dc_data = json.loads(dc_path.read_text(encoding="utf-8"))

inj_path = repo / "docs" / "data-sources" / "research" / "2026-10-18" / "injuries" / "espn_nfl_injuries_week6.json"
inj_data = json.loads(inj_path.read_text(encoding="utf-8"))

usage_path = repo / "docs" / "data-sources" / "research" / "2026-10-13" / "linestar" / "linestar_usage_2026-10-13.json"
usage_data = json.loads(usage_path.read_text(encoding="utf-8"))

def _norm_name(name: str) -> str:
    nm = (name or "").strip().lower()
    for suf in (" jr.", " sr.", " iii", " ii", " iv", " jr", " sr"):
        if nm.endswith(suf):
            nm = nm[: -len(suf)].strip()
    return nm.replace(".", "").replace("'", "")

# Build name -> team maps
player_to_team = {}
# 1. Depth charts
for t_abbr, units in (dc_data.get("teams") or {}).items():
    for _, slots in (units or {}).items():
        for s in slots or []:
            nm = _norm_name(s.get("athlete") or "")
            if nm:
                player_to_team[nm] = t_abbr.upper()

# 2. Injuries
for t in (inj_data.get("teams") or []):
    t_abbr = t.get("team") or ""
    for inj in (t.get("injuries") or []):
        nm = _norm_name(inj.get("athlete") or "")
        if nm and nm not in player_to_team:
            player_to_team[nm] = t_abbr.upper()

# 3. Usage
for u in (usage_data.get("players") or []):
    nm = _norm_name(u.get("name") or "")
    t_abbr = u.get("team") or ""
    if nm and t_abbr and nm not in player_to_team:
        player_to_team[nm] = t_abbr.upper()

# 4. DST names
dst_map = {
    "cardinals": "ARI", "falcons": "ATL", "ravens": "BAL", "bills": "BUF",
    "panthers": "CAR", "bears": "CHI", "bengals": "CIN", "browns": "CLE",
    "cowboys": "DAL", "broncos": "DEN", "lions": "DET", "packers": "GB",
    "texans": "HOU", "colts": "IND", "jaguars": "JAX", "chiefs": "KC",
    "raiders": "LV", "chargers": "LAC", "rams": "LAR", "dolphins": "MIA",
    "vikings": "MIN", "patriots": "NE", "saints": "NO", "giants": "NYG",
    "jets": "NYJ", "eagles": "PHI", "steelers": "PIT", "49ers": "SF",
    "seahawks": "SEA", "buccaneers": "TB", "titans": "TEN", "commanders": "WSH",
}

print(f"Total entries in combined player_to_team: {len(player_to_team)}")

# Test on grid players
unresolved = []
resolved = Counter()

bye_teams = {"MIN", "DET", "MIA", "CIN"}
completed_tnf_teams = {"SEA", "DEN"}
active_slate_teams = {
    "HOU", "JAX", "CHI", "ATL", "BAL", "CLE", "TEN", "IND",
    "NYJ", "NE", "NO", "NYG", "CAR", "PHI", "PIT", "TB",
    "ARI", "LAR", "LAC", "KC", "BUF", "LV", "DAL", "GB",
    "WSH", "SF",
}

for p in grid.get("players", []):
    name = (p.get("name") or "").strip()
    pos = (p.get("pos") or "").strip().upper()
    if pos == "D":
        pos = "DST"
    nm = _norm_name(name)
    team = None
    if pos == "DST":
        for k, v in dst_map.items():
            if k in nm:
                team = v
                break
    else:
        team = player_to_team.get(nm)
    
    if team:
        resolved[team] += 1
    else:
        unresolved.append((name, pos, p.get("salary")))

print(f"Resolved players count: {sum(resolved.values())}")
print(f"Unresolved players count: {len(unresolved)}")
print(f"Teams represented: {len(resolved)}")
print("\nUnresolved sample (top 15 by salary):")
for u in sorted(unresolved, key=lambda x: -x[2])[:15]:
    print(f"  {u[0]} ({u[1]}, ${u[2]})")
