import urllib.request
import urllib.parse
import json
import time
import os

api_key = "vl5mztSmzowNO9S0khTkEt"
headers = {
    'User-Agent': 'GalaxySportsEdge-Engine/1.0 (mailto:garrett@galaxysportsedge.com)'
}

queries = [
    "NFL football prediction",
    "sports betting market efficiency",
    "sports analytics player tracking",
    "biomechanics fatigue athletic performance",
    "Navier Stokes ball aerodynamics",
    "referee bias crowd noise sports"
]

out_dir = r"C:\Users\Garrett\Sports\docs\arxiv-program\research\2026-10-17"
os.makedirs(out_dir, exist_ok=True)

all_openalex_works = {}

for q in queries:
    print(f"Querying OpenAlex API for: '{q}'...")
    encoded_q = urllib.parse.quote(q)
    url = f"https://api.openalex.org/works?search={encoded_q}&per-page=50&api_key={api_key}"
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=25) as r:
            data = json.loads(r.read())
            results = data.get('results', [])
            print(f"Retrieved {len(results)} works for '{q}' (Total available: {data.get('meta', {}).get('count')})")
            for item in results:
                work_id = item.get('id')
                if work_id:
                    all_openalex_works[work_id] = {
                        'id': work_id,
                        'doi': item.get('doi'),
                        'title': item.get('title'),
                        'publication_year': item.get('publication_year'),
                        'cited_by_count': item.get('cited_by_count'),
                        'authors': [a.get('author', {}).get('display_name') for a in item.get('authorships', []) if a.get('author')],
                        'landing_page_url': item.get('primary_location', {}).get('landing_page_url') if item.get('primary_location') else None,
                        'query': q
                    }
        time.sleep(1)
    except Exception as e:
        print(f"Error querying OpenAlex for '{q}': {e}")

master_list = list(all_openalex_works.values())
out_path = os.path.join(out_dir, "OPENALEX_ACADEMIC_SPORTS_CORPUS.json")
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(master_list, f, indent=2)

print("\n==========================================")
print(f"OPENALEX HARVEST COMPLETE: {len(master_list)} UNIQUE ACADEMIC WORKS INDEXED")
print(f"Saved to: {out_path}")
print("==========================================")
