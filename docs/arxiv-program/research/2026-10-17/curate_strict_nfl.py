import json
import re
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

with open('docs/arxiv-program/research/2026-10-17/MASTER_NFL_SPORTS_PAPERS_DATABASE.json', 'r', encoding='utf-8') as f:
    papers = json.load(f)

# Explicitly filter out cond-mat, physics, pure math logic unless explicitly football/sports
pure_nfl_sports = []

for p in papers:
    title = p['title'].lower()
    abstract = p['abstract'].lower()
    text = title + " " + abstract
    
    # Check if cond-mat or materials physics
    if any(m in text for m in ['fermi', 'superconduct', 'spin-orbit', 'caruo', 'cetin', 'cecuas', 'cepd', 'magnetoresist', 'magnetocrystalline', 'heavy-fermion', 'heavy fermion', 'landau quasiparticles', 'quantum', 'no free lunch', 'no-free-lunch', 'nerve fiber', 'optic sensing', 'perineuronal', 'intrinsically disordered']):
        continue
    if any(m in text for m in ['perimetric glaucoma', 'free logics', 'pressure sensor chip', 'bipolar junction transistor']):
        continue
    if 'arxiv_id' in p and p['id'].startswith('cond-mat'):
        continue
        
    pure_nfl_sports.append(p)

print(f"Total Strictly Curated NFL, Sports Analytics & Betting Papers: {len(pure_nfl_sports)}")

with open('docs/arxiv-program/research/2026-10-17/STRICT_CURATED_NFL_SPORTS_PAPERS.json', 'w', encoding='utf-8') as f:
    json.dump(pure_nfl_sports, f, indent=2)

for i, p in enumerate(pure_nfl_sports):
    cid = p['id']
    title = p['title']
    authors = ", ".join(p['authors'][:2])
    if len(p['authors']) > 2:
        authors += " et al."
    print(f"{i+1:2d}. [{cid}] {title} ({authors})")
