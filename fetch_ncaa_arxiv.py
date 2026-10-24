import urllib.request
import xml.etree.ElementTree as ET
import json
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

query = 'all:%22NCAA+football%22+OR+all:%22college+football%22+OR+all:%22CFB%22'
url = f'http://export.arxiv.org/api/query?search_query={query}&start=0&max_results=200&sortBy=submittedDate&sortOrder=descending'
print('Querying arXiv API:', url)

req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req, timeout=40) as resp:
        xml_data = resp.read()
        print(f"Received {len(xml_data):,} bytes XML")
        root = ET.fromstring(xml_data)
        ns = {'atom': 'http://www.w3.org/2005/Atom', 'arxiv': 'http://arxiv.org/schemas/atom'}
        
        entries = root.findall('atom:entry', ns)
        print(f"Total atom entries: {len(entries)}")
        
        papers = []
        for e in entries:
            id_val = e.find('atom:id', ns).text.strip()
            arxiv_id = id_val.split('/abs/')[-1]
            title = ' '.join(e.find('atom:title', ns).text.strip().split())
            summary = ' '.join(e.find('atom:summary', ns).text.strip().split())
            published = e.find('atom:published', ns).text.strip()
            authors = [a.find('atom:name', ns).text.strip() for a in e.findall('atom:author', ns)]
            categories = [c.attrib.get('term') for c in e.findall('atom:category', ns) if c.attrib.get('term')]
            
            papers.append({
                'arxiv_id': arxiv_id,
                'title': title,
                'authors': authors,
                'date': published,
                'categories': categories,
                'abstract': summary,
                'url': f'https://arxiv.org/abs/{arxiv_id}',
                'pdf_url': f'https://arxiv.org/pdf/{arxiv_id}.pdf'
            })
            
        out_dir = r"C:\Users\Garrett\Sports\docs\arxiv-program\research\2026-10-17"
        os.makedirs(out_dir, exist_ok=True)
        out_json = os.path.join(out_dir, "NCAA_FOOTBALL_ARXIV_PAPERS.json")
        with open(out_json, "w", encoding="utf-8") as f:
            json.dump(papers, f, indent=2)
        print(f"Saved {len(papers)} papers to {out_json}")
        
        print("\n--- SAMPLE TOP 10 PAPERS ---")
        for i, p in enumerate(papers[:10]):
            print(f"[{i+1}] {p['arxiv_id']}: {p['title']}")
            print(f"    Date: {p['date']} | Authors: {', '.join(p['authors'][:3])}")
            print(f"    Summary: {p['abstract'][:150]}...\n")
            
except Exception as ex:
    print("Error:", ex)
