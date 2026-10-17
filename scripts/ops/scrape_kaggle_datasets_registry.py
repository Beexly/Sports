import urllib.request
import urllib.parse
import json
import time
import os

queries = [
    'nfl',
    'sports betting',
    'sports prediction',
    '2027 sports',
    'betting',
    'sportsbook',
    'football'
]

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
out_dir = r"C:\Users\Garrett\Sports\docs\data-sources\research\2026-10-17"
os.makedirs(out_dir, exist_ok=True)

all_datasets = {}

for q in queries:
    print(f"Harvesting Kaggle datasets for query: '{q}'...")
    q_datasets = []
    # Fetch top 5 pages (100 results per query)
    for page in range(1, 6):
        url = f"https://www.kaggle.com/api/v1/datasets/list?search={urllib.parse.quote(q)}&page={page}"
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=20) as r:
                data = json.loads(r.read())
                if not data:
                    break
                for d in data:
                    ref = d.get('ref')
                    if ref:
                        item = {
                            'ref': ref,
                            'title': d.get('title'),
                            'url': f"https://www.kaggle.com/datasets/{ref}",
                            'size': d.get('totalBytes'),
                            'lastUpdated': d.get('lastUpdated'),
                            'downloadCount': d.get('downloadCount'),
                            'voteCount': d.get('voteCount'),
                            'usabilityRating': d.get('usabilityRating'),
                            'query': q
                        }
                        q_datasets.append(item)
                        all_datasets[ref] = item
            time.sleep(1)
        except Exception as e:
            print(f"Error on {q} page {page}: {e}")
            break
    print(f"Query '{q}' returned {len(q_datasets)} datasets.")

master_list = list(all_datasets.values())
out_path = os.path.join(out_dir, "KAGGLE_SPORTS_AND_BETTING_REGISTRY.json")
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(master_list, f, indent=2)

print("\n==========================================")
print(f"KAGGLE HARVEST COMPLETE: {len(master_list)} UNIQUE DATASETS CATALOGED")
print(f"Saved to: {out_path}")
print("==========================================")
