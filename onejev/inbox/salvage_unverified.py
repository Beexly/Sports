"""Salvage equations from UNVERIFIED rows WITHOUT widening agree-drain.jsonl.

agree-drain.jsonl is contractually "AGREE rows whose recover status is EQUATION".
This file deliberately does NOT touch it.

Finding that motivates this: 15,505 agreement rows carry status UNVERIFIED,
because eq_normalize.is_clean_equation judges the WHOLE prose row (>4 English
words -> reject). eq_recover judges the extracted SPAN instead, and classifies
10,793 of those same rows as EQUATION. The math was never missing; it was
rejected for carrying English beside it.

So this writes the salvage to a separate, clearly-named file:
  mind-queue/unverified-recoverable.jsonl

Same integrity rules as the drain: verbatim span only, source path only, drop
duplicates on (path, equation), drop TRUNCATED, drop JSX.
"""
import json, os, re, sys
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from eq_recover import recover, drain_row, JSX
from recover_mixed_equations import spans as _split_equation

Q = os.path.join(HERE, 'mind-queue')
SRC = os.path.join(Q, 'wave-agreement-gemini.jsonl')
OUT = os.path.join(Q, 'unverified-recoverable.jsonl')


def main():
    kept, junk, truncated, jsx, dups, nonverb = [], 0, 0, 0, 0, 0
    seen = set()
    with open(SRC, encoding='utf-8') as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                r = json.loads(line)
            except Exception:
                continue
            if r.get('status') != 'UNVERIFIED':
                continue
            printed = r.get('printed_equation') or ''
            got = recover(printed)
            if got['status'] == 'TRUNCATED':
                truncated += 1
                continue
            if got['status'] == 'JUNK':
                junk += 1
                if JSX.search(printed):
                    jsx += 1
                continue
            item = drain_row(r)
            if not item:
                junk += 1
                continue
            eq = item['equation']
            if re.search(r"[=<>≤≥≈←:]\s*$|->\s*$", eq):
                truncated += 1
                continue
            # eq_recover's EQ_SPAN now has no length cap, so a span can run to
            # end-of-line and pick up the row's trailing prose:
            #   '\u03c6 = −1.93 — standings *less* variable than chance.'
            # Cut at a dash/em-dash that starts prose, and at an operator-free
            # English clause after a full stop.
            cut = re.split(r"\s[—–-]\s+(?=[A-Za-z*])|(?<=\.)\s+(?=[A-Z][a-z]{2,}(?:\s+[a-z]{2,}){2,}\s*$)", eq)[0].strip()
            if cut and cut != eq:
                if re.search(r"[=<>≤≥≈←:]\s*$", cut):
                    truncated += 1
                    continue
                if cut in item.get('_printed_source', printed):
                    eq = cut
                elif cut in printed:
                    eq = cut
                else:
                    truncated += 1
                    continue
            # Second pass with the proven gloss cutter. The dash cut above only
            # fires on an explicit em/en dash; rows like
            # 'R = P_exec / ∏ p_j using the book's leg prices vs the parlay price'
            # carry prose with no dash at all. recover_mixed_equations.split_equation
            # already solves this and keeps only verbatim spans.
            try:
                spans = _split_equation(eq)
            except Exception:
                spans = []
            if spans:
                pick = max(spans, key=len)
                if pick in printed and not re.search(
                        r"[=<>≤≥≈←:]\s*$|->\s*$", pick):
                    eq = pick
            if not item.get('verbatim'):
                nonverb += 1
                continue
            key = (item['path'], eq)
            if key in seen:
                dups += 1
                continue
            seen.add(key)
            kept.append({'equation': eq, 'path': item['path'],
                         'status': 'UNVERIFIED_RECOVERABLE', 'verbatim': True})

    with open(OUT, 'w', encoding='utf-8') as fh:
        for k in kept:
            fh.write(json.dumps(k, ensure_ascii=False) + '\n')

    print(json.dumps({
        'unverified_scanned': truncated + junk + len(kept) + dups,
        'kept_equations': len(kept),
        'junk': junk, 'truncated': truncated, 'jsx_dropped': jsx,
        'duplicates_dropped': dups, 'nonverbatim_dropped': nonverb,
        'out': OUT,
    }, indent=1))
    print('\n--- samples ---')
    for k in kept[:10]:
        print('  %s  %s' % (k['equation'][:74], os.path.basename(k['path'])[:38]))


if __name__ == '__main__':
    main()