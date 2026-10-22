import json
import random
from pathlib import Path
from collections import Counter

repo = Path(r"c:\Users\Garrett\Sports")
import sys
sys.path.insert(0, str(repo))

from intelligence.optimizer.dfs_optimizer_suite import (
    cash_mode,
    greedy_leverage,
    tabu_portfolio,
    fieldsim_portfolio,
    raw_score,
    valid,
)

grid_path = repo / "docs" / "data-sources" / "research" / "2026-10-13" / "linestar" / "linestar_slate_grid_2026-10-13.json"
grid = json.loads(grid_path.read_text(encoding="utf-8"))

inj_path = repo / "docs" / "data-sources" / "research" / "2026-10-18" / "injuries" / "espn_nfl_injuries_week6.json"
inj_data = json.loads(inj_path.read_text(encoding="utf-8"))

usage_path = repo / "docs" / "data-sources" / "research" / "2026-10-13" / "linestar" / "linestar_usage_2026-10-13.json"
usage_data = json.loads(usage_path.read_text(encoding="utf-8"))

own_path = repo / "docs" / "data-sources" / "research" / "2026-10-13" / "linestar" / "linestar_ownership_2026-10-13.json"
own_data = json.loads(own_path.read_text(encoding="utf-8"))

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

usage_by_name = {_norm_name(r.get("name") or ""): r for r in (usage_data.get("players") or [])}
own_by_name = {_norm_name(r.get("name") or ""): float(r.get("projected_ownership") or r.get("owned") or 10.0) / 100.0 for r in (own_data.get("rows") or [])}

pool = {}
mu = {}
sigma = {}
own = {}
blocked_players = []

for p in grid.get("players", []):
    pid = int(p.get("playerId") or 0)
    if not pid: continue
    name = (p.get("name") or "").strip()
    pos = (p.get("pos") or "").strip().upper()
    if pos == "D": pos = "DST"
    if pos not in ("QB", "RB", "WR", "TE", "DST"): continue
    sal = int(p.get("salary") or 0)
    if sal < 2000: continue
    s_ord = int(p.get("starting_order") or 0)
    if pos != "DST" and s_ord <= 0: continue

    tid = p.get("teamId")
    team = LINESTAR_TID_MAP.get(tid, "")
    if team in EXCLUDED_TEAMS or not team: continue

    blocked, reason = is_player_blocked(name, extra_status=str(p.get("injury_status") or ""))
    if blocked:
        blocked_players.append(f"{name} ({pos}, ${sal}): {reason}")
        continue

    nm = _norm_name(name)
    u = usage_by_name.get(nm) or {}
    stars = float(p.get("stars_new") or p.get("stars") or 3.0)
    base_pts = (sal / 1000.0) * (2.55 if pos == "QB" else 2.35 if pos in ("RB", "WR") else 2.15 if pos == "TE" else 2.20)
    star_mult = 1.0 + (stars - 3.0) * 0.08
    usage_bonus = 0.0
    if pos in ("WR", "TE"):
        usage_bonus = float(u.get("target_share_4wk") or 0.0) * 14.0 + float(u.get("rz_targets_4wk") or 0) * 0.35
    elif pos == "RB":
        usage_bonus = float(u.get("snap_share_4wk") or 0.0) * 8.0 + float(u.get("carry_share_4wk") or 0.0) * 6.0
    elif pos == "QB" and s_ord == 1:
        usage_bonus = 4.5

    proj = round(max(3.0, base_pts * star_mult + usage_bonus), 2)
    vol = round(max(2.5, proj * (0.48 if pos in ("WR", "TE") else 0.38)), 2)
    p_own = round(own_by_name.get(nm, min(0.28, max(0.03, (proj / sal) * 35.0))), 3)

    pool[pid] = {
        "pid": pid,
        "name": name,
        "pos": pos,
        "team": team,
        "salary": sal,
        "ppg": proj,
        "mu": proj,
    }
    mu[pid] = proj
    sigma[pid] = vol
    own[pid] = p_own

print(f"Pool size: {len(pool)} active players.")
rng = random.Random(42)
cash_lu = cash_mode(pool, mu, sigma)
print(f"Cash Lineup: valid={valid(cash_lu)}, salary=${sum(p['salary'] for p in cash_lu)}, proj={raw_score(cash_lu, mu):.2f}")
for p in cash_lu:
    print(f"  {p['pos']}: {p['name']} ({p['team']}) - ${p['salary']} | proj={mu[p['pid']]}")

greedy_lu, greedy_s = greedy_leverage(pool, mu, 1.0, own, sigma, tries=100, rng=rng)
print(f"\nGreedy Leverage: valid={valid(greedy_lu)}, salary=${sum(p['salary'] for p in greedy_lu)}, proj={raw_score(greedy_lu, mu):.2f}")
for p in greedy_lu:
    print(f"  {p['pos']}: {p['name']} ({p['team']}) - ${p['salary']} | proj={mu[p['pid']]}")

tabu_lus = tabu_portfolio(pool, mu, 1.0, own, sigma, seed=greedy_lu, n_keep=3, iters=180, rng=rng, time_budget=15)
print(f"\nTabu Top-3 generated: {len(tabu_lus)}")
for idx, (s, lu) in enumerate(tabu_lus):
    print(f"  Tabu #{idx+1}: valid={valid(lu)}, salary=${sum(p['salary'] for p in lu)}, proj={raw_score(lu, mu):.2f}")
