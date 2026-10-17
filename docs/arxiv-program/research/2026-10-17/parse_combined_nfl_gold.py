import json
import re

# Load Page 1
with open('docs/arxiv-program/research/2026-10-17/ARXIV_NFL_CORPUS_EXTRACTION_2026-10-17.json', 'r', encoding='utf-8') as f:
    p1 = json.load(f)

# Load Page 2
with open('docs/arxiv-program/research/2026-10-17/ARXIV_NFL_PAGE2_EXTRACTION_2026-10-17.json', 'r', encoding='utf-8') as f:
    p2 = json.load(f)

all_items = p1.get('search_results', []) + p2.get('results', [])

# Deduplicate
seen = set()
unique_items = []
for it in all_items:
    if it['id'] not in seen:
        seen.add(it['id'])
        unique_items.append(it)

print(f"Total Combined Unique arXiv Items across Page 1 & 2: {len(unique_items)}")

# Identify real sports analytics / football papers
exclude_terms = ['fermi', 'superconduct', 'quasicrystal', 'circuit simulator', 'magnetic', 'graphene', 'spin-orbit', 'dirac', 'weyl', 'condensed matter', 'nanowire', 'topological insulator']

sports_gold = []
for it in unique_items:
    txt = (it['title'] + ' ' + it.get('abstract', '')).lower()
    if any(ex in txt for ex in exclude_terms):
        continue
    
    # Check sports terms
    sports_terms = [
        'football', 'nfl', 'sports', 'passer', 'pass-blocking', 'rusher', 'quarterback',
        'receiver', 'route', 'tackle', 'blitz', 'punt', 'kicking', 'field goal',
        'touchdown', 'fourth down', 'win probability', 'big data bowl', 'coaching',
        'trajectory', 'fandom', 'betting', 'handicapping', 'prediction'
    ]
    if any(st in txt for st in sports_terms):
        sports_gold.append(it)

print(f"Total Verified Sports Analytics & Football Papers Isolated: {len(sports_gold)}\n")

# Sort chronologically or print the newly discovered gold from Page 2
for idx, g in enumerate(sports_gold, 1):
    print(f"{idx:02d}. [{g['id']}] {g['title']}")
    authors = ', '.join(g.get('authors', [])[:3])
    print(f"    Authors: {authors}")
    print(f"    Date: {g.get('date', '')[:35]}")
    print(f"    Snippet: {g.get('abstract', '')[:160]}...\n")

out_gold = r"docs\arxiv-program\research\2026-10-17\ALL_COMBINED_NFL_SPORTS_PAPERS_PAGE1_AND_2.json"
with open(out_gold, 'w', encoding='utf-8') as f:
    json.dump(sports_gold, f, indent=2)
print(f"Saved complete combined dataset to {out_gold}")
