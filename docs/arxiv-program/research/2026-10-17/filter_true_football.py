import json
import re
import sys

# Ensure stdout handles utf-8 safely
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

with open('docs/arxiv-program/research/2026-10-17/ARXIV_NFL_CORPUS_EXTRACTION_2026-10-17.json', 'r', encoding='utf-8') as f:
    d1 = json.load(f)
p1 = d1.get('search_results', [])

with open('docs/arxiv-program/research/2026-10-17/ARXIV_NFL_PAGE2_EXTRACTION_2026-10-17.json', 'r', encoding='utf-8') as f:
    d2 = json.load(f)
p2 = d2.get('results', [])

all_raw = []
for item in p1:
    item['page'] = 1
    all_raw.append(item)
for item in p2:
    item['page'] = 2
    all_raw.append(item)

# Strict physics / non-sports exclusion patterns
non_sports_patterns = [
    r'non-?fermi\s+liquid',
    r'no\s+free\s+lunch',
    r'neural\s+lidar\s+fields?',
    r'no\s+forgetting\s+learning',
    r'nearest\s+feature\s+line',
    r'normalized\s+frequency\s+loss',
    r'non-?linear\s+fractional\s+laplacian',
    r'negative\s+feedback\s+loop',
    r'nonlinear\s+feedback\s+linearization',
    r'nanofiber',
    r'near-?field',
    r'noisy\s+feature\s+learning',
    r'neurofeedback',
    r'normal\s+faulting',
    r'nuclear\s+fuel',
    r'natural\s+frequency\s+loss',
    r'non-?fungible\s+token',
    r'network\s+flow',
    r'quantum\s+impurity',
    r'moir[eé]\s+heterostructures',
    r'su-schrieffer-heeger',
    r'orbital-selective',
    r'fermi\s+surface',
    r'kondo',
    r'majorana',
    r'spin-orbit',
    r'superconductivity'
]

# American football specific validation
real_football = []
for p in all_raw:
    title = p.get('title', '')
    abstract = p.get('abstract', '')
    full_text = (title + " " + abstract).lower()
    
    # check physics
    is_physics = False
    for pat in non_sports_patterns:
        if re.search(pat, full_text):
            is_physics = True
            break
    if is_physics:
        continue
        
    cid = p.get('id', '')
    if not cid and p.get('link'):
        cid = p.get('link', '').split('/abs/')[-1]
    p['clean_id'] = cid
    real_football.append(p)

print(f"Total True Football / Sports Analytics Papers Found: {len(real_football)}")

for i, p in enumerate(real_football):
    cid = p.get('clean_id', '')
    title = p.get('title', '')
    page = p.get('page', 1)
    authors = p.get('authors', [])
    auth_str = ", ".join(authors[:2]) if isinstance(authors, list) else str(authors)[:30]
    print(f"{i+1:3d}. [P{page} | {cid}] {title} ({auth_str})")

with open('docs/arxiv-program/research/2026-10-17/TRUE_NFL_FOOTBALL_PAPERS_COMPLETE.json', 'w', encoding='utf-8') as f:
    json.dump(real_football, f, indent=2)
