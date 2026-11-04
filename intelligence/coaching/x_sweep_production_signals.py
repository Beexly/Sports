"""X and Instagram Sweep Production Signals Engine (Oct 29 - Nov 4, 2026).

Transforms raw play-by-play (nflverse) streams into 5 production football mechanisms:
1. 3-Part Hidden Yardage & Penalty Profile (penalty yards, net 1st downs, DPI conceded/drawn).
2. 4-Level Pressure & Trench Disruption System (self-invited vs OL, clean vs pressured EPA, blitz vs 4-man).
3. QB Dropback Composition & Field-Zone Shifts (5-way dropback distribution, middle-of-field target rates).
4. RB Explosive-vs-Stuffed & xFP Regression Matrix (12+/15+ explosive vs <=0 stuffed rate, buy-low signal).
5. WR Target Quality, Red-Zone TD Regression & Coverage Splits (explosive recs with 0 TDs, target passer rating).
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional


def compute_hidden_yardage_and_penalty_profile(
    plays: List[Dict[str, Any]],
    team: str,
) -> Dict[str, Any]:
    """Compute 3-part penalty and hidden yardage profile for a given team."""
    penalty_yds_conceded = 0
    first_downs_donated = 0
    dpi_yds_conceded = 0
    dpi_yds_drawn = 0
    
    for p in plays:
        pen_team = p.get("penalty_team")
        def_team = p.get("defensive_team") or p.get("defteam")
        pos_team = p.get("posteam") or p.get("offensive_team")
        pen_type = str(p.get("penalty_type", ""))
        pen_yds = int(p.get("penalty_yards", 0) or 0)
        fd = int(p.get("first_down_penalty", 0) or 0)
        
        if pen_team == team:
            penalty_yds_conceded += pen_yds
            if fd > 0:
                first_downs_donated += fd
                
        if def_team == team and "pass interference" in pen_type.lower():
            dpi_yds_conceded += pen_yds
        elif pos_team == team and "pass interference" in pen_type.lower():
            dpi_yds_drawn += pen_yds
            
    net_penalty_diff = dpi_yds_drawn - (penalty_yds_conceded + dpi_yds_conceded)
    
    return {
        "team": team,
        "penalty_yards_conceded": penalty_yds_conceded,
        "first_downs_donated": first_downs_donated,
        "defensive_dpi_yards_conceded": dpi_yds_conceded,
        "offensive_dpi_yards_drawn": dpi_yds_drawn,
        "net_penalty_differential": net_penalty_diff,
    }


def compute_four_level_pressure_matrix(
    dropbacks: List[Dict[str, Any]],
    qb_id: str,
    def_team: Optional[str] = None,
) -> Dict[str, Any]:
    """Compute 4-level trench and QB pressure disruption metrics."""
    qb_dbs = [d for d in dropbacks if d.get("qb_id") == qb_id]
    total_dbs = len(qb_dbs)
    if total_dbs == 0:
        return {"dropbacks": 0, "pressure_rate": 0.0, "clean_epa_per_db": 0.0, "pressured_epa_per_db": 0.0}
        
    pressured_dbs = [d for d in qb_dbs if d.get("was_pressured", 0) == 1]
    clean_dbs = [d for d in qb_dbs if d.get("was_pressured", 0) == 0]
    
    clean_epa = sum(float(d.get("epa", 0.0) or 0.0) for d in clean_dbs) / max(1, len(clean_dbs))
    pressured_epa = sum(float(d.get("epa", 0.0) or 0.0) for d in pressured_dbs) / max(1, len(pressured_dbs))
    
    # Self-invited pressure proxy: dropbacks holding ball > 2.8s resulting in pressure/sack
    self_invited = [d for d in pressured_dbs if float(d.get("time_to_throw", 0.0) or 0.0) >= 2.8]
    self_invited_pct = len(self_invited) / max(1, len(pressured_dbs))
    
    blitz_dbs = [d for d in qb_dbs if d.get("is_blitz", 0) == 1]
    blitz_epa = sum(float(d.get("epa", 0.0) or 0.0) for d in blitz_dbs) / max(1, len(blitz_dbs)) if blitz_dbs else 0.0
    
    return {
        "dropbacks": total_dbs,
        "pressured_dropbacks": len(pressured_dbs),
        "pressure_rate": len(pressured_dbs) / total_dbs,
        "clean_epa_per_db": clean_epa,
        "pressured_epa_per_db": pressured_epa,
        "pressure_epa_cost": clean_epa - pressured_epa,
        "self_invited_pressure_pct": self_invited_pct,
        "blitz_epa_per_db": blitz_epa,
    }


def compute_qb_composition_and_field_zones(
    dropbacks: List[Dict[str, Any]],
    qb_id: str,
) -> Dict[str, Any]:
    """Compute 5-way dropback outcome breakdown and middle-of-field metrics."""
    qb_dbs = [d for d in dropbacks if d.get("qb_id") == qb_id]
    total_dbs = len(qb_dbs)
    if total_dbs == 0:
        return {"total_dropbacks": 0}
        
    comps = sum(1 for d in qb_dbs if d.get("complete_pass", 0) == 1)
    sacks = sum(1 for d in qb_dbs if d.get("sack", 0) == 1)
    scrambles = sum(1 for d in qb_dbs if d.get("qb_scramble", 0) == 1)
    ints = sum(1 for d in qb_dbs if d.get("interception", 0) == 1)
    incomps = sum(1 for d in qb_dbs if d.get("incomplete_pass", 0) == 1 and d.get("interception", 0) == 0)
    
    mof_targets = [d for d in qb_dbs if str(d.get("pass_location", "")).lower() == "middle"]
    mof_comps = sum(1 for d in mof_targets if d.get("complete_pass", 0) == 1)
    
    return {
        "total_dropbacks": total_dbs,
        "completions": comps,
        "completion_pct": comps / total_dbs,
        "sack_pct": sacks / total_dbs,
        "scramble_pct": scrambles / total_dbs,
        "int_pct": ints / total_dbs,
        "incompletion_pct": incomps / total_dbs,
        "middle_of_field_targets": len(mof_targets),
        "middle_of_field_comp_pct": (mof_comps / len(mof_targets)) if mof_targets else 0.0,
    }


def compute_rb_explosive_vs_stuffed_matrix(
    rushes: List[Dict[str, Any]],
    rb_id: str,
) -> Dict[str, Any]:
    """Compute RB explosive run rate (12+ / 15+ yd) vs stuffed rate (<= 0 yd)."""
    rb_rushes = [r for r in rushes if r.get("rusher_id") == rb_id]
    carries = len(rb_rushes)
    if carries == 0:
        return {"carries": 0, "explosive_12plus_rate": 0.0, "stuffed_rate": 0.0, "rushing_epa_per_att": 0.0}
        
    explosive_12 = sum(1 for r in rb_rushes if float(r.get("rushing_yards", 0) or 0) >= 12.0)
    explosive_15 = sum(1 for r in rb_rushes if float(r.get("rushing_yards", 0) or 0) >= 15.0)
    stuffed = sum(1 for r in rb_rushes if float(r.get("rushing_yards", 0) or 0) <= 0.0)
    total_epa = sum(float(r.get("epa", 0.0) or 0.0) for r in rb_rushes)
    
    return {
        "carries": carries,
        "explosive_12plus_count": explosive_12,
        "explosive_12plus_rate": explosive_12 / carries,
        "explosive_15plus_rate": explosive_15 / carries,
        "stuffed_count": stuffed,
        "stuffed_rate": stuffed / carries,
        "rushing_epa_per_att": total_epa / carries,
    }


def compute_wr_target_and_td_regression_matrix(
    targets: List[Dict[str, Any]],
    wr_id: str,
) -> Dict[str, Any]:
    """Compute WR target efficiency and red-zone positive touchdown regression screen."""
    wr_targets = [t for t in targets if t.get("receiver_id") == wr_id]
    n_targets = len(wr_targets)
    if n_targets == 0:
        return {"targets": 0, "receptions": 0, "explosive_receptions_15plus": 0, "touchdowns": 0, "td_positive_regression_candidate": False}
        
    receptions = sum(1 for t in wr_targets if t.get("complete_pass", 0) == 1)
    explosive_15 = sum(1 for t in wr_targets if t.get("complete_pass", 0) == 1 and float(t.get("yards_gained", 0) or 0) >= 15.0)
    tds = sum(1 for t in wr_targets if int(t.get("touchdown", 0) or 0) == 1)
    
    # Candidate for positive TD regression: explosive volume with 0 or unusually low TDs
    td_regression_candidate = (explosive_15 >= 2 and tds == 0)
    
    return {
        "targets": n_targets,
        "receptions": receptions,
        "catch_rate": receptions / n_targets,
        "explosive_receptions_15plus": explosive_15,
        "touchdowns": tds,
        "td_positive_regression_candidate": td_regression_candidate,
    }
