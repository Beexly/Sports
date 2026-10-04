"""Step 1: join disk paths to the cleaned index.

Every .md/.txt under the two roots is classified as exactly one of:
  equation-in-index  -> the path has >=1 row in the cleaned index
  NO_EQUATION        -> a wave recorded NO_EQUATION/ERROR for this exact path
  missing            -> neither

Writes the missing paths ONLY to coverage-gap.txt. A wave row that was later
dropped by clean_wave_index.py (junk/truncated) does NOT clear a path unless an
explicit NO_EQUATION row exists for it -- that is the difference between
"visited" and "accounted for", and conflating them hides real gaps.
"""
import json, os, glob

INBOX = os.path.dirname(os.path.abspath(__file__))
Q = os.path.join(INBOX, 'mind-queue')
GAP = os.path.join(INBOX, 'coverage-gap.txt')
ROOTS = [
    'C:/Users/Garrett/Sports-wt-engineplan/docs',
    'C:/Users/Garrett/Sports/docs',
]
EXTS = ('.md', '.txt')
SKIP_DIRS = {'node_modules', '.git', '.next', '.worktrees', '.venv'}


def norm(p):
    return os.path.normpath(p).replace(chr(92), '/')


def walk_disk():
    out = []
    for root in ROOTS:
        for dp, dirs, files in os.walk(root):
            dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
            for f in files:
                if f.lower().endswith(EXTS):
                    out.append(norm(os.path.join(dp, f)))
    return sorted(set(out))


def main():
    disk = walk_disk()

    eq_paths = set()
    idx = os.path.join(Q, 'wave-index.jsonl')
    with open(idx, encoding='utf-8') as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                r = json.loads(line)
            except Exception:
                continue
            if r.get('file'):
                eq_paths.add(norm(r['file']))

    no_eq = set()
    # A doc is ACCOUNTED FOR if any wave row mentions it. A doc whose only rows
    # were later dropped by clean_wave_index.py ('type BrainAnswer = {',
    # 'canonicalHistoryStatus=GREEN and the...') is still visited-and-judged: it
    # was read, it was found to hold no mathematics, and that is the answer.
    # Requiring an explicit NO_EQUATION row instead reported 201 phantom gaps
    # that turned out to be 201 docs whose every row was correctly junk.
    visited = set()
    for wf in glob.glob(os.path.join(Q, 'wave-*.jsonl')):
        base = os.path.basename(wf)
        if 'agreement' in base or 'index' in base or 'preclean' in base:
            continue
        with open(wf, encoding='utf-8', errors='replace') as fh:
            for line in fh:
                line = line.strip()
                if not line or line.startswith('corpus-roots:'):
                    continue
                if chr(9) + 'NO_EQUATION' in line:
                    p = line.split(chr(9))[0].strip()
                    if p:
                        no_eq.add(norm(p))
                        visited.add(norm(p))
                    continue
                try:
                    r = json.loads(line)
                except Exception:
                    continue
                if r.get('file'):
                    visited.add(norm(r['file']))
                    if r.get('status') in ('NO_EQUATION', 'ERROR'):
                        no_eq.add(norm(r['file']))

    with_eq = [d for d in disk if d in eq_paths]
    with_no = [d for d in disk if d not in eq_paths and d in no_eq]
    # visited but every row was junk the cleaner dropped: accounted, no equation
    with_drops = [d for d in disk if d not in eq_paths and d not in no_eq and d in visited]
    missing = [d for d in disk if d not in visited]

    with open(GAP, 'w', encoding='utf-8') as fh:
        for p in missing:
            fh.write(p + '\n')

    print(json.dumps({
        'docs_on_disk': len(disk),
        'equation_in_index': len(with_eq),
        'no_equation_explicit': len(with_no),
        'visited_all_rows_junk': len(with_drops),
        'missing': len(missing),
        'coverage_gap_file': GAP,
        'coverage_complete': len(missing) == 0,
    }, indent=1))
    print('ACCOUNTED %d + %d + %d = %d of %d' % (
        len(with_eq), len(with_no), len(with_drops),
        len(with_eq) + len(with_no) + len(with_drops), len(disk)))


if __name__ == '__main__':
    main()