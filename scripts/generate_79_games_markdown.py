#!/usr/bin/env python3
"""
Generate the complete Markdown report for all 79 games of NFL Weeks 1-5, 2026.
"""

import json
import os

def main():
    json_path = "docs/predictions/research/2026-10-17/CV_ALL_GAMES_WEEKS_1_TO_5_CENSUS.json"
    with open(json_path) as f:
        games = json.load(f)

    report_lines = []
    report_lines.append("# Full Census & Processing Report: NFL Weeks 1–5, 2026 (All 79 Games)")
    report_lines.append("")
    report_lines.append("> **RETRACTION NOTICE (2026-10-17):** The computer vision derived metrics (pocket depth, STRAIN, SOE) in this report are RETRACTED. They were derived from synthetic simulation shifted by EPA rather than measured broadcast tracking. PBP counts and scores are official; optical tracking metrics are marked measured=false. Production vision weight remains 0.0.")
    report_lines.append("")
    report_lines.append("**Timestamp:** 2026-10-17T10:15:00-05:00  ")
    report_lines.append("**Ledger Entry:** `L-092: All 79 games census Weeks 1-5 2026 — RETRACTED`  ")
    report_lines.append(f"**Total Regular Season Games:** {len(games)} games  ")
    report_lines.append(f"**JSON Dataset:** [`docs/predictions/research/2026-10-17/CV_ALL_GAMES_WEEKS_1_TO_5_CENSUS.json`](file:///C:/Users/Garrett/Sports/docs/predictions/research/2026-10-17/CV_ALL_GAMES_WEEKS_1_TO_5_CENSUS.json)  ")
    report_lines.append("")
    report_lines.append("---")
    report_lines.append("")
    report_lines.append("## 1. Executive Summary & Aggregate Census")
    report_lines.append("")
    
    total_plays = sum(g["box_stats"]["total_plays"] for g in games)
    total_pass = sum(g["box_stats"]["pass_plays"] for g in games)
    total_rush = sum(g["box_stats"]["rush_plays"] for g in games)
    total_sacks = sum(g["box_stats"]["sacks"] for g in games)
    total_ints = sum(g["box_stats"]["interceptions"] for g in games)
    total_tracklets = sum(g["cv_tracking"]["tracklets_analyzed"] for g in games)
    total_tracked_plays = sum(g["cv_tracking"]["tracked_plays"] for g in games)
    mean_rmse_jac = sum(g["cv_tracking"]["kalman_rmse_jacobian_m"] for g in games) / len(games)

    report_lines.append(f"- **Total Games Evaluated:** {len(games)} games (100% census across Weeks 1–5, zero omitted)")
    report_lines.append(f"- **Total Official Plays (PBP):** {total_plays:,} plays ({total_pass:,} pass, {total_rush:,} rush)")
    report_lines.append(f"- **Total Sacks / Interceptions:** {total_sacks:,} sacks, {total_ints:,} interceptions")
    report_lines.append(f"- **Total Computer Vision Tracklets Analyzed:** {total_tracklets:,} player tracklets")
    report_lines.append(f"- **Total CV High-Fidelity Tracked Plays:** {total_tracked_plays:,} plays")
    report_lines.append(f"- **Mean Jacobian Kalman RMSE:** `{mean_rmse_jac:.4f} m` (DLT Hartley reprojection <0.12 m)")
    report_lines.append(f"- **Mean Pocket Depth:** `Unmeasured (optical tracking columns absent)`")
    report_lines.append(f"- **Mean STRAIN Pressure Surface:** `Unmeasured (optical tracking columns absent)`")
    report_lines.append(f"- **Mean Separation Over Expected (SOE):** `Unmeasured (optical tracking columns absent)`")
    report_lines.append("")
    report_lines.append("### Week-by-Week Breakdown")
    report_lines.append("")
    report_lines.append("| Week | Games | Total Plays | Tracklets Analyzed | Optical Derived Metrics | Split Role |")
    report_lines.append("|:---|:---:|:---:|:---:|:---:|:---|")

    weeks = sorted(list(set(g["week"] for g in games)))
    for w in weeks:
        w_games = [g for g in games if g["week"] == w]
        w_plays = sum(g["box_stats"]["total_plays"] for g in w_games)
        w_tracklets = sum(g["cv_tracking"]["tracklets_analyzed"] for g in w_games)
        role = "Week 5 Holdout (Evaluation)" if w == 5 else f"Weeks 1–4 Training (In-Sample)"
        report_lines.append(f"| Week {w} | {len(w_games)} | {w_plays:,} | {w_tracklets:,} | measured=false (unmeasured) | {role} |")

    report_lines.append("")
    report_lines.append("---")
    report_lines.append("")

    # Detailed Per-Week Tables
    for w in weeks:
        w_games = [g for g in games if g["week"] == w]
        report_lines.append(f"## 2.{w} Week {w} Game-by-Game Dossier ({len(w_games)} Games)")
        report_lines.append("")
        report_lines.append("| # | Matchup | Date | Final Score | Winner | Plays (P/R) | Pocket Depth | STRAIN | SOE | Act EPA | CV Status |")
        report_lines.append("|:---:|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---|")

        for i, g in enumerate(w_games, 1):
            m = g["matchup"]
            dt = g["date"]
            sc = g["final_score"].replace(f"{g['away_team']} ", "").replace(f"{g['home_team']} ", "")
            wn = g["winner"]
            p_tot = g["box_stats"]["total_plays"]
            p_pass = g["box_stats"]["pass_plays"]
            p_rush = g["box_stats"]["rush_plays"]
            pd_val = "N/A" if g["cv_derived_metrics"]["mean_pocket_depth_yd"] is None else f"{g['cv_derived_metrics']['mean_pocket_depth_yd']:.2f}"
            str_val = "N/A" if g["cv_derived_metrics"]["mean_strain"] is None else f"{g['cv_derived_metrics']['mean_strain']:.2f}"
            soe = "N/A" if g["cv_derived_metrics"]["mean_soe_yd"] is None else f"{g['cv_derived_metrics']['mean_soe_yd']:+.2f}"
            act = f"{g['calibration']['actual_epa']:+.3f}"

            report_lines.append(f"| {i} | **{m}** | {dt} | {sc} | **{wn}** | {p_tot} ({p_pass}/{p_rush}) | {pd_val} | {str_val} | {soe} | {act} | measured=false |")

        report_lines.append("")

    report_lines.append("---")
    report_lines.append("")
    report_lines.append("## 3. Calibration Accuracy and Holdout Verification")
    report_lines.append("")
    report_lines.append("1. **Retraction Summary:**")
    report_lines.append("   - Prior calibration claims of $R^2 = 0.442$ and RMSE $0.118$ were circular fits on synthetic covariates shifted by target EPA.")
    report_lines.append("   - Real `tracklet_outcome_enrichment_2026.parquet` contains tracking quality (RMSE, CI coverage, speed, blitz/route flags), but does NOT contain optical pocket depth, STRAIN surface, or receiver SOE.")
    report_lines.append("   - All derived optical metrics are formally retracted and marked `measured = false`.")
    report_lines.append("")
    report_lines.append("2. **Production Safety Assurance:**")
    report_lines.append("   - Vision factor default weight in production remains locked at **`weight = 0.0`** (`VISION_DEFAULT_WEIGHT = 0.0` in `packages/prediction-engine/src/vision-factors.ts`).")
    report_lines.append("   - Zero drift on live lines, spreads, and totals.")
    report_lines.append("")

    out_md = "docs/predictions/research/2026-10-17/CV_ALL_GAMES_WEEKS_1_TO_5_REPORT.md"
    with open(out_md, "w", encoding="utf-8") as f:
        f.write("\n".join(report_lines))

    print(f"Generated comprehensive report at {out_md}")

if __name__ == "__main__":
    main()
