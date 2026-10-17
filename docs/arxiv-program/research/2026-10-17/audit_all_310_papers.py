import json
import re

def clean_text(s):
    if not s:
        return ""
    return re.sub(r'\s+', ' ', s).strip()

with open('docs/arxiv-program/research/2026-10-17/ARXIV_NFL_CORPUS_EXTRACTION_2026-10-17.json', 'r', encoding='utf-8') as f:
    d1 = json.load(f)
p1 = d1.get('search_results', [])

with open('docs/arxiv-program/research/2026-10-17/ARXIV_NFL_PAGE2_EXTRACTION_2026-10-17.json', 'r', encoding='utf-8') as f:
    d2 = json.load(f)
p2 = d2.get('results', [])

all_raw = []
for item in p1:
    item['source_page'] = 1
    all_raw.append(item)
for item in p2:
    item['source_page'] = 2
    all_raw.append(item)

print(f"Total raw items across Page 1 & 2: {len(all_raw)}")

# Non-football acronym filters (to separate obvious physics/CS non-football from football)
non_football_patterns = [
    r'\bno\s+forgetting\s+learning\b',
    r'\bneural\s+lidar\s+fields?\b',
    r'\bnearest\s+feature\s+line\b',
    r'\bnormalized\s+frequency\s+loss\b',
    r'\bnon-?linear\s+fractional\s+laplacian\b',
    r'\bnon-?fungible\s+token\b', # NFT
    r'\bnegative\s+feedback\s+loop\b',
    r'\bnonlinear\s+feedback\s+linearization\b',
    r'\bnanofiber\b',
    r'\bnear-?field\b',
    r'\bnoisy\s+feature\s+learning\b',
    r'\bneurofeedback\b',
    r'\bnarrow-?field\b',
    r'\bnetwork\s+flow\b',
    r'\bno-?free-?lunch\b'
]

football_keywords = [
    'football', 'nfl', 'quarterback', 'touchdown', 'super bowl', 'yards', 'passing',
    'rushing', 'receiver', 'kicker', 'punt', 'interception', 'blitz', 'tackle',
    'down and distance', 'epa', 'big data bowl', 'line of scrimmage', 'sack', 'fumble',
    'play-by-play', 'point spread', 'betting', 'odds', 'head coach', 'fourth down',
    'field goal', 'completion', 'coverage', 'pass rush', 'route', 'concussion',
    'helmet', 'american football', 'sports analytics', 'sports betting', 'draft'
]

football_papers = []
non_football_papers = []

for idx, p in enumerate(all_raw):
    title = p.get('title', '')
    abstract = p.get('abstract', '')
    text = (title + " " + abstract).lower()
    
    # Check if explicitly non-football acronym
    is_non_football = False
    for pat in non_football_patterns:
        if re.search(pat, text):
            is_non_football = True
            break
            
    # Check for football keywords
    has_football_kw = False
    matched_kws = []
    for kw in football_keywords:
        if re.search(r'\b' + re.escape(kw) + r'\b', text):
            has_football_kw = True
            matched_kws.append(kw)
            
    p_id = p.get('id', '')
    if not p_id and p.get('link'):
        p_id = p.get('link', '').split('/abs/')[-1]
    p['clean_id'] = p_id
    p['matched_keywords'] = matched_kws

    # Specific check: if helmet safety / concussion without 'football', is it sports?
    if ('helmet' in text or 'concussion' in text) and not is_non_football:
        if 'football' in text or 'nfl' in text or 'player' in text or 'impact' in text:
            has_football_kw = True

    if has_football_kw and not is_non_football:
        football_papers.append(p)
    else:
        non_football_papers.append(p)

print(f"Identified {len(football_papers)} football/sports-analytics papers out of {len(all_raw)} total.")
print(f"Non-football papers: {len(non_football_papers)}")

# Save intermediate filtered list
with open('docs/arxiv-program/research/2026-10-17/ALL_FOOTBALL_PAPERS_310_AUDIT.json', 'w', encoding='utf-8') as f:
    json.dump(football_papers, f, indent=2)
