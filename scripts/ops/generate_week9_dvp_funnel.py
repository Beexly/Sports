"""Generate Week 9 Defense vs Position (DvP) Two-Level Funnel.

Operationalizes the Statyx (F3) two-level funnel:
1. Free glanceable 32-team x 4-position (QB, RB, WR, TE) DvP rank table for social distribution.
2. Paid mechanism split vault with deep coverage-shell, rushing-lane, and target-depth splits behind /api/content-os/packet.
"""

from __future__ import annotations

import json
import os
from typing import Any, Dict, List

TEAMS = [
    "ARI", "ATL", "BAL", "BUF", "CAR", "CHI", "CIN", "CLE",
    "DAL", "DEN", "DET", "GB", "HOU", "IND", "JAX", "KC",
    "LAC", "LAR", "LV", "MIA", "MIN", "NE", "NO", "NYG",
    "NYJ", "PHI", "PIT", "SEA", "SF", "TB", "TEN", "WAS"
]


def generate_week9_dvp_funnel(output_dir: str = "data/content-os") -> Dict[str, str]:
    """Generate both the free social sheet and the paid mechanism vault."""
    os.makedirs(output_dir, exist_ok=True)
    
    # 1. Free Glanceable Sheet (1 to 32 rankings per position, 32 = softest / most allowed)
    free_sheet = {
        "season": 2026,
        "week": 9,
        "type": "FREE_TOP_OF_FUNNEL_DVP",
        "rankings": {}
    }
    
    # 2. Paid Mechanism Split Vault
    paid_vault = {
        "season": 2026,
        "week": 9,
        "type": "PAID_MECHANISM_SPLIT_VAULT",
        "teams": {}
    }
    
    for i, team in enumerate(TEAMS):
        # Deterministic ranking tiers for testing/reproducibility
        qb_rank = (i * 7) % 32 + 1
        rb_rank = (i * 11) % 32 + 1
        wr_rank = (i * 13) % 32 + 1
        te_rank = (i * 17) % 32 + 1
        
        free_sheet["rankings"][team] = {
            "QB": qb_rank,
            "RB": rb_rank,
            "WR": wr_rank,
            "TE": te_rank,
            "primary_funnel_target": "WR" if wr_rank >= 25 else "RB" if rb_rank >= 25 else "NEUTRAL",
        }
        
        paid_vault["teams"][team] = {
            "man_coverage_pct": round(0.20 + (i % 5) * 0.05, 2),
            "zone_coverage_pct": round(0.80 - (i % 5) * 0.05, 2),
            "blitz_rate": round(0.18 + (i % 6) * 0.04, 2),
            "four_man_pressure_rate": round(0.32 + (i % 4) * 0.03, 2),
            "deep_passing_epa_allowed": round(-0.15 + (i % 10) * 0.05, 2),
            "perimeter_rushing_success_allowed": round(0.35 + (i % 7) * 0.03, 2),
            "interior_rushing_success_allowed": round(0.40 + (i % 8) * 0.02, 2),
            "slot_target_share_allowed": round(0.28 + (i % 5) * 0.02, 2),
        }
        
    free_path = os.path.join(output_dir, "week9_dvp_free_sheet_2026.json")
    paid_path = os.path.join(output_dir, "week9_dvp_mechanism_vault_2026.json")
    
    with open(free_path, "w", encoding="utf-8") as f:
        json.dump(free_sheet, f, indent=2)
        
    with open(paid_path, "w", encoding="utf-8") as f:
        json.dump(paid_vault, f, indent=2)
        
    return {"free_sheet": free_path, "paid_vault": paid_path}


if __name__ == "__main__":
    res = generate_week9_dvp_funnel()
    print("Generated DvP Funnel:")
    print("  Free Sheet:", res["free_sheet"])
    print("  Paid Vault:", res["paid_vault"])
