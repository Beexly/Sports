"""Rank the 56,611 unextracted candidate docs -- and exclude vendor noise.

A delegated subagent produced the candidate list (Temp/corpus_probe/cands.txt)
but never analyzed it. Reading it shows most entries are third-party package
docs: .bun/install/cache/**, .agents/skills/**, node_modules docs. Those are
vendored READMEs, not Garrett's corpus, and ingesting them would poison the pool
with API documentation.

So: filter to OWNED content first, then rank what survives by math density.
Ownership = not a package cache, not a skill library, not site-packages.
"""
import os, re
from collections import Counter, defaultdict

CANDS = os.path.expandvars(r'%LOCALAPPDATA%\Temp\corpus_probe\cands.txt')
INDEX = os.path.expandvars(r'%LOCALAPPDATA%\Temp\corpus_probe\index_paths.txt')
HOME = 'C:/Users/Garrett'

# third-party / vendored trees that must NOT enter the corpus
VENDOR = re.compile(
    r'(?:^|/)'
    r'(?:node_modules|\.bun|site-packages|dist-info|__pycache__|\.venv|venv|'
    r'pkgs|\.cache|\.npm|\.yarn|\.cargo|\.rustup|go/pkg|'
    r'\.agents/skills|\.claude/skills|\.hermes/skills|'
    r'Templates|Library/Application Support)'
    r'(?:/|$)', re.I)

MATHY = re.compile(r'[0-9\u03b1-\u03c9\u0391-\u03a9\u2211\u220f\u222b\u2202\u221a]|\\[A-Za-z]{2,}')


def norm(p):
    p = p.strip().replace('\\', '/')
    return p[2:] if p.startswith('./') else p


def main():
    indexed = set()
    if os.path.exists(INDEX):
        for line in open(INDEX, encoding='utf-8', errors='replace'):
            line = norm(line)
            if line:
                indexed.add(line)
    print('already-indexed paths:', len(indexed))

    cands = []
    with open(CANDS, encoding='utf-8', errors='replace') as fh:
        for line in fh:
            p = norm(line)
            if p:
                cands.append(p)
    print('candidate docs       :', len(cands))

    unindexed = [p for p in cands if p not in indexed]
    print('NOT already indexed  :', len(unindexed))

    vend = [p for p in unindexed if VENDOR.search(p)]
    owned = [p for p in unindexed if not VENDOR.search(p)]
    print('  vendor (excluded)  :', len(vend))
    print('  OWNED candidates   :', len(owned))

    # worktree family collapse
    fam = defaultdict(list)
    for p in owned:
        parts = p.split('/')
        fam['/'.join(parts[-2:])].append(p)
    print('  distinct families  :', len(fam))
    dupes = sum(len(v) - 1 for v in fam.values())
    print('  duplicate copies   :', dupes)

    # directory rollup (cheap: no file reads)
    dir_eq = Counter()
    dir_n = Counter()
    for p in owned:
        d = '/'.join(p.split('/')[:-1])
        dir_n[d] += 1
    print('\n=== TOP 30 OWNED directories by file count ===')
    for d, n in dir_n.most_common(30):
        print('  %6d  %s' % (n, d.replace(HOME + '/', '')))


if __name__ == '__main__':
    main()