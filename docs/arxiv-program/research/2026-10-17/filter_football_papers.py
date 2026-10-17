import json

with open('docs/arxiv-program/research/2026-10-17/ARXIV_NFL_CORPUS_EXTRACTION_2026-10-17.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

football_hits = []
keywords = ['football', 'nfl', 'tracking', 'pass-blocking', 'quarterback', 'sports', 'trajectory', 'tackle', 'blitz', 'formation']
for r in d['search_results']:
    text = (r['title'] + ' ' + r.get('abstract', '')).lower()
    if any(k in text for k in keywords):
        football_hits.append(r)

print(f"Total football/sports-analytics papers found in 200 search results: {len(football_hits)}")
for h in football_hits[:15]:
    print(f"  - [{h['id']}] {h['title']}")

# Save filtered football research corpus
out_filtered = r"docs\arxiv-program\research\2026-10-17\ARXIV_FOOTBALL_ANALYTICS_PAPERS_2026-10-17.json"
with open(out_filtered, 'w', encoding='utf-8') as f:
    json.dump(football_hits, f, indent=2)
print(f"Saved filtered catalog to {out_filtered}")
