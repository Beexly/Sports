"""The Matchup Engine: specific receiver vs specific coverage, OL vs specific rusher.

The depth the market does not have (doctrine Move 3): the market prices team
tendencies; this engine prices SPECIFIC matchups in SPECIFIC conditions.

Method (corpus-honest, every row cites its file):
- OFFENSE side: 2026 in-season NGS receiving table ranks each team's
  receivers by targets (TAR) -> WR1/WR2/TE1/RB1 usage titles, with measured
  form: separation (SEP), YAC above expectation (EYAC/R), catch rate, air-yard share.
- DEFENSE side: the gated ESPN depth charts + Week 6 injury digest yields
  the opposing coverage unit (CB/S/NB) and defensive line (DE/DT/EDGE) availability,
  player by player.
- PAIRING: each offensive usage title is paired against the opposing
  coverage-availability picture; the OL block against the opposing
  pass-rusher availability (active starters vs doubtful/out).
- SYNTHESIS: bidirectional causal chain strings with citations, ready for
  the analyst card and the causal-chain board. No invented numbers - if the
  corpus lacks the defender, the pairing says so as a named gap.

Usage:
    python intelligence/matchups/matchup_engine.py
    python intelligence/matchups/matchup_engine.py --home PHI --away DAL
    -> docs/predictions/research/<date>/DAL@PHI-matchups.md
"""

from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parent
while REPO.name != "Sports" and REPO.parent != REPO:
    REPO = REPO.parent
SOURCES = REPO / "docs" / "data-sources" / "research"
OUTROOT = REPO / "docs" / "predictions" / "research"

# 2026 In-Season Next Gen Stats (NGS) statboards
NGS_REC_FILE = SOURCES / "2026-10-13" / "ngs" / "raw_statboard_receiving.json"
NGS_RUSH_FILE = SOURCES / "2026-10-13" / "ngs" / "raw_statboard_rushing.json"
NGS_PASS_FILE = SOURCES / "2026-10-13" / "ngs" / "raw_statboard_passing.json"

# LineStar usage and grid feeds
LINESTAR_USAGE = SOURCES / "2026-10-13" / "linestar" / "linestar_usage_2026-10-13.json"
LINESTAR_GRID_FILE = SOURCES / "2026-10-13" / "linestar" / "linestar_slate_grid_2026-10-13.json"

# Depth charts and Week 6 injury digest
DC_FILE = SOURCES / "2026-10-13" / "depthcharts" / "espn-depthcharts-2026.json"
_INJ_CANDS = sorted(SOURCES.glob("*/injuries/espn_nfl_injuries_week6.json"), reverse=True)
INJ_FILE = _INJ_CANDS[0] if _INJ_CANDS else (SOURCES / "2026-10-18" / "injuries" / "espn_nfl_injuries_week6.json")

COVERAGE_POS = {"CB", "S", "SAF", "FS", "SS", "NB", "DB"}
RUSH_POS = {"DE", "DT", "ED", "DL", "NT", "OLB", "EDGE"}
OL_POS = {"OT", "OG", "C", "G", "T", "OL"}
CB_POS_KEYS = ("LCB", "RCB", "NB")

GSIS_TEAM_MAP = {
    '0200': 'ATL', '0325': 'BAL', '0610': 'BUF', '0750': 'CAR', '0810': 'CHI',
    '0920': 'CIN', '1050': 'CLE', '1200': 'DAL', '1400': 'DEN', '1540': 'DET',
    '1800': 'GB',  '2100': 'TEN', '2120': 'HOU', '2200': 'IND', '2250': 'JAX',
    '2310': 'KC',  '2510': 'LAR', '2520': 'LV',  '2700': 'MIA', '3000': 'MIN',
    '3200': 'NE',  '3300': 'NO',  '3410': 'NYG', '3430': 'NYJ', '3700': 'PHI',
    '3800': 'ARI', '3900': 'PIT', '4400': 'LAC', '4500': 'SF',  '4600': 'SEA',
    '4900': 'TB',  '5110': 'WSH'
}

LINESTAR_TEAM_MAP = {
    65: 'LAC', 66: 'DEN', 67: 'DET', 68: 'ATL', 69: 'SEA', 70: 'CAR', 71: 'BAL', 72: 'CIN',
    73: 'MIA', 74: 'JAX', 75: 'LAR', 76: 'KC',  77: 'CHI', 78: 'NE',  79: 'BUF', 80: 'NYJ',
    81: 'MIN', 82: 'TB',  83: 'HOU', 84: 'TEN', 85: 'PHI', 86: 'ARI', 87: 'LV',  88: 'CLE',
    89: 'IND', 90: 'PIT', 91: 'GB',  92: 'NO',  93: 'WSH', 94: 'DAL', 95: 'SF',  96: 'NYG'
}

TEAM_ALIASES = {
    'AZ': 'ARI', 'ARZ': 'ARI', 'WAS': 'WSH', 'WFT': 'WSH',
    'JAC': 'JAX', 'LA': 'LAR', 'SD': 'LAC', 'OAK': 'LV'
}

WEEK6_GAMES = [
    ('LAR', 'ARI'), ('CLE', 'BAL'), ('LV', 'BUF'), ('PHI', 'CAR'),
    ('ATL', 'CHI'), ('GB', 'DAL'), ('JAX', 'HOU'), ('KC', 'LAC'),
    ('NYG', 'NO'), ('NE', 'NYJ'), ('TB', 'PIT'), ('DEN', 'SEA'),
    ('IND', 'TEN'), ('SF', 'WSH')
]


def canon_team(t: str | int | None) -> str:
    """Canonicalize team code to standard 3-letter abbreviation."""
    if not t:
        return ""
    s = str(t).strip().upper()
    if s in GSIS_TEAM_MAP:
        return GSIS_TEAM_MAP[s]
    try:
        tid = int(s)
        if tid in LINESTAR_TEAM_MAP:
            return LINESTAR_TEAM_MAP[tid]
    except ValueError:
        pass
    return TEAM_ALIASES.get(s, s)


def norm_name(name: str) -> str:
    """Normalize player name for robust multi-feed joins."""
    n = (name or "").strip()
    if "," in n:
        parts = [p.strip() for p in n.split(",", 1)]
        n = f"{parts[1]} {parts[0]}"
    n = n.replace("’", "'")
    n = re.sub(r"[.\u2019']", "", n)
    for suf in (" jr", " sr", " iii", " ii", " iv", " v"):
        if n.lower().endswith(suf):
            n = n[:-len(suf)].strip()
    return re.sub(r"\s+", " ", n).lower().strip()


def _load(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


_USAGE_CACHE: dict | None = None


def _usage() -> dict[str, dict]:
    """name(normalized) -> LineStar usage row. Empty if unreadable."""
    global _USAGE_CACHE
    if _USAGE_CACHE is None:
        d = _load(LINESTAR_USAGE)
        out: dict[str, dict] = {}
        for row in ((d or {}).get("players") or []):
            nm = norm_name(row.get("name") or "")
            if nm:
                out[nm] = row
        _USAGE_CACHE = out
    return _USAGE_CACHE


def _usage_row(name: str) -> dict:
    nm = norm_name(name)
    return _usage().get(nm) or {}


def _pct(v) -> str:
    """LineStar shares arrive as 0-1 floats; render as percent or name the gap."""
    try:
        f = float(v)
    except (TypeError, ValueError):
        return "n/a"
    return f"{f * 100:.1f}%"


def _receivers() -> dict[str, list[dict]]:
    """team -> receivers parsed from 2026 in-season NGS receiving statboard."""
    d = _load(NGS_REC_FILE)
    if not d:
        return {}
    rows: dict[str, list[dict]] = {}
    for r in (d.get("stats") or []):
        team = canon_team(r.get("teamId"))
        p_info = r.get("player") or {}
        pname = r.get("playerName") or p_info.get("displayName") or ""
        row = {
            "player": pname,
            "team": team,
            "pos": r.get("position") or p_info.get("position") or "WR",
            "season_label": "2026-inseason",
            "cushion": float(r.get("avgCushion") or 0.0),
            "sep": float(r.get("avgSeparation") or 0.0),
            "tay": float(r.get("avgIntendedAirYards") or 0.0),
            "tay_pct": float(r.get("percentShareOfIntendedAirYards") or 0.0),
            "rec": int(r.get("receptions") or 0),
            "tar": int(r.get("targets") or 0),
            "catch_pct": float(r.get("catchPercentage") or 0.0),
            "yards": float(r.get("yards") or 0.0),
            "td": int(r.get("recTouchdowns") or 0),
            "yac_per_r": float(r.get("avgYAC") or 0.0),
            "eyac_per_r": float(r.get("avgYACAboveExpectation") or 0.0),
            "source": str(NGS_REC_FILE.relative_to(REPO)).replace("\\", "/"),
        }
        rows.setdefault(team, []).append(row)
    for team in rows:
        seen: dict[str, dict] = {}
        for r in sorted(rows[team], key=lambda x: x["tar"], reverse=True):
            seen.setdefault(r["player"], r)
        rows[team] = sorted(seen.values(), key=lambda x: x["tar"], reverse=True)
    return rows


def _rushers() -> dict[str, list[dict]]:
    """team -> rushers from 2026 in-season NGS rushing statboard."""
    d = _load(NGS_RUSH_FILE)
    if not d:
        return {}
    rows: dict[str, list[dict]] = {}
    for r in (d.get("stats") or []):
        team = canon_team(r.get("teamId"))
        p_info = r.get("player") or {}
        pname = r.get("playerName") or p_info.get("displayName") or ""
        row = {
            "player": pname,
            "team": team,
            "pos": "RB",
            "season_label": "2026-inseason",
            "att": int(r.get("rushAttempts") or 0),
            "yards": float(r.get("rushYards") or 0.0),
            "avg_yards": float(r.get("avgRushYards") or 0.0),
            "eff": float(r.get("efficiency") or 0.0),
            "tlos": float(r.get("avgTimeToLos") or 0.0),
            "ryoe": float(r.get("rushYardsOverExpected") or 0.0),
            "ryoe_per_att": float(r.get("rushYardsOverExpectedPerAtt") or 0.0),
            "source": str(NGS_RUSH_FILE.relative_to(REPO)).replace("\\", "/"),
        }
        rows.setdefault(team, []).append(row)
    for team in rows:
        seen: dict[str, dict] = {}
        for r in sorted(rows[team], key=lambda x: x["att"], reverse=True):
            seen.setdefault(r["player"], r)
        rows[team] = sorted(seen.values(), key=lambda x: x["att"], reverse=True)
    return rows


def _passers() -> dict[str, list[dict]]:
    """team -> passers from 2026 in-season NGS passing statboard."""
    d = _load(NGS_PASS_FILE)
    if not d:
        return {}
    rows: dict[str, list[dict]] = {}
    for r in (d.get("stats") or []):
        team = canon_team(r.get("teamId"))
        p_info = r.get("player") or {}
        pname = r.get("playerName") or p_info.get("displayName") or ""
        row = {
            "player": pname,
            "team": team,
            "pos": "QB",
            "season_label": "2026-inseason",
            "att": int(r.get("attempts") or 0),
            "cmp": int(r.get("completions") or 0),
            "yards": float(r.get("passYards") or 0.0),
            "td": int(r.get("passTouchdowns") or 0),
            "cpoe": float(r.get("completionPercentageAboveExpectation") or 0.0),
            "ttt": float(r.get("avgTimeToThrow") or 0.0),
            "source": str(NGS_PASS_FILE.relative_to(REPO)).replace("\\", "/"),
        }
        rows.setdefault(team, []).append(row)
    for team in rows:
        seen: dict[str, dict] = {}
        for r in sorted(rows[team], key=lambda x: x["att"], reverse=True):
            seen.setdefault(r["player"], r)
        rows[team] = sorted(seen.values(), key=lambda x: x["att"], reverse=True)
    return rows


def _injuries() -> dict[str, list[dict]]:
    """team -> list of player injury entries from ESPN Week 6 digest."""
    d = _load(INJ_FILE)
    out: dict[str, list[dict]] = {}
    for t in (d or {}).get("teams") or []:
        team = canon_team(t.get("team"))
        entries = []
        for e in t.get("injuries") or []:
            entries.append({
                "player": e.get("athlete"),
                "pos": e.get("position"),
                "status": (e.get("status") or "").upper(),
                "detail": e.get("detail") or e.get("comment"),
                "source": str(INJ_FILE.relative_to(REPO)).replace("\\", "/"),
            })
        out[team] = entries
    return out


def _depth_chart() -> dict[str, dict]:
    """team_abbr -> {unit|POS: [{'slot': s, 'athlete': name}, ...]} from ESPN 2026 capture."""
    d = _load(DC_FILE)
    raw = (d or {}).get("teams") or {}
    return {canon_team(k): v for k, v in raw.items()}


def _corners(dc_team: dict) -> list[dict]:
    """CB ladder (LCB/RCB/NB) with position, depth order, and athlete name."""
    out: list[dict] = []
    for key, rows in dc_team.items():
        pos = key.split("|")[-1]
        if pos not in CB_POS_KEYS:
            continue
        for idx, r in enumerate(rows):
            athlete = r.get("athlete")
            if athlete:
                out.append({
                    "pos": pos,
                    "slot": r.get("slot"),
                    "depth": idx + 1,
                    "player": athlete
                })
    return out


def usage_titles(team_receivers: list[dict], rushers: list[dict] | None = None,
                 injuries: list[dict] | None = None) -> dict[str, dict]:
    """WR1/WR2/TE1 by targets; RB1 from rushing table by carries.
    Filters out offensive weapons with status OUT/IR/DOUBTFUL from taking top titles.
    """
    inj_by_name = {}
    if injuries:
        inj_by_name = {norm_name(x.get("player") or ""): x.get("status", "").upper() for x in injuries}

    def is_down(name: str) -> bool:
        st = inj_by_name.get(norm_name(name), "")
        return st in ("OUT", "IR", "INJURED RESERVE", "DOUBTFUL", "PUP")

    active_wrs = [r for r in team_receivers if r["pos"] == "WR" and not is_down(r["player"])]
    active_tes = [r for r in team_receivers if r["pos"] == "TE" and not is_down(r["player"])]
    if not active_wrs:
        active_wrs = [r for r in team_receivers if r["pos"] == "WR"]
    if not active_tes:
        active_tes = [r for r in team_receivers if r["pos"] == "TE"]

    titles: dict[str, dict] = {}
    if active_wrs:
        titles["WR1"] = active_wrs[0]
    if len(active_wrs) > 1:
        titles["WR2"] = active_wrs[1]
    if active_tes:
        titles["TE1"] = active_tes[0]

    active_rush = [r for r in (rushers or []) if not is_down(r["player"])]
    if not active_rush and rushers:
        active_rush = rushers
    for r in active_rush[:1]:
        r_copy = dict(r)
        r_copy["usage_title_basis"] = f"rush att {r_copy.get('att', 0)}, RYOE {r_copy.get('ryoe', 0.0):+.1f}"
        titles["RB1"] = r_copy

    return titles


def build_matchups(home: str, away: str) -> dict:
    home_c = canon_team(home)
    away_c = canon_team(away)

    recv = _receivers()
    rush = _rushers()
    passers = _passers()
    inj = _injuries()
    dc = _depth_chart()

    gaps: list[str] = []
    if not recv:
        gaps.append(f"NGS receiving table unreadable ({NGS_REC_FILE.name})")
    if not rush:
        gaps.append(f"NGS rushing table unreadable ({NGS_RUSH_FILE.name})")
    if not passers:
        gaps.append(f"NGS passing table unreadable ({NGS_PASS_FILE.name})")
    if home_c not in inj or away_c not in inj:
        gaps.append(f"injury digest missing a team block ({home_c}/{away_c})")
    if home_c not in dc or away_c not in dc:
        gaps.append(f"depth chart missing a team block ({home_c}/{away_c})")

    report = {
        "game": f"{away_c}@{home_c}",
        "generated_utc": datetime.now(timezone.utc).isoformat(),
        "gaps": gaps,
        "pairings": [],
        "ol_vs_rush": None,
        "trench_matchups": [],
        "chains": []
    }

    # Dual-side receiver evaluations: AWAY-OFF vs HOME-DEF and HOME-OFF vs AWAY-DEF
    for side, (o, d) in (("AWAY-OFF vs HOME-DEF", (away_c, home_c)),
                         ("HOME-OFF vs AWAY-DEF", (home_c, away_c))):
        o_recv = recv.get(o, [])
        d_inj = inj.get(d, [])
        o_inj = inj.get(o, [])
        dchart = dc.get(d, {})
        corners = _corners(dchart) if dchart else []

        inj_by_name = {norm_name(x["player"]): x for x in d_inj}
        cov_out = [x for x in d_inj if (x.get("pos") in COVERAGE_POS) and x.get("status") in ("OUT", "INJURED RESERVE", "IR", "DOUBTFUL")]
        cov_q = [x for x in d_inj if (x.get("pos") in COVERAGE_POS) and x.get("status") == "QUESTIONABLE"]

        titles = usage_titles(o_recv, rush.get(o, []), o_inj)

        cb_starters = [c for c in corners if c.get("depth") == 1]
        cb_pairs = []
        seen_cb = set()
        for c in cb_starters:
            pname = c["player"]
            if pname and pname not in seen_cb:
                seen_cb.add(pname)
                st = inj_by_name.get(norm_name(pname), {}).get("status", "not-on-report")
                cb_pairs.append(f"{pname} ({c['pos']}, slot-1, {st})")
                if st.upper() in ("OUT", "IR", "INJURED RESERVE", "DOUBTFUL"):
                    backup = next((b for b in corners if b["pos"] == c["pos"] and b.get("depth") == 2 and b["player"] not in seen_cb), None)
                    if backup:
                        seen_cb.add(backup["player"])
                        bst = inj_by_name.get(norm_name(backup["player"]), {}).get("status", "not-on-report")
                        cb_pairs.append(f"{backup['player']} ({backup['pos']}, depth-2, {bst})")

        # Build detailed pairing records
        for title, r in titles.items():
            pair = {
                "side": side,
                "usage_title": title,
                "matched_cornerbacks": cb_pairs if r["pos"] in ("WR", "TE") else [],
                "receiver": r["player"],
                "receiver_form": {
                    "targets": r.get("tar", r.get("att")),
                    "separation_yds": r.get("sep"),
                    "yac_over_expected": r.get("eyac_per_r"),
                    "catch_pct": r.get("catch_pct"),
                    "air_yard_share": r.get("tay_pct"),
                    "usage_basis": r.get("usage_title_basis", "targets"),
                    "target_share_4wk": _usage_row(r["player"]).get("target_share_4wk"),
                    "snap_share_4wk": _usage_row(r["player"]).get("snap_share_4wk"),
                    "rz_targets_4wk": _usage_row(r["player"]).get("rz_targets_4wk"),
                    "rz_recTD_4wk": _usage_row(r["player"]).get("rz_recTD_4wk"),
                },
                "opposing_coverage_status": {
                    "out_or_limited": [f"{x['player']} ({x['pos']}, {x['status']})" for x in cov_out],
                    "questionable": [f"{x['player']} ({x['pos']}, {x['status']})" for x in cov_q],
                },
                "source_receiver": r.get("source", ""),
                "source_defense": INJ_FILE.name,
            }
            report["pairings"].append(pair)

        # Receiver Causal Chain (primary WR1)
        wr1 = titles.get("WR1")
        if wr1:
            q_cbs = [c for c in cb_pairs if "Questionable" in c or "Doubtful" in c or "OUT" in c.upper() or "INJURED" in c.upper()]
            if q_cbs:
                report["chains"].append(
                    f"{side}: {wr1['player']} leads {o} pass-catchers (2026 NGS: targets {wr1.get('tar', '?')}, separation {wr1.get('sep', 0.0):.2f} yds, air-yd share {wr1.get('tay_pct', 0.0):.1f}%) [{wr1['source']}] "
                    f"-> draws the opposing slot-1 corner ladder: {', '.join(cb_pairs[:3])} [{DC_FILE.name}] "
                    f"-> starter(s) he meets are on injury report ({'; '.join(q_cbs)}) [{INJ_FILE.name}] - specific receiver vs weakened defender creates target concentration and conversion leverage "
                    f"-> breaking condition: pre-kick scratch/activation flips this pairing, and depth-chart slot changes void it"
                )
            elif cov_out:
                names = "; ".join(f"{x['player']} ({x['pos']}, {x['status']})" for x in cov_out[:3])
                report["chains"].append(
                    f"{side}: {wr1['player']} leads {o} receivers in targets ({wr1.get('tar', '?')}) with measured separation "
                    f"{wr1.get('sep', 0.0):.2f} yds and air-yd share {wr1.get('tay_pct', 0.0):.1f}% [{wr1['source']}] "
                    f"-> opposing coverage is missing {names} [{INJ_FILE.name}] "
                    f"-> coverage void meets usage leader: expect target concentration and perimeter explosive pass window; "
                    f"breaking condition: the cited defender is announced active, which voids the void"
                )
            elif cov_q:
                names = "; ".join(f"{x['player']} ({x['pos']}, {x['status']})" for x in cov_q[:3])
                report["chains"].append(
                    f"{side}: {wr1['player']} leads {o} pass-catchers (2026 NGS: targets {wr1.get('tar', '?')}, separation {wr1.get('sep', 0.0):.2f} yds) [{wr1['source']}] "
                    f"-> draws opposing secondary with {names} on injury report [{INJ_FILE.name}] "
                    f"-> separation leverage against thinned secondary anchors passing efficiency; "
                    f"breaking condition: pre-kick status updates or bracket coverage adjustment"
                )
            else:
                report["chains"].append(
                    f"{side}: {wr1['player']} leads {o} pass-catchers (2026 NGS: targets {wr1.get('tar', '?')}, separation {wr1.get('sep', 0.0):.2f} yds, air-yd share {wr1.get('tay_pct', 0.0):.1f}%) [{wr1['source']}] "
                    f"-> draws active opposing secondary ladder: {', '.join(cb_pairs[:3])} [{DC_FILE.name}] "
                    f"-> opposing coverage fully active on report [{INJ_FILE.name}]; separation rate ({wr1.get('sep', 0.0):.2f} yds) anchors primary passing volume "
                    f"-> breaking condition: pre-kick scratches or defensive bracket coverage scheme"
                )

    # Bidirectional Trench Analysis: AWAY-OL vs HOME-FRONT and HOME-OL vs AWAY-FRONT
    for t_side, (o, d) in (("AWAY-OL vs HOME-FRONT", (away_c, home_c)),
                           ("HOME-OL vs AWAY-FRONT", (home_c, away_c))):
        o_dc = dc.get(o, {})
        d_dc = dc.get(d, {})
        o_inj = inj.get(o, [])
        d_inj = inj.get(d, [])

        ol_starters = []
        for k, rows in o_dc.items():
            pos = k.split("|")[-1]
            if pos in ("LT", "LG", "C", "RG", "RT") and rows:
                ol_starters.append(f"{rows[0].get('athlete')} ({pos})")

        front_starters = []
        for k, rows in d_dc.items():
            pos = k.split("|")[-1]
            if pos in ("DE", "DT", "LDE", "RDE", "LDT", "RDT", "NT", "EDGE", "OLB") and rows:
                front_starters.append(f"{rows[0].get('athlete')} ({pos})")

        front_active = [x for x in d_inj if x.get("pos") in RUSH_POS and x.get("status") == "ACTIVE"]
        front_down = [x for x in d_inj if x.get("pos") in RUSH_POS and x.get("status") in ("OUT", "DOUBTFUL", "INJURED RESERVE", "IR")]
        front_q = [x for x in d_inj if x.get("pos") in RUSH_POS and x.get("status") == "QUESTIONABLE"]
        ol_down = [x for x in o_inj if x.get("pos") in OL_POS and x.get("status") in ("OUT", "DOUBTFUL", "INJURED RESERVE", "IR")]

        qb = passers.get(o, [{}])[0]
        qb_name = qb.get("player", "QB")
        qb_ttt = qb.get("ttt", 2.80)

        rb = rush.get(o, [{}])[0]
        rb_name = rb.get("player", "RB1")
        rb_tlos = rb.get("tlos", 2.80)
        rb_ryoe = rb.get("ryoe", 0.0)

        trench_record = {
            "side": t_side,
            "offense_team": o,
            "defense_team": d,
            "ol_starters": ol_starters,
            "ol_down": [f"{x['player']} ({x['pos']}, {x['status']})" for x in ol_down],
            "front_starters": front_starters,
            "front_active_on_report": [f"{x['player']} ({x['pos']})" for x in front_active],
            "front_down": [f"{x['player']} ({x['pos']}, {x['status']})" for x in front_down],
            "front_questionable": [f"{x['player']} ({x['pos']}, {x['status']})" for x in front_q],
            "qb_name": qb_name,
            "qb_ttt": qb_ttt,
            "rb_name": rb_name,
            "rb_tlos": rb_tlos,
            "rb_ryoe": rb_ryoe,
            "source_passing": str(NGS_PASS_FILE.relative_to(REPO)).replace("\\", "/"),
            "source_rushing": str(NGS_RUSH_FILE.relative_to(REPO)).replace("\\", "/"),
            "source_injuries": INJ_FILE.name,
            "source_depthcharts": DC_FILE.name,
        }
        report["trench_matchups"].append(trench_record)

        # Trench Causal Chain
        if front_down:
            names = "; ".join(f"{x['player']} ({x['pos']}, {x['status']})" for x in front_down[:3])
            report["chains"].append(
                f"{t_side}: the {d} front is missing {names} [{INJ_FILE.name}] "
                f"-> rotation depth thins on the interior/edge, collapsing pass rush pressure rate "
                f"-> {o} QB {qb_name} pocket release window widens ({qb_ttt:.2f}s 2026 NGS TTT) [{NGS_PASS_FILE.name}] "
                f"and creates downhill rushing lanes for {rb_name} (TLOS {rb_tlos:.2f}s, RYOE {rb_ryoe:+.1f} yds) [{NGS_RUSH_FILE.name}]; "
                f"breaking condition: starters announced active pre-kick or game script forces pass-heavy abandonment"
            )
        elif ol_down:
            ol_names = "; ".join(f"{x['player']} ({x['pos']}, {x['status']})" for x in ol_down[:3])
            report["chains"].append(
                f"{t_side}: {o} offensive line protection compromised by {ol_names} [{INJ_FILE.name}] "
                f"-> pass protection breakdown compresses pocket release window for {qb_name} ({qb_ttt:.2f}s TTT) [{NGS_PASS_FILE.name}] "
                f"and disrupts blocking leverage for {rb_name} [{NGS_RUSH_FILE.name}] against {d} front ({', '.join(front_starters[:3])}) [{DC_FILE.name}]; "
                f"breaking condition: quick-release screen game or extra protection packages neutralize pressure"
            )
        elif front_q:
            names = "; ".join(f"{x['player']} ({x['pos']}, {x['status']})" for x in front_q[:3])
            report["chains"].append(
                f"{t_side}: {d} front operating with {names} Questionable on injury report [{INJ_FILE.name}] "
                f"-> interior push limited against {o} OL starters ({', '.join(ol_starters[:3])}) [{DC_FILE.name}] "
                f"-> {qb_name} maintains pocket tempo ({qb_ttt:.2f}s TTT) [{NGS_PASS_FILE.name}] and {rb_name} gains downhill lane leverage ({rb_tlos:.2f}s TLOS, RYOE {rb_ryoe:+.1f}) [{NGS_RUSH_FILE.name}]; "
                f"breaking condition: pre-kick activation of defensive starters or interior run blitz scheme"
            )
        else:
            report["chains"].append(
                f"{t_side}: {o} offensive line ({', '.join(ol_starters[:3])}) protecting {qb_name} (2026 NGS {qb_ttt:.2f}s time-to-throw) [{NGS_PASS_FILE.name}, {DC_FILE.name}] "
                f"-> meets {d} defensive front ({', '.join(front_starters[:3])}) fully active on report [{INJ_FILE.name}] "
                f"-> pocket release tempo ({qb_ttt:.2f}s) and {rb_name} burst (TLOS {rb_tlos:.2f}s, RYOE {rb_ryoe:+.1f}) [{NGS_RUSH_FILE.name}] serve as primary trench counter against rush pressure "
                f"-> breaking condition: pre-kick OL/DL scratches or in-game blitz scheme overhaul"
            )

    # Legacy compatibility slot for ol_vs_rush
    if report["trench_matchups"]:
        report["ol_vs_rush"] = report["trench_matchups"][1]  # HOME-OL vs AWAY-FRONT

    return report


def emit_matchup_md(home: str, away: str, date: str = "2026-10-18") -> tuple[Path, dict]:
    rep = build_matchups(home, away)
    lines = [
        f"# {rep['game']} - Matchup Report",
        "",
        f"generated_utc: {rep['generated_utc']}",
        ""
    ]

    lines.append("## Receiver vs coverage pairings")
    lines.append("")
    for p in rep["pairings"]:
        lines.append(f"### {p['side']} - {p['usage_title']}: {p['receiver']}")
        f = p["receiver_form"]
        basis = f.get("usage_basis") or "targets"
        if basis == "targets":
            lines.append(
                f"- targets {f['targets']} | separation {f['separation_yds']:.2f} yds | "
                f"air-yd share {f.get('air_yard_share', 0.0):.1f}% | "
                f"YAC/E R {f['yac_over_expected']:+.2f} | catch {f['catch_pct']:.1f}% "
                f"(2026 in-season NGS) [{p['source_receiver']}]"
            )
        else:
            lines.append(f"- {basis} [{p['source_receiver']}]")

        u = _usage_row(p.get("receiver") or "")
        if u:
            lines.append(
                f"- usage share (LineStar 4wk): target {_pct(u.get('target_share_4wk'))} | "
                f"snap {_pct(u.get('snap_share_4wk'))} | "
                f"red-zone targets {u.get('rz_targets_4wk', 'n/a')}, "
                f"red-zone recTD {u.get('rz_recTD_4wk', 'n/a')}"
            )
        if p.get("matched_cornerbacks"):
            lines.append(f"- matched slot-1 corners: {'; '.join(p['matched_cornerbacks'])}")
        cs = p["opposing_coverage_status"]
        lines.append(f"- opposing coverage OUT/limited: {', '.join(cs['out_or_limited']) or '(none listed)'}")
        lines.append(f"- opposing coverage QUESTIONABLE: {', '.join(cs['questionable']) or '(none)'}")
        lines.append("")

    lines.append("## OL vs pass-rush")
    lines.append("")
    for tm in rep["trench_matchups"]:
        lines.append(f"### {tm['side']}")
        lines.append(f"- offensive line starters: {', '.join(tm.get('ol_starters', [])) or '(none listed)'}")
        if tm.get("ol_down"):
            lines.append(f"- OL DOWN/limited: {', '.join(tm['ol_down'])}")
        lines.append(f"- QB protection anchor: {tm.get('qb_name', 'QB')} (2026 NGS time-to-throw: {tm.get('qb_ttt', 0.0):.2f}s) [{tm.get('source_passing', '')}]")
        lines.append(f"- RB downhill leverage: {tm.get('rb_name', 'RB')} (2026 NGS time-to-LOS: {tm.get('rb_tlos', 0.0):.2f}s, RYOE: {tm.get('rb_ryoe', 0.0):+.1f} yds) [{tm.get('source_rushing', '')}]")
        lines.append(f"- defensive front starters: {', '.join(tm.get('front_starters', [])) or '(none listed)'}")
        lines.append(f"- front ACTIVE (on report): {', '.join(tm.get('front_active_on_report', [])) or '(none listed)'}")
        lines.append(f"- front DOWN: {', '.join(tm.get('front_down', [])) or '(none)'}")
        lines.append(f"- front QUESTIONABLE: {', '.join(tm.get('front_questionable', [])) or '(none)'}")
        lines.append("")

    lines.append("## Matchup chains (each cites its file)")
    lines.append("")
    for i, c in enumerate(rep["chains"], 1):
        lines.append(f"{i}. {c}")
    lines.append("")

    if rep["gaps"]:
        lines.append("## Honest gaps")
        lines.append("")
        for g in rep["gaps"]:
            lines.append(f"- {g}")
        lines.append("")

    outdir = OUTROOT / date
    outdir.mkdir(parents=True, exist_ok=True)
    out = outdir / f"{rep['game']}-matchups.md"
    out.write_text("\n".join(lines), encoding="utf-8")
    rep["path"] = str(out)
    return out, rep


def main() -> int:
    ap = argparse.ArgumentParser(description="Galaxy Sports Edge Matchup Intelligence Engine")
    ap.add_argument("--home", required=False, help="Home team abbreviation (e.g. PHI)")
    ap.add_argument("--away", required=False, help="Away team abbreviation (e.g. DAL)")
    ap.add_argument("--date", default="2026-10-18", help="Matchup date partition (default: 2026-10-18)")
    ap.add_argument("--all", action="store_true", help="Generate all 14 Week 6 games")
    args = ap.parse_args()

    if args.home and args.away:
        path, rep = emit_matchup_md(args.home.upper(), args.away.upper(), args.date)
        print(f"pairings: {len(rep['pairings'])} | chains: {len(rep['chains'])} | gaps: {len(rep['gaps'])}")
        print(f"matchups -> {path}")
        return 0

    print("Generating all 14 Week 6 NFL matchup reports...")
    results = []
    for home, away in WEEK6_GAMES:
        path, rep = emit_matchup_md(home, away, args.date)
        print(f"  {away:3s}@{home:3s} -> {len(rep['chains'])} chains -> {path.name}")
        results.append((home, away, len(rep['chains']), path))

    all_pass = all(c >= 2 for _, _, c, _ in results)
    print("=" * 60)
    print(f"Total games processed: {len(results)}/14 | All >= 2 chains: {all_pass}")
    return 0 if all_pass else 1


if __name__ == "__main__":
    raise SystemExit(main())
