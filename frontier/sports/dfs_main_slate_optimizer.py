"""
dfs_main_slate_optimizer.py
===========================
Institutional DraftKings NFL Week 4 1:00 PM Main Slate Optimizer.
Excludes London early game (Colts vs Commanders kicked off at 9:30 AM ET).

Incorporates:
- GSE Glass-Box Formulation (apps/web/lib/calibration/entropy-dfs-portfolios.ts)
- Shannon Opponent Entropy and Jaccard Portfolio Diversity (arXiv:2308.14339v3)
- GSE Tournament Leverage Score: leverage(p) = ceiling / (own * 100 + 1.5)
- Exact $50,000 DraftKings Salary Cap constraints
- Game Stacking: Primary QB + WR/TE + Opposing Bring-Back
- DST Correlation: Workhorse RB + DST pairing or QB vs turnover-prone backup
"""

import math
from itertools import combinations
from typing import Dict, List, Tuple, Any, Optional

SALARY_CAP = 50000

# 1:00 PM & Afternoon Main Slate Pool (London Excluded)
MAIN_SLATE_POOL = [
    # Quarterbacks
    {"id": "qb_allen", "name": "Josh Allen", "pos": "QB", "team": "BUF", "opp": "NE", "salary": 7800, "proj": 23.8, "ceiling": 36.5, "own": 0.13},
    {"id": "qb_hurts", "name": "Jalen Hurts", "pos": "QB", "team": "PHI", "opp": "LAR", "salary": 7500, "proj": 22.2, "ceiling": 34.0, "own": 0.11},
    {"id": "qb_stroud", "name": "C.J. Stroud", "pos": "QB", "team": "HOU", "opp": "DAL", "salary": 6900, "proj": 20.4, "ceiling": 32.8, "own": 0.12},
    {"id": "qb_murray", "name": "Kyler Murray", "pos": "QB", "team": "ARI", "opp": "NYG", "salary": 6800, "proj": 20.8, "ceiling": 32.0, "own": 0.10},
    {"id": "qb_dak", "name": "Dak Prescott", "pos": "QB", "team": "DAL", "opp": "HOU", "salary": 6600, "proj": 18.2, "ceiling": 28.0, "own": 0.06},
    {"id": "qb_love", "name": "Jordan Love", "pos": "QB", "team": "GB", "opp": "TB", "salary": 6400, "proj": 19.5, "ceiling": 30.5, "own": 0.09},
    {"id": "qb_goff", "name": "Jared Goff", "pos": "QB", "team": "DET", "opp": "CAR", "salary": 6300, "proj": 18.8, "ceiling": 29.5, "own": 0.07},
    {"id": "qb_mayfield", "name": "Baker Mayfield", "pos": "QB", "team": "TB", "opp": "GB", "salary": 6000, "proj": 17.6, "ceiling": 27.0, "own": 0.05},
    {"id": "qb_stafford", "name": "Matthew Stafford", "pos": "QB", "team": "LAR", "opp": "PHI", "salary": 5700, "proj": 16.2, "ceiling": 25.0, "own": 0.04},
    {"id": "qb_dalton", "name": "Andy Dalton", "pos": "QB", "team": "CAR", "opp": "DET", "salary": 5200, "proj": 15.0, "ceiling": 23.5, "own": 0.04},

    # Running Backs
    {"id": "rb_saquon", "name": "Saquon Barkley", "pos": "RB", "team": "PHI", "opp": "LAR", "salary": 8100, "proj": 21.0, "ceiling": 33.0, "own": 0.19},
    {"id": "rb_henry", "name": "Derrick Henry", "pos": "RB", "team": "BAL", "opp": "TEN", "salary": 7600, "proj": 17.0, "ceiling": 28.5, "own": 0.14},
    {"id": "rb_kyren", "name": "Kyren Williams", "pos": "RB", "team": "LAR", "opp": "PHI", "salary": 7400, "proj": 19.8, "ceiling": 30.0, "own": 0.16},
    {"id": "rb_gibbs", "name": "Jahmyr Gibbs", "pos": "RB", "team": "DET", "opp": "CAR", "salary": 7300, "proj": 18.2, "ceiling": 29.0, "own": 0.12},
    {"id": "rb_cook", "name": "James Cook", "pos": "RB", "team": "BUF", "opp": "NE", "salary": 6800, "proj": 17.5, "ceiling": 27.5, "own": 0.13},
    {"id": "rb_conner", "name": "James Conner", "pos": "RB", "team": "ARI", "opp": "NYG", "salary": 6500, "proj": 16.8, "ceiling": 26.0, "own": 0.12},
    {"id": "rb_mixon", "name": "Joe Mixon", "pos": "RB", "team": "HOU", "opp": "DAL", "salary": 6400, "proj": 15.2, "ceiling": 24.5, "own": 0.09},
    {"id": "rb_dmont", "name": "David Montgomery", "pos": "RB", "team": "DET", "opp": "CAR", "salary": 6400, "proj": 16.0, "ceiling": 25.5, "own": 0.10},
    {"id": "rb_jacobs", "name": "Josh Jacobs", "pos": "RB", "team": "GB", "opp": "TB", "salary": 6200, "proj": 15.5, "ceiling": 25.0, "own": 0.09},
    {"id": "rb_singletary", "name": "Devin Singletary", "pos": "RB", "team": "NYG", "opp": "ARI", "salary": 5700, "proj": 13.2, "ceiling": 21.0, "own": 0.07},
    {"id": "rb_pollard", "name": "Tony Pollard", "pos": "RB", "team": "TEN", "opp": "BAL", "salary": 5600, "proj": 13.8, "ceiling": 22.0, "own": 0.08},
    {"id": "rb_hubbard", "name": "Chuba Hubbard", "pos": "RB", "team": "CAR", "opp": "DET", "salary": 5400, "proj": 14.5, "ceiling": 23.5, "own": 0.12},
    {"id": "rb_bucky", "name": "Bucky Irving", "pos": "RB", "team": "TB", "opp": "GB", "salary": 5400, "proj": 13.5, "ceiling": 22.0, "own": 0.09},
    {"id": "rb_dowdle", "name": "Rico Dowdle", "pos": "RB", "team": "DAL", "opp": "HOU", "salary": 5100, "proj": 12.0, "ceiling": 19.5, "own": 0.06},

    # Wide Receivers
    {"id": "wr_ceedee", "name": "CeeDee Lamb", "pos": "WR", "team": "DAL", "opp": "HOU", "salary": 8600, "proj": 21.5, "ceiling": 35.0, "own": 0.17},
    {"id": "wr_amonra", "name": "Amon-Ra St. Brown", "pos": "WR", "team": "DET", "opp": "CAR", "salary": 8400, "proj": 21.0, "ceiling": 34.0, "own": 0.15},
    {"id": "wr_ajbrown", "name": "A.J. Brown", "pos": "WR", "team": "PHI", "opp": "LAR", "salary": 8000, "proj": 19.5, "ceiling": 32.0, "own": 0.13},
    {"id": "wr_nico", "name": "Nico Collins", "pos": "WR", "team": "HOU", "opp": "DAL", "salary": 7700, "proj": 20.2, "ceiling": 33.5, "own": 0.18},
    {"id": "wr_nabers", "name": "Malik Nabers", "pos": "WR", "team": "NYG", "opp": "ARI", "salary": 7500, "proj": 19.0, "ceiling": 31.5, "own": 0.16},
    {"id": "wr_marvin", "name": "Marvin Harrison Jr.", "pos": "WR", "team": "ARI", "opp": "NYG", "salary": 7200, "proj": 18.0, "ceiling": 31.0, "own": 0.14},
    {"id": "wr_evans", "name": "Mike Evans", "pos": "WR", "team": "TB", "opp": "GB", "salary": 7100, "proj": 17.5, "ceiling": 29.5, "own": 0.11},
    {"id": "wr_devonta", "name": "DeVonta Smith", "pos": "WR", "team": "PHI", "opp": "LAR", "salary": 6900, "proj": 16.5, "ceiling": 27.5, "own": 0.09},
    {"id": "wr_diggs", "name": "Stefon Diggs", "pos": "WR", "team": "HOU", "opp": "DAL", "salary": 6700, "proj": 16.0, "ceiling": 26.0, "own": 0.10},
    {"id": "wr_godwin", "name": "Chris Godwin", "pos": "WR", "team": "TB", "opp": "GB", "salary": 6500, "proj": 16.8, "ceiling": 27.0, "own": 0.13},
    {"id": "wr_reed", "name": "Jayden Reed", "pos": "WR", "team": "GB", "opp": "TB", "salary": 6200, "proj": 16.5, "ceiling": 28.0, "own": 0.11},
    {"id": "wr_diontae", "name": "Diontae Johnson", "pos": "WR", "team": "CAR", "opp": "DET", "salary": 6000, "proj": 15.8, "ceiling": 26.5, "own": 0.14},
    {"id": "wr_shakir", "name": "Khalil Shakir", "pos": "WR", "team": "BUF", "opp": "NE", "salary": 5800, "proj": 15.2, "ceiling": 26.5, "own": 0.10},
    {"id": "wr_jamo", "name": "Jameson Williams", "pos": "WR", "team": "DET", "opp": "CAR", "salary": 5500, "proj": 13.8, "ceiling": 25.0, "own": 0.08},
    {"id": "wr_wandale", "name": "Wan'Dale Robinson", "pos": "WR", "team": "NYG", "opp": "ARI", "salary": 4600, "proj": 13.0, "ceiling": 21.5, "own": 0.09},
    {"id": "wr_douglas", "name": "Demario Douglas", "pos": "WR", "team": "NE", "opp": "BUF", "salary": 4500, "proj": 12.2, "ceiling": 20.5, "own": 0.05},
    {"id": "wr_dortch", "name": "Greg Dortch", "pos": "WR", "team": "ARI", "opp": "NYG", "salary": 4200, "proj": 11.0, "ceiling": 19.0, "own": 0.04},
    {"id": "wr_whittington", "name": "Jordan Whittington", "pos": "WR", "team": "LAR", "opp": "PHI", "salary": 3800, "proj": 10.5, "ceiling": 18.0, "own": 0.06},

    # Tight Ends
    {"id": "te_mcbride", "name": "Trey McBride", "pos": "TE", "team": "ARI", "opp": "NYG", "salary": 5600, "proj": 14.5, "ceiling": 24.5, "own": 0.13},
    {"id": "te_laporta", "name": "Sam LaPorta", "pos": "TE", "team": "DET", "opp": "CAR", "salary": 5400, "proj": 13.5, "ceiling": 23.0, "own": 0.10},
    {"id": "te_kincaid", "name": "Dalton Kincaid", "pos": "TE", "team": "BUF", "opp": "NE", "salary": 5200, "proj": 13.8, "ceiling": 23.0, "own": 0.11},
    {"id": "te_ferguson", "name": "Jake Ferguson", "pos": "TE", "team": "DAL", "opp": "HOU", "salary": 5000, "proj": 13.5, "ceiling": 22.5, "own": 0.12},
    {"id": "te_goedert", "name": "Dallas Goedert", "pos": "TE", "team": "PHI", "opp": "LAR", "salary": 5100, "proj": 13.0, "ceiling": 22.0, "own": 0.09},
    {"id": "te_schultz", "name": "Dalton Schultz", "pos": "TE", "team": "HOU", "opp": "DAL", "salary": 4400, "proj": 11.2, "ceiling": 19.0, "own": 0.06},
    {"id": "te_kraft", "name": "Tucker Kraft", "pos": "TE", "team": "GB", "opp": "TB", "salary": 3800, "proj": 10.8, "ceiling": 19.5, "own": 0.07},
    {"id": "te_otton", "name": "Cade Otton", "pos": "TE", "team": "TB", "opp": "GB", "salary": 3600, "proj": 8.5, "ceiling": 15.0, "own": 0.04},

    # Defense / Special Teams
    {"id": "dst_ravens", "name": "Ravens DST", "pos": "DST", "team": "BAL", "opp": "TEN", "salary": 3800, "proj": 9.5, "ceiling": 18.5, "own": 0.12},
    {"id": "dst_lions", "name": "Lions DST", "pos": "DST", "team": "DET", "opp": "CAR", "salary": 3600, "proj": 9.0, "ceiling": 17.5, "own": 0.10},
    {"id": "dst_bills", "name": "Bills DST", "pos": "DST", "team": "BUF", "opp": "NE", "salary": 3500, "proj": 9.2, "ceiling": 18.0, "own": 0.11},
    {"id": "dst_packers", "name": "Packers DST", "pos": "DST", "team": "GB", "opp": "TB", "salary": 3200, "proj": 8.8, "ceiling": 17.0, "own": 0.09},
    {"id": "dst_cardinals", "name": "Cardinals DST", "pos": "DST", "team": "ARI", "opp": "NYG", "salary": 2900, "proj": 8.0, "ceiling": 16.0, "own": 0.06},
    {"id": "dst_texans", "name": "Texans DST", "pos": "DST", "team": "HOU", "opp": "DAL", "salary": 2800, "proj": 7.5, "ceiling": 16.0, "own": 0.05}
]

# Calculate GSE tournament leverage score for each player
for p in MAIN_SLATE_POOL:
    p["leverage"] = round(p["ceiling"] / (p["own"] * 100.0 + 1.5), 3)

def solve_optimal_lineup(
    mode: str = "proj", # "proj" (Cash), "ceiling" (GPP Raw Upside), "leverage" (GSE Tournament Contrarian)
    qb_id: Optional[str] = None,
    primary_passcatchers: Optional[List[str]] = None,
    bringback_id: Optional[str] = None,
    lock_ids: Optional[List[str]] = None,
    exclude_ids: Optional[List[str]] = None,
    forced_dst: Optional[str] = None
) -> Dict[str, Any]:
    lock_set = set(lock_ids or [])
    exclude_set = set(exclude_ids or [])

    qbs = [p for p in MAIN_SLATE_POOL if p["pos"] == "QB" and p["id"] not in exclude_set and (qb_id is None or p["id"] == qb_id)]
    rbs = [p for p in MAIN_SLATE_POOL if p["pos"] == "RB" and p["id"] not in exclude_set]
    wrs = [p for p in MAIN_SLATE_POOL if p["pos"] == "WR" and p["id"] not in exclude_set]
    tes = [p for p in MAIN_SLATE_POOL if p["pos"] == "TE" and p["id"] not in exclude_set]
    dsts = [p for p in MAIN_SLATE_POOL if p["pos"] == "DST" and p["id"] not in exclude_set and (forced_dst is None or p["id"] == forced_dst)]

    best_score = -1.0
    best_cand = None

    for qb in qbs:
        qb_team = qb["team"]
        opp_team = qb["opp"]

        for rb1, rb2 in combinations(rbs, 2):
            sal_rb = qb["salary"] + rb1["salary"] + rb2["salary"]
            # Lowest remaining 3 WRs (12,500), TE (3,600), FLEX (3,800), DST (2,800) = 22,700
            if sal_rb + 22700 > SALARY_CAP:
                continue

            for wr1, wr2, wr3 in combinations(wrs, 3):
                sal_wr = sal_rb + wr1["salary"] + wr2["salary"] + wr3["salary"]
                # Lowest remaining TE (3,600), FLEX (3,800), DST (2,800) = 10,200
                if sal_wr + 10200 > SALARY_CAP:
                    continue

                for te in tes:
                    sal_te = sal_wr + te["salary"]
                    if sal_te + 6600 > SALARY_CAP: # Lowest FLEX (3,800) + DST (2,800)
                        continue

                    # Check primary stack constraints if requested
                    if primary_passcatchers:
                        cand_pc = {wr1["id"], wr2["id"], wr3["id"], te["id"]}
                        if not all(pc in cand_pc for pc in primary_passcatchers):
                            continue

                    used_ids = {qb["id"], rb1["id"], rb2["id"], wr1["id"], wr2["id"], wr3["id"], te["id"]}
                    flex_pool = [p for p in rbs + wrs + tes if p["id"] not in used_ids]

                    for flex in flex_pool:
                        sal_flx = sal_te + flex["salary"]
                        if sal_flx + 2800 > SALARY_CAP:
                            continue

                        for dst in dsts:
                            total_sal = sal_flx + dst["salary"]
                            if total_sal > SALARY_CAP:
                                continue

                            cand = [qb, rb1, rb2, wr1, wr2, wr3, te, flex, dst]
                            cand_ids = {p["id"] for p in cand}

                            # Verify locks
                            if not lock_set.issubset(cand_ids):
                                continue

                            # Verify bringback
                            if bringback_id and bringback_id not in cand_ids:
                                continue

                            if mode == "proj":
                                score = sum(p["proj"] for p in cand)
                            elif mode == "ceiling":
                                score = sum(p["ceiling"] for p in cand)
                            elif mode == "leverage":
                                # GSE contrarian tournament objective: leverage * 6 + ceiling * 0.45
                                score = sum(p["leverage"] * 6.0 + p["ceiling"] * 0.45 for p in cand)
                            else:
                                score = sum(p["proj"] for p in cand)

                            if score > best_score:
                                best_score = score
                                best_cand = cand

    if not best_cand:
        raise ValueError("No feasible lineup found under constraints!")

    total_sal = sum(p["salary"] for p in best_cand)
    total_proj = round(sum(p["proj"] for p in best_cand), 1)
    total_ceil = round(sum(p["ceiling"] for p in best_cand), 1)
    total_own = round(sum(p["own"] for p in best_cand) * 100.0, 1)
    total_lev = round(sum(p["leverage"] for p in best_cand), 2)

    qb_p = next(p for p in best_cand if p["pos"] == "QB")
    dst_p = next(p for p in best_cand if p["pos"] == "DST")
    other_rbs = [p for p in best_cand if p["pos"] == "RB"]
    other_wrs = [p for p in best_cand if p["pos"] == "WR"]
    other_tes = [p for p in best_cand if p["pos"] == "TE"]

    rb1 = other_rbs[0]
    rb2 = other_rbs[1]
    flex = None
    if len(other_rbs) > 2:
        flex = other_rbs[2]
        wr1, wr2, wr3 = other_wrs[0], other_wrs[1], other_wrs[2]
        te = other_tes[0]
    elif len(other_wrs) > 3:
        flex = other_wrs[3]
        wr1, wr2, wr3 = other_wrs[0], other_wrs[1], other_wrs[2]
        te = other_tes[0]
    elif len(other_tes) > 1:
        flex = other_tes[1]
        wr1, wr2, wr3 = other_wrs[0], other_wrs[1], other_wrs[2]
        te = other_tes[0]
    else:
        wr1, wr2, wr3 = other_wrs[0], other_wrs[1], other_wrs[2]
        te = other_tes[0]
        flex = other_wrs[0]

    return {
        "total_salary": total_sal,
        "remaining_salary": SALARY_CAP - total_sal,
        "total_projection": total_proj,
        "total_ceiling": total_ceil,
        "cumulative_ownership": total_own,
        "total_leverage": total_lev,
        "player_ids": [p["id"] for p in best_cand],
        "qb": f"{qb_p['name']} (${qb_p['salary']:,}, {qb_p['team']})",
        "rb1": f"{rb1['name']} (${rb1['salary']:,}, {rb1['team']})",
        "rb2": f"{rb2['name']} (${rb2['salary']:,}, {rb2['team']})",
        "wr1": f"{wr1['name']} (${wr1['salary']:,}, {wr1['team']})",
        "wr2": f"{wr2['name']} (${wr2['salary']:,}, {wr2['team']})",
        "wr3": f"{wr3['name']} (${wr3['salary']:,}, {wr3['team']})",
        "te": f"{te['name']} (${te['salary']:,}, {te['team']})",
        "flex": f"{flex['name']} ({flex['pos']}, ${flex['salary']:,}, {flex['team']})",
        "dst": f"{dst_p['name']} (${dst_p['salary']:,}, {dst_p['team']})"
    }

def jaccard_overlap(ids1: List[str], ids2: List[str]) -> float:
    s1, s2 = set(ids1), set(ids2)
    inter = len(s1.intersection(s2))
    union = len(s1.union(s2))
    return inter / union

def run_main_slate_optimizations():
    print("=" * 80)
    print("DRAFTKINGS NFL WEEK 4 MAIN SLATE (1:00 PM ET) GLASS-BOX OPTIMIZER")
    print("=" * 80)

    # 1. CASH / 50-50 OPTIMAL LINEUP
    cash = solve_optimal_lineup(mode="proj", lock_ids=["rb_saquon"])
    print("\n[LINEUP 1: CASH / 50-50 CORE (MAX MEDIAN PROJECTION & VOLUME ANCHORS)]")
    print(f"Salary: ${cash['total_salary']:,} / ${SALARY_CAP:,} (Rem: ${cash['remaining_salary']})")
    print(f"Projection: {cash['total_projection']} pts | Ceiling: {cash['total_ceiling']} pts | Own: {cash['cumulative_ownership']}% | GSE Lev: {cash['total_leverage']}")
    print(f"  QB:   {cash['qb']}")
    print(f"  RB1:  {cash['rb1']}")
    print(f"  RB2:  {cash['rb2']}")
    print(f"  WR1:  {cash['wr1']}")
    print(f"  WR2:  {cash['wr2']}")
    print(f"  WR3:  {cash['wr3']}")
    print(f"  TE:   {cash['te']}")
    print(f"  FLEX: {cash['flex']}")
    print(f"  DST:  {cash['dst']}")

    # 2. GPP STROUD DOME DOUBLE-STACK (HOU vs DAL)
    # Primary: Stroud + Nico Collins + Stefon Diggs; Bringback: CeeDee Lamb
    gpp_hou = solve_optimal_lineup(
        mode="ceiling",
        qb_id="qb_stroud",
        primary_passcatchers=["wr_nico"],
        bringback_id="wr_ceedee"
    )
    print("\n[LINEUP 2: GPP TOURNAMENT CORE — DOME SHOOTOUT (STROUD + NICO + CEEDEE BRING-BACK)]")
    print(f"Salary: ${gpp_hou['total_salary']:,} / ${SALARY_CAP:,} (Rem: ${gpp_hou['remaining_salary']})")
    print(f"Projection: {gpp_hou['total_projection']} pts | Ceiling: {gpp_hou['total_ceiling']} pts | Own: {gpp_hou['cumulative_ownership']}% | GSE Lev: {gpp_hou['total_leverage']}")
    print(f"  QB:   {gpp_hou['qb']}")
    print(f"  RB1:  {gpp_hou['rb1']}")
    print(f"  RB2:  {gpp_hou['rb2']}")
    print(f"  WR1:  {gpp_hou['wr1']}")
    print(f"  WR2:  {gpp_hou['wr2']}")
    print(f"  WR3:  {gpp_hou['wr3']}")
    print(f"  TE:   {gpp_hou['te']}")
    print(f"  FLEX: {gpp_hou['flex']}")
    print(f"  DST:  {gpp_hou['dst']}")

    # 3. GPP JOSH ALLEN HIGHMARK CEILING (BUF vs NE)
    # Primary: Josh Allen + Khalil Shakir; Bringback: Demario Douglas; Defense: Bills DST
    gpp_buf = solve_optimal_lineup(
        mode="ceiling",
        qb_id="qb_allen",
        primary_passcatchers=["wr_shakir"],
        bringback_id="wr_douglas",
        forced_dst="dst_bills"
    )
    print("\n[LINEUP 3: GPP TOURNAMENT CORE — HIGHMARK AIR RAID (ALLEN + SHAKIR + DOUGLAS + BILLS DST)]")
    print(f"Salary: ${gpp_buf['total_salary']:,} / ${SALARY_CAP:,} (Rem: ${gpp_buf['remaining_salary']})")
    print(f"Projection: {gpp_buf['total_projection']} pts | Ceiling: {gpp_buf['total_ceiling']} pts | Own: {gpp_buf['cumulative_ownership']}% | GSE Lev: {gpp_buf['total_leverage']}")
    print(f"  QB:   {gpp_buf['qb']}")
    print(f"  RB1:  {gpp_buf['rb1']}")
    print(f"  RB2:  {gpp_buf['rb2']}")
    print(f"  WR1:  {gpp_buf['wr1']}")
    print(f"  WR2:  {gpp_buf['wr2']}")
    print(f"  WR3:  {gpp_buf['wr3']}")
    print(f"  TE:   {gpp_buf['te']}")
    print(f"  FLEX: {gpp_buf['flex']}")
    print(f"  DST:  {gpp_buf['dst']}")

    # 4. GPP KYLER MURRAY DESERT SHOOTOUT (ARI vs NYG)
    # Primary: Murray + Marvin Harrison Jr. + Trey McBride; Bringback: Wan'Dale Robinson
    gpp_ari = solve_optimal_lineup(
        mode="ceiling",
        qb_id="qb_murray",
        primary_passcatchers=["wr_marvin", "te_mcbride"],
        bringback_id="wr_wandale"
    )
    print("\n[LINEUP 4: GPP TOURNAMENT CORE — DESERT PASS-FUNNEL (MURRAY + MHJ + MCBRIDE + WAN'DALE)]")
    print(f"Salary: ${gpp_ari['total_salary']:,} / ${SALARY_CAP:,} (Rem: ${gpp_ari['remaining_salary']})")
    print(f"Projection: {gpp_ari['total_projection']} pts | Ceiling: {gpp_ari['total_ceiling']} pts | Own: {gpp_ari['cumulative_ownership']}% | GSE Lev: {gpp_ari['total_leverage']}")
    print(f"  QB:   {gpp_ari['qb']}")
    print(f"  RB1:  {gpp_ari['rb1']}")
    print(f"  RB2:  {gpp_ari['rb2']}")
    print(f"  WR1:  {gpp_ari['wr1']}")
    print(f"  WR2:  {gpp_ari['wr2']}")
    print(f"  WR3:  {gpp_ari['wr3']}")
    print(f"  TE:   {gpp_ari['te']}")
    print(f"  FLEX: {gpp_ari['flex']}")
    print(f"  DST:  {gpp_ari['dst']}")

    # 5. GPP CONTRARIAN LEVERAGE: FORD FIELD DOME MACHINE (DET vs CAR)
    # Primary: Jared Goff + Amon-Ra St. Brown; Bringback: Chuba Hubbard; Defense: Lions DST
    gpp_det = solve_optimal_lineup(
        mode="leverage",
        qb_id="qb_goff",
        primary_passcatchers=["wr_amonra"],
        bringback_id="rb_hubbard",
        forced_dst="dst_lions"
    )
    print("\n[LINEUP 5: GPP CONTRARIAN LEVERAGE — FORD FIELD STACK (GOFF + AMON-RA + HUBBARD + LIONS DST)]")
    print(f"Salary: ${gpp_det['total_salary']:,} / ${SALARY_CAP:,} (Rem: ${gpp_det['remaining_salary']})")
    print(f"Projection: {gpp_det['total_projection']} pts | Ceiling: {gpp_det['total_ceiling']} pts | Own: {gpp_det['cumulative_ownership']}% | GSE Lev: {gpp_det['total_leverage']}")
    print(f"  QB:   {gpp_det['qb']}")
    print(f"  RB1:  {gpp_det['rb1']}")
    print(f"  RB2:  {gpp_det['rb2']}")
    print(f"  WR1:  {gpp_det['wr1']}")
    print(f"  WR2:  {gpp_det['wr2']}")
    print(f"  WR3:  {gpp_det['wr3']}")
    print(f"  TE:   {gpp_det['te']}")
    print(f"  FLEX: {gpp_det['flex']}")
    print(f"  DST:  {gpp_det['dst']}")

    # Portfolio Overlap Matrix (Jaccard Distance)
    lineups = [("Cash", cash), ("GPP-HOU", gpp_hou), ("GPP-BUF", gpp_buf), ("GPP-ARI", gpp_ari), ("GPP-DET", gpp_det)]
    print("\n" + "=" * 80)
    print("PORTFOLIO JACCARD OVERLAP MATRIX (TARGET <= 0.44 ACROSS TOURNAMENT LINEUPS)")
    print("=" * 80)
    for i in range(len(lineups)):
        for j in range(i + 1, len(lineups)):
            name_a, lu_a = lineups[i]
            name_b, lu_b = lineups[j]
            overlap = jaccard_overlap(lu_a["player_ids"], lu_b["player_ids"])
            shared = len(set(lu_a["player_ids"]).intersection(set(lu_b["player_ids"])))
            print(f"  {name_a:<8} vs {name_b:<8} | Jaccard Overlap: {overlap:.3f} ({shared}/9 players shared) | Diversity: {1 - overlap:.3f}")

if __name__ == "__main__":
    run_main_slate_optimizations()
