"""Build ONE canonical equation pool from every source.

The corpus now lives in five files written by different passes:
  wave-index.jsonl                    the extracted corpus (45,944)
  agree-drain.jsonl                   AGREE-only, eq_recover-verified (12,894)
  unverified-recoverable.jsonl        salvaged from UNVERIFIED (20,620)
  corpus-equations.jsonl / corpus-recovered.jsonl   earlier recovery passes

Downstream work keeps re-counting per-file. This emits a single deduplicated,
verbatim-checked pool with a provenance tag on every row, so "how many
equations do we actually have" has one answer.
"""
import json, os, re
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
Q = os.path.join(HERE, 'mind-queue')
OUT = os.path.join(Q, 'equation-pool.jsonl')
SEP = chr(92)
FN_APP = '\u2061'
ZWSP = '\u200b'

# Ordered by trust. The CLEANED pools come first because they have already had
# prose stripped and junk rejected; wave-index is the raw pre-clean extraction and
# is kept last so its rows only survive if nothing better claimed them.
#
# Retargeted 2026-10-04: the previous pool predated arxiv-clean, git-tree-clean,
# corpus-intelligence-clean and downloads-research, so it reported 69,377 while the
# corpus actually held far more. git-gse_comp_intel is deliberately ABSENT -- it
# measured 84% junk (58% web furniture, 26% binary mojibake) and was purged.
SOURCES = [
    ('arxiv_clean', 'arxiv-clean.jsonl'),
    ('markdown_clean', 'markdown-clean-v3.jsonl'),
    ('git_tree', 'git-tree-clean.jsonl'),
    ('unverified_recovered', 'unverified-recoverable.jsonl'),
    ('agree_drain', 'agree-drain.jsonl'),
    ('corpus_intel', 'corpus-intelligence-clean.jsonl'),
    ('downloads', 'downloads-research.jsonl'),
    ('index', 'wave-index.jsonl'),
]

HAS_REL = re.compile(r'[=<>\u2264\u2265\u2248\u2190]|:=|\\to|\\rightarrow|\\le\b|\\ge\b|\\approx')
HAS_MATH = re.compile(r'[0-9\u03b1-\u03c9\u0391-\u03a9\u2211\u220f\u222b\u2202\u221a]|\\[A-Za-z]{2,}')


def norm_key(path, eq):
    t = eq.replace(FN_APP, '').replace(ZWSP, '')
    t = re.sub(r'\s+', '', t)
    return (path, t[:160])


def main():
    cache = {}          # path -> source text, LRU-ish so RAM stays bounded
    pool = {}           # (path,key) -> row
    prov = Counter()
    skipped = Counter()
    unverifiable = 0

    for tag, fname in SOURCES:
        path = os.path.join(Q, fname)
        if not os.path.exists(path):
            skipped['missing:' + fname] += 1
            continue
        n = 0
        with open(path, encoding='utf-8') as fh:
            for line in fh:
                line = line.strip()
                if not line or line.startswith('corpus-roots:'):
                    continue
                try:
                    r = json.loads(line)
                except Exception:
                    skipped['bad_json:' + fname] += 1
                    continue
                eq = r.get('equation') or r.get('printed_equation') or ''
                src = r.get('file') or r.get('source_path') or r.get('path') or ''
                if not eq or not src:
                    skipped['no_equation_or_path:' + fname] += 1
                    continue
                eq = eq.strip()
                if len(eq) < 15 or not HAS_REL.search(eq) or not HAS_MATH.search(eq):
                    skipped['weak_span:' + fname] += 1
                    continue
                src = src.replace(SEP, '/')

                # VERBATIM: only trust the claim for files we can actually re-read
                verified = False
                if os.path.exists(src):
                    if src not in cache:
                        try:
                            with open(src, encoding='utf-8', errors='replace') as g:
                                cache.clear()      # bound RAM: one paper at a time
                                cache[src] = g.read()
                        except Exception:
                            cache[src] = None
                    body = cache.get(src)
                    if body:
                        verified = eq in body.replace(FN_APP, '').replace(ZWSP, '')
                if not verified:
                    unverifiable += 1

                k = norm_key(src, eq)
                if k in pool:
                    if tag not in pool[k]['sources']:
                        pool[k]['sources'].append(tag)
                    skipped['dup'] += 1
                    continue
                pool[k] = {
                    'equation': eq,
                    'path': src,
                    'sources': [tag],
                    'verbatim_verified': verified,
                }
                n += 1
        prov[tag] = n

    rows = list(pool.values())
    with open(OUT, 'w', encoding='utf-8') as fh:
        for r in rows:
            fh.write(json.dumps(r, ensure_ascii=False) + '\n')

    ver = sum(1 for r in rows if r['verbatim_verified'])
    print(json.dumps({
        'sources': dict(prov),
        'pool_rows': len(rows),
        'verbatim_verified': ver,
        'not_recheckable': len(rows) - ver,
        'rows_whose_source_file_was_unreadable': unverifiable,
        'skipped': dict(skipped),
        'out': OUT,
    }, indent=1))


if __name__ == '__main__':
    main()