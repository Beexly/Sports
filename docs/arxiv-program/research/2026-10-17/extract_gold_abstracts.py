import json

with open('docs/arxiv-program/research/2026-10-17/ARXIV_NFL_CORPUS_EXTRACTION_2026-10-17.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

# Curate the absolute top football analytics papers
gold_ids = [
    '2609.33664', # Who Blocks Whom?
    '2604.01491', # Opponent-Adjusted Pass Protection
    '2603.25901', # Decoding Defensive Coverage Responsibilities
    '2603.17866', # NFL Step-and-Turn
    '2601.18774', # The Blown Lead Paradox
    '2507.06122', # Bayesian circular directional movement
    '2506.03057', # Partially Regularized Ordinal Regression (Strength of Schedule & Unit Complementarity)
    '2504.08747', # GridMind: Multi-Agent NLP Framework
    '2406.17220', # NFL Ghosts: Evaluating defender positioning with conditional density estimation
    '2309.00756', # Learning Risk Preferences in MDPs: Fourth Down Decision
    '2305.10262', # Here Comes the STRAIN: Defensive Pass Rush
    '2303.10895', # Leapfrog Diffusion Model for Trajectory Prediction
    '2102.01846', # NFLSimulatoR: Simulation-Based Decision Making
    '1908.02423', # Route Identification in the NFL
    '1906.11373'  # Unsupervised Methods for Pass Coverage Identification
]

curated = []
all_sources = d['search_results'] + [
    {'id': p['arxiv_id'], 'title': p['title'], 'link': p['url'], 'authors': p['authors'], 'abstract': p['abstract']}
    for p in d['verified_papers']
]

for gid in gold_ids:
    for item in all_sources:
        if item.get('id') == gid:
            curated.append(item)
            break

print(f"Total Top-Tier Gold Papers Extracted: {len(curated)}")
for c in curated:
    print(f"\n========================================================")
    print(f"[{c['id']}] {c['title']}")
    print(f"Authors: {', '.join(c['authors'][:3])}")
    print(f"Abstract: {c['abstract']}")
