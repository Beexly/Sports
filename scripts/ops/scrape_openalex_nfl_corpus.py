import urllib.request
import urllib.parse
import json
import time
import os

api_key = "vl5mztSmzowNO9S0khTkEt"
headers = {
    'User-Agent': 'GalaxySportsEdge-Engine/1.0 (mailto:garrett@galaxysportsedge.com)'
}

out_dir = r"C:\Users\Garrett\Sports\docs\arxiv-program\research\2026-10-17"
os.makedirs(out_dir, exist_ok=True)

# 1. Harvest post-2025 NFL works (2025-2026 latest literature)
url_recent_nfl = f"https://api.openalex.org/works?filter=from_publication_date:2025-01-01,title_and_abstract.search:NFL&sort=publication_date:desc&per-page=100&api_key={api_key}"

# 2. Harvest top all-time relevant NFL football analytics works
url_relevance_nfl = f"https://api.openalex.org/works?search=NFL+football&sort=relevance_score:desc&per-page=100&api_key={api_key}"

datasets = [
    {"name": "recent_2025_plus", "url": url_recent_nfl, "filename": "OPENALEX_NFL_2025_2026_RECENT.json"},
    {"name": "relevance_ranked", "url": url_relevance_nfl, "filename": "OPENALEX_NFL_RELEVANCE_RANKED.json"}
]

all_nfl_academic = {}

for d in datasets:
    print(f"Fetching OpenAlex dataset: {d['name']}...")
    try:
        req = urllib.request.Request(d['url'], headers=headers)
        with urllib.request.urlopen(req, timeout=30) as r:
            res_data = json.loads(r.read())
            results = res_data.get('results', [])
            print(f"Harvested {len(results)} works for {d['name']} (Total available: {res_data.get('meta', {}).get('count')})")
            
            cleaned_works = []
            for item in results:
                work_id = item.get('id')
                entry = {
                    'id': work_id,
                    'doi': item.get('doi'),
                    'title': item.get('title'),
                    'publication_year': item.get('publication_year'),
                    'publication_date': item.get('publication_date'),
                    'cited_by_count': item.get('cited_by_count'),
                    'authors': [a.get('author', {}).get('display_name') for a in item.get('authorships', []) if a.get('author')],
                    'landing_page_url': item.get('primary_location', {}).get('landing_page_url') if item.get('primary_location') else None,
                    'abstract': item.get('abstract'),
                    'source_query': d['name']
                }
                cleaned_works.append(entry)
                if work_id:
                    all_nfl_academic[work_id] = entry
            
            out_file = os.path.join(out_dir, d['filename'])
            with open(out_file, "w", encoding="utf-8") as f:
                json.dump(cleaned_works, f, indent=2)
            print(f"Saved {len(cleaned_works)} to {out_file}")
            time.sleep(2)
    except Exception as e:
        print(f"Error fetching {d['name']}: {e}")

# Save master deduplicated NFL academic omnibus
omnibus_file = os.path.join(out_dir, "OPENALEX_NFL_MASTER_CORPUS.json")
master_list = list(all_nfl_academic.values())
with open(omnibus_file, "w", encoding="utf-8") as f:
    json.dump(master_list, f, indent=2)

print("\n==========================================")
print(f"OPENALEX NFL MASTER CORPUS HARVESTED: {len(master_list)} UNIQUE ACADEMIC WORKS")
print(f"Saved to: {omnibus_file}")
print("==========================================")
