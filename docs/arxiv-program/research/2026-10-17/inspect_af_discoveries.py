import json
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

with open('docs/arxiv-program/research/2026-10-17/NEW_AMERICAN_FOOTBALL_DISCOVERIES.json', 'r', encoding='utf-8') as f:
    papers = json.load(f)

# Priority discoveries
highlight_ids = [
    '2604.02447', # PlayGen-MoG: Mixture-of-Gaussians Trajectory Prediction (Kevin Song)
    '2602.10784', # Predicting Defensive Schemes in American football (Michels & Bajons)
    '2409.04889', # Moving from ML to Statistics: Expected Points in American football (Brill & Yee)
    '2407.08508', # PEP: Prevention of Expected Points for Tackles (Bajons & Koslik)
    '2403.14769', # Fractional Tackles: Tracking Data Tackling Evaluation (Nguyen & Jiang)
    '2210.12519', # Partially Constrained Group Selection: Complementary Unit Performance (Skripnikov)
    '2207.14124', # Graph Neural Networks to Predict Sports Outcomes (Xenopoulos & Silva)
    '2207.13747', # Bayesian In-Game Win Probability for College Football (Maddox & Sides)
    '2010.11187', # G-Elo: Generalization of Elo via Discretized Margin of Victory (Szczecinski)
    '1909.03343', # Sports Commentator Bias in American Football Broadcasts (Merullo & Yeh)
    '1906.01760', # Going Deep: Continuous-Time Within-Play Valuation with Tracking (Yurko & Matano)
    '1301.2954',  # Ranking Lasso for Sport Tournaments (Masarotto & Varin)
    '1111.0693',  # Scoring Strategies for the Underdog (Brian Skinner)
    '0706.0366',  # On the Flight of an American Football: Aerodynamics & Wobble (Horn & Fearn)
    'physics/0505169', # Network-based ranking system for American college football (Park & Newman)
    'physics/0403049'  # The Bowl Championship Series: Mathematical Review (Callaghan & Mucha)
]

print(f"Loaded {len(papers)} new papers.")
found = [p for p in papers if p['id'] in highlight_ids]

for p in found:
    print(f"\n=======================================================")
    print(f"ID: {p['id']} | Date: {p['date']}")
    print(f"TITLE: {p['title']}")
    print(f"AUTHORS: {', '.join(p['authors'])}")
    print(f"ABSTRACT:\n{p['abstract']}")
