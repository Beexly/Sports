import json
import math
from pathlib import Path
from collections import defaultdict
import sys

repo = Path(r"c:\Users\Garrett\Sports")
sys.path.insert(0, str(repo))

from intelligence.pipeline.emit_week6_master_product import (
    _load_json,
    build_injury_status_map,
    is_player_blocked,
    canon_team,
    _norm_name,
)

inj_map = build_injury_status_map()
dc_data = _load_json(repo / "docs/data-sources/research/2026-10-13/depthcharts/espn-depthcharts-2026.json") or {}
player_to_team = {}
for t_abbr, units in (dc_data.get("teams") or {}).items():
    for _, slots in (units or {}).items():
        for s in slots or []:
            nm = _norm_name(s.get("athlete") or "")
            if nm:
                player_to_team[nm] = canon_team(t_abbr)
for nm, info in inj_map.items():
    if info.get("team"):
        player_to_team.setdefault(nm, canon_team(info["team"]))

player_to_team[_norm_name("A.J. Brown")] = "NE"
player_to_team[_norm_name("Hollywood Brown")] = "PHI"
player_to_team[_norm_name("Marquise Brown")] = "PHI"
player_to_team[_norm_name("DeVonta Smith")] = "PHI"

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

archive_dir = repo / "docs/data-sources/research/props-archive"
files = sorted(archive_dir.glob("*_20261018T09.json"))
all_dk_props = defaultdict(dict)
for f in files:
    d = json.loads(f.read_text(encoding="utf-8"))
    for l in d.get("lines", []):
        m = l.get("propMarket")
        if m in MARKETS:
            pname = l.get("playerName")
            line = l.get("line")
            if not pname or line is None:
                continue
            cat_label, cat_key = MARKETS[m]
            all_dk_props[_norm_name(pname)][cat_key] = {
                "player_raw": pname,
                "prop_market": m,
                "category": cat_label,
                "line": float(line),
                "open_line": float(l.get("openLine")) if l.get("openLine") is not None else float(line),
                "line_moved": bool(l.get("lineMoved", False)),
            }

ACTIVE_W6_TEAMS = {
    "HOU", "JAX", "CHI", "ATL", "BAL", "CLE", "TEN", "IND",
    "NYJ", "NE", "NO", "NYG", "CAR", "PHI", "PIT", "TB",
    "ARI", "LAR", "LAC", "KC", "BUF", "LV", "DAL", "GB",
    "WSH", "SF", "SEA", "DEN"
}

usage_data = _load_json(repo / "docs/data-sources/research/2026-10-13/linestar/linestar_usage_2026-10-13.json") or {}
usage_by_name = {_norm_name(r.get("name") or ""): r for r in (usage_data.get("players") or [])}

ngs_rec = _load_json(repo / "docs/data-sources/research/2026-10-13/ngs/raw_statboard_receiving.json") or {}
ngs_rush = _load_json(repo / "docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json") or {}
ngs_pass = _load_json(repo / "docs/data-sources/research/2026-10-13/ngs/raw_statboard_passing.json") or {}

props = []

# Receivers
for r in ngs_rec.get("stats") or []:
    p_info = r.get("player") or {}
    pname = p_info.get("displayName") or r.get("playerName") or ""
    nm = _norm_name(pname)
    team = player_to_team.get(nm, "")
    if team not in ACTIVE_W6_TEAMS:
        continue
    blk, reason = is_player_blocked(pname, inj_map)
    if blk:
        continue
    dk_lines = all_dk_props.get(nm, {})
    if "rec_yds" not in dk_lines:
        continue
    info = dk_lines["rec_yds"]
    L = info["line"]
    open_L = info["open_line"]
    moved = info["line_moved"]
    tar = int(r.get("targets") or 0)
    rec = int(r.get("receptions") or 0)
    yds = float(r.get("yards") or 0.0)
    sep = float(r.get("avgSeparation") or 0.0)
    yac_oe = float(r.get("avgYACAboveExpectation") or 0.0)
    air_share = float(r.get("percentShareOfIntendedAirYards") or 0.0)
    if tar < 15:
        continue
    u = usage_by_name.get(nm) or {}
    t_share = float(u.get("target_share_4wk") or (air_share / 100.0 * 0.78))
    s_share = float(u.get("snap_share_4wk") or 0.82)
    gp = 5.0
    yds_pg = yds / gp
    tar_pg = tar / gp
    mu = yds_pg * 0.82 + (tar_pg * 2.8 * t_share) + (sep * 2.5) + (yac_oe * 1.8)
    sigma = max(12.0, mu * 0.36)
    var_ratio = (sigma / mu) ** 2
    sigma_ln = math.sqrt(math.log1p(var_ratio))
    mu_ln = math.log(mu) - 0.5 * (sigma_ln ** 2)
    z = (math.log(L) - mu_ln) / sigma_ln
    p_over = 0.5 * math.erfc(z / math.sqrt(2))
    p_under = 1.0 - p_over
    pick = "OVER" if p_over >= 0.5 else "UNDER"
    win_p = p_over if pick == "OVER" else p_under
    delta = L - open_L
    aligned = (pick == "OVER" and delta > 0) or (pick == "UNDER" and delta < 0)
    pos_str = p_info.get("position") or "WR"
    score = 52.0 + (win_p - 0.5) * 36.0 + min(15.0, (abs(mu - L) / sigma) * 12.0) + (2.5 if aligned else 0.0) + min(4.0, sep * 1.2) + (t_share * 6.0)
    props.append({
        "player": pname,
        "team": team,
        "position": pos_str,
        "market": f"Total Receiving Yards {pick} {L}",
        "dk_line": L,
        "dk_open_line": open_L,
        "line_moved": moved,
        "mu": round(mu, 1),
        "sigma": round(sigma, 1),
        "win_prob": round(win_p, 3),
        "roster_gate": "PASS (ACTIVE)",
        "conviction_score": round(score, 1),
        "ngs_metric": f"2026 NGS: {tar} tgt, {yds:.0f} yds, sep {sep:.2f} yds, YAC/OE {yac_oe:+.2f}, air {air_share:.1f}%",
        "reasoning": f"{pname} ({team} {pos_str}) projects mu={mu:.1f} yds vs DK line {L} (open {open_L}, moved={moved}) with {sep:.2f} yds sep and {t_share*100:.1f}% target share [raw_statboard_receiving.json]. LogNormal P({pick})={win_p*100:.1f}%. Cleared LiveRosterGate ({reason}).",
    })

# Rushers
for r in ngs_rush.get("stats") or []:
    p_info = r.get("player") or {}
    pname = p_info.get("displayName") or r.get("playerName") or ""
    nm = _norm_name(pname)
    team = player_to_team.get(nm, "")
    if team not in ACTIVE_W6_TEAMS:
        continue
    blk, reason = is_player_blocked(pname, inj_map)
    if blk:
        continue
    dk_lines = all_dk_props.get(nm, {})
    if "rush_yds" not in dk_lines:
        continue
    info = dk_lines["rush_yds"]
    L = info["line"]
    open_L = info["open_line"]
    moved = info["line_moved"]
    att = int(r.get("rushAttempts") or 0)
    yds = float(r.get("rushYards") or 0.0)
    ryoe = float(r.get("rushYardsOverExpected") or 0.0)
    ryoe_pa = float(r.get("rushYardsOverExpectedPerAtt") or 0.0)
    box8 = float(r.get("percentAttemptsGteEightDefenders") or 0.0)
    if att < 35:
        continue
    u = usage_by_name.get(nm) or {}
    c_share = float(u.get("carry_share_4wk") or min(0.78, att / 125.0))
    s_share = float(u.get("snap_share_4wk") or min(0.80, att / 115.0))
    gp = 5.0
    yds_pg = yds / gp
    att_pg = att / gp
    mu = yds_pg * 0.85 + (att_pg * 1.5 * c_share) + (ryoe_pa * 6.0) - (box8 * 0.05)
    sigma = max(10.0, mu * 0.35)
    var_ratio = (sigma / mu) ** 2
    sigma_ln = math.sqrt(math.log1p(var_ratio))
    mu_ln = math.log(mu) - 0.5 * (sigma_ln ** 2)
    z = (math.log(L) - mu_ln) / sigma_ln
    p_over = 0.5 * math.erfc(z / math.sqrt(2))
    p_under = 1.0 - p_over
    pick = "OVER" if p_over >= 0.5 else "UNDER"
    win_p = p_over if pick == "OVER" else p_under
    delta = L - open_L
    aligned = (pick == "OVER" and delta > 0) or (pick == "UNDER" and delta < 0)
    score = 52.0 + (win_p - 0.5) * 36.0 + min(15.0, (abs(mu - L) / sigma) * 12.0) + (2.5 if aligned else 0.0) + min(4.0, abs(ryoe_pa) * 4.0) + (c_share * 6.0)
    props.append({
        "player": pname,
        "team": team,
        "position": "RB",
        "market": f"Total Rushing Yards {pick} {L}",
        "dk_line": L,
        "dk_open_line": open_L,
        "line_moved": moved,
        "mu": round(mu, 1),
        "sigma": round(sigma, 1),
        "win_prob": round(win_p, 3),
        "roster_gate": "PASS (ACTIVE)",
        "conviction_score": round(score, 1),
        "ngs_metric": f"2026 NGS: {att} att, {yds:.0f} yds, RYOE {ryoe:+.1f} ({ryoe_pa:+.2f}/att), 8+ box {box8:.1f}%",
        "reasoning": f"{pname} ({team} RB) projects mu={mu:.1f} yds vs DK line {L} (open {open_L}, moved={moved}) with RYOE {ryoe:+.1f} ({ryoe_pa:+.2f}/att) and {c_share*100:.1f}% carry share [raw_statboard_rushing.json]. LogNormal P({pick})={win_p*100:.1f}%. Cleared LiveRosterGate ({reason}).",
    })

# Passers
for r in ngs_pass.get("stats") or []:
    p_info = r.get("player") or {}
    pname = p_info.get("displayName") or r.get("playerName") or ""
    nm = _norm_name(pname)
    team = player_to_team.get(nm, "")
    if team not in ACTIVE_W6_TEAMS:
        continue
    blk, reason = is_player_blocked(pname, inj_map)
    if blk:
        continue
    dk_lines = all_dk_props.get(nm, {})
    if "pass_yds" not in dk_lines:
        continue
    info = dk_lines["pass_yds"]
    L = info["line"]
    open_L = info["open_line"]
    moved = info["line_moved"]
    att = int(r.get("attempts") or 0)
    comp = int(r.get("completions") or 0)
    yds = float(r.get("passYards") or 0.0)
    cpoe = float(r.get("completionPercentageAboveExpectation") or 0.0)
    ttt = float(r.get("avgTimeToThrow") or 0.0)
    gp = int(r.get("gamesPlayed") or 5)
    if att < 80:
        continue
    mu = (yds / max(gp, 1)) * 0.90 + (cpoe * 2.0) + (ttt - 2.5) * 8.0
    sigma = max(20.0, mu * 0.22)
    var_ratio = (sigma / mu) ** 2
    sigma_ln = math.sqrt(math.log1p(var_ratio))
    mu_ln = math.log(mu) - 0.5 * (sigma_ln ** 2)
    z = (math.log(L) - mu_ln) / sigma_ln
    p_over = 0.5 * math.erfc(z / math.sqrt(2))
    p_under = 1.0 - p_over
    pick = "OVER" if p_over >= 0.5 else "UNDER"
    win_p = p_over if pick == "OVER" else p_under
    delta = L - open_L
    aligned = (pick == "OVER" and delta > 0) or (pick == "UNDER" and delta < 0)
    score = 52.0 + (win_p - 0.5) * 36.0 + min(15.0, (abs(mu - L) / sigma) * 12.0) + (2.5 if aligned else 0.0) + min(4.0, abs(cpoe) * 0.5)
    props.append({
        "player": pname,
        "team": team,
        "position": "QB",
        "market": f"Total Passing Yards {pick} {L}",
        "dk_line": L,
        "dk_open_line": open_L,
        "line_moved": moved,
        "mu": round(mu, 1),
        "sigma": round(sigma, 1),
        "win_prob": round(win_p, 3),
        "roster_gate": "PASS (ACTIVE)",
        "conviction_score": round(score, 1),
        "ngs_metric": f"2026 NGS: CPOE {cpoe:+.1f}%, {yds:.0f} yds ({gp} GP), TTT {ttt:.2f}s",
        "reasoning": f"{pname} ({team} QB) projects mu={mu:.1f} yds vs DK line {L} (open {open_L}, moved={moved}) with {cpoe:+.1f}% CPOE and {ttt:.2f}s time-to-throw [raw_statboard_passing.json]. LogNormal P({pick})={win_p*100:.1f}%. Cleared LiveRosterGate ({reason}).",
    })

props.sort(key=lambda x: -x["conviction_score"])

# Ensure un-tied conviction scores
seen_scores = set()
for p in props:
    s = p["conviction_score"]
    while s in seen_scores:
        s = round(s - 0.1, 1)
    seen_scores.add(s)
    p["conviction_score"] = s

print(f"Total evaluated props: {len(props)}")
print("Top 15 Props:")
for i, p in enumerate(props[:15], 1):
    print(f"  {i}. {p['player']} ({p['team']} {p['position']}) - {p['market']} | DK Line: {p['dk_line']} (open {p['dk_open_line']}, moved={p['line_moved']}) | mu={p['mu']}, sigma={p['sigma']} | P(Win)={p['win_prob']} | Score={p['conviction_score']}/100")
