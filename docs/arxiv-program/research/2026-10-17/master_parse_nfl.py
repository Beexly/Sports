import re
import json
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

def parse_html_file(file_path, page_num):
    with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
        html = f.read()

    blocks = html.split('<li class="arxiv-result">')[1:]
    print(f"Parsing {file_path}: found {len(blocks)} entries.")
    
    entries = []
    for b in blocks:
        # truncate at end of li
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
            
        # Abstract (full)
        m_full_abs = re.search(r'<span class="abstract-full[^>]*>(.*?)</span>', b, re.DOTALL)
        if m_full_abs:
            abs_text = m_full_abs.group(1)
        else:
            m_short_abs = re.search(r'<span class="abstract-short[^>]*>(.*?)</span>', b, re.DOTALL)
            abs_text = m_short_abs.group(1) if m_short_abs else ''
            
        # Clean abstract
        abs_text = re.sub(r'<span class="search-hit mathjax">([^<]+)</span>', r'\1', abs_text)
        abs_text = re.sub(r'<a class="is-size-7".*?</a>', '', abs_text, flags=re.DOTALL)
        abs_text = re.sub(r'<.*?>', '', abs_text)
        abs_text = re.sub(r'\s+', ' ', abs_text).strip()
        
        # Date
        m_date = re.search(r'<p class="is-size-7">\s*<span>Submitted</span>\s*([^;]+);', b, re.DOTALL)
        date = m_date.group(1).strip() if m_date else ''
        
        # Tags / Subjects
        tags = re.findall(r'<span class="tag is-small [^"]*tooltip is-tooltip-top"[^>]*>([^<]+)</span>', b)
        
        entries.append({
            "id": arxiv_id,
            "title": title,
            "authors": authors,
            "date": date,
            "abstract": abs_text,
            "tags": tags,
            "link": link,
            "page": page_num
        })
    return entries

p1 = parse_html_file('docs/arxiv-program/research/2026-10-17/samples/arxiv_nfl_search_size200.html', 1)
p2 = parse_html_file('docs/arxiv-program/research/2026-10-17/samples/arxiv_nfl_search_size200_start200.html', 2)

all_310 = p1 + p2
print(f"Total parsed: {len(all_310)}")

# Filtering out non-sports physics / biology / math homonyms
exclude_patterns = [
    r'\bnon-?fermi\s+liquid\b',
    r'\bfermi\s+liquid\b',
    r'\bno\s+free\s+lunch\b',
    r'\bneural\s+lidar\s+fields?\b',
    r'\bno\s+forgetting\s+learning\b',
    r'\bnearest\s+feature\s+line\b',
    r'\bnormalized\s+frequency\s+loss\b',
    r'\bnon-?linear\s+fractional\s+laplacian\b',
    r'\bnegative\s+feedback\s+loop\b',
    r'\bnonlinear\s+feedback\s+linearization\b',
    r'\bnanofiber\b',
    r'\bnear-?field\b',
    r'\bnoisy\s+feature\s+learning\b',
    r'\bneurofeedback\b',
    r'\bnormal\s+faulting\b',
    r'\bnuclear\s+fuel\b',
    r'\bnatural\s+frequency\s+loss\b',
    r'\bnegative\s+federated\s+learning\b',
    r'\bquantum\b',
    r'\bsachdev-ye-kitaev\b',
    r'\bsyk\b',
    r'\bperipapillary\b',
    r'\bglaucoma\b',
    r'\bnerve\s+fiber\s+layer\b',
    r'\bcuprates\b',
    r'\bhubbard\s+model\b',
    r'\bmott\b',
    r'\bkondo\b',
    r'\bmoir[eé]\b',
    r'\bptychography\b',
    r'\bcram[eè]r-rao\b',
    r'\bpressure\s+sensor\s+chip\b',
    r'\bbipolar\s+junction\s+transistor\b',
    r'\bperineuronal\s+net\b',
    r'\bfree\s+logics\b',
    r'\bvan\s+hove\b',
    r'\buniversal\s+induction\b',
    r'\bintrinsically\s+disordered\b',
    r'\balzheimer\b',
    r'\bcricket\b',
    r'\bload\s+balancing\s+dynamic\s+networks\b'
]

pure_sports_papers = []
for p in all_310:
    text = (p['title'] + " " + p['abstract']).lower()
    
    is_ex = False
    for pat in exclude_patterns:
        if re.search(pat, text):
            is_ex = True
            break
    if is_ex:
        continue
        
    pure_sports_papers.append(p)

print(f"Total verified Sports / Football / Betting / Analytics Papers: {len(pure_sports_papers)}")

# Save to json
with open('docs/arxiv-program/research/2026-10-17/MASTER_NFL_SPORTS_PAPERS_DATABASE.json', 'w', encoding='utf-8') as f:
    json.dump(pure_sports_papers, f, indent=2)

print("\n=== MASTER NFL & SPORTS ANALYTICS CATALOGUE ===")
for i, p in enumerate(pure_sports_papers):
    cid = p['id']
    date = p['date']
    title = p['title']
    auth_str = ", ".join(p['authors'][:2])
    if len(p['authors']) > 2:
        auth_str += " et al."
    print(f"{i+1:2d}. [{cid}] ({date}) {title} | {auth_str}")
