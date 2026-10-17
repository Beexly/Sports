import json
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

with open('docs/arxiv-program/research/2026-10-17/MASTER_NFL_SPORTS_PAPERS_DATABASE.json', 'r', encoding='utf-8') as f:
    master = json.load(f)

with open('docs/arxiv-program/research/2026-10-17/NEW_AMERICAN_FOOTBALL_DISCOVERIES.json', 'r', encoding='utf-8') as f:
    new_af = json.load(f)

# Combine and deduplicate
combined_map = {p['id']: p for p in master}

# Valid sports papers from AF list
af_to_add = [
    '2604.02447', '2602.10784', '2409.04889', '2407.08508', '2403.14769',
    '2210.12519', '2207.14124', '2207.13747', '2010.11187', '1909.03343',
    '1906.01760', '1301.2954', '1111.0693', '0706.0366', 'physics/0505169',
    'physics/0403049', 'physics/0310148', '2609.35562', '2604.01318', '2511.09455'
]

added_count = 0
for p in new_af:
    if p['id'] in af_to_add and p['id'] not in combined_map:
        combined_map[p['id']] = p
        added_count += 1

final_corpus = list(combined_map.values())
# Sort by id descending
final_corpus.sort(key=lambda x: str(x['id']), reverse=True)

print(f"Added {added_count} new papers. Total unified corpus size: {len(final_corpus)} papers.")

with open('docs/arxiv-program/research/2026-10-17/MASTER_NFL_SPORTS_PAPERS_DATABASE.json', 'w', encoding='utf-8') as f:
    json.dump(final_corpus, f, indent=2)

print("Saved updated MASTER_NFL_SPORTS_PAPERS_DATABASE.json.")
