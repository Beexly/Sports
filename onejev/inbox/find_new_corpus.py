"""Find genuinely unextracted corpus, FAST.

measure_uncorpused.py hashed every file and ran >13 min before I killed it.
The cost was reading 55,701 files. This version skips the work:

  1. Only count docs whose PATH is absent from the index (a set lookup, no I/O).
  2. Collapse duplicate worktree families BEFORE reading anything (~28 copies).
  3. Read file CONTENT only for the survivors, and only up to 8 KB each --
     enough to hash and to judge equation density.

Prints the ranked opportunity list so the next sweep targets real corpus.
"""
import glob, hashlib, os, re
from collections import Counter, defaultdict

HOME = 'C:/Users/Garrett'
INDEX = 'C:/Users/Garrett/onejev/inbox/mind-queue/wave-index.jsonl'
SEP = chr(92)
MAXREAD = 8192

SWEEPT = [
    'C:/Users/Garrett/Sports/docs',
    'C:/Users/Garrett/Sports-wt-engineplan/docs',
    'C:/Users/Garrett/_research/agent-bus/research/arxiv-sweep/fulltext',
]
SKIP_DIR = re.compile(
    r'(?:^|[\\/])(?:node_modules|\.git|\.next|\.worktrees|dist|build|'
    r'\.venv|venv|site-packages|__pycache__|AppData)(?:[\\/]|$)', re.I)


def norm(p):
    return p.replace(SEP, '/')


def already_indexed():
    seen = set()
    with open(INDEX, encoding='utf-8') as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                import json
                r = json.loads(line)
                f = r.get('file')
                if f:
                    seen.add(norm(f))
            except Exception:
                continue
    return seen


def collapse(paths):
    """Group duplicate worktree/checkout families by their trailing shape."""
    fam = defaultdict(list)
    for p in paths:
        parts = p.replace(SEP, '/').split('/')
        # family = the last 2 meaningful path components
        fam['/'.join(parts[-2:])].append(p)
    return fam


def main():
    print('loading index paths...')
    idx = already_indexed()
    print('  index paths:', len(idx))

    swept = {norm(r) for r in SWEEPT}

    print('walking home for .md/.txt...')
    all_docs = []
    for dp, dn, fn in os.walk(HOME):
        if SKIP_DIR.search(dp + '/'):
            dn[:] = []
            continue
        dn[:] = [d for d in dn if not SKIP_DIR.match(d + '/')]
        for f in fn:
            if f.lower().endswith(('.md', '.txt')):
                all_docs.append(norm(os.path.join(dp, f)))
    print('  total .md/.txt on disk:', len(all_docs))

    unindexed = [p for p in all_docs if p not in idx]
    print('  NOT in wave index      :', len(unindexed))

    # drop anything already swept
    unswept = [p for p in unindexed if not any(p.startswith(s) for s in swept)]
    print('  and not under swept roots:', len(unswept))

    fams = collapse(unswept)
    print('  distinct families       :', len(fams))

    # read content only for the biggest families, 8KB each
    rows = []
    hashes = {}
    for name, paths in fams.items():
        if len(paths) < 5:
            continue
        for p in paths[:60]:
            try:
                with open(p, encoding='utf-8', errors='replace') as fh:
                    chunk = fh.read(MAXREAD)
            except Exception:
                continue
            h = hashlib.sha256(chunk.encode('utf-8', 'replace')).hexdigest()[:16]
            hashes.setdefault(h, []).append(p)
            eq = chunk.count('=')
            greek = len(re.findall(r'[α-ωΑ-Ω∑∏∫∂√≈≤≥]', chunk))
            rows.append((eq, greek, len(chunk), p))

    uniq_h = len(hashes)
    dupes = sum(len(v) - 1 for v in hashes.values())
    total_eq = sum(r[0] for r in rows)
    rows.sort(reverse=True)

    print('\n=== VERDICT ===')
    print('  files read (cap 60/family)   :', len(rows))
    print('  DISTINCT by 8KB content hash :', uniq_h)
    print('  duplicate copies             :', dupes)
    print("  '=' occurrences in sample    :", total_eq)

    print('\n=== TOP 25 files by math density ===')
    for eq, greek, ln, p in rows[:25]:
        short = p.replace(HOME + '/', '')[:70]
        print('  eq=%5d greek=%4d  %s' % (eq, greek, short))

    # family-level rollup: where is the volume
    fam_eq = Counter()
    for eq, greek, ln, p in rows:
        parts = p.replace(HOME + '/', '').split('/')
        fam_eq['/'.join(parts[:2])] += eq
    print('\n=== TOP 15 directories by total math ===')
    for d, n in fam_eq.most_common(15):
        print('  %8d  %s' % (n, d))


if __name__ == '__main__':
    main()