"""How much GENUINELY new corpus is outside the two swept roots?

55,701 .md/.txt files live outside Sports/docs and Sports-wt-engineplan/docs,
but most are worktree copies of the same repo at different branches
(~1,018 docs x 15 near-identical Sports-wt-* branches). Counting files would
inflate the opportunity and produce a dishonest number.

So: hash each file's CONTENT and count distinct hashes. That answers the question
that actually matters -- how much text has never been seen by any extractor.
"""
import hashlib, os
from collections import defaultdict

EXTS = ('.md', '.txt')
SKIP_PARTS = {
    'node_modules', '.git', '.next', '.worktrees', '.venv', 'venv',
    'AppData', 'Downloads', 'Documents', 'Pictures', 'Music', 'Movies',
    '.sports-scrub-20261003', '.cagent', '.hermes', 'cache',
}
SWEPT = (
    os.path.normpath('C:/Users/Garrett/Sports/docs'),
    os.path.normpath('C:/Users/Garrett/Sports-wt-engineplan/docs'),
)


def skip(p):
    low = p.lower()
    for s in SKIP_PARTS:
        if os.sep + s.lower() + os.sep in low or low.endswith(os.sep + s.lower()):
            return True
    return False


def main():
    root = 'C:/Users/Garrett'
    by_hash = defaultdict(list)
    swept_hashes = set()
    n = swept_n = 0

    for dp, dirs, files in os.walk(root):
        dirs[:] = [d for d in dirs if d not in SKIP_PARTS and d != '.git']
        norm_dp = os.path.normpath(dp)
        for f in files:
            if not f.lower().endswith(EXTS):
                continue
            p = os.path.join(dp, f)
            if skip(p):
                continue
            try:
                if os.path.getsize(p) < 200:
                    continue
                with open(p, 'rb') as fh:
                    h = hashlib.sha256(fh.read()).hexdigest()
            except Exception:
                continue
            n += 1
            by_hash[h].append(p)
            if any(norm_dp.startswith(s) for s in SWEPT):
                swept_hashes.add(h)
                swept_n += 1

    uniq = set(by_hash)
    fresh = uniq - swept_hashes
    dup_files = n - len(uniq)

    print('files scanned            : %d' % n)
    print('  from swept roots       : %d' % swept_n)
    print('distinct content hashes  : %d' % len(uniq))
    print('  duplicate files        : %d  (worktree copies)' % dup_files)
    print()
    print('SEEN content (in swept)  : %d' % len(swept_hashes))
    print('UNSEEN content (new)     : %d' % len(fresh))
    print()
    print('--- sample of genuinely unseen docs ---')
    shown = 0
    for h in fresh:
        for p in by_hash[h][:1]:
            print('   %s' % p.replace(root + os.sep, '')[:96])
            shown += 1
            break
        if shown >= 20:
            break


if __name__ == '__main__':
    main()