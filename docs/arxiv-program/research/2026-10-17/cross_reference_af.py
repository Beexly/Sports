import json
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

with open('docs/arxiv-program/research/2026-10-17/MASTER_NFL_SPORTS_PAPERS_DATABASE.json', 'r', encoding='utf-8') as f:
    master = json.load(f)
existing_ids = set(p['id'] for p in master)

with open('docs/arxiv-program/research/2026-10-17/ARXIV_AMERICAN_FOOTBALL_PARSED.json', 'r', encoding='utf-8') as f:
    af_papers = json.load(f)

print(f"Master corpus has {len(master)} papers.")
print(f"American football search returned {len(af_papers)} papers.")

new_papers = []
for p in af_papers:
    if p['id'] not in existing_ids:
        # Check if actually sports/football (exclude soccer/robotics/non-football if irrelevant)
        text = (p['title'] + " " + p['abstract']).lower()
        if 'football' in text or 'tackle' in text or 'pass' in text or 'play' in text:
            new_papers.append(p)

print(f"Found {len(new_papers)} NEW papers not in previous 'nfl' query!")

print("\n--- NEW DISCOVERIES ---")
for i, p in enumerate(new_papers):
    auth_str = ", ".join(p['authors'][:2])
    print(f"{i+1:2d}. [{p['id']}] ({p['date']}) {p['title']} -- {auth_str}")

with open('docs/arxiv-program/research/2026-10-17/NEW_AMERICAN_FOOTBALL_DISCOVERIES.json', 'w', encoding='utf-8') as f:
    json.dump(new_papers, f, indent=2)
