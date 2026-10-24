import json
from pathlib import Path

repo = Path(r"c:\Users\Garrett\Sports")
dc_path = repo / "docs" / "data-sources" / "research" / "2026-10-13" / "depthcharts" / "espn-depthcharts-2026.json"
dc_data = json.loads(dc_path.read_text(encoding="utf-8")) if dc_path.exists() else {}

print("Depth chart teams:", len(dc_data.get("teams", {})))
player_count = 0
for t, units in dc_data.get("teams", {}).items():
    t_players = 0
    for u, slots in units.items():
        for s in slots:
            t_players += 1
    player_count += t_players
print("Total depth chart slots:", player_count)

# Check injuries
inj_path = repo / "docs" / "data-sources" / "research" / "2026-10-18" / "injuries" / "espn_nfl_injuries_week6.json"
inj_data = json.loads(inj_path.read_text(encoding="utf-8")) if inj_path.exists() else {}
print("Injuries teams:", len(inj_data.get("teams", [])))
print("Total injuries:", inj_data.get("injury_count"))
