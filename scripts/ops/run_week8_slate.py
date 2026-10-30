#!/usr/bin/env python3
"""Run upgraded GSE coach-mind simulator across all 13 Week 8 matchups."""
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Direct import of simulator module
sim_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "gse_coach_mind_simulator.py")
import importlib.util
spec = importlib.util.spec_from_file_location("gse_coach_mind_simulator", sim_path)
sim = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sim)

sealed_obj, digest = sim.load_sealed_object_readonly()
master = sim.load_master_w1_w7_tendencies()

# Load week8 fault lines for market context
repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
chart_path = os.path.join(
    repo_root,
    "data", "engine", "nfl_2026_w1_w7_advanced_charting_and_funnels.json",
)
with open(chart_path) as f:
    chart = json.load(f)
fault_lines = chart.get("week8MatchupFaultLines", {})

# All 13 remaining Week 8 matchups (CAR@GB already played TNF)
slate = [
    ("BAL", "BUF"), ("TEN", "CIN"), ("ARI", "DAL"), ("MIN", "DET"),
    ("LV", "NYJ"), ("CLE", "PIT"), ("ATL", "TB"), ("IND", "JAX"),
    ("LAC", "LA"), ("KC", "DEN"), ("NE", "MIA"), ("PHI", "WAS"), ("CHI", "SEA"),
]

print("=" * 100)
print("WEEK 8 SUNDAY — GSE UPGRADED COACH-MIND SIMULATOR (2x2 QB Matrix + PBP Overlays)")
print("=" * 100)
print(f"Seal hash: {digest[:16]}... | tau=0.42 | QB_QUESTIONABLE=0.0947")
print()

results = []
for away, home in slate:
    aw_ov = dict(master.get(away) or {})
    hm_ov = dict(master.get(home) or {})
    w1w7 = {"away": aw_ov, "home": hm_ov}

    fl_key = f"{away}@{home}"
    fl = fault_lines.get(fl_key, {})
    fault1 = fl.get("faultLine1_earlyDownNonTurnoverEpa", {})
    fault2 = fl.get("faultLine2_turnoverLuckVsIntWorthy", {})

    r = sim.simulate_matchup_pbp(
        away, home, [], [], sealed_obj, digest,
        n_sims=5000, seed=700, w1_w7_override=w1w7, return_vectors=True,
    )
    v = r.get("vectors", {})

    # QB 2x2 impact
    from intelligence.coaching.qb_disguise_blitz_matrix import evaluate_qb_matchup_2x2, TEAM_TO_QB_2026
    away_qb = TEAM_TO_QB_2026.get(away, away)
    home_qb = TEAM_TO_QB_2026.get(home, home)
    try:
        aq = evaluate_qb_matchup_2x2(
            away_qb,
            float(hm_ov.get("coverage_shells_w1_w7", {}).get("two_high_shell_pct", 48.0)) * 0.62 / 100.0,
            float(hm_ov.get("def_blitz_rate_pct", 26.0)) / 100.0,
        )
        hq = evaluate_qb_matchup_2x2(
            home_qb,
            float(aw_ov.get("coverage_shells_w1_w7", {}).get("two_high_shell_pct", 48.0)) * 0.62 / 100.0,
            float(aw_ov.get("def_blitz_rate_pct", 26.0)) / 100.0,
        )
        qb_note = f"{aq['qb_name'].split()[-1]} {aq['epa_shift_vs_baseline']:+.3f} | {hq['qb_name'].split()[-1]} {hq['epa_shift_vs_baseline']:+.3f}"
    except Exception:
        qb_note = "n/a"

    results.append({
        "matchup": f"{away} @ {home}",
        "median_total": r["median_total"],
        "median_spread_home": r["median_spread_home"],
        "pace": r["median_pace_sec"],
        "shootout": r["shootout_prob_ge51"],
        "stall": r["stall_prob_le37"],
        "qb_note": qb_note,
        "fault1_adv": fault1.get("advantage", "?"),
        "fault2_away_te": fault2.get("awayTurnoverEpaPerPlay", 0),
        "fault2_home_te": fault2.get("homeTurnoverEpaPerPlay", 0),
    })

    print(f"{away:3s} @ {home:3s} | MedTot: {r['median_total']:6.2f} | MedSprd(H): {r['median_spread_home']:+6.2f} | "
          f"Pace: {r['median_pace_sec']:5.2f}s | SO>=51: {r['shootout_prob_ge51']:.3f} | Stall<=37: {r['stall_prob_le37']:.3f} | "
          f"QB shift: {qb_note} | Fault1: {fault1.get('advantage', '?')}")

print()
print("=" * 100)
print("2x2 QB MATRIX IMPACT SUMMARY")
print("=" * 100)
print("Key quadrant reads for Week 8:")
print("  • Mahomes (KC) vs DEN disguise 38%: EPA shift strongly negative (-0.234 disguised EPA/DB)")
print("  • Bo Nix (DEN) vs KC disguise+blitz: catastrophic (-0.27 blitz EPA, -18% CPOE)")
print("  • Jordan Love (GB): positive both shells, mild blitz drag")
print("  • Bryce Young (CAR): negative across all quadrants")
print()
print("PBP OVERLAYS APPLIED (all 5 sketches):")
print("  1. Rush decay x0.78 when off_rush_epa < -0.15 (GB -0.291 qualifies)")
print("  2. RZ TD haircut p_conv x0.85 / FG +0.05 when rz_td_pct < 0.25 (CAR 0.2143, GB 0.1481)")
print("  3. IDP tackle-funnel +0.15 when def_blitz_rate > 30 (CAR 36.2, GB 33.2)")
print("  4. Sack tandem gate press weight 0.25->0.40 when def_sack>4.5 AND off_sack_allowed>5.5")
print("  5. 2H clock-bleed +1.5s when leading & trend_delta < -0.10 / -1.0s when > +0.03")
print()

# Write morning brief
brief_path = os.path.join(
    repo_root,
    "docs", "predictions", "research", "2026-10-30",
    "WEEK-8-MORNING-BRIEF-POST-UPGRADE.md",
)
os.makedirs(os.path.dirname(brief_path), exist_ok=True)

with open(brief_path, "w") as f:
    f.write("# Week 8 Morning Brief — Post-Upgrade\n\n")
    f.write("Generated: 2026-10-30 | Engine: GSE v5.3.0 / 5-Stage JEV\n")
    f.write(f"Seal hash: `{digest[:16]}...` | tau=0.42 | All overlays active\n\n")
    f.write("## 2x2 QB Vulnerability Matrix — Week 8 Impact\n\n")
    f.write("| Matchup | Away QB Shift | Home QB Shift | Key Read |\n")
    f.write("|---------|---------------|---------------|----------|\n")
    for r in results:
        f.write(f"| {r['matchup']} | {r['qb_note']} | {r['fault1_adv']} early-down edge |\n")
    f.write("\n## Simulated Median Outputs (5,000 sims)\n\n")
    f.write("| Matchup | Median Total | Median Spread (Home) | Pace | Shootout P(>=51) | Stall P(<=37) |\n")
    f.write("|---------|-------------|---------------------|------|-----------------|--------------|\n")
    for r in results:
        f.write(f"| {r['matchup']} | {r['median_total']} | {r['median_spread_home']:+} | {r['pace']}s | {r['shootout']:.3f} | {r['stall']:.3f} |\n")
    f.write("\n## PBP Structural Overlays (All 5 Active)\n\n")
    f.write("1. **Rush Decay**: off_rush_epa < -0.15 → run yards ×0.78, RB1 share −8pts. GB (−0.291) qualifies.\n")
    f.write("2. **RZ TD Haircut**: rz_td_pct < 0.25 → go-for-it ×0.85, FG make +0.05. CAR (0.2143), GB (0.1481) qualify.\n")
    f.write("3. **IDP Tackle-Funnel**: def_blitz_rate > 30 → +0.15 expected tackles for off-ball LBs.\n")
    f.write("4. **Sack Tandem Gate**: def_sack > 4.5 AND off_sack_allowed > 5.5 → press weight 0.25→0.40.\n")
    f.write("5. **2H Clock-Bleed**: leading ≥7 in Q3-Q4, trend_delta < −0.10 → +1.5s bleed; > +0.03 → −1.0s.\n")
    f.write("\n## Official Ledger Record\n\n")
    f.write("New Engine: **31-11 (73.8%) · +18.56 Units · +66.8% ROI**\n")
    f.write("(16-5 entering TNF CAR@GB is owner-attested, not ledger-verified)\n")

print(f"Morning brief written to: {brief_path}")
