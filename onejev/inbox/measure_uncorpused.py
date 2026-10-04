"""Fast measurement: how much genuinely new corpus is outside the two swept roots?

The first version walked all of C:/Users/Garrett and ran >13 minutes because
~15 Sports-wt-* branches each carry ~1,018 near-identical docs. Those branches are
duplicates of one another, so this version:

  1. collapses worktree/branch families to ONE representative (same base name)
  2. hashes content, not paths, so even a differing copy counts once
  3. reports distinct NEW hashes vs hashes already covered by the swept roots

Read-only. No sweep, no extraction, no trainer touched.
"""
import hashlib, os, re, sys
from collections import defaultdict

EXTS = ('.md', '.txt')
MIN_BYTES = 200

SKIP_DIRS = {
    'node_modules', '.git', '.next', '.worktrees', '.venv', 'venv', '__pycache__',
    'AppData', 'Downloads', 'Documents', 'Pictures', 'Music', 'Movies', 'Videos',
    'OneDrive', '$RECYCLE.BIN', 'System Volume Information', 'cache', 'Cache',
    'Temp', '.sports-scrub-20261003', '.cagent', '.hermes', '.ollama', '.cargo',
    '.rustup', '.vscode', '.cursor', '.npm', '.pnpm-store', '.gradle', '.m2',
}

# Family names that are copies of each other across branches.
FAMILY = re.compile(r'^(Sports|Sports-wt)[-.].*')
SWEPT_PREFIXES = (
    'C:\\Users\\Garrett\\Sports\\docs',
    'C:\\Users\\Garrett\\Sports-wt-engineplan\\docs',
)


def is_swept(path):
    return any(path.lower().startswith(p.lower()) for p in SWEPT_PREFIXES)


def main():
    root = 'C:\\Users\\Garrett'
    # ---- pass 1: pick one representative directory per family -------------
    tops = []
    for name in sorted(os.listdir(root)):
        full = os.path.join(root, name)
        if not os.path.isdir(full) or name in SKIP_DIRS or name.startswith('.'):
            continue
        tops.append(full)

    # group branch copies: 'Sports-wt-brier' family -> keep the alphabetically
    # first, record the rest as skipped duplicates
    families = defaultdict(list)
    for t in tops:
        base = os.path.basename(t)
        if FAMILY.match(base):
            families[os.path.dirname(t)].append(t)
    skipped = []
    for parent, members in families.items():
        members.sort(key=lambda p: len(p))
        skipped.extend(members[1:])

    scanned_roots = [t for t in tops if t not in skipped]
    print('top-level dirs scanned : %d' % len(scanned_roots))
    print('branch copies skipped  : %d' % len(skipped))
    for s in skipped[:8]:
        print('    skipped %s' % os.path.basename(s))

    # ---- pass 2: hash content ---------------------------------------------
    by_hash = defaultdict(list)
    swept_hashes = set()
    n = 0
    for base in scanned_roots:
        for dp, dirs, files in os.walk(base):
            dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
            for f in files:
                if not f.lower().endswith(EXTS):
                    continue
                p = os.path.join(dp, f)
                try:
                    if os.path.getsize(p) < MIN_BYTES:
                        continue
                    with open(p, 'rb') as fh:
                        h = hashlib.sha256(fh.read()).hexdigest()
                except Exception:
                    continue
                n += 1
                by_hash[h].append(p)
                if is_swept(p):
                    swept_hashes.add(h)

    uniq = set(by_hash)
    fresh = uniq - swept_hashes

    print()
    print('files hashed            : %d' % n)
    print('distinct content hashes : %d' % len(uniq))
    print('duplicate files         : %d' % (n - len(uniq)))
    print()
    print('SEEN (in swept roots)   : %d' % len(swept_hashes))
    print('UNSEEN (genuinely new)  : %d' % len(fresh))
    print()

    # where the new content lives
    loc = defaultdict(int)
    for h in fresh:
        p = by_hash[h][0]
        rel = os.path.relpath(p, root)
        loc['\\'.join(rel.split('\\')[:2])] += 1
    print('--- unseen content by location (top 15) ---')
    for k, v in sorted(loc.items(), key=lambda kv: -kv[1])[:15]:
        print('  %6d  %s' % (v, k))

    print()
    print('--- sample unseen docs ---')
    shown = 0
    for h in fresh:
        print('   %s' % os.path.relpath(by_hash[h][0], root)[:96])
        shown += 1
        if shown >= 15:
            break


if __name__ == '__main__':
    main()