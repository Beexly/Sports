import json

with open('docs/arxiv-program/research/2026-10-17/ARXIV_FOOTBALL_ANALYTICS_PAPERS_2026-10-17.json', 'r', encoding='utf-8') as f:
    papers = json.load(f)

print(f"Total papers to review: {len(papers)}")
nfl_pure = []
for p in papers:
    text = (p['title'] + ' ' + p.get('abstract', '')).lower()
    if any(k in text for k in ['nfl', 'football', 'pass-blocking', 'quarterback', 'passer', 'coverage', 'rusher', 'blitz', 'tackle', 'punting', 'field goal', 'touchdown']):
        nfl_pure.append(p)

print(f"Pure American Football papers: {len(nfl_pure)}\n")
for idx, p in enumerate(nfl_pure[:30], 1):
    print(f"{idx:02d}. [{p['id']}] {p['title']}")
    print(f"    Authors: {', '.join(p['authors'][:3])}")
    print(f"    Date: {p['date']}")
    print(f"    Abstract snippet: {p['abstract'][:180]}...\n")
