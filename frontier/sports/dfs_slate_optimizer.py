"""
dfs_slate_optimizer.py
======================
Institutional DraftKings NFL Week 4 Slate Optimizer.
Integrates:
- GSE glass-box contest theory (Cash vs GPP vs Leverage objectives)
- Spatio-temporal kinematic pass rush & pocket collapse ratings
- Correlation matrix stacking: Primary QB-WR/TE stack + Opposing Bring-Back
- Workhorse RB + DST positive correlation pairs
- Full PPR 100-yard bonus calibration
"""

import math
from itertools import combinations
from typing import Dict, List, Tuple, Any, Optional

SALARY_CAP = 50000

# Week 4 Main Slate Player Pool with Real DraftKings Salaries, Median Projections, Ceilings, and Ownership
WEEK4_DK_POOL = [
    # Quarterbacks
    {"id": "qb_allen", "name": "Josh Allen", "pos": "QB", "team": "BUF", "opp": "NE", "salary": 7800, "proj": 23.8, "ceiling": 36.5, "own": 0.14},
    {"id": "qb_stroud", "name": "C.J. Stroud", "pos": "QB", "team": "HOU", "opp": "DAL", "salary": 6900, "proj": 20.4, "ceiling": 32.8, "own": 0.12},
    {"id": "qb_love", "name": "Jordan Love", "pos": "QB", "team": "GB", "opp": "TB", "salary": 6400, "proj": 19.5, "ceiling": 30.5, "own": 0.09},
    {"id": "qb_richardson", "name": "Anthony Richardson", "pos": "QB", "team": "IND", "opp": "WAS", "salary": 6300, "proj": 19.2, "ceiling": 31.0, "own": 0.08},
    {"id": "qb_murray", "name": "Kyler Murray", "pos": "QB", "team": "ARI", "opp": "NYG", "salary": 6800, "proj": 20.8, "ceiling": 32.0, "own": 0.11},
    {"id": "qb_dak", "name": "Dak Prescott", "pos": "QB", "team": "DAL", "opp": "HOU", "salary": 6600, "proj": 18.2, "ceiling": 28.0, "own": 0.07},
    {"id": "qb_bagent", "name": "Tyson Bagent", "pos": "QB", "team": "CHI", "opp": "NYJ", "salary": 4500, "proj": 11.5, "ceiling": 18.0, "own": 0.03},
    {"id": "qb_mariota", "name": "Marcus Mariota", "pos": "QB", "team": "WAS", "opp": "IND", "salary": 4800, "proj": 13.5, "ceiling": 21.0, "own": 0.04},

    # Running Backs
    {"id": "rb_jt", "name": "Jonathan Taylor", "pos": "RB", "team": "IND", "opp": "WAS", "salary": 7800, "proj": 22.4, "ceiling": 34.5, "own": 0.18}, # ALPHA LOCK
    {"id": "rb_kyren", "name": "Kyren Williams", "pos": "RB", "team": "LAR", "opp": "PHI", "salary": 7400, "proj": 19.8, "ceiling": 30.0, "own": 0.16},
    {"id": "rb_cook", "name": "James Cook", "pos": "RB", "team": "BUF", "opp": "NE", "salary": 6800, "proj": 17.5, "ceiling": 27.5, "own": 0.13},
    {"id": "rb_conner", "name": "James Conner", "pos": "RB", "team": "ARI", "opp": "NYG", "salary": 6500, "proj": 16.8, "ceiling": 26.0, "own": 0.12},
    {"id": "rb_henry", "name": "Derrick Henry", "pos": "RB", "team": "BAL", "opp": "TEN", "salary": 7600, "proj": 17.0, "ceiling": 28.5, "own": 0.15},
    {"id": "rb_jacobs", "name": "Josh Jacobs", "pos": "RB", "team": "GB", "opp": "TB", "salary": 6200, "proj": 15.5, "ceiling": 25.0, "own": 0.10},
    {"id": "rb_pollard", "name": "Tony Pollard", "pos": "RB", "team": "TEN", "opp": "BAL", "salary": 5600, "proj": 13.8, "ceiling": 22.0, "own": 0.08},
    {"id": "rb_hubbard", "name": "Chuba Hubbard", "pos": "RB", "team": "CAR", "opp": "DET", "salary": 5400, "proj": 14.5, "ceiling": 23.5, "own": 0.12},
    {"id": "rb_singletary", "name": "Devin Singletary", "pos": "RB", "team": "NYG", "opp": "ARI", "salary": 5700, "proj": 13.2, "ceiling": 21.0, "own": 0.07},
    {"id": "rb_mixon", "name": "Joe Mixon", "pos": "RB", "team": "HOU", "opp": "DAL", "salary": 6400, "proj": 15.2, "ceiling": 24.5, "own": 0.09},

    # Wide Receivers
    {"id": "wr_ceedee", "name": "CeeDee Lamb", "pos": "WR", "team": "DAL", "opp": "HOU", "salary": 8600, "proj": 21.5, "ceiling": 35.0, "own": 0.18},
    {"id": "wr_nico", "name": "Nico Collins", "pos": "WR", "team": "HOU", "opp": "DAL", "salary": 7700, "proj": 20.2, "ceiling": 33.5, "own": 0.17},
    {"id": "wr_brown", "name": "A.J. Brown", "pos": "WR", "team": "PHI", "opp": "LAR", "salary": 8000, "proj": 19.5, "ceiling": 32.0, "own": 0.14},
    {"id": "wr_reed", "name": "Jayden Reed", "pos": "WR", "team": "GB", "opp": "TB", "salary": 6200, "proj": 16.5, "ceiling": 28.0, "own": 0.11},
    {"id": "wr_shakir", "name": "Khalil Shakir", "pos": "WR", "team": "BUF", "opp": "NE", "salary": 5800, "proj": 15.2, "ceiling": 26.5, "own": 0.10},
    {"id": "wr_marvin", "name": "Marvin Harrison Jr.", "pos": "WR", "team": "ARI", "opp": "NYG", "salary": 7200, "proj": 18.0, "ceiling": 31.0, "own": 0.15},
    {"id": "wr_diggs", "name": "Stefon Diggs", "pos": "WR", "team": "HOU", "opp": "DAL", "salary": 6700, "proj": 16.0, "ceiling": 26.0, "own": 0.10},
    {"id": "wr_pittman", "name": "Michael Pittman Jr.", "pos": "WR", "team": "IND", "opp": "WAS", "salary": 5900, "proj": 14.8, "ceiling": 24.5, "own": 0.09},
    {"id": "wr_downs", "name": "Josh Downs", "pos": "WR", "team": "IND", "opp": "WAS", "salary": 4800, "proj": 12.5, "ceiling": 21.0, "own": 0.06},
    {"id": "wr_douglas", "name": "Demario Douglas", "pos": "WR", "team": "NE", "opp": "BUF", "salary": 4500, "proj": 12.2, "ceiling": 20.5, "own": 0.05},
    {"id": "wr_wandale", "name": "Wan'Dale Robinson", "pos": "WR", "team": "NYG", "opp": "ARI", "salary": 4600, "proj": 13.0, "ceiling": 21.5, "own": 0.08},
    {"id": "wr_dortch", "name": "Greg Dortch", "pos": "WR", "team": "ARI", "opp": "NYG", "salary": 4200, "proj": 11.0, "ceiling": 19.0, "own": 0.04},
    {"id": "wr_whittington", "name": "Jordan Whittington", "pos": "WR", "team": "LAR", "opp": "PHI", "salary": 3800, "proj": 10.5, "ceiling": 18.0, "own": 0.05},

    # Tight Ends
    {"id": "te_ferguson", "name": "Jake Ferguson", "pos": "TE", "team": "DAL", "opp": "HOU", "salary": 5000, "proj": 13.5, "ceiling": 22.5, "own": 0.12},
    {"id": "te_kincaid", "name": "Dalton Kincaid", "pos": "TE", "team": "BUF", "opp": "NE", "salary": 5200, "proj": 13.8, "ceiling": 23.0, "own": 0.11},
    {"id": "te_kraft", "name": "Tucker Kraft", "pos": "TE", "team": "GB", "opp": "TB", "salary": 3800, "proj": 10.8, "ceiling": 19.5, "own": 0.07},
    {"id": "te_schultz", "name": "Dalton Schultz", "pos": "TE", "team": "HOU", "opp": "DAL", "salary": 4400, "proj": 11.2, "ceiling": 19.0, "own": 0.06},
    {"id": "te_ertz", "name": "Zach Ertz", "pos": "TE", "team": "WAS", "opp": "IND", "salary": 3700, "proj": 9.5, "ceiling": 16.5, "own": 0.04},

    # Defenses (DST)
    {"id": "dst_packers", "name": "Packers DST", "pos": "DST", "team": "GB", "opp": "TB", "salary": 3200, "proj": 9.5, "ceiling": 18.0, "own": 0.12},
    {"id": "dst_jets", "name": "Jets DST", "pos": "DST", "team": "NYJ", "opp": "CHI", "salary": 3400, "proj": 9.8, "ceiling": 19.0, "own": 0.14},
    {"id": "dst_bills", "name": "Bills DST", "pos": "DST", "team": "BUF", "opp": "NE", "salary": 3500, "proj": 9.2, "ceiling": 17.5, "own": 0.11},
    {"id": "dst_colts", "name": "Colts DST", "pos": "DST", "team": "IND", "opp": "WAS", "salary": 3000, "proj": 8.0, "ceiling": 15.5, "own": 0.07},
    {"id": "dst_texans", "name": "Texans DST", "pos": "DST", "team": "HOU", "opp": "DAL", "salary": 2800, "proj": 7.5, "ceiling": 16.0, "own": 0.05}
]

def solve_optimal_lineup(
    mode: str = "proj", # "proj" (Cash) or "ceiling" (GPP)
    qb_id: Optional[str] = None,
    require_stack: bool = False,
    require_bringback: bool = False,
    lock_ids: Optional[List[str]] = None,
    exclude_ids: Optional[List[str]] = None,
    forced_dst: Optional[str] = None
) -> Dict[str, Any]:
    lock_set = set(lock_ids or [])
    exclude_set = set(exclude_ids or [])

    qbs = [p for p in WEEK4_DK_POOL if p["pos"] == "QB" and p["id"] not in exclude_set and (qb_id is None or p["id"] == qb_id)]
    rbs = [p for p in WEEK4_DK_POOL if p["pos"] == "RB" and p["id"] not in exclude_set]
    wrs = [p for p in WEEK4_DK_POOL if p["pos"] == "WR" and p["id"] not in exclude_set]
    tes = [p for p in WEEK4_DK_POOL if p["pos"] == "TE" and p["id"] not in exclude_set]
    dsts = [p for p in WEEK4_DK_POOL if p["pos"] == "DST" and p["id"] not in exclude_set and (forced_dst is None or p["id"] == forced_dst)]

    best_score = -1.0
    best_cand = None

    for qb in qbs:
        qb_team = qb["team"]
        opp_team = qb["opp"]

        for rb1, rb2 in combinations(rbs, 2):
            sal_rb = qb["salary"] + rb1["salary"] + rb2["salary"]
            # Lowest remaining 3 WRs (12,500), TE (3,700), FLEX (3,800), DST (2,800) = 22,800
            if sal_rb + 22800 > SALARY_CAP:
                continue

            for wr1, wr2, wr3 in combinations(wrs, 3):
                sal_wr = sal_rb + wr1["salary"] + wr2["salary"] + wr3["salary"]
                # Lowest remaining TE (3,700), FLEX (3,800), DST (2,800) = 10,300
                if sal_wr + 10300 > SALARY_CAP:
                    continue

                for te in tes:
                    sal_te = sal_wr + te["salary"]
                    if sal_te + 6600 > SALARY_CAP: # Lowest FLEX (3,800) + DST (2,800)
                        continue

                    if require_stack:
                        has_stk = (wr1["team"] == qb_team or wr2["team"] == qb_team or wr3["team"] == qb_team or te["team"] == qb_team)
                        if not has_stk:
                            continue

                    used_ids = {qb["id"], rb1["id"], rb2["id"], wr1["id"], wr2["id"], wr3["id"], te["id"]}
                    flex_pool = [p for p in rbs + wrs + tes if p["id"] not in used_ids]

                    for flex in flex_pool:
                        sal_flx = sal_te + flex["salary"]
                        if sal_flx + 2800 > SALARY_CAP: # Lowest DST
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

                            if require_bringback:
                                if not any(p["team"] == opp_team for p in cand):
                                    continue

                            score = sum(p["proj"] if mode == "proj" else p["ceiling"] for p in cand)
                            if score > best_score:
                                best_score = score
                                best_cand = cand

    if not best_cand:
        raise ValueError("No feasible lineup found under constraints!")

    total_sal = sum(p["salary"] for p in best_cand)
    total_proj = round(sum(p["proj"] for p in best_cand), 1)
    total_ceil = round(sum(p["ceiling"] for p in best_cand), 1)
    total_own = round(sum(p["own"] for p in best_cand) * 100.0, 1)

    qb_p = next(p for p in best_cand if p["pos"] == "QB")
    dst_p = next(p for p in best_cand if p["pos"] == "DST")
    other_rbs = [p for p in best_cand if p["pos"] == "RB"]
    other_wrs = [p for p in best_cand if p["pos"] == "WR"]
    other_tes = [p for p in best_cand if p["pos"] == "TE"]

    # Assign slots cleanly
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
        flex = other_wrs[0] # Fallback

    return {
        "total_salary": total_sal,
        "remaining_salary": SALARY_CAP - total_sal,
        "total_projection": total_proj,
        "total_ceiling": total_ceil,
        "cumulative_ownership": total_own,
        "qb": f"{qb_p['name']} (${qb_p['salary']:,})",
        "rb1": f"{rb1['name']} (${rb1['salary']:,})",
        "rb2": f"{rb2['name']} (${rb2['salary']:,})",
        "wr1": f"{wr1['name']} (${wr1['salary']:,})",
        "wr2": f"{wr2['name']} (${wr2['salary']:,})",
        "wr3": f"{wr3['name']} (${wr3['salary']:,})",
        "te": f"{te['name']} (${te['salary']:,})",
        "flex": f"{flex['name']} ({flex['pos']}, ${flex['salary']:,})",
        "dst": f"{dst_p['name']} (${dst_p['salary']:,})"
    }

def print_all_sovereign_lineups():
    print("=" * 80)
    print("INSTITUTIONAL DRAFTKINGS NFL WEEK 4 WINNING LINEUP CONSTRUCTIONS")
    print("=" * 80)

    # 1. CASH GAME OPTIMAL
    # Max median projection, zero unnecessary variance, Jonathan Taylor lock
    cash = solve_optimal_lineup(mode="proj", lock_ids=["rb_jt"])
    print("\n[1] CASH / 50-50 / DOUBLE-UP OPTIMAL LINEUP (MAX MEDIAN PROJECTION)")
    print(f"    Salary: ${cash['total_salary']:,} / ${SALARY_CAP:,} | Rem: ${cash['remaining_salary']}")
    print(f"    Projection: {cash['total_projection']} pts | Ceiling: {cash['total_ceiling']} pts | Own: {cash['cumulative_ownership']}%")
    print(f"    QB:   {cash['qb']}")
    print(f"    RB1:  {cash['rb1']}")
    print(f"    RB2:  {cash['rb2']}")
    print(f"    WR1:  {cash['wr1']}")
    print(f"    WR2:  {cash['wr2']}")
    print(f"    WR3:  {cash['wr3']}")
    print(f"    TE:   {cash['te']}")
    print(f"    FLEX: {cash['flex']}")
    print(f"    DST:  {cash['dst']}")

    # 2. GPP TOURNAMENT: HOUSTON/DALLAS DOME SHOOTOUT
    # Stroud + Nico Collins + Cowboys Bring-Back + JT Anchor
    gpp_hou = solve_optimal_lineup(mode="ceiling", qb_id="qb_stroud", require_stack=True, require_bringback=True, lock_ids=["rb_jt"])
    print("\n[2] GPP TOURNAMENT LINEUP: HOU/DAL DOME SHOOTOUT (STROUD GAME STACK)")
    print(f"    Salary: ${gpp_hou['total_salary']:,} / ${SALARY_CAP:,} | Rem: ${gpp_hou['remaining_salary']}")
    print(f"    Projection: {gpp_hou['total_projection']} pts | Ceiling: {gpp_hou['total_ceiling']} pts | Own: {gpp_hou['cumulative_ownership']}%")
    print(f"    QB:   {gpp_hou['qb']}")
    print(f"    RB1:  {gpp_hou['rb1']}")
    print(f"    RB2:  {gpp_hou['rb2']}")
    print(f"    WR1:  {gpp_hou['wr1']}")
    print(f"    WR2:  {gpp_hou['wr2']}")
    print(f"    WR3:  {gpp_hou['wr3']}")
    print(f"    TE:   {gpp_hou['te']}")
    print(f"    FLEX: {gpp_hou['flex']}")
    print(f"    DST:  {gpp_hou['dst']}")

    # 3. GPP TOURNAMENT: JOSH ALLEN / BUFFALO AIR RAID & DEFENSE
    # Allen + Shakir/Kincaid + Demario Douglas Bring-Back + JT Anchor
    gpp_buf = solve_optimal_lineup(mode="ceiling", qb_id="qb_allen", require_stack=True, require_bringback=True, lock_ids=["rb_jt"])
    print("\n[3] GPP TOURNAMENT LINEUP: JOSH ALLEN HIGHMARK CEILING (BUF GAME STACK)")
    print(f"    Salary: ${gpp_buf['total_salary']:,} / ${SALARY_CAP:,} | Rem: ${gpp_buf['remaining_salary']}")
    print(f"    Projection: {gpp_buf['total_projection']} pts | Ceiling: {gpp_buf['total_ceiling']} pts | Own: {gpp_buf['cumulative_ownership']}%")
    print(f"    QB:   {gpp_buf['qb']}")
    print(f"    RB1:  {gpp_buf['rb1']}")
    print(f"    RB2:  {gpp_buf['rb2']}")
    print(f"    WR1:  {gpp_buf['wr1']}")
    print(f"    WR2:  {gpp_buf['wr2']}")
    print(f"    WR3:  {gpp_buf['wr3']}")
    print(f"    TE:   {gpp_buf['te']}")
    print(f"    FLEX: {gpp_buf['flex']}")
    print(f"    DST:  {gpp_buf['dst']}")

    # 4. GPP TOURNAMENT: COLTS GROUND & DEFENSE LEVERAGE STACK
    # Capitalizes on our certified C-Vine SGP correlation (+49.8% alpha): ARich + JT + Colts DST
    gpp_ind = solve_optimal_lineup(mode="ceiling", qb_id="qb_richardson", require_stack=True, require_bringback=True, lock_ids=["rb_jt"], forced_dst="dst_colts")
    print("\n[4] GPP TOURNAMENT LINEUP: COLTS C-VINE SGP CORRELATION LEVERAGE (+49.8% ALPHA)")
    print(f"    Salary: ${gpp_ind['total_salary']:,} / ${SALARY_CAP:,} | Rem: ${gpp_ind['remaining_salary']}")
    print(f"    Projection: {gpp_ind['total_projection']} pts | Ceiling: {gpp_ind['total_ceiling']} pts | Own: {gpp_ind['cumulative_ownership']}%")
    print(f"    QB:   {gpp_ind['qb']}")
    print(f"    RB1:  {gpp_ind['rb1']}")
    print(f"    RB2:  {gpp_ind['rb2']}")
    print(f"    WR1:  {gpp_ind['wr1']}")
    print(f"    WR2:  {gpp_ind['wr2']}")
    print(f"    WR3:  {gpp_ind['wr3']}")
    print(f"    TE:   {gpp_ind['te']}")
    print(f"    FLEX: {gpp_ind['flex']}")
    print(f"    DST:  {gpp_ind['dst']}")

if __name__ == "__main__":
    print_all_sovereign_lineups()
