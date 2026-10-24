import json
import math
from pathlib import Path
from collections import defaultdict

repo = Path(r"c:\Users\Garrett\Sports")

archive_dir = repo / "docs" / "data-sources" / "research" / "props-archive"
files = sorted(archive_dir.glob("*_20261018T09.json"))

inj_path = repo / "docs" / "data-sources" / "research" / "2026-10-18" / "injuries" / "espn_nfl_injuries_week6.json"
inj_data = json.loads(inj_path.read_text(encoding="utf-8"))

dc_path = repo / "docs" / "data-sources" / "research" / "2026-10-13" / "depthcharts" / "espn-depthcharts-2026.json"
dc_data = json.loads(dc_path.read_text(encoding="utf-8"))

usage_path = repo / "docs" / "data-sources" / "research" / "2026-10-13" / "linestar" / "linestar_usage_2026-10-13.json"
usage_data = json.loads(usage_path.read_text(encoding="utf-8"))

ngs_rec_path = repo / "docs" / "data-sources" / "research" / "2026-10-13" / "ngs" / "raw_statboard_receiving.json"
ngs_rec = json.loads(ngs_rec_path.read_text(encoding="utf-8"))

ngs_rush_path = repo / "docs" / "data-sources" / "research" / "2026-10-13" / "ngs" / "raw_statboard_rushing.json"
ngs_rush = json.loads(ngs_rush_path.read_text(encoding="utf-8"))

ngs_pass_path = repo / "docs" / "data-sources" / "research" / "2026-10-13" / "ngs" / "raw_statboard_passing.json"
ngs_pass = json.loads(ngs_pass_path.read_text(encoding="utf-8"))

def _norm_name(name: str) -> str:
    nm = (name or "").strip().lower()
    for suf in (" jr.", " sr.", " iii", " ii", " iv", " jr", " sr"):
        if nm.endswith(suf):
            nm = nm[: -len(suf)].strip()
    return nm.replace(".", "").replace("'", "")

# Build player -> team
player_to_team = {}
for t_abbr, units in (dc_data.get("teams") or {}).items():
    for _, slots in (units or {}).items():
        for s in slots or []:
            nm = _norm_name(s.get("athlete") or "")
            if nm: player_to_team[nm] = t_abbr.upper()

for t in (inj_data.get("teams") or []):
    t_abbr = t.get("team") or ""
    for inj in (t.get("injuries") or []):
        nm = _norm_name(inj.get("athlete") or "")
        if nm and nm not in player_to_team:
            player_to_team[nm] = t_abbr.upper()

# Injuries map
BLOCKING_STATUS = ("OUT", "IR", "INJURED RESERVE", "DOUBTFUL", "SUSPENDED", "PUP", "NFI", "RESERVE")
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

def is_blocked(name: str) -> tuple[bool, str]:
    nm = _norm_name(name)
    info = inj_map.get(nm)
    if info:
        st = info["status"]
        if any(b in st for b in BLOCKING_STATUS):
            return True, f"ESPN status={st}"
    return False, "ACTIVE"

# Load DK prop lines
# 8 Target Markets
MARKETS = {
    "Total Passing Yards (incl. overtime)": ("Passing Yards", "pass_yds"),
    "Total Pass Completions (incl. overtime)": ("Pass Completions", "pass_comp"),
    "Total Passing Touchdowns (incl. overtime)": ("Passing Touchdowns", "pass_td"),
    "Total Rushing Yards (incl. overtime)": ("Rushing Yards", "rush_yds"),
    "Total Carries (incl. overtime)": ("Carries", "rush_att"),
    "Total Receiving Yards (incl. overtime)": ("Receiving Yards", "rec_yds"),
    "Total Receptions (incl. overtime)": ("Receptions", "rec"),
    "Total Passing Plus Rushing Yards (incl. overtime)": ("Passing Plus Rushing Yards", "pass_rush_yds"),
}

all_dk_props = defaultdict(dict)
for f in files:
    d = json.loads(f.read_text(encoding="utf-8"))
    game = d.get("game")
    game_id = d.get("game_id")
    for l in d.get("lines", []):
        m = l.get("propMarket")
        if m in MARKETS:
            pname = l.get("playerName")
            if not pname: continue
            cat_label, cat_key = MARKETS[m]
            line = l.get("line")
            open_line = l.get("openLine")
            if line is None: continue
            # Keep line info
            all_dk_props[_norm_name(pname)][cat_key] = {
                "player_raw": pname,
                "prop_market": m,
                "category": cat_label,
                "line": float(line),
                "open_line": float(open_line) if open_line is not None else float(line),
                "line_moved": bool(l.get("lineMoved", False)),
                "as_of": l.get("asOf"),
                "game": game,
                "game_id": game_id,
            }

print(f"Total players with DK lines: {len(all_dk_props)}")

# Active Week 6 teams (excluding bye teams MIN, DET, MIA, CIN and completed TNF SEA, DEN)
ACTIVE_W6_TEAMS = {
    "HOU", "JAX", "CHI", "ATL", "BAL", "CLE", "TEN", "IND",
    "NYJ", "NE", "NO", "NYG", "CAR", "PHI", "PIT", "TB",
    "ARI", "LAR", "LAC", "KC", "BUF", "LV", "DAL", "GB",
    "WSH", "SF",
}

# Now let's test joining NGS receivers against DK lines
joined_props = []

# Index usage
usage_by_name = {_norm_name(r.get("name") or ""): r for r in (usage_data.get("players") or [])}

for r in ngs_rec.get("stats") or []:
    p_info = r.get("player") or {}
    pname = p_info.get("displayName") or r.get("playerName") or ""
    nm = _norm_name(pname)
    team = player_to_team.get(nm, "")
    if team not in ACTIVE_W6_TEAMS: continue
    blk, reason = is_blocked(pname)
    if blk: continue

    dk_dict = all_dk_props.get(nm, {})
    if "rec_yds" not in dk_dict: continue

    rec_line_info = dk_dict["rec_yds"]
    line = rec_line_info["line"]
    open_line = rec_line_info["open_line"]
    line_moved = rec_line_info["line_moved"]

    tar = int(r.get("targets") or 0)
    rec = int(r.get("receptions") or 0)
    yds = float(r.get("yards") or 0.0)
    sep = float(r.get("avgSeparation") or 0.0)
    yac_oe = float(r.get("avgYACAboveExpectation") or 0.0)
    air_share = float(r.get("percentShareOfIntendedAirYards") or 0.0)
    if tar < 15: continue

    u = usage_by_name.get(nm) or {}
    t_share = float(u.get("target_share_4wk") or (air_share / 100.0 * 0.78))
    s_share = float(u.get("snap_share_4wk") or 0.82)

    # Projected mu and sigma
    gp = 5.0
    mu = (yds / gp) * 0.75 + (tar * 2.8 * t_share) + (sep * 3.5)
    sigma = max(12.0, mu * 0.38)

    # LogNormal tail probability P(X > line)
    # sigma_ln = sqrt(ln(1 + (sigma/mu)^2))
    # mu_ln = ln(mu) - 0.5 * sigma_ln^2
    var_ratio = (sigma / mu) ** 2
    sigma_ln = math.sqrt(math.log1p(var_ratio))
    mu_ln = math.log(mu) - 0.5 * sigma_ln ** 2
    z_score = (math.log(line) - mu_ln) / sigma_ln
    p_over = 0.5 * math.erfc(z_score / math.sqrt(2))
    p_under = 1.0 - p_over

    pick = "OVER" if p_over >= 0.5 else "UNDER"
    win_prob = p_over if pick == "OVER" else p_under
    edge_pts = abs(mu - line)

    # Conviction score
    score = 50.0 + (win_prob - 0.5) * 60.0 + (edge_pts / sigma) * 15.0 + (sep * 2.5) + (t_share * 10.0)
    if line_moved:
        if (pick == "OVER" and line > open_line) or (pick == "UNDER" and line < open_line):
            score += 2.5

    joined_props.append({
        "player": pname,
        "team": team,
        "position": p_info.get("position") or "WR",
        "market": f"Total Receiving Yards {pick} {line}",
        "dk_line": line,
        "dk_open_line": open_line,
        "line_moved": line_moved,
        "mu": round(mu, 2),
        "sigma": round(sigma, 2),
        "win_prob": round(win_prob, 4),
        "conviction_score": round(score, 2),
        "game": rec_line_info["game"],
        "ngs_metric": f"2026 NGS: {tar} tgt, {yds:.0f} yds, sep {sep:.2f} yds, YAC/OE {yac_oe:+.2f}, air {air_share:.1f}%",
    })

joined_props.sort(key=lambda x: -x["conviction_score"])
print(f"\nTop 10 Joined Receiving Props against real DK lines:")
for idx, jp in enumerate(joined_props[:10], 1):
    print(f"  {idx}. {jp['player']} ({jp['team']}): {jp['market']} (open={jp['dk_open_line']}, moved={jp['line_moved']}) | mu={jp['mu']}, sigma={jp['sigma']} | P({jp['market'].split()[3]})={jp['win_prob']*100:.1f}% | Score={jp['conviction_score']}")
