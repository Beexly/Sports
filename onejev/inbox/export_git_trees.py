"""Extract documents straight from FETCHED GIT OBJECTS -- no checkout, no mutation.

The census exposed that the local checkouts are stale:
  agent-bus  local 17 commits behind origin/main, 352 more .md/.txt there
  Sports     local is on branch docs/surf-21-round, not main; 3,995 .md/.txt
             exist on origin/main

Extracting from the working tree would re-ingest old copies. Instead read blobs
with `git show origin/main:<path>` so the corpus is built from what the remote
actually holds, and nothing on disk is touched.

Documents are written to a temp tree first (one file per blob) because the
extractors are line-oriented readers, not git-aware.
"""
import json, os, re, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))

REPOS = [
    ('agent_bus', 'C:/Users/Garrett/_research/agent-bus', 'origin/main'),
    ('sports', 'C:/Users/Garrett/Sports', 'origin/main'),
    ('gse_comp_intel', 'C:/Users/Garrett/_research/gse-competitive-intel', 'origin/main'),
]

SKIP_DIR = re.compile(
    r'(?:^|/)(?:node_modules|\.git|dist|build|coverage|\.next|__pycache__'
    r'|\.venv|venv|public|assets|fonts|images)(?:/|$)', re.I)
DOC = re.compile(r'\.(md|txt)$', re.I)


def git(repo, *args):
    return subprocess.run(['git', '-C', repo] + list(args),
                          capture_output=True, text=True, errors='replace')


def main():
    wanted = sys.argv[1:] or [n for n, _, _ in REPOS]
    grand = {}
    for name, repo, ref in REPOS:
        if name not in wanted:
            continue
        if not os.path.isdir(repo):
            print('%-16s MISSING %s' % (name, repo))
            continue

        r = git(repo, 'rev-parse', ref)
        if r.returncode != 0:
            print('%-16s NO %s (%s)' % (name, ref, r.stderr.strip()[:60]))
            continue
        sha = r.stdout.strip()

        t = git(repo, 'ls-tree', '-r', '--name-only', ref)
        paths = [p for p in t.stdout.splitlines()
                 if DOC.search(p) and not SKIP_DIR.search(p)]
        print('%-16s %s  docs in tree: %d' % (name, sha[:8], len(paths)))

        outroot = tempfile.mkdtemp(prefix='gitextract_%s_' % name)
        written = 0
        for i, p in enumerate(paths):
            b = git(repo, 'show', '%s:%s' % (ref, p))
            if b.returncode != 0 or not b.stdout:
                continue
            try:
                b.stdout.encode('utf-8', 'replace').decode('utf-8')
            except Exception:
                continue
            safe = re.sub(r'[^A-Za-z0-9._-]', '_', p)[-120:]
            with open(os.path.join(outroot, '%05d__%s' % (i, safe)),
                      'w', encoding='utf-8', errors='replace') as fh:
                fh.write(b.stdout)
            written += 1
            if written % 800 == 0:
                print('   ... %d/%d blobs materialized' % (written, len(paths)))

        print('%-16s materialized %d blobs -> %s' % (name, written, outroot))
        grand[name] = {'repo': repo, 'ref': ref, 'sha': sha,
                       'docs_in_tree': len(paths), 'blobs_written': written,
                       'extracted_to': outroot}

    out = os.path.join(HERE, 'git-tree-export.json')
    with open(out, 'w', encoding='utf-8') as fh:
        json.dump(grand, fh, indent=1)
    print('\nwrote', out)


if __name__ == '__main__':
    main()