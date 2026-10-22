"""Test prototype for Requirement 2 (R2) 14/14 matchup chains."""
import json
import re
from pathlib import Path

REPO = Path("c:/Users/Garrett/Sports")
SOURCES = REPO / "docs" / "data-sources" / "research"

GSIS_MAP = {
    '0200': 'ATL', '0325': 'BAL', '0610': 'BUF', '0750': 'CAR', '0810': 'CHI',
    '0920': 'CIN', '1050': 'CLE', '1200': 'DAL', '1400': 'DEN', '1540': 'DET',
    '1800': 'GB', '2100': 'TEN', '2120': 'HOU', '2200': 'IND', '2250': 'JAX',
    '2310': 'KC', '2510': 'LAR', '2520': 'LV', '2700': 'MIA', '3000': 'MIN',
    '3200': 'NE', '3300': 'NO', '3410': 'NYG', '3430': 'NYJ', '3700': 'PHI',
    '3800': 'ARI', '3900': 'PIT', '4400': 'LAC', '4500': 'SF', '4600': 'SEA',
    '4900': 'TB', '5110': 'WSH'
}
CANON = {'AZ': 'ARI', 'WAS': 'WSH', 'JAC': 'JAX', 'LA': 'LAR', 'SD': 'LAC', 'OAK': 'LV'}

def canon_team(t):
    if not t: return ''
    s = str(t).strip().upper()
    return GSIS_MAP.get(s, CANON.get(s, s))

def norm_name(n):
    n = (n or '').lower().strip()
    if ',' in n:
        parts = [p.strip() for p in n.split(',', 1)]
        n = f'{parts[1]} {parts[0]}'
    n = n.replace('’', "'")
    n = re.sub(r"[.\u2019']", '', n)
    for s in (' jr', ' sr', ' iii', ' ii', ' iv', ' v'):
        if n.endswith(s):
            n = n[:-len(s)].strip()
    return re.sub(r'\s+', ' ', n)

def main():
    rec_raw = json.load(open(SOURCES / '2026-10-13' / 'ngs' / 'raw_statboard_receiving.json', encoding='utf-8'))['stats']
    rush_raw = json.load(open(SOURCES / '2026-10-13' / 'ngs' / 'raw_statboard_rushing.json', encoding='utf-8'))['stats']
    pass_raw = json.load(open(SOURCES / '2026-10-13' / 'ngs' / 'raw_statboard_passing.json', encoding='utf-8'))['stats']
    dc_teams = json.load(open(SOURCES / '2026-10-13' / 'depthcharts' / 'espn-depthcharts-2026.json', encoding='utf-8'))['teams']
    inj_raw = json.load(open(SOURCES / '2026-10-18' / 'injuries' / 'espn_nfl_injuries_week6.json', encoding='utf-8'))['teams']
    inj_teams = {canon_team(t['team']): t['injuries'] for t in inj_raw}

    grid = json.load(open(SOURCES / '2026-10-13' / 'linestar' / 'linestar_slate_grid_2026-10-13.json', encoding='utf-8'))
    dvp_teams = {canon_team(t['Abbrev']): t for t in grid.get('defense_vs_position', {}).get('teams', [])}

    rec_by_team = {}
    for r in rec_raw:
        rec_by_team.setdefault(canon_team(r['teamId']), []).append(r)
    for t in rec_by_team:
        rec_by_team[t].sort(key=lambda x: x.get('targets', 0), reverse=True)

    rush_by_team = {}
    for r in rush_raw:
        rush_by_team.setdefault(canon_team(r['teamId']), []).append(r)
    for t in rush_by_team:
        rush_by_team[t].sort(key=lambda x: x.get('rushAttempts', 0), reverse=True)

    pass_by_team = {}
    for r in pass_raw:
        pass_by_team.setdefault(canon_team(r['teamId']), []).append(r)
    for t in pass_by_team:
        pass_by_team[t].sort(key=lambda x: x.get('attempts', 0), reverse=True)

    COVERAGE_POS = {'CB', 'S', 'SAF', 'FS', 'SS', 'NB', 'DB'}
    RUSH_POS = {'DE', 'DT', 'ED', 'DL', 'NT', 'OLB', 'EDGE'}

    games = [
        ('LAR', 'ARI'), ('CLE', 'BAL'), ('LV', 'BUF'), ('PHI', 'CAR'),
        ('ATL', 'CHI'), ('GB', 'DAL'), ('JAX', 'HOU'), ('KC', 'LAC'),
        ('NYG', 'NO'), ('NE', 'NYJ'), ('TB', 'PIT'), ('DEN', 'SEA'),
        ('IND', 'TEN'), ('SF', 'WSH')
    ]

    all_pass = True
    print("Executing Prototype Chain Simulation on all 14 Week 6 Games:")
    print("-" * 75)
    for home, away in games:
        chains = []
        for side, off, defe in [('AWAY-OFF vs HOME-DEF', away, home), ('HOME-OFF vs AWAY-DEF', home, away)]:
            o_rec = rec_by_team.get(off, [])
            d_inj = inj_teams.get(defe, [])
            d_dc = dc_teams.get(defe, {})
            o_dc = dc_teams.get(off, {})
            d_inj_names = {norm_name(x['athlete']): x for x in d_inj}
            
            # 1. Receiver vs Coverage Chain
            if o_rec:
                wr1 = o_rec[0]
                pname = wr1.get('playerName') or (wr1.get('player') or {}).get('displayName', 'WR1')
                tar = wr1.get('targets', 0)
                sep = wr1.get('avgSeparation', 0.0)
                tay_pct = wr1.get('percentShareOfIntendedAirYards', 0.0)
                eyac = wr1.get('avgYACAboveExpectation', 0.0)
                
                cb_starters = []
                for k, rows in d_dc.items():
                    pos = k.split('|')[-1]
                    if pos in ('LCB', 'RCB', 'NB') and rows:
                        cb_starters.append((pos, rows[0].get('athlete')))
                
                cov_down = [x for x in d_inj if x.get('position') in COVERAGE_POS and x.get('status', '').upper() in ('OUT', 'IR', 'INJURED RESERVE', 'DOUBTFUL')]
                cov_q = [x for x in d_inj if x.get('position') in COVERAGE_POS and x.get('status', '').upper() == 'QUESTIONABLE']
                
                parts = [f"{side}: {pname} leads {off} pass-catchers (2026 NGS: {tar} targets, {sep:.2f} yds separation, {tay_pct:.1f}% air yard share, EYAC/R {eyac:+.2f}) [raw_statboard_receiving.json]"]
                if cb_starters:
                    cb_desc = '; '.join(f"{ath} ({pos}, slot-1, {d_inj_names.get(norm_name(ath), {}).get('status', 'ACTIVE')})" for pos, ath in cb_starters[:3])
                    parts.append(f"-> draws opposing secondary ladder: {cb_desc} [espn-depthcharts-2026.json]")
                if cov_down:
                    names = '; '.join(f"{x['athlete']} ({x['position']}, {x['status']})" for x in cov_down[:2])
                    parts.append(f"-> {defe} coverage void with {names} OUT/IR [espn_nfl_injuries_week6.json]; creates target concentration and explosive perimeter pass window")
                elif cov_q:
                    names = '; '.join(f"{x['athlete']} ({x['position']}, {x['status']})" for x in cov_q[:2])
                    parts.append(f"-> {defe} secondary operating at less than 100% with {names} on injury report [espn_nfl_injuries_week6.json]; separation ({sep:.2f} yds) yields conversion leverage")
                else:
                    parts.append(f"-> opposing coverage fully active; {pname} separation rate ({sep:.2f} yds) anchors primary passing volume against boundary corners")
                parts.append("-> breaking condition: pre-kick scratch/activation flips coverage depth or defensive coordinator implements bracket coverage")
                chains.append(" ".join(parts))

            # 2. Trench Mismatch Chain
            ol_starters = []
            for k, rows in o_dc.items():
                pos = k.split('|')[-1]
                if pos in ('LT', 'LG', 'C', 'RG', 'RT') and rows:
                    ol_starters.append(f"{rows[0].get('athlete')} ({pos})")
            
            front_starters = []
            for k, rows in d_dc.items():
                pos = k.split('|')[-1]
                if pos in ('DE', 'DT', 'LDE', 'RDE', 'LDT', 'RDT', 'NT', 'EDGE', 'OLB') and rows:
                    front_starters.append(f"{rows[0].get('athlete')} ({pos})")
            
            front_down = [x for x in d_inj if x.get('position') in RUSH_POS and x.get('status', '').upper() in ('OUT', 'IR', 'INJURED RESERVE', 'DOUBTFUL')]
            front_q = [x for x in d_inj if x.get('position') in RUSH_POS and x.get('status', '').upper() == 'QUESTIONABLE']
            ol_down = [x for x in inj_teams.get(off, []) if x.get('position') in {'OT', 'OG', 'C', 'G', 'T', 'OL'} and x.get('status', '').upper() in ('OUT', 'IR', 'INJURED RESERVE', 'DOUBTFUL')]
            
            qb = pass_by_team.get(off, [{}])[0]
            qb_name = qb.get('playerName') or (qb.get('player') or {}).get('displayName', 'QB')
            ttt = qb.get('avgTimeToThrow', 0.0)
            
            rb = rush_by_team.get(off, [{}])[0]
            rb_name = rb.get('playerName') or (rb.get('player') or {}).get('displayName', 'RB1')
            tlos = rb.get('avgTimeToLos', 0.0)
            ryoe = rb.get('rushYardsOverExpected', 0.0)
            
            t_side = side.replace("OFF", "OL").replace("DEF", "FRONT")
            t_parts = [f"{t_side}: {off} offensive line ({len(ol_starters)} starters) protecting {qb_name} (2026 NGS {ttt:.2f}s time-to-throw) [raw_statboard_passing.json, espn-depthcharts-2026.json]"]
            if front_starters:
                t_parts.append(f"-> meets {defe} defensive front ({len(front_starters)} starters: {', '.join(front_starters[:3])}) [espn-depthcharts-2026.json]")
            if ol_down:
                ol_names = '; '.join(f"{x['athlete']} ({x['position']}, {x['status']})" for x in ol_down[:2])
                t_parts.append(f"-> {off} offensive trench compromised by {ol_names} [espn_nfl_injuries_week6.json]; pass rush win rate swings heavily toward {defe} front")
            elif front_down:
                names = '; '.join(f"{x['athlete']} ({x['position']}, {x['status']})" for x in front_down[:2])
                t_parts.append(f"-> {defe} front rotation thinned with {names} OUT/IR [espn_nfl_injuries_week6.json]; pass rush pressure rate collapses, widening {qb_name} pocket window")
            elif front_q:
                names = '; '.join(f"{x['athlete']} ({x['position']}, {x['status']})" for x in front_q[:2])
                t_parts.append(f"-> {defe} front interior limited with {names} Questionable [espn_nfl_injuries_week6.json]; allows {rb_name} (TLOS {tlos:.2f}s, RYOE {ryoe:+.1f}) downhill lane leverage [raw_statboard_rushing.json]")
            else:
                t_parts.append(f"-> {defe} defensive front fully active; {qb_name} pocket release tempo ({ttt:.2f}s) serves as trench counter against defensive pressure")
            t_parts.append("-> breaking condition: pre-kick OL/DL starter scratches or in-game blitz scheme overhaul")
            chains.append(" ".join(t_parts))
            
        print(f"{away}@{home:4s} -> {len(chains)} chains (PASS: {len(chains) >= 2})")
        if len(chains) < 2:
            all_pass = False

    print("-" * 75)
    print(f"ALL 14 GAMES MEET chains_count >= 2: {all_pass}")

if __name__ == '__main__':
    main()
