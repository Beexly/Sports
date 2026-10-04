"""Run the recovered + clean equation rows through eq_normalize.agreed().

These rows are NEW since the 18,006-row pass (7,384 recovered spans), so they have
no agreement verdict yet. Same authority, same output shape as the Gemini lane:
status, compare_key, source_path, printed_equation (unchanged). Verifier only --
no model is asked to rewrite an equation.

Appends to mind-queue/wave-agreement-gemini.jsonl and advances the same seen-file,
so a later full drain will not reprocess them.
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import eq_normalize as E

Q = os.path.join(HERE, 'mind-queue')
OUT = os.path.join(Q, 'wave-agreement-gemini.jsonl')
SEEN = os.path.join(Q, 'wave-agreement-gemini-seen.txt')
SOURCES = [
    os.path.join(Q, 'corpus-recovered.jsonl'),
    os.path.join(Q, 'corpus-equations.jsonl'),
]


def main():
    seen = set()
    if os.path.exists(SEEN):
        with open(SEEN, encoding='utf-8') as f:
            seen = set(x for x in f.read().splitlines() if x)

    rows, adds = [], []
    agree = unver = dup = 0
    for src in SOURCES:
        if not os.path.exists(src):
            continue
        with open(src, encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    r = json.loads(line)
                except Exception:
                    continue
                path = r.get('file', '')
                eq = r.get('equation', '')
                if not path or not eq:
                    continue
                key = E.normalize_key(eq)
                sid = '%s|%s' % (path, key[:80])
                if sid in seen:
                    dup += 1
                    continue
                verdict, compare_key = E.verdict(eq)
                if verdict == 'AGREE':
                    agree += 1
                else:
                    unver += 1
                rows.append(json.dumps({
                    'status': verdict,
                    'compare_key': compare_key,
                    'source_path': path,
                    'printed_equation': eq,      # unchanged
                }, ensure_ascii=False))
                adds.append(sid)

    with open(OUT, 'a', encoding='utf-8') as f:
        for line in rows:
            f.write(line + '\n')
    with open(SEEN, 'a', encoding='utf-8') as f:
        for a in adds:
            f.write(a + '\n')

    print(json.dumps({
        'sources': [os.path.basename(s) for s in SOURCES],
        'appended': len(rows),
        'agreed': agree,
        'unverified': unver,
        'skipped_already_seen': dup,
        'gemini_file_rows_now': sum(1 for _ in open(OUT, encoding='utf-8')),
    }, indent=1))


if __name__ == '__main__':
    main()