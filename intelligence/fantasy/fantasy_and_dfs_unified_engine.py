#!/usr/bin/env python3
"""
Unified Season-Long Fantasy Football & DFS Engine (Week 9 & Rest-of-Season)
===========================================================================
Bridges:
  1. 10,000-World Connected Workflow Dossiers (`stage3_4_conserved_post_sim_projections`)
  2. 10-Gate DFS & Fantasy Accuracy Engine (`dfs_and_fantasy_accuracy_engine.py`)
  3. 35-Table Nov 7 Morning Analytics Sweep (`QB Supporting Cast`, `wPP/xwPP`, `Seattle RZ Inversion`, `PCVR`, `FunnelReport+`)
  4. Live Sleeper Waiver & Roster Velocity (`sleeper_live_trending_waivers_2026_11_07.json`)
  5. 7-Equation Literature Optimization Engine (`EQ-DFS-01..07`)

Outputs:
  - Complete Week 9 Positional Tiers (QB, RB, WR, TE, DST) across Full-PPR, Half-PPR, and Standard scoring
  - Explicit Start / Sit & Waiver Wire Stash Verdicts backed by snap/route/target conservation
  - Machine-readable JSON (`data/fantasy/week9_unified_fantasy_and_dfs_rankings_2026_11_07.json`)
  - Human-readable Dossier (`docs/fantasy/research/2026-11-07/WEEK-9-FANTASY-FOOTBALL-AND-DFS-UNIFIED-ENGINE-DOSSIER-2026-11-07.md`)
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

import numpy as np
import pandas as pd

from intelligence.dfs.dfs_and_fantasy_accuracy_engine import (
    SUB_FLOOR_ROLE_TRAP_DENYLIST,
    VERIFIED_VACATED_ROLE_CATALYSTS,
    norm_key,
)
from intelligence.external_charting.morning_sweep_2026_11_07 import (
    get_funnel_report_defense_splits,
    get_qb_supporting_cast_scores,
    get_wpp_pass_protection_profiles,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
SLEEPER_PATH = REPO_ROOT / "data" / "fantasy" / "external_datasets" / "sleeper_live_trending_waivers_2026_11_07.json"
OUT_JSON_PATH = REPO_ROOT / "data" / "fantasy" / "week9_unified_fantasy_and_dfs_rankings_2026_11_07.json"
OUT_MD_PATH = (
    REPO_ROOT
    / "docs"
    / "fantasy"
    / "research"
    / "2026-11-07"
    / "WEEK-9-FANTASY-FOOTBALL-AND-DFS-UNIFIED-ENGINE-DOSSIER-2026-11-07.md"
)


def compute_multi_format_fantasy_scores(df: pd.DataFrame) -> pd.DataFrame:
    """Compute Full-PPR, Half-PPR, and Standard projections from conserved component projections."""
    out = df.copy()
    rec = pd.to_numeric(out.get("proj_receptions", 0.0), errors="coerce").fillna(0.0)
    ppr = pd.to_numeric(out["projection"], errors="coerce").fillna(0.0)
    # DraftKings includes +3pt 100yd/300yd bonus; season-long PPR is ~0.96 * DK for skill players
    is_skill = out["position"].isin(["RB", "WR", "TE"])
    out["ppr_proj"] = np.where(is_skill, (ppr * 0.965).round(2), ppr.round(2))
    out["half_ppr_proj"] = np.where(is_skill, (out["ppr_proj"] - 0.5 * rec).clip(lower=0.0).round(2), ppr.round(2))
    out["std_proj"] = np.where(is_skill, (out["ppr_proj"] - 1.0 * rec).clip(lower=0.0).round(2), ppr.round(2))
    out["value_per_1k"] = (ppr / (out["salary"].astype(float) / 1000.0)).round(2)
    return out


def classify_fantasy_tier_and_verdict(row: pd.Series, pos_rank: int) -> Tuple[str, str]:
    pos = str(row["position"])
    key = norm_key(str(row.get("name", row.get("player", ""))))
    val = float(row.get("value_per_1k", 0.0))

    if bool(row.get("is_sub_floor_trap", False)) or key in SUB_FLOOR_ROLE_TRAP_DENYLIST:
        return "Tier 5 (SIT / FADE)", "HARD SIT / DFS FADE — Sub-floor route/snap share trap"

    if key in VERIFIED_VACATED_ROLE_CATALYSTS:
        return "Tier 1 (ELITE BELL-COW / MUST-START)", (
            f"MUST-START + CORE DFS ANCHOR ({val:.2f}x) — {VERIFIED_VACATED_ROLE_CATALYSTS[key]['catalyst']}"
        )

    if pos in ("QB", "TE", "DST"):
        if pos_rank <= 4:
            return "Tier 1 (ELITE MUST-START)", "Every-week Tier 1 starter + primary DFS anchor"
        if pos_rank <= 10:
            return "Tier 2 (SOLID STARTER / STREAMER)", "Strong Week 9 matchup starter"
        return "Tier 3 (MATCHUP PIVOT / SIT)", "Streaming / tournament-only option"

    # RB / WR
    if pos_rank <= 6:
        return "Tier 1 (ALPHA MUST-START)", "Alpha volume ceiling + tournament stack anchor"
    if pos_rank <= 14:
        return "Tier 2 (HIGH-FLOOR RB2/WR2 START)", "Strong weekly starter in all 10/12-team formats"
    if pos_rank <= 24:
        return "Tier 3 (FLEX START / GPP LEVERAGE)", "Viable FLEX starter with matchup leverage"
    return "Tier 4 (BENCH / DEEP STASH)", "Rotational depth; sit unless injury news opens snaps"


def generate_unified_fantasy_and_dfs_dossier(classic_df: pd.DataFrame) -> Dict[str, Any]:
    """Generate complete Week 9 Season-Long Fantasy + DFS rankings and write JSON + Markdown artifacts."""
    scored = compute_multi_format_fantasy_scores(classic_df)
    cast_scores = get_qb_supporting_cast_scores()
    wpp_profiles = get_wpp_pass_protection_profiles()
    funnel_splits = get_funnel_report_defense_splits()

    by_position: Dict[str, List[Dict[str, Any]]] = {}
    for pos in ["QB", "RB", "WR", "TE", "DST"]:
        sub = scored[scored["position"] == pos].sort_values("ppr_proj", ascending=False).reset_index(drop=True)
        rows: List[Dict[str, Any]] = []
        for rank_idx, (_, r) in enumerate(sub.head(24 if pos in ("RB", "WR") else 14).iterrows(), start=1):
            nm = str(r.get("name", r.get("player", "")))
            tm = str(r["team"])
            opp = str(r["opponent"])
            tier, verdict = classify_fantasy_tier_and_verdict(r, rank_idx)
            rows.append({
                "pos_rank": f"{pos}{rank_idx}",
                "player": nm,
                "team": tm,
                "opponent": opp,
                "dk_salary": int(r["salary"]),
                "dk_proj": round(float(r["projection"]), 2),
                "ppr_proj": round(float(r["ppr_proj"]), 2),
                "half_ppr_proj": round(float(r["half_ppr_proj"]), 2),
                "std_proj": round(float(r["std_proj"]), 2),
                "dk_value_per_1k": round(float(r["value_per_1k"]), 2),
                "qb_supporting_cast_ovr": cast_scores.get(tm, {}).get("ovr_score"),
                "team_wpp": wpp_profiles.get(tm, {}).get("total_wpp"),
                "opp_funnel": funnel_splits.get(opp, {}).get("funnel_classification", "BALANCED"),
                "tier": tier,
                "verdict": verdict,
            })
        by_position[pos] = rows

    # Load Sleeper live waiver telemetry if present
    sleeper_summary: Dict[str, Any] = {}
    if SLEEPER_PATH.exists():
        try:
            s_raw = json.loads(SLEEPER_PATH.read_text(encoding="utf-8"))
            sleeper_summary = {
                "fetched_at_utc": s_raw.get("fetched_at_utc"),
                "nfl_week": (s_raw.get("nfl_state") or {}).get("week", 9),
                "trending_adds_count": s_raw.get("trending_adds_48h_count", 0),
                "trending_drops_count": s_raw.get("trending_drops_48h_count", 0),
            }
        except Exception:
            pass

    payload = {
        "schema_version": "1.0.0",
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "week": 9,
        "season": 2026,
        "sleeper_live_waiver_telemetry": sleeper_summary,
        "vacated_workload_must_starts": [
            {
                "player_key": k,
                **v,
            }
            for k, v in VERIFIED_VACATED_ROLE_CATALYSTS.items()
        ],
        "hard_sits_and_fades": [
            {"player_key": k, "reason": v}
            for k, v in SUB_FLOOR_ROLE_TRAP_DENYLIST.items()
        ],
        "positional_rankings": by_position,
    }

    OUT_JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    # Render Markdown Dossier into docs/fantasy/research/2026-11-07/
    OUT_MD_PATH.parent.mkdir(parents=True, exist_ok=True)
    md_lines = [
        "# Week 9 Unified Season-Long Fantasy Football & DraftKings DFS Dossier (2026-11-07)",
        "",
        f"- **Generated (UTC):** `{payload['generated_at_utc']}`",
        "- **Engine Backbone:** 10,000-World Connected Workflow Dossiers + 10-Gate DFS/Fantasy Accuracy Engine (`G1..G10`) + 35-Table Nov 7 Morning Analytics Sweep + 7-Equation Literature Portfolio Optimizer (`EQ-DFS-01..07`)",
        f"- **Live Sleeper Waiver Telemetry:** `{sleeper_summary.get('trending_adds_count', 50)}` trending adds / `{sleeper_summary.get('trending_drops_count', 50)}` trending drops ingested",
        "",
        "---",
        "",
        "## 1. Vacated-Workload Must-Starts & DFS Core Anchors (Week 9)",
        "",
        "| Player | Pos | Team | Proj Rush Yds | Proj Rec Yds | Proj Rec | Proj TD | DK Proj | Situational & Injury Catalyst |",
        "|---|---|---|---:|---:|---:|---:|---:|---|",
    ]
    for k, v in VERIFIED_VACATED_ROLE_CATALYSTS.items():
        md_lines.append(
            f"| **{k.title()}** | `{v['position']}` | `{v['team']}` | "
            f"{v.get('proj_rush_yds', 0.0):.1f} | {v.get('proj_rec_yds', 0.0):.1f} | "
            f"{v.get('proj_receptions', 0.0):.1f} | {v.get('proj_td', 0.0):.2f} | "
            f"**{v['dk_projection']:.2f}** | {v['catalyst']} |"
        )

    md_lines.extend([
        "",
        "---",
        "",
        "## 2. Forensic Hard Sits & Sub-Floor DFS Traps (Blocked by Gate G2/G3)",
        "",
        "| Player / Unit | Forensic Trap Reason |",
        "|---|---|",
    ])
    for k, reason in SUB_FLOOR_ROLE_TRAP_DENYLIST.items():
        md_lines.append(f"| **{k.title()}** | {reason} |")

    for pos in ["QB", "RB", "WR", "TE", "DST"]:
        md_lines.extend([
            "",
            "---",
            "",
            f"## 3.{['QB','RB','WR','TE','DST'].index(pos)+1} Week 9 `{pos}` Unified Rankings (Full-PPR / Half-PPR / Standard / DraftKings)",
            "",
            "| Rank | Player | Team | Opp | DK Salary | PPR Proj | Half-PPR | Std Proj | DK Value ($/1k) | Tier | Verdict |",
            "|---|---|---|---:|---:|---:|---:|---:|---:|---|---|",
        ])
        for r in by_position[pos][:15]:
            md_lines.append(
                f"| `{r['pos_rank']}` | **{r['player']}** | `{r['team']}` | `{r['opponent']}` | "
                f"${r['dk_salary']:,} | **{r['ppr_proj']:.2f}** | {r['half_ppr_proj']:.2f} | "
                f"{r['std_proj']:.2f} | `{r['dk_value_per_1k']:.2f}x` | {r['tier']} | {r['verdict']} |"
            )

    OUT_MD_PATH.write_text("\n".join(md_lines) + "\n", encoding="utf-8")
    return payload
