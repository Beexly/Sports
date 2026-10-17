import re
import json
import os
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

def parse_arxiv_html(html_path, page_num):
    with open(html_path, 'r', encoding='utf-8', errors='replace') as f:
        html = f.read()

    # Split by <li class="arxiv-result">
    chunks = html.split('<li class="arxiv-result">')
    print(f"File {html_path}: Found {len(chunks)-1} result blocks.")
    
    results = []
    for chunk in chunks[1:]:
        # End of li block
        block = chunk.split('</li>')[0]
        
        # Link & ID
        m_link = re.search(r'<p class="list-title.*?<a href="(https://arxiv\.org/abs/[^"]+)"', block, re.DOTALL)
        link = m_link.group(1).strip() if m_link else ''
        arxiv_id = link.split('/abs/')[-1] if link else ''
        
        # Title
        m_title = re.search(r'<p class="title is-5 mathjax">\s*(.*?)\s*</p>', block, re.DOTALL)
        title = m_title.group(1).strip() if m_title else ''
        title = re.sub(r'<span class="search-hit mathjax">([^<]+)</span>', r'\1', title)
        title = re.sub(r'\s+', ' ', title).strip()
        
        # Authors
        m_authors = re.findall(r'<p class="authors">\s*Authors:\s*(.*?)</p>', block, re.DOTALL)
        authors = []
        if m_authors:
            authors = re.findall(r'<a href="[^"]+">([^<]+)</a>', m_authors[0])
            
        # Abstract (full)
        # Look for <span class="abstract-full ...">...</span>
        m_abs = re.search(r'<span class="abstract-full[^>]*>(.*?)</span>', block, re.DOTALL)
        if not m_abs:
            m_abs = re.search(r'<span class="abstract-short[^>]*>(.*?)</span>', block, re.DOTALL)
        abstract = m_abs.group(1).strip() if m_abs else ''
        abstract = re.sub(r'<span class="search-hit mathjax">([^<]+)</span>', r'\1', abstract)
        abstract = re.sub(r'<a class="is-abstract-toggle.*?</a>', '', abstract, flags=re.DOTALL)
        abstract = re.sub(r'<.*?>', '', abstract)
        abstract = re.sub(r'\s+', ' ', abstract).strip()
        
        # Date
        m_date = re.search(r'<p class="is-size-7">\s*<span>Submitted</span>\s*([^;]+);', block, re.DOTALL)
        date = m_date.group(1).strip() if m_date else ''
        
        # Tags / Subjects
        tags = re.findall(r'<span class="tag is-small is-link is-light tooltip is-tooltip-top"[^>]*>([^<]+)</span>', block)
        if not tags:
            tags = re.findall(r'<span class="tag is-small is-grey is-light tooltip is-tooltip-top"[^>]*>([^<]+)</span>', block)

        results.append({
            "id": arxiv_id,
            "title": title,
            "authors": authors,
            "date": date,
            "abstract": abstract,
            "tags": tags,
            "link": link,
            "page": page_num
        })
    return results

p1_results = parse_arxiv_html('docs/arxiv-program/research/2026-10-17/samples/arxiv_nfl_search_size200.html', 1)
p2_results = parse_arxiv_html('docs/arxiv-program/research/2026-10-17/samples/arxiv_nfl_search_size200_start200.html', 2)

all_310 = p1_results + p2_results
print(f"Total parsed results: {len(all_310)}")

with open('docs/arxiv-program/research/2026-10-17/ARXIV_NFL_310_FULL_PARSED.json', 'w', encoding='utf-8') as f:
    json.dump(all_310, f, indent=2)

print("Saved to ARXIV_NFL_310_FULL_PARSED.json successfully.")
