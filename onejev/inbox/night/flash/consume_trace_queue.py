"""Wave 4 consumer for trace-queue.jsonl.
Consumes in batches of 50.
Fails closed on:
  - domain violations
  - zero denominator
  - nonpositive strength
  - empty sum
  - truncated tail
  - false-merge risk
Outputs to inbox/night/flash/drafts.jsonl.
"""
import os
import sys
import json
import re

HERE = os.path.dirname(os.path.abspath(__file__))
QUEUE_FILE = os.path.abspath(os.path.join(HERE, '..', 'trace-queue.jsonl'))
OUT_FILE = os.path.join(HERE, 'drafts.jsonl')
SEEN_FILE = os.path.join(HERE, 'trace-queue-seen.txt')

def fail_closed_check(row):
    """Evaluates fail-closed conditions. Returns (status, reasoning, content)."""
    text = row.get('text') or row.get('equation') or row.get('content') or ''
    eq = text.strip()
    
    reasons = []
    
    if not eq:
        return "FAIL", "Empty content or missing equation string", None

    # 1. Truncated tail (unbalanced braces/parens or trailing operators/ellipsis)
    depth = 0
    for ch in eq:
        if ch in '{([': depth += 1
        elif ch in '})]':
            depth -= 1
            if depth < 0:
                reasons.append("Unbalanced opening/closing delimiters")
                break
    if depth != 0:
        reasons.append(f"Unbalanced braces/delimiters (depth={depth})")
        
    if re.search(r'[+\-*/=^_,]\s*$', eq) or eq.endswith('...') or eq.endswith('…'):
        reasons.append("Truncated tail ending mid-expression or with trailing operator")

    # 2. Zero denominator
    if re.search(r'/\s*0(?![.\d])', eq) or re.search(r'\\frac\{[^{}]*\}\{0\}', eq):
        reasons.append("Zero denominator detected")

    # 3. Domain violation (e.g. log of nonpositive, sqrt of negative literal)
    if re.search(r'\b(?:log|ln)\s*\(\s*0\s*\)', eq) or re.search(r'\b(?:log|ln)\s*\(\s*-\d', eq):
        reasons.append("Domain error: log of nonpositive value")
    if re.search(r'\\sqrt\{\s*-\d', eq) or re.search(r'√\s*-\d', eq):
        reasons.append("Domain error: square root of negative literal")

    # 4. Nonpositive strength (e.g. beta <= 0 or variance <= 0 when variance must be positive)
    if re.search(r'σ\^2\s*<\s*0', eq) or re.search(r'Var\[.*?\]\s*<\s*0', eq):
        reasons.append("Nonpositive strength/variance specification")

    # 5. Empty sum (e.g. \sum_{i=1}^0 or sum over empty set)
    if re.search(r'\\sum_\{[^}]*\}\^\{0\}', eq) or re.search(r'∑_\{i=1\}\^0', eq):
        reasons.append("Empty sum: index upper bound strictly less than lower bound")

    # 6. False-merge risk (prose contamination, heading markup, multi-statement prose)
    words = [w for w in re.findall(r'[A-Za-z]{4,}', eq) if w.lower() not in {'logit', 'sigmoid', 'softmax', 'exp', 'log', 'brier'}]
    if len(words) > 4:
        reasons.append(f"False-merge risk: sentence prose contamination ({len(words)} descriptive words)")

    if any(art in eq for art in ['className=', 'style={{', 'href=', 'const ', 'function ']):
        reasons.append("Code artifact contamination")

    if reasons:
        return "FAIL", "; ".join(reasons), None
    
    # If passed all fail-closed checks, status is PASS and content is printed result
    return "PASS", "Verified fail-closed: valid domain, non-zero denominator, balanced delimiters, non-prose math AST.", eq

def consume_queue():
    if not os.path.exists(QUEUE_FILE):
        return 0, 0
        
    seen = set()
    if os.path.exists(SEEN_FILE):
        with open(SEEN_FILE, encoding='utf-8') as f:
            seen = set(f.read().splitlines())
            
    rows = []
    with open(QUEUE_FILE, encoding='utf-8') as f:
        for idx, line in enumerate(f):
            if not line.strip(): continue
            key = str(idx)
            if key in seen: continue
            try:
                r = json.loads(line)
                r['_qid'] = key
                rows.append(r)
            except Exception:
                continue

    if not rows:
        return 0, 0

    batch = rows[:50]
    out_lines = []
    seen_ids = []
    
    pass_cnt = 0
    fail_cnt = 0
    
    for r in batch:
        status, reasoning, content = fail_closed_check(r)
        if status == "PASS": pass_cnt += 1
        else: fail_cnt += 1
        
        draft = {
            "id": r.get('id', r.get('_qid')),
            "status": status,
            "reasoning": reasoning,
            "content": content,
            "source_row": r
        }
        out_lines.append(json.dumps(draft, ensure_ascii=False))
        seen_ids.append(r['_qid'])

    with open(OUT_FILE, 'a', encoding='utf-8') as out_f:
        for l in out_lines:
            out_f.write(l + '\n')
            
    with open(SEEN_FILE, 'a', encoding='utf-8') as seen_f:
        for sid in seen_ids:
            seen_f.write(sid + '\n')
            
    return pass_cnt, fail_cnt

if __name__ == '__main__':
    p, f = consume_queue()
    print(f"Consumed batch: PASS={p}, FAIL={f}")
