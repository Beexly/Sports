"""Did removing the character caps stop mid-expression truncation?

The delegated audit measured the signature: max span was 250 chars, 34.9% of
rows sat at >=220, and crossing that boundary unbalanced jumped 7.8% -> 34.5%.
Direct source inspection found 16% of spans resumed with more math right after
the cut. The 220/320 caps in arxiv_extract.py silently truncated rather than
rejecting.

After replacing them with structural boundaries, the same signature must move.

NOTE ON A BUG I HIT: extract() returns DICTS, not tuples. An earlier version of
this check unpacked it as tuples and read the string 'equation' as the span,
which collapsed every metric to "max length 8". Verify the row shape first.
"""
import glob
import os
import random
import re
import sys

sys.path.insert(0, '.')
import arxiv_extract as A  # noqa: E402

FT = 'C:/Users/Garrett/_research/agent-bus/research/arxiv-sweep/fulltext'
N = 500
SEED = 20260103
PAPERS = 120          # bounded so RAM stays inside the ~2.8 GB headroom


def main():
    probe = A.extract(open(sorted(glob.glob(os.path.join(FT, '*.txt')))[0],
                            encoding='utf-8', errors='replace').read())
    assert isinstance(probe[0], dict), 'extract() must return dicts'
    print('row shape verified: %s\n' % ', '.join(sorted(probe[0].keys())))

    files = sorted(glob.glob(os.path.join(FT, '*.txt')))
    random.Random(7).shuffle(files)

    rows = []
    for f in files[:PAPERS]:
        t = open(f, encoding='utf-8', errors='replace').read()
        for r in A.extract(t):
            eq = r['equation']
            if eq and eq in t:
                rows.append((f, t, eq))

    random.Random(SEED).shuffle(rows)
    s = rows[:N]
    lens = sorted(len(e) for _f, _t, e in s)

    unbalanced = sum(1 for _f, _t, e in s if not A._balanced(e))
    ends_op = sum(1 for _f, _t, e in s
                  if re.search(r'[=<>\u2264\u2265\u2248\\{,]\s*$', e))
    cut = 0
    for _f, t, e in s:
        i = t.find(e)
        if i >= 0 and re.match(r'^\s*[A-Za-z0-9\\{}^_\u03b1-\u03c9\u0391-\u03a9]',
                               t[i + len(e):i + len(e) + 12]):
            cut += 1
    over = sum(1 for x in lens if x >= 220)

    print('sampled                : %d' % len(s))
    print('max span length        : %d    was 250' % lens[-1])
    print('p50 / p90              : %d / %d' % (lens[len(lens) // 2],
                                                 lens[int(len(lens) * 0.9)]))
    print('spans >= 220 chars     : %d (%.1f%%)   was 34.9%%' % (over, 100.0 * over / len(lens)))
    print('unbalanced             : %d (%.1f%%)   was 16.6%%' % (unbalanced, 100.0 * unbalanced / len(lens)))
    print('ends on operator/comma : %d (%.1f%%)' % (ends_op, 100.0 * ends_op / len(lens)))
    print('source resumes w/ math : %d (%.1f%%)   was 16.0%%   <-- the cut signature'
          % (cut, 100.0 * cut / len(lens)))


if __name__ == '__main__':
    main()