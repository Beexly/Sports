import urllib.request
import re
import json
import time
import os

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}

targets = [
    {
        "name": "sports_betting",
        "query": "sports+betting",
        "starts": [0, 200], # ~200-300 results
        "file": "ARXIV_SPORTS_BETTING.json"
    },
    {
        "name": "sports_books",
        "query": "sports+books",
        "starts": [0, 200], # ~200 results
        "file": "ARXIV_SPORTS_BOOKS.json"
    },
    {
        "name": "sports_core_harvest",
        "query": "sports",
        # Pull top 600 of 2,772 most recent announced
        "starts": [0, 200, 400],
        "file": "ARXIV_SPORTS_CANONICAL_600.json"
    }
]

out_dir = r"C:\Users\Garrett\Sports\docs\arxiv-program\research\2026-10-17"
os.makedirs(out_dir, exist_ok=True)

all_master_papers = {}

def scrape_arxiv_query(query, start):
    url = f"https://arxiv.org/search/?query={query}&searchtype=all&abstracts=show&order=-announced_date_first&size=200&start={start}"
    print(f"Fetching {url}...")
    papers = []
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=35) as r:
            html = r.read().decode('utf-8', errors='ignore')
        
        results = re.findall(r'<li class="arxiv-result">([\s\S]*?)</li>', html)
        print(f"Query '{query}' start {start}: found {len(results)} results")
        
        for res in results:
            id_m = re.search(r'href="https://arxiv.org/abs/([\d\.]+)', res)
            arxiv_id = id_m.group(1) if id_m else ''
            
            title_m = re.search(r'<p class="title is-5 mathjax">([\s\S]*?)</p>', res)
            title = re.sub(r'<.*?>', '', title_m.group(1)).strip() if title_m else ''
            
            authors_m = re.search(r'<p class="authors">([\s\S]*?)</p>', res)
            authors = re.sub(r'<.*?>', '', authors_m.group(1)).replace('Authors:', '').strip() if authors_m else ''
            
            abstract_m = re.search(r'<span class="abstract-full[\s\S]*?">([\s\S]*?)</span>', res)
            abstract = re.sub(r'<.*?>', '', abstract_m.group(1)).strip() if abstract_m else ''
            if not abstract:
                abstract_short_m = re.search(r'<span class="abstract-short[\s\S]*?">([\s\S]*?)</span>', res)
                abstract = re.sub(r'<.*?>', '', abstract_short_m.group(1)).strip() if abstract_short_m else ''
            
            date_m = re.search(r'<p class="is-size-7">[\s\S]*?Submitted</span>\s*([^;<\n]+)', res)
            date = date_m.group(1).strip() if date_m else ''
            
            if arxiv_id:
                papers.append({
                    'arxiv_id': arxiv_id,
                    'title': title,
                    'authors': authors,
                    'abstract': abstract,
                    'date': date,
                    'url': f'https://arxiv.org/abs/{arxiv_id}',
                    'source_query': query
                })
    except Exception as e:
        print(f"Error scraping {query} start {start}: {e}")
    return papers

for t in targets:
    t_papers = []
    for s in t["starts"]:
        p_list = scrape_arxiv_query(t["query"], s)
        t_papers.extend(p_list)
        for p in p_list:
            all_master_papers[p["arxiv_id"]] = p
        time.sleep(2)
    
    t_path = os.path.join(out_dir, t["file"])
    with open(t_path, "w", encoding="utf-8") as f:
        json.dump(t_papers, f, indent=2)
    print(f"Saved {len(t_papers)} papers for {t['name']} -> {t_path}")

# Save master deduplicated omnibus corpus
omnibus_path = os.path.join(out_dir, "ARXIV_OMNIBUS_SPORTS_AND_BETTING_CORPUS.json")
master_list = list(all_master_papers.values())
with open(omnibus_path, "w", encoding="utf-8") as f:
    json.dump(master_list, f, indent=2)

print(f"\n==========================================")
print(f"OMNIBUS CORPUS COMPLETE: {len(master_list)} UNIQUE PAPERS HARVESTED")
print(f"Saved to: {omnibus_path}")
print(f"==========================================")
