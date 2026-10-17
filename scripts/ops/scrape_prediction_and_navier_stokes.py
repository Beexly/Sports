import urllib.request
import re
import json
import time
import os

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}

targets = [
    {
        "name": "prediction_model_sports",
        "query": "prediction+model+sports",
        "starts": [0, 200],
        "file": "ARXIV_PREDICTION_MODEL_SPORTS.json"
    },
    {
        "name": "navier_stokes",
        "query": "navier+stokes",
        "starts": [0, 200], # Top 400 physics/fluid dynamics/PDE papers
        "file": "ARXIV_NAVIER_STOKES_400.json"
    }
]

out_dir = r"C:\Users\Garrett\Sports\docs\arxiv-program\research\2026-10-17"
os.makedirs(out_dir, exist_ok=True)

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
        time.sleep(2)
    
    t_path = os.path.join(out_dir, t["file"])
    with open(t_path, "w", encoding="utf-8") as f:
        json.dump(t_papers, f, indent=2)
    print(f"Saved {len(t_papers)} papers for {t['name']} -> {t_path}")

print("Completed harvesting prediction model sports & Navier-Stokes physics corpus.")
