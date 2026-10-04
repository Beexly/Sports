"""Explain WHY each agreement row was dropped from agree-drain.jsonl.

The user asked for `python drain_reasons.py mind-queue/wave-agreement-gemini.jsonl`,
but no such script exists on this machine (not in inbox, not in Downloads, not
found anywhere under C:/Users/Garrett to depth 4). Rather than silently skip the
request or invent behaviour, this implements the obvious intent: break the
20,638 AGREE rows down by drop reason using the SAME predicates eq_recover.recover
and build_drain.load_agree use, so the numbers reconcile with wave-receipt.json
exactly rather than approximately.

Run:  python drain_reasons.py mind-queue/wave-agreement-gemini.jsonl
"""
import json
import os
import sys
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from eq_recover import JSX, JUNK, TRUNC_LEFT, DANGLING, recover  # noqa: E402


def load_agree(path):
    rows = []
    for line in open(path, encoding='utf-8', errors='replace'):
        line = line.strip()
        if not line:
            continue
        try:
            r = json.loads(line)
        except Exception:
            continue
        if str(r.get('status') or '').upper() in {'AGREE', 'AGREED', 'AGREE_RECOVERED'}:
            rows.append(r)
    return rows


def reason_for(row):
    """Classify one AGREE row the way write_drain drops it."""
    printed = str(row.get('printed_equation') or row.get('equation') or '')
    text = printed.strip()

    if not text:
        return 'empty_printed_equation'
    # JSX/CSS wins over the alias check because it can appear anywhere
    if JSX.search(text):
        return 'jsx_or_css'
    got = recover(text)
    if got['status'] == 'TRUNCATED':
        if TRUNC_LEFT.match(text):
            return 'truncated_empty_rhs'
        if text.startswith(('...', '\u2026')):
            return 'truncated_leading_ellipsis'
        if DANGLING.search(text):
            return 'truncated_dangling'
        return 'truncated_unbalanced_or_cut'
    if got['status'] != 'EQUATION':
        if JUNK.match(text):
            return 'junk_alias_or_heading'
        return 'junk_no_equation_span'
    if not (row.get('path') or row.get('source_path')):
        return 'no_path'
    return None


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        HERE, 'mind-queue', 'wave-agreement-gemini.jsonl')
    rows = load_agree(src)

    reasons = Counter()
    kept = []
    seen = set()
    for r in rows:
        why = reason_for(r)
        if why:
            reasons[why] += 1
            continue
        item = recover(str(r.get('printed_equation') or r.get('equation') or ''))
        key = (r.get('path') or r.get('source_path'), item['equation'])
        if key in seen:
            reasons['duplicate_path_plus_equation'] += 1
            continue
        seen.add(key)
        kept.append(key)

    print(json.dumps({
        'source': os.path.basename(src),
        'agree_in': len(rows),
        'kept': len(kept),
        'dropped': len(rows) - len(kept),
        'drop_reasons': dict(reasons.most_common()),
        'reconciles': (len(kept) + sum(reasons.values()) == len(rows)),
    }, indent=1))


if __name__ == '__main__':
    main()