import json
import os
import re

json_path = r"C:\Users\Garrett\Sports\docs\arxiv-program\research\2026-10-17\SPORTS_PREDICTION_ARXIV_596.json"
out_corpus_dir = r"C:\Users\Garrett\Sports\docs\arxiv-program\research\2026-10-17"
out_ts_dir = r"C:\Users\Garrett\Sports\packages\prediction-engine\src\reasoning"

with open(json_path, "r", encoding="utf-8") as f:
    papers = json.load(f)

print(f"Loaded {len(papers)} papers for comprehensive corpus synthesis.")

pillars = {
    "P1_MARKET_GRAVITY_AND_CALIBRATION": {
        "title": "Pillar 1: Market Gravity, Bookmaker Calibration & Behavioral Biases",
        "keywords": ["market", "betting", "odds", "bookmaker", "calibration", "bias", "efficiency", "profit-bias", "brier", "polymarket", "longshot"],
        "papers": []
    },
    "P2_NETWORK_MATCHUP_AND_STYLES": {
        "title": "Pillar 2: Higher-Order Network Matching, Non-Transitivity & Stylistic Geometry",
        "keywords": ["network", "graph", "eigenvector", "ranking", "rating", "bradley-terry", "elo", "pairwise", "decomposition", "style", "head-to-head"],
        "papers": []
    },
    "P3_FATIGUE_INJURY_AND_WORKLOAD": {
        "title": "Pillar 3: Biomechanical Workload, Fatigue Decay & Inactive Injury Disruption",
        "keywords": ["injury", "fatigue", "biomechanic", "workload", "strain", "physiological", "heart rate", "recovery", "load", "exertion"],
        "papers": []
    },
    "P4_VISION_SPATIAL_AND_TRACKING": {
        "title": "Pillar 4: Spatial Tracking, Broadcast Pose Extraction & Spatial Field Control",
        "keywords": ["tracking", "detection", "trajectory", "pose estimation", "broadcast", "video", "optical", "soccernet", "kinematic", "optical tracking"],
        "papers": []
    },
    "P5_TACTICS_GAME_THEORY_AND_LEVERAGE": {
        "title": "Pillar 5: Tactical Counter-Schemes, Play Calling & Game Theory Equilibrium",
        "keywords": ["tactic", "formation", "strategy", "game theory", "reinforcement learning", "play calling", "simulation", "decision", "counter"],
        "papers": []
    },
    "P6_DYNAMIC_IN_PLAY_AND_MOMENTUM": {
        "title": "Pillar 6: Sequential In-Play State, Live Momentum & State-Space Transitions",
        "keywords": ["time series", "lstm", "transformer", "temporal", "in-play", "live", "momentum", "in-game", "sequential", "flow", "volatility"],
        "papers": []
    },
    "P7_ENVIRONMENTAL_PSYCHOLOGICAL_CONTEXT": {
        "title": "Pillar 7: Environmental Shocks, Atmosphere, Refereeing & Situational Leverage",
        "keywords": ["home advantage", "referee", "crowd", "sentiment", "psychological", "pressure", "clutch", "travel", "altitude", "weather"],
        "papers": []
    }
}

for p in papers:
    txt = (p.get("title", "") + " " + p.get("abstract", "")).lower()
    matched = False
    for pkey, pval in pillars.items():
        if any(k in txt for k in pval["keywords"]):
            pval["papers"].append(p)
            matched = True
    if not matched:
        # Default into foundational general predictive modeling / network
        pillars["P2_NETWORK_MATCHUP_AND_STYLES"]["papers"].append(p)

md_out = "# ARXIV 596 SPORTS PREDICTION IN-DEPTH CORPUS SYNTHESIS & REASONING CATALOG\n\n"
md_out += "## Direct-to-Engine Corpus Ingestion (Doctrine Garrett, 2026-10-05 / 2026-10-17)\n\n"
md_out += "> **Doctrine**: The mission was never to beat the closing line with a static formula. The closing line is the sharpest number on earth. "
md_out += "The mission is an engine that UNDERSTANDS sports deeper than the market and reasons between the numbers and the grey areas. "
md_out += "Equations are school, not ammo. Edge lives in situational reasoning, physiological fatigue, non-transitive stylistic matchups, "
md_out += "and behavioral biases in the public line. Ingest everything; gate nothing from the reasoning layer.\n\n"

for pkey, pval in pillars.items():
    md_out += f"## {pval['title']} ({len(pval['papers'])} Papers)\n\n"
    md_out += "| arXiv ID | Title | Year/Date | Core Situational / Grey-Area Reasoning Signal |\n"
    md_out += "|---|---|---|---|\n"
    for p in pval["papers"][:50]:  # Highlight top 50 in table
        aid = p.get("arxiv_id", "N/A")
        title = p.get("title", "").replace("|", "-")
        date = p.get("date", "2026")
        abs_summary = p.get("abstract", "").replace("\n", " ").replace("|", "-")[:160] + "..."
        md_out += f"| [{aid}](https://arxiv.org/abs/{aid}) | **{title}** | {date} | {abs_summary} |\n"
    if len(pval["papers"]) > 50:
        md_out += f"\n*... and {len(pval['papers']) - 50} additional papers in this pillar indexed in the master JSON dataset.*\n\n"
    md_out += "\n---\n\n"

corpus_md_path = os.path.join(out_corpus_dir, "ARXIV_596_DEEP_REASONING_SYNTHESIS.md")
with open(corpus_md_path, "w", encoding="utf-8") as f:
    f.write(md_out)
print(f"Generated deep reasoning markdown synthesis at {corpus_md_path}")
