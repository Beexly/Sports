"""Recount unseen corpus against the CURRENT index, and record the quarantine.

measure_uncorpused.py finished but ran against the pre-arXiv index, so its
"UNSEEN 18563" is stale: it counted the 1,113 arXiv papers and 3,569
corpus-intelligence briefs as new when I have since extracted both.

It also swept without any exclusion list. That is how a directory named
03_quarantine_DO_NOT_INGEST -- privileged attorney correspondence for the
Turner matter, quarantined by name and by turner_quarantine.py -- turned up in
the sample. Ingesting client-attorney privileged material into a corpus that
trains a public-facing engine is not "more data", it is a legal problem for
Garrett. EXCLUSIONS below is the guard; anything matching it is never read.
"""
import hashlib, json, os, re, sys
from collections import Counter, defaultdict

HOME = 'C:/Users/Garrett'
INDEX = os.path.join(HOME, 'onejev/inbox/mind-queue/wave-index.jsonl')

# --- hard exclusions: privileged, third-party, or generated -----------------
EXCLUSIONS = [
    (re.compile(r'Turner_Case_AI[/\\]03_quarantine', re.I),
     'privileged attorney correspondence, quarantined by name + turner_quarantine.py'),
    (re.compile(r'Turner_Case_AI[/\\](?:01_raw_takeout|02_corpus_text)', re.I),
     'raw privileged matter intake'),
    (re.compile(r'[/\\]node_modules[/\\]|[/\\]\.git[/\\]|[/\\]AppData[/\\]', re.I),
     'dependency / VCS / OS'),
    (re.compile(r'[/\\]site-packages[/\\]|[/\\]\.venv[/\\]|[/\\]dist[/\\]', re.I),
     'packaged dependency'),
    (re.compile(r'[/\\]\.bun[/\\]|[/\\]\.cache[/\\]|[/\\]\.next[/\\]', re.I),
     'package/build cache'),
    (re.compile(r'[/\\]\.claude[/\\]skills[/\\]|[/\\]\.agents[/\\]skills[/\\]', re.I),
     'skill library (vendor-authored)'),
    (re.compile(r'[/\\]third_party[/\\]', re.I), 'vendored third-party'),
]

DOC = re.compile(r'\.(md|txt)$', re.I)


def excluded(path):
    for rx, why in EXCLUSIONS:
        if rx.search(path):
            return why
    return None


def norm(p):
    p = p.strip().replace('\\', '/')
    return p[2:] if p.startswith('./') else p


def walk_docs():
    skip_names = {'node_modules', '.git', 'AppData', 'site-packages', '.venv',
                  'venv', '__pycache__', '.next', '.bun', '.cache', 'dist',
                  'third_party'}
    out = []
    for dp, dn, fn in os.walk(HOME):
        dn[:] = [d for d in dn if d not in skip_names]
        for f in fn:
            if DOC.search(f):
                out.append(os.path.join(dp, f).replace('\\', '/'))
    return out


def main():
    indexed = set()
    if os.path.exists(INDEX):
        for line in open(INDEX, encoding='utf-8', errors='replace'):
            try:
                r = json.loads(line)
            except Exception:
                continue
            p = r.get('file') or r.get('path') or r.get('source_path')
            if p:
                indexed.add(p.replace('\\', '/'))
    print('current index paths:', len(indexed))

    docs = walk_docs()
    print('docs on disk       :', len(docs))

    excl_count = Counter()
    kept = []
    for p in docs:
        why = excluded(p)
        if why:
            excl_count[why] += 1
            continue
        kept.append(p)
    print('EXCLUDED           :', sum(excl_count.values()))
    for why, n in excl_count.most_common():
        print('   %6d  %s' % (n, why))

    unseen = [p for p in kept if p not in indexed]
    print('unseen (not indexed):', len(unseen))

    by_dir = Counter('/'.join(p.split('/')[:-1]) for p in unseen)
    print('\n=== TOP 25 unseen directories (already exclusion-filtered) ===')
    for d, n in by_dir.most_common(25):
        print('  %6d  %s' % (n, d.replace(HOME + '/', '')))

    json.dump({'unseen_total': len(unseen),
               'excluded': dict(excl_count),
               'top_dirs': dict(by_dir.most_common(60))},
              open(os.path.join(HOME, 'onejev/inbox/unseen-recount.json'), 'w',
                   encoding='utf-8'), indent=1)
    print('\nwrote unseen-recount.json')


if __name__ == '__main__':
    main()