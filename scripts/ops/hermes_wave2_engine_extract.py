# Extract stage1a coaching tendencies + FTN box report from all 13 week10 dossiers.
# Output: scratch/wave2_engine_side.json (input to hermes_wave2_charting_matrix_builder.py).
import json, glob, os
WT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.chdir(WT)
SCRATCH = r"C:\Users\Garrett\AppData\Local\hermes\cache\scratch"
games = []
for fp in sorted(glob.glob("data/engine/connected_workflow_dossier_*_week10.json")):
    d = json.load(open(fp, encoding="utf-8"))
    s1 = d.get("stage1a_coaching_mind_and_schemes", {})
    ct = s1.get("coaching_tendencies_resolved", {})
    ftn = (s1.get("python_31_intelligence_subpackages_and_31_datasets", {})
             .get("datasets_report", {}).get("ftn_charting_2026", {}).get("teams", {}))
    games.append({
        "file": os.path.basename(fp), "matchup": d.get("matchup"), "week": d.get("week"),
        "generated": d.get("generated_at_utc"),
        "away": d.get("stage0_roster_and_board_allowlist", {}).get("away"),
        "home": d.get("stage0_roster_and_board_allowlist", {}).get("home"),
        "tendencies": ct,
        "box": {t: v.get("def_mean_box_defenders") for t, v in ftn.items()},
    })
json.dump(games, open(os.path.join(SCRATCH, "wave2_engine_side.json"), "w"), indent=1)
print("extracted", len(games), "dossiers; generations:", sorted({g["generated"][:10] for g in games}))