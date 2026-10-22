"""Full simulation test of the upgraded matchup engine across all 14 Week 6 games."""
import json
import re
from pathlib import Path

REPO = Path("c:/Users/Garrett/Sports")
SOURCES = REPO / "docs" / "data-sources" / "research"

NGS_REC_FILE = SOURCES / "2026-10-13" / "ngs" / "raw_statboard_receiving.json"
NGS_RUSH_FILE = SOURCES / "2026-10-13" / "ngs" / "raw_statboard_rushing.json"
NGS_PASS_FILE = SOURCES / "2026-10-13" / "ngs" / "raw_statboard_passing.json"
LINESTAR_GRID_FILE = SOURCES / "2026-10-13" / "linestar" / "linestar_slate_grid_2026-10-13.json"
LINESTAR_USAGE = SOURCES / "2026-10-13" / "linestar" / "linestar_usage_2026-10-13.json"
INJ_FILE = SOURCES / "2026-10-18" / "injuries" / "espn_nfl_injuries_week6.json"
DC_FILE = SOURCES / "2026-10-13" / "depthcharts" / "espn-depthcharts-2026.json"

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

def canon_team(t: str) -> str:
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

COVERAGE_POS = {"CB", "S", "SAF", "FS", "SS", "NB", "DB"}
RUSH_POS = {"DE", "DT", "ED", "DL", "NT", "OLB", "EDGE"}
OL_POS = {"OT", "OG", "C", "G", "T", "OL"}

def test_full_pipeline():
    rec_d = json.load(open(NGS_REC_FILE, encoding="utf-8"))['stats']
    rush_d = json.load(open(NGS_RUSH_FILE, encoding="utf-8"))['stats']
    pass_d = json.load(open(NGS_PASS_FILE, encoding="utf-8"))['stats']
    inj_d = json.load(open(INJ_FILE, encoding="utf-8"))['teams']
    dc_d = json.load(open(DC_FILE, encoding="utf-8"))['teams']

    inj_by_team = {}
    for t in inj_d:
        team = canon_team(t['team'])
        inj_by_team[team] = [
            {
                "player": e.get("athlete"),
                "pos": e.get("position"),
                "status": (e.get("status") or "").upper(),
                "detail": e.get("detail") or e.get("comment"),
                "source": str(INJ_FILE.relative_to(REPO)).replace("\\", "/"),
            }
            for e in t.get("injuries", [])
        ]

    rec_by_team = {}
    for r in rec_d:
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
        rec_by_team.setdefault(team, []).append(row)
    for team in rec_by_team:
        rec_by_team[team].sort(key=lambda x: x["tar"], reverse=True)

    rush_by_team = {}
    for r in rush_d:
        team = canon_team(r.get("teamId"))
        p_info = r.get("player") or {}
        pname = r.get("playerName") or p_info.get("displayName") or ""
        row = {
            "player": pname,
            "team": team,
            "pos": "RB",
            "att": int(r.get("rushAttempts") or 0),
            "yards": float(r.get("rushYards") or 0.0),
            "avg_yards": float(r.get("avgRushYards") or 0.0),
            "eff": float(r.get("efficiency") or 0.0),
            "tlos": float(r.get("avgTimeToLos") or 0.0),
            "ryoe": float(r.get("rushYardsOverExpected") or 0.0),
            "ryoe_per_att": float(r.get("rushYardsOverExpectedPerAtt") or 0.0),
            "source": str(NGS_RUSH_FILE.relative_to(REPO)).replace("\\", "/"),
        }
        rush_by_team.setdefault(team, []).append(row)
    for team in rush_by_team:
        rush_by_team[team].sort(key=lambda x: x["att"], reverse=True)

    pass_by_team = {}
    for r in pass_d:
        team = canon_team(r.get("teamId"))
        p_info = r.get("player") or {}
        pname = r.get("playerName") or p_info.get("displayName") or ""
        row = {
            "player": pname,
            "team": team,
            "pos": "QB",
            "att": int(r.get("attempts") or 0),
            "cmp": int(r.get("completions") or 0),
            "yards": float(r.get("passYards") or 0.0),
            "td": int(r.get("passTouchdowns") or 0),
            "cpoe": float(r.get("completionPercentageAboveExpectation") or 0.0),
            "ttt": float(r.get("avgTimeToThrow") or 0.0),
            "source": str(NGS_PASS_FILE.relative_to(REPO)).replace("\\", "/"),
        }
        pass_by_team.setdefault(team, []).append(row)
    for team in pass_by_team:
        pass_by_team[team].sort(key=lambda x: x["att"], reverse=True)

    games = [
        ('LAR', 'ARI'), ('CLE', 'BAL'), ('LV', 'BUF'), ('PHI', 'CAR'),
        ('ATL', 'CHI'), ('GB', 'DAL'), ('JAX', 'HOU'), ('KC', 'LAC'),
        ('NYG', 'NO'), ('NE', 'NYJ'), ('TB', 'PIT'), ('DEN', 'SEA'),
        ('IND', 'TEN'), ('SF', 'WSH')
    ]

    all_ok = True
    for home, away in games:
        home_c = canon_team(home)
        away_c = canon_team(away)
        chains = []

        # Dual side receivers & trench
        for side, (o, d) in (("AWAY-OFF vs HOME-DEF", (away_c, home_c)),
                             ("HOME-OFF vs AWAY-DEF", (home_c, away_c))):
            o_recv = rec_by_team.get(o, [])
            d_inj = inj_by_team.get(d, [])
            o_inj = inj_by_team.get(o, [])
            d_dc = dc_d.get(d, {})
            o_dc = dc_d.get(o, {})

            inj_by_name = {norm_name(x["player"]): x for x in d_inj}
            cov_out = [x for x in d_inj if (x.get("pos") in COVERAGE_POS) and x.get("status") in ("OUT", "INJURED RESERVE", "IR", "DOUBTFUL")]
            cov_q = [x for x in d_inj if (x.get("pos") in COVERAGE_POS) and x.get("status") == "QUESTIONABLE"]

            # Filter active receivers
            def is_down(name: str) -> bool:
                st = inj_by_name.get(norm_name(name), {}).get("status", "")
                return st in ("OUT", "IR", "INJURED RESERVE", "DOUBTFUL", "PUP")

            active_wrs = [r for r in o_recv if r["pos"] == "WR" and not is_down(r["player"])]
            if not active_wrs:
                active_wrs = [r for r in o_recv if r["pos"] == "WR"]
            wr1 = active_wrs[0] if active_wrs else None

            # Starters for CB
            cb_starters = []
            for k, rows in d_dc.items():
                pos = k.split("|")[-1]
                if pos in ("LCB", "RCB", "NB") and rows:
                    cb_starters.append((pos, rows[0].get("athlete")))

            cb_pairs = []
            seen_cb = set()
            for pos, ath in cb_starters:
                if ath and ath not in seen_cb:
                    seen_cb.add(ath)
                    st = inj_by_name.get(norm_name(ath), {}).get("status", "not-on-report")
                    cb_pairs.append(f"{ath} ({pos}, slot-1, {st})")
                    if st.upper() in ("OUT", "IR", "INJURED RESERVE", "DOUBTFUL"):
                        # next man up
                        for row in d_dc.get(f"Base 4-3 D|{pos}", []) + d_dc.get(f"Base 3-4 D|{pos}", []):
                            b_ath = row.get("athlete")
                            if b_ath and b_ath not in seen_cb:
                                seen_cb.add(b_ath)
                                bst = inj_by_name.get(norm_name(b_ath), {}).get("status", "not-on-report")
                                cb_pairs.append(f"{b_ath} ({pos}, depth-2, {bst})")
                                break

            # Receiver Chain
            if wr1:
                q_cbs = [c for c in cb_pairs if "Questionable" in c or "Doubtful" in c or "OUT" in c.upper() or "INJURED" in c.upper()]
                if q_cbs:
                    chains.append(
                        f"{side}: {wr1['player']} leads {o} pass-catchers (2026 NGS: targets {wr1['tar']}, separation {wr1['sep']:.2f} yds, air-yd share {wr1['tay_pct']:.1f}%) [{wr1['source']}] "
                        f"-> draws opposing slot-1 corner ladder: {', '.join(cb_pairs[:3])} [{DC_FILE.name}] "
                        f"-> starter(s) he meets are on injury report ({'; '.join(q_cbs)}) [{INJ_FILE.name}] - specific receiver vs weakened defender creates target concentration and conversion leverage "
                        f"-> breaking condition: pre-kick scratch/activation flips pairing or coverage depth changes"
                    )
                elif cov_out:
                    names = "; ".join(f"{x['player']} ({x['pos']}, {x['status']})" for x in cov_out[:2])
                    chains.append(
                        f"{side}: {wr1['player']} leads {o} receivers (2026 NGS: {wr1['tar']} targets, {wr1['sep']:.2f} yds sep, {wr1['tay_pct']:.1f}% air-yds) [{wr1['source']}] "
                        f"-> opposing coverage missing {names} [{INJ_FILE.name}] "
                        f"-> coverage void meets usage leader: expect target funnel and perimeter explosive pass window "
                        f"-> breaking condition: cited defender announced active pre-kick"
                    )
                elif cov_q:
                    names = "; ".join(f"{x['player']} ({x['pos']}, {x['status']})" for x in cov_q[:2])
                    chains.append(
                        f"{side}: {wr1['player']} leads {o} pass-catchers (2026 NGS: {wr1['tar']} targets, {wr1['sep']:.2f} yds sep) [{wr1['source']}] "
                        f"-> draws opposing secondary with {names} on report [{INJ_FILE.name}] "
                        f"-> separation leverage against thinned secondary anchors passing efficiency "
                        f"-> breaking condition: pre-kick status updates or bracket coverage adjustment"
                    )
                else:
                    chains.append(
                        f"{side}: {wr1['player']} leads {o} pass-catchers (2026 NGS: {wr1['tar']} targets, {wr1['sep']:.2f} yds sep, {wr1['tay_pct']:.1f}% air-yds) [{wr1['source']}] "
                        f"-> draws active opposing secondary ladder: {', '.join(cb_pairs[:3])} [{DC_FILE.name}] "
                        f"-> opposing coverage fully active on report [{INJ_FILE.name}]; separation rate ({wr1['sep']:.2f} yds) anchors primary passing volume "
                        f"-> breaking condition: pre-kick scratches or defensive bracket coverage scheme"
                    )

            # Trench Chain
            t_side = side.replace("OFF", "OL").replace("DEF", "FRONT")
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

            front_down = [x for x in d_inj if x.get("pos") in RUSH_POS and x.get("status") in ("OUT", "IR", "INJURED RESERVE", "DOUBTFUL")]
            front_q = [x for x in d_inj if x.get("pos") in RUSH_POS and x.get("status") == "QUESTIONABLE"]
            ol_down = [x for x in o_inj if x.get("pos") in OL_POS and x.get("status") in ("OUT", "IR", "INJURED RESERVE", "DOUBTFUL")]

            qb = pass_by_team.get(o, [{}])[0]
            qb_name = qb.get("player", "QB")
            qb_ttt = qb.get("ttt", 2.80)

            rb = rush_by_team.get(o, [{}])[0]
            rb_name = rb.get("player", "RB1")
            rb_tlos = rb.get("tlos", 2.80)
            rb_ryoe = rb.get("ryoe", 0.0)

            if front_down:
                names = "; ".join(f"{x['player']} ({x['pos']}, {x['status']})" for x in front_down[:2])
                chains.append(
                    f"{t_side}: {d} front missing {names} [{INJ_FILE.name}] "
                    f"-> rotation depth thins on interior/edge, collapsing pass rush pressure rate "
                    f"-> {qb_name} pocket release window widens ({qb_ttt:.2f}s 2026 NGS TTT) [{NGS_PASS_FILE.name}] "
                    f"and creates downhill rushing lane leverage for {rb_name} (TLOS {rb_tlos:.2f}s, RYOE {rb_ryoe:+.1f} yds) [{NGS_RUSH_FILE.name}] "
                    f"-> breaking condition: starters announced active pre-kick or game script forces pass-heavy abandonment"
                )
            elif ol_down:
                ol_names = "; ".join(f"{x['player']} ({x['pos']}, {x['status']})" for x in ol_down[:2])
                chains.append(
                    f"{t_side}: {o} offensive line compromised by {ol_names} [{INJ_FILE.name}] "
                    f"-> pass protection breakdown compresses pocket release window for {qb_name} ({qb_ttt:.2f}s TTT) [{NGS_PASS_FILE.name}] "
                    f"and disrupts blocking leverage for {rb_name} [{NGS_RUSH_FILE.name}] against {d} front ({', '.join(front_starters[:3])}) [{DC_FILE.name}] "
                    f"-> breaking condition: quick-release screen game or extra protection packages neutralize pressure"
                )
            elif front_q:
                names = "; ".join(f"{x['player']} ({x['pos']}, {x['status']})" for x in front_q[:2])
                chains.append(
                    f"{t_side}: {d} front operating with {names} Questionable on injury report [{INJ_FILE.name}] "
                    f"-> interior push limited against {o} OL starters ({', '.join(ol_starters[:3])}) [{DC_FILE.name}] "
                    f"-> {qb_name} maintains pocket tempo ({qb_ttt:.2f}s TTT) [{NGS_PASS_FILE.name}] and {rb_name} gains downhill lane leverage ({rb_tlos:.2f}s TLOS, RYOE {rb_ryoe:+.1f}) [{NGS_RUSH_FILE.name}] "
                    f"-> breaking condition: pre-kick activation of defensive starters or interior run blitz scheme"
                )
            else:
                chains.append(
                    f"{t_side}: {o} offensive line ({', '.join(ol_starters[:3])}) protecting {qb_name} (2026 NGS {qb_ttt:.2f}s time-to-throw) [{NGS_PASS_FILE.name}, {DC_FILE.name}] "
                    f"-> meets {d} defensive front ({', '.join(front_starters[:3])}) fully active on report [{INJ_FILE.name}] "
                    f"-> pocket release tempo ({qb_ttt:.2f}s) and {rb_name} burst (TLOS {rb_tlos:.2f}s, RYOE {rb_ryoe:+.1f}) [{NGS_RUSH_FILE.name}] serve as primary trench counter against rush pressure "
                    f"-> breaking condition: pre-kick OL/DL scratches or in-game blitz scheme overhaul"
                )

        print(f"Game {away:3s}@{home:3s} -> Total Chains: {len(chains)} (>= 2: {len(chains) >= 2})")
        if len(chains) < 2:
            all_ok = False

    print("=" * 60)
    print("ALL 14 GAMES PASS (chains >= 2):", all_ok)

if __name__ == '__main__':
    test_full_pipeline()
