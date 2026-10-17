import json
import re
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

with open('docs/arxiv-program/research/2026-10-17/ARXIV_NFL_310_FULL_PARSED.json', 'r', encoding='utf-8') as f:
    papers = json.load(f)

# Non-sports exclusion terms
non_sports = [
    'non-fermi-liquid', 'non-fermi liquid', 'fermi liquid', 'fermi-liquid',
    'sachdev-ye-kitaev', 'syk model', 'superconduct', 'magnetoresistiv',
    'hubbard model', 'kondo effect', 'moiré', 'moire heterostructure',
    'optic sensing', 'alzheimer', 'peripapillary', 'glaucoma', 'nerve fiber layer',
    'retinal', 'perineuronal net', 'federated learning', 'ptychography',
    'cuprates', 'cramèr-rao', 'mott transition', 'spin transport',
    'wiedemann-franz', 'heavy fermion', 'anti-ferromagnetic', 'heavy-fermion',
    'antiferromagnet', 'polyelectrolytes', 'neurofilament', 'free logics',
    'van hove singularity', 'learned index', 'free lunch theorem',
    'neural feedback loop', 'negative federated learning', 'natural formal language',
    'universal induction', 'intrinsically disordered', 'questionnaire uncertainty',
    'latent pseudotime', 'quantum key distribution', 'quantum impurity',
    'quantum computing', 'quantum criticality', 'quantum liquid', 'quantum phase',
    'non-kramers', 'variational wave-functions', 'fermion condensate',
    'nanofocusing', 'chiral liquid'
]

# Sports positive terms
sports_terms = [
    'football', 'nfl', 'quarterback', 'touchdown', 'super bowl', 'passing',
    'rushing', 'receiver', 'kicker', 'punt', 'interception', 'blitz', 'tackle',
    'epa', 'big data bowl', 'line of scrimmage', 'sack', 'fumble', 'play-by-play',
    'point spread', 'betting', 'odds', 'head coach', 'fourth down', 'field goal',
    'pass rush', 'route', 'concussion', 'helmet', 'american football',
    'sports analytics', 'sports betting', 'draft', 'fantasy football',
    'sports', 'athletic', 'game', 'team', 'match outcome', 'home advantage',
    'bradley-terry', 'pairwise comparison', 'pairwise comparisons', 'ranking'
]

sports_papers = []

for p in papers:
    title = p['title']
    abstract = p['abstract']
    combined = (title + " " + abstract).lower()
    
    # Check exclusion
    excluded = False
    for ns in non_sports:
        if ns in combined:
            excluded = True
            break
    if excluded:
        continue
        
    # Check positive
    matched = []
    for st in sports_terms:
        if re.search(r'\b' + re.escape(st) + r'\b', combined):
            matched.append(st)
            
    # Extra check: if title or abstract specifically mentions football, NFL, sports, betting, or games
    if any(k in matched for k in ['football', 'nfl', 'quarterback', 'super bowl', 'touchdown', 'fourth down', 'american football', 'sports betting', 'point spread', 'fantasy football', 'big data bowl', 'pass rush', 'concussion', 'helmet', 'betting', 'odds', 'sports analytics', 'sports', 'home advantage']):
        p['matched_sports_terms'] = matched
        sports_papers.append(p)
    elif ('game' in matched or 'team' in matched or 'ranking' in matched or 'bradley-terry' in matched) and ('score' in combined or 'win' in combined or 'player' in combined or 'league' in combined):
        p['matched_sports_terms'] = matched
        sports_papers.append(p)

print(f"Total True Sports / Football / Betting Papers: {len(sports_papers)}")

# Save to file
with open('docs/arxiv-program/research/2026-10-17/CLEAN_SPORTS_ARXIV_PAPERS.json', 'w', encoding='utf-8') as f:
    json.dump(sports_papers, f, indent=2)

for i, p in enumerate(sports_papers):
    cid = p['id']
    title = p['title']
    authors = ", ".join(p['authors'][:2])
    date = p['date']
    print(f"{i+1:2d}. [{cid}] ({date}) {title} -- {authors}")
