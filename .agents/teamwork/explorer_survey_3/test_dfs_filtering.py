import json
from pathlib import Path
from collections import Counter
import random

repo = Path(r"c:\Users\Garrett\Sports")

grid_path = repo / "docs" / "data-sources" / "research" / "2026-10-13" / "linestar" / "linestar_slate_grid_2026-10-13.json"
grid = json.loads(grid_path.read_text(encoding="utf-8"))

inj_path = repo / "docs" / "data-sources" / "research" / "2026-10-18" / "injuries" / "espn_nfl_injuries_week6.json"
inj_data = json.loads(inj_path.read_text(encoding="utf-8"))

usage_path = repo / "docs" / "data-sources" / "research" / "2026-10-13" / "linestar" / "linestar_usage_2026-10-13.json"
usage_data = json.loads(usage_path.read_text(encoding="utf-8"))

LINESTAR_TID_MAP = {
    65: "LAC", 66: "DEN", 68: "ATL", 69: "SEA", 70: "CAR", 71: "BAL",
    74: "JAX", 75: "LAR", 76: "KC", 77: "CHI", 78: "NE", 79: "BUF",
    80: "NYJ", 82: "TB", 83: "HOU", 84: "TEN", 85: "PHI", 86: "ARI",
    87: "LV", 88: "CLE", 89: "IND", 90: "PIT", 91: "GB", 92: "NO",
    93: "WSH", 94: "DAL", 95: "SF", 96: "NYG",
}

BYE_TEAMS = {"MIN", "DET", "MIA", "CIN"}
COMPLETED_TNF_TEAMS = {"SEA", "DEN"}
EXCLUDED_TEAMS = BYE_TEAMS | COMPLETED_TNF_TEAMS

def _norm_name(name: str) -> str:
    nm = (name or "").strip().lower()
    for suf in (" jr.", " sr.", " iii", " ii", " iv", " jr", " sr"):
        if nm.endswith(suf):
            nm = nm[: -len(suf)].strip()
    return nm.replace(".", "").replace("'", "")

inj_map = {}
for t in (inj_data.get("teams") or []):
    team = t.get("team")
    for e in (t.get("injuries") or []):
        nm = _norm_name(e.get("athlete") or "")
        if nm:
            inj_map[nm] = {
                "player": e.get("athlete") or "",
                "team": team,
                "status": (e.get("status") or "").upper(),
                "detail": e.get("comment") or "",
            }

BLOCKING_STATUS = ("OUT", "IR", "INJURED RESERVE", "DOUBTFUL", "SUSPENDED", "PUP", "NFI", "RESERVE")

def is_player_blocked(name: str, extra_status: str = "") -> tuple[bool, str]:
    st_extra = (extra_status or "").strip().upper()
    if any(b in st_extra for b in BLOCKING_STATUS):
        return True, f"LineStar status={st_extra}"
    nm = _norm_name(name)
    info = inj_map.get(nm)
    if info:
        st = info["status"]
        if any(b in st for b in BLOCKING_STATUS):
            return True, f"ESPN Week 6 status={st}"
    return False, "ACTIVE"

pool = {}
blocked = []
excluded_team_count = 0

for p in grid.get("players", []):
    pid = int(p.get("playerId") or 0)
    if not pid:
        continue
    name = (p.get("name") or "").strip()
    pos = (p.get("pos") or "").strip().upper()
    if pos == "D":
        pos = "DST"
    if pos not in ("QB", "RB", "WR", "TE", "DST"):
        continue
    sal = int(p.get("salary") or 0)
    if sal < 2000:
        continue
    s_ord = int(p.get("starting_order") or 0)
    if pos != "DST" and s_ord <= 0:
        continue

    tid = p.get("teamId")
    team = LINESTAR_TID_MAP.get(tid, "")
    if team in EXCLUDED_TEAMS:
        excluded_team_count += 1
        continue
    if not team:
        continue

    blk, reason = is_player_blocked(name, extra_status=str(p.get("injury_status") or ""))
    if blk:
        blocked.append(f"{name} ({pos}, {team}, ${sal}): {reason}")
        continue

    pool[pid] = {
        "pid": pid,
        "name": name,
        "pos": pos,
        "team": team,
        "salary": sal,
    }

print(f"Total players in active Week 6 slate pool: {len(pool)}")
print(f"Blocked inactive/OUT/IR players: {len(blocked)}")
print(f"Excluded bye / TNF players: {excluded_team_count}")
print(f"Positions in pool: {dict(Counter(p['pos'] for p in pool.values()))}")
print(f"Sample blocked players (first 10):")
for b in blocked[:10]:
    print(f"  {b}")
