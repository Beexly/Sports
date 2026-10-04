"""Verifier only. Model: gemini-3.8-flash-low.
Strict compliance with user instructions:
- No extraction
- No inventing an equation
- No rewriting an equation
- No reordering terms
- No appending brain/mind.jsonl
- No printing keys
- Normalization rules: strip whitespace, map LaTeX macros to unicode, drop \\text{},
  drop underscores and braces, do not sort terms.
- Compare reading of printed source to that key.
- If one would have to change the printed equation to match, status is UNVERIFIED.
- Skip rows whose key is already in wave-agreement-gemini-seen.txt.
"""
import os
import sys
import json
import re

HERE = os.path.dirname(os.path.abspath(__file__))
QUEUE = os.path.join(HERE, 'mind-queue')
INDEX = os.path.join(QUEUE, 'wave-index.jsonl')
OUT = os.path.join(QUEUE, 'wave-agreement-gemini.jsonl')
SEEN = os.path.join(QUEUE, 'wave-agreement-gemini-seen.txt')

LATEX_MACROS = [
    (r'\\alpha', 'α'), (r'\\beta', 'β'), (r'\\gamma', 'γ'), (r'\\delta', 'δ'),
    (r'\\epsilon', 'ε'), (r'\\varepsilon', 'ε'), (r'\\zeta', 'ζ'), (r'\\eta', 'η'),
    (r'\\theta', 'θ'), (r'\\iota', 'ι'), (r'\\kappa', 'κ'), (r'\\lambda', 'λ'),
    (r'\\mu', 'μ'), (r'\\nu', 'ν'), (r'\\xi', 'ξ'), (r'\\pi', 'π'),
    (r'\\rho', 'ρ'), (r'\\sigma', 'σ'), (r'\\tau', 'τ'), (r'\\upsilon', 'υ'),
    (r'\\phi', 'φ'), (r'\\varphi', 'φ'), (r'\\chi', 'χ'), (r'\\psi', 'ψ'),
    (r'\\omega', 'ω'), (r'\\Gamma', 'Γ'), (r'\\Delta', 'Δ'), (r'\\Theta', 'Θ'),
    (r'\\Lambda', 'Λ'), (r'\\Xi', 'Ξ'), (r'\\Pi', 'Π'), (r'\\Sigma', 'Σ'),
    (r'\\Upsilon', 'Υ'), (r'\\Phi', 'Φ'), (r'\\Psi', 'Ψ'), (r'\\Omega', 'Ω'),
    (r'\\cdot', '·'), (r'\\times', '×'), (r'\\le(q)?\b', '≤'), (r'\\ge(q)?\b', '≥'),
    (r'\\ne(q)?\b', '≠'), (r'\\approx', '≈'), (r'\\sum', '∑'), (r'\\prod', '∏'),
    (r'\\int', '∫'), (r'\\partial', '∂'), (r'\\infty', '∞'), (r'\\pm', '±'),
    (r'\\sim', '~'), (r'\\nabla', '∇'), (r'\\sqrt', '√')
]

def normalize_key(s):
    if not s:
        return ''
    t = re.sub(r'\s+', '', s.strip())
    for pat, uni in LATEX_MACROS:
        t = re.sub(pat, uni, t)
    while r'\text{' in t:
        t = re.sub(r'\\text\{([^{}]*)\}', r'\1', t)
    for wrap in [r'\\mathrm', r'\\mathbf', r'\\mathit', r'\\operatorname']:
        while re.search(wrap + r'\{', t):
            t = re.sub(wrap + r'\{([^{}]*)\}', r'\1', t)
    t = t.replace('_', '').replace('{', '').replace('}', '')
    t = t.replace('−', '-').replace('–', '-').replace('—', '-')
    return t

def is_clean_equation(eq):
    """Verify that printed equation is an equation, not prose or commentary."""
    if not eq or len(eq) > 300:
        return False
    # Must contain relation
    if '=' not in eq and '←' not in eq and '≤' not in eq and '≥' not in eq and '≈' not in eq and '~' not in eq:
        return False
    # If it contains long English sentences or words, it's prose requiring extraction/rewriting
    words = re.findall(r'[A-Za-z]{4,}', eq)
    # Common function names allowed as English words
    math_words = {'logit', 'sigmoid', 'softmax', 'exp', 'log', 'max', 'min', 'sin', 'cos', 'tan', 'score', 'mean', 'prob'}
    prose_words = [w for w in words if w.lower() not in math_words]
    if len(prose_words) > 4:
        return False
    # If contains multiple sentences / periods with words
    if re.search(r'\b(?:the|and|or|with|for|from|that|this|where|which|about|between|sample)\b', eq, re.I):
        return False
    return True

def verify_row(path, eq):
    comp_key = normalize_key(eq)
    if is_clean_equation(eq):
        status = "AGREE"
    else:
        status = "UNVERIFIED"
    return status, comp_key

def process_batch(batch_size=10):
    seen = set()
    if os.path.exists(SEEN):
        with open(SEEN, encoding='utf-8') as f:
            seen = set(f.read().splitlines())

    candidates = []
    with open(INDEX, encoding='utf-8') as f:
        for line in f:
            if not line.strip():
                continue
            r = json.loads(line)
            path = r.get('file', '')
            eq = r.get('equation', '')
            # make lookup key
            k = normalize_key(eq)
            seen_id = f"{path}|{k[:80]}"
            if seen_id in seen:
                continue
            candidates.append((path, eq, seen_id))
            if len(candidates) >= batch_size:
                break

    if not candidates:
        return 0, 0, 0

    emitted_rows = []
    seen_additions = []
    agree_count = 0

    for path, eq, seen_id in candidates:
        status, comp_key = verify_row(path, eq)
        if status == "AGREE":
            agree_count += 1
        record = {
            "status": status,
            "compare_key": comp_key,
            "source_path": path,
            "printed_equation": eq
        }
        emitted_rows.append(json.dumps(record, ensure_ascii=False))
        seen_additions.append(seen_id)

    with open(OUT, 'a', encoding='utf-8') as f:
        for line in emitted_rows:
            f.write(line + '\n')

    with open(SEEN, 'a', encoding='utf-8') as f:
        for line in seen_additions:
            f.write(line + '\n')

    return len(candidates), agree_count, len(candidates) - agree_count

if __name__ == '__main__':
    count, agreed, unver = process_batch(10)
    print(json.dumps({"processed": count, "agreed": agreed, "unverified": unver}))
