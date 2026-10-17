import json
import re

with open('docs/arxiv-program/research/2026-10-17/ARXIV_NFL_CORPUS_EXTRACTION_2026-10-17.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

# True sports analytics papers only (filter out Non-Fermi-Liquid physics homonyms)
sports_papers = []
exclude_terms = ['fermi', 'quantum', 'superconduct', 'quasicrystal', 'circuit simulator', 'magnetic', 'graphene', 'spin-orbit']

for p in d['search_results']:
    title_lower = p['title'].lower()
    abs_lower = p.get('abstract', '').lower()
    full_text = title_lower + ' ' + abs_lower
    
    if any(ex in full_text for ex in exclude_terms):
        continue
        
    # Check sports analytics keywords
    sports_keywords = [
        'football', 'nfl', 'pass-blocking', 'quarterback', 'passer', 'coverage', 
        'rusher', 'blitz', 'tackle', 'punting', 'field goal', 'touchdown', 
        'sports', 'fandom', 'tweets', 'betting', 'prediction', 'win probability',
        'coaching', 'trajectory', 'receiver', 'big data bowl', 'route'
    ]
    if any(k in full_text for k in sports_keywords):
        sports_papers.append(p)

# Also add the 7 explicitly targeted papers from the prompt
for p in d['verified_papers']:
    if not any(sp['id'] == p['arxiv_id'] for sp in sports_papers):
        sports_papers.append({
            'id': p['arxiv_id'],
            'title': p['title'],
            'link': p['url'],
            'authors': p['authors'],
            'date': p.get('verified_at_utc', ''),
            'abstract': p['abstract']
        })

print(f"Total True Sports / Football Analytics Papers Isolated: {len(sports_papers)}")

# Categorize into GSE Football Edge Pillars
categories = {
    "TRENCH_WARFARE_AND_PRESSURE": [],
    "DEFENSIVE_COVERAGE_AND_SCHEME": [],
    "PLAYER_MOVEMENT_AND_PHYSICAL_TRAJECTORY": [],
    "GAME_THEORY_WIN_PROBABILITY_AND_COACHING": [],
    "MARKET_SENTIMENT_AND_PATHWISE_BIAS": []
}

for sp in sports_papers:
    txt = (sp['title'] + ' ' + sp.get('abstract', '')).lower()
    if any(k in txt for k in ['block', 'pass protection', 'pass rush', 'rusher', 'trench', 'pressure', 'blitz', 'tackle']):
        categories["TRENCH_WARFARE_AND_PRESSURE"].append(sp)
    elif any(k in txt for k in ['coverage', 'receiver', 'route', 'defensive coverage', 'separation', 'disguise', 'secondary']):
        categories["DEFENSIVE_COVERAGE_AND_SCHEME"].append(sp)
    elif any(k in txt for k in ['step-and-turn', 'trajectory', 'movement', 'kinematics', 'speed', 'acceleration', 'tracking data', 'lidar', 'diffusion']):
        categories["PLAYER_MOVEMENT_AND_PHYSICAL_TRAJECTORY"].append(sp)
    elif any(k in txt for k in ['win probability', 'fourth down', 'decision', 'coach', 'game outcomes', 'prediction', 'blown lead', 'forecast']):
        categories["GAME_THEORY_WIN_PROBABILITY_AND_COACHING"].append(sp)
    else:
        categories["MARKET_SENTIMENT_AND_PATHWISE_BIAS"].append(sp)

for cat, lst in categories.items():
    print(f"\n=== {cat} ({len(lst)} papers) ===")
    for p in lst[:6]:
        print(f"  * [{p['id']}] {p['title']}")

out_file = r"docs\arxiv-program\research\2026-10-17\GSE_SPORTS_MIND_NFL_TAXONOMY_2026-10-17.json"
with open(out_file, 'w', encoding='utf-8') as f:
    json.dump({"pillars": categories, "total_count": len(sports_papers)}, f, indent=2)
print(f"\nSaved structured taxonomy to {out_file}")
