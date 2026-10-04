"""Reclassify ONLY the truncated AGREE rows and APPEND recovered ones.

The LaTeX-aware balance check in eq_recover (3).py fixes a real bug: the old
naive bracket count rejected every row containing \\left( \\big( \\Big[ because
the opener and closer are DIFFERENT tokens. 4,416 AGREE rows were dropped as
truncated; most are balanced equations.

Contract, exactly as specified:
  * Do NOT rewrite the existing 12,946 drain rows -- append only.
  * Reclassify ONLY rows whose previous verdict was TRUNCATED.
  * Skip any path+equation already present in the drain.
  * Empty right-hand side and a leading ellipsis stay TRUNCATED.
  * JSX stays JUNK.
  * No sweep, no trainer, no mind.jsonl.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from eq_recover import (CODE, EQ_SPAN, JSX, SIZING, TRUNC_LEFT,  # noqa: E402
                       DANGLING, recover)

AGREE = os.path.join(HERE, 'mind-queue', 'wave-agreement-gemini.jsonl')
DRAIN = os.path.join(HERE, 'mind-queue', 'agree-drain.jsonl')
RECEIPT = os.path.join(HERE, 'wave-receipt.log')

AGREE_STATES = {'AGREE', 'AGREED', 'AGREE_RECOVERED'}


def load_agree():
    rows = []
    for line in open(AGREE, encoding='utf-8', errors='replace'):
        line = line.strip()
        if not line:
            continue
        try:
            r = json.loads(line)
        except Exception:
            continue
        if str(r.get('status') or '').upper() in AGREE_STATES:
            rows.append(r)
    return rows


def drain_keys():
    """path+equation pairs ALREADY in the drain -- these must not be appended twice."""
    seen = set()
    if not os.path.exists(DRAIN):
        return seen
    for line in open(DRAIN, encoding='utf-8', errors='replace'):
        line = line.strip()
        if not line:
            continue
        try:
            r = json.loads(line)
        except Exception:
            continue
        seen.add((r.get('path') or r.get('source_path'), r.get('equation')))
    return seen


def was_truncated(text):
    """Would the PREVIOUS (naive-balance) gate have called this truncated?

    True when the row still truncates under explicit rules (empty RHS, leading
    ellipsis, dangling) OR when naive bracket counting fails but the LaTeX-aware
    count succeeds -- that difference IS the bug being reclassified.
    """
    if not text:
        return False
    if text.startswith(('...', '\u2026')):
        return True
    if TRUNC_LEFT.match(text) or text.endswith('='):
        return True
    if DANGLING.search(text):
        return True
    naive = (text.count('{') == text.count('}')
             and text.count('(') == text.count(')')
             and text.count('[') == text.count(']'))
    return not naive


def main():
    agree = load_agree()
    already = drain_keys()

    candidates = []
    for r in agree:
        printed = str(r.get('printed_equation') or r.get('equation') or '')
        if JSX.search(printed) or CODE.match(printed.strip()):
            continue                      # JSX stays JUNK
        text = printed.strip()
        if not was_truncated(text):
            continue                      # only reclassify truncated rows
        if text.startswith(('...', '\u2026')) or TRUNC_LEFT.match(text) or text.endswith('='):
            continue                      # ellipsis / empty RHS stay TRUNCATED
        candidates.append((r, text))
    # EQ_SPAN's leading class is [A-Za-zθμτσα-ωΑ-Ωκ] and MISSES Latin Extended
    # capitals like Ĉ (U+0108), so 'Ĉ(p) = p^γ / [p^γ + (1−p)^γ]' yields the span
    # 'p) = ...' -- the opener is dropped and the remainder looks unbalanced. A row
    # the fix cannot help is still counted, just not as a candidate.

    appended, still_trunc, skipped_dup = [], 0, 0
    for r, text in candidates:
        got = recover(text)
        if got['status'] != 'EQUATION':
            still_trunc += 1
            continue
        path = r.get('path') or r.get('source_path')
        if not path:
            still_trunc += 1
            continue
        key = (path, got['equation'])
        if key in already:
            skipped_dup += 1
            continue
        already.add(key)
        appended.append({
            'equation': got['equation'],
            'path': path,
            'page': r.get('page'),
            'status': 'AGREE_RECOVERED',
            'verbatim': got['equation'] in text,
        })

    if appended:
        with open(DRAIN, 'a', encoding='utf-8') as fh:
            for row in appended:
                fh.write(json.dumps(row, ensure_ascii=False) + '\n')

    span_blocked = 0
    for r in agree:
        printed = str(r.get('printed_equation') or r.get('equation') or '')
        if JSX.search(printed) or CODE.match(printed.strip()):
            continue
        text = printed.strip()
        if was_truncated(text):
            continue
        if recover(text)['status'] == 'TRUNCATED':
            m = EQ_SPAN.search(text)
            span = (m.group(0).strip().rstrip(',') if m else '')
            cleaned = SIZING.sub('', span)
            if (span and cleaned.count('(') != cleaned.count(')')
                    and recover(span)['status'] == 'TRUNCATED'):
                span_blocked += 1

    out = {
        'reconsidered': len(candidates),
        'span_regex_cannot_fix': span_blocked,
        'recovered': len(appended),
        'still_truncated': still_trunc,
        'appended': len(appended),
        'skipped_already_in_drain': skipped_dup,
        'drain_rows_before': len(agree) and sum(1 for _ in open(DRAIN, encoding='utf-8', errors='replace')) - len(appended),
        'drain_rows_after': sum(1 for _ in open(DRAIN, encoding='utf-8', errors='replace')),
    }
    print(json.dumps(out, indent=1))
    return out


if __name__ == '__main__':
    main()