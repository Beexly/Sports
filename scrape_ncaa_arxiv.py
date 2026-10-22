import sys
import os
import urllib.request
import re
import json

sys.stdout.reconfigure(encoding='utf-8')

url = 'https://arxiv.org/search/?query=NCAA+football&searchtype=all&abstracts=show&order=-announced_date_first&size=200'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})

try:
    with urllib.request.urlopen(req, timeout=20) as resp:
        html = resp.read().decode('utf-8', errors='ignore')
        print(f"Fetched {len(html):,} characters")
        
        m_total = re.search(r'showing\s+[\d,-]+\s+of\s+([\d,]+)\s+results', html, re.I)
        total_str = m_total.group(1) if m_total else 'Unknown'
        print(f"Total results reported by arXiv: {total_str}")
        
        results = html.split('<li class="arxiv-result">')
        print(f"Result blocks found: {len(results)-1}")
        
        papers = []
        for block in results[1:]:
            m_id = re.search(r'href="https://arxiv\.org/abs/([0-9\.]+)"', block)
            arxiv_id = m_id.group(1) if m_id else ''
            
            m_title = re.search(r'<p class="title is-5 mathjax">(.*?)</p>', block, re.DOTALL)
            title = re.sub(r'\s+', ' ', m_title.group(1)).strip() if m_title else ''
            title = re.sub(r'<.*?>', '', title)
            
            m_authors = re.search(r'<p class="authors">(.*?)</p>', block, re.DOTALL)
            authors = re.sub(r'\s+', ' ', m_authors.group(1)).strip() if m_authors else ''
            authors = re.sub(r'<.*?>', '', authors)
            if authors.startswith('Authors:'):
                authors = authors[len('Authors:'):].strip()
                
            m_date = re.search(r'class="has-text-black-bis has-text-weight-semibold">Submitted</span>\s*([^;<\n]+)', block)
            date_str = m_date.group(1).strip() if m_date else ''
            
            m_abs = re.search(r'<span class="abstract-full[^>]*>(.*?)</span>', block, re.DOTALL)
            abstract = re.sub(r'\s+', ' ', m_abs.group(1)).strip() if m_abs else ''
            abstract = re.sub(r'<.*?>', '', abstract)
            abstract = abstract.replace('\u25b3 Less', '').strip()
            
            cats = re.findall(r'data-tooltip="([^"]+)"[^>]*>([a-zA-Z\.\-]+)</span>', block)
            cat_list = [c[1] for c in cats]
            
            if arxiv_id:
                papers.append({
                    'arxiv_id': arxiv_id,
                    'title': title,
                    'authors': authors,
                    'date': date_str,
                    'categories': cat_list,
                    'abstract': abstract,
                    'url': f'https://arxiv.org/abs/{arxiv_id}',
                    'pdf_url': f'https://arxiv.org/pdf/{arxiv_id}.pdf'
                })
                
        print(f"Successfully parsed {len(papers)} papers")
        
        out_dir = r"C:\Users\Garrett\Sports\docs\arxiv-program\research\2026-10-17"
        os.makedirs(out_dir, exist_ok=True)
        out_json = os.path.join(out_dir, "NCAA_FOOTBALL_ARXIV_PAPERS.json")
        with open(out_json, "w", encoding="utf-8") as f:
            json.dump(papers, f, indent=2)
        print(f"Saved JSON to {out_json}")
        
        print("\n--- TOP 10 PAPERS ---")
        for i, p in enumerate(papers[:10]):
            print(f"[{i+1}] {p['arxiv_id']}: {p['title']}")
            print(f"    Date: {p['date']} | Categories: {p['categories']}")
            print(f"    Abstract: {p['abstract'][:150]}...\n")
            
except Exception as e:
    print("Error:", e)
