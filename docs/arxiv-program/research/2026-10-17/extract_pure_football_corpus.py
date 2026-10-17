import json
import re
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

with open('docs/arxiv-program/research/2026-10-17/TRUE_NFL_FOOTBALL_PAPERS_COMPLETE.json', 'r', encoding='utf-8') as f:
    candidates = json.load(f)

# Explicit list of non-football physics/CS/medical homonyms that still slipped in
exclude_terms = [
    'non-fermi-liquid', 'non-fermi liquid', 'fermi-liquid', 'fermi liquid',
    'sachdev-ye-kitaev', 'syk', 'quantum', 'superconduct', 'magnetoresistiv',
    'hubbard model', 'kondo', 'moiré', 'moire', 'optic sensing', 'alzheimer',
    'peripapillary', 'glaucoma', 'nerve fiber layer', 'retinal', 'perineuronal',
    'federated learning', 'cricket', 'ptychography', 'cuprates', 'cramèr-rao',
    'mott transition', 'spin transport', 'wiedemann-franz', 'heavy fermion',
    'anti-ferromagnetic', 'heavy-fermion', 'antiferromagnet', 'polyelectrolytes',
    'neurofilament', 'tableaux for free logics', 'van hove singularity',
    'learned index', 'free lunch', 'reachability analysis of neural feedback',
    'neural feedback loop', 'fl-guard', 'lindt: tackling negative',
    'natural formal language', 'universal induction', 'intrinsically disordered',
    'questionnaire uncertainty responses', 'latent pseudotime'
]

pure_football_papers = []

for p in candidates:
    title = p.get('title', '')
    abstract = p.get('abstract', '')
    combined = (title + " " + abstract).lower()
    
    is_excluded = False
    for ex in exclude_terms:
        if ex in combined:
            is_excluded = True
            break
            
    if is_excluded:
        continue
        
    pure_football_papers.append(p)

print(f"Total Pure Football / Sports Analytics Papers: {len(pure_football_papers)}")

# Let's inspect them sorted by announcement date / ID descending
pure_football_papers.sort(key=lambda x: x.get('clean_id', ''), reverse=True)

with open('docs/arxiv-program/research/2026-10-17/PURE_NFL_SPORTS_PAPERS_CORPUS.json', 'w', encoding='utf-8') as f:
    json.dump(pure_football_papers, f, indent=2)

print("\n=== PURE NFL SPORTS ANALYTICS PAPERS LIST ===")
for i, p in enumerate(pure_football_papers):
    cid = p.get('clean_id', '')
    title = p.get('title', '')
    page = p.get('page', 1)
    authors = p.get('authors', [])
    auth_str = ', '.join(authors[:2]) if isinstance(authors, list) else str(authors)[:30]
    print(f"{i+1:2d}. [{cid}] {title} ({auth_str})")
