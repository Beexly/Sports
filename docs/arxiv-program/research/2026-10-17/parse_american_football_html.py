import re
import json
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

file_path = 'docs/arxiv-program/research/2026-10-17/samples/arxiv_american_football_search_size200.html'
with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
    html = f.read()

# Check total results header
m_tot = re.search(r'Showing\s+([\d,]+–[\d,]+|[\d,]+-[\d,]+)\s+of\s+([\d,]+)\s+results', html)
total_str = m_tot.group(0) if m_tot else "Unknown total"
print(f"Results header: {total_str}")

blocks = html.split('<li class="arxiv-result">')[1:]
print(f"Found {len(blocks)} result blocks.")

entries = []
for b in blocks:
    b = b.split('</li>')[0]
    
    # Link & ID
    m_link = re.search(r'<p class="list-title.*?<a href="(https://arxiv\.org/abs/[^"]+)"', b, re.DOTALL)
    link = m_link.group(1).strip() if m_link else ''
    arxiv_id = link.split('/abs/')[-1] if link else ''
    
    # Title
    m_title = re.search(r'<p class="title is-5 mathjax">\s*(.*?)\s*</p>', b, re.DOTALL)
    title = m_title.group(1).strip() if m_title else ''
    title = re.sub(r'<span class="search-hit mathjax">([^<]+)</span>', r'\1', title)
    title = re.sub(r'\s+', ' ', title).strip()
    
    # Authors
    authors = []
    m_auth_block = re.search(r'<p class="authors">(.*?)</p>', b, re.DOTALL)
    if m_auth_block:
        authors = re.findall(r'<a href="[^"]+">([^<]+)</a>', m_auth_block.group(1))
        
    # Full abstract
    m_full_abs = re.search(r'<span class="abstract-full[^>]*>(.*?)</span>', b, re.DOTALL)
    if m_full_abs:
        abs_text = m_full_abs.group(1)
    else:
        m_short_abs = re.search(r'<span class="abstract-short[^>]*>(.*?)</span>', b, re.DOTALL)
        abs_text = m_short_abs.group(1) if m_short_abs else ''
        
    abs_text = re.sub(r'<span class="search-hit mathjax">([^<]+)</span>', r'\1', abs_text)
    abs_text = re.sub(r'<a class="is-size-7".*?</a>', '', abs_text, flags=re.DOTALL)
    abs_text = re.sub(r'<.*?>', '', abs_text)
    abs_text = re.sub(r'\s+', ' ', abs_text).strip()
    
    m_date = re.search(r'<p class="is-size-7">\s*<span>Submitted</span>\s*([^;]+);', b, re.DOTALL)
    date = m_date.group(1).strip() if m_date else ''
    
    tags = re.findall(r'<span class="tag is-small [^"]*tooltip is-tooltip-top"[^>]*>([^<]+)</span>', b)
    
    entries.append({
        "id": arxiv_id,
        "title": title,
        "authors": authors,
        "date": date,
        "abstract": abs_text,
        "tags": tags,
        "link": link
    })

print(f"Parsed {len(entries)} entries successfully.")

with open('docs/arxiv-program/research/2026-10-17/ARXIV_AMERICAN_FOOTBALL_PARSED.json', 'w', encoding='utf-8') as f:
    json.dump(entries, f, indent=2)

print("\n--- SAMPLE ENTRIES ---")
for i, p in enumerate(entries[:15]):
    auth_str = ", ".join(p['authors'][:2])
    print(f"{i+1:2d}. [{p['id']}] {p['title']} ({auth_str})")
