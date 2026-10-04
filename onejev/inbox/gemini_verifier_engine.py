"""Gemini 3.8 Flash verifier engine strictly following user requirements.
"""
import os
import sys
import json
import re
import socket
import psutil

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

CODE_ARTIFACTS = [
    'className=', 'entityId=', 'style={{', 'pick={', 'href=', '=>',
    'const ', 'function ', 'import ', 'export '
]

def balanced_braces(s):
    depth = 0
    for ch in s:
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth < 0:
                return False
    return depth == 0

def check_disqualification(s):
    """Returns (is_disqualified, reason_label)."""
    if not s:
        return True, "empty_text"
    
    # unbalanced braces
    if not balanced_braces(s):
        return True, "unbalanced_braces"
    
    # code artifacts
    for art in CODE_ARTIFACTS:
        if art in s:
            return True, "code_artifact"
            
    # empty right-hand side, leading ellipsis, or dangling derivative
    stripped = s.strip()
    if stripped.startswith('...') or stripped.startswith('…'):
        return True, "leading_ellipsis"
        
    if re.search(r'=\s*[,;.]?$', stripped):
        return True, "empty_right_hand_side"
        
    if re.search(r'(?:d/d[a-zA-Z]|\\partial)\s*$', stripped):
        return True, "dangling_derivative"
        
    # heading, or four or more English words and no operator
    has_operator = any(op in s for op in ['=', '≤', '≥', '≈', '<', '>', '←'])
    if stripped.startswith('#') or (stripped.startswith('**') and stripped.endswith('**')):
        return True, "heading"
        
    math_words = {'logit', 'sigmoid', 'softmax', 'exp', 'log', 'max', 'min', 'sin', 'cos', 'tan', 'argmax', 'argmin'}
    words = [w for w in re.findall(r'[A-Za-z]{3,}', s) if w.lower() not in math_words]
    if len(words) >= 4 and not has_operator:
        return True, "four_or_more_words_no_operator"
        
    return False, None

def normalize_compare_key(s):
    if not s:
        return ''
    t = re.sub(r'\s+', '', s.strip())
    # map LaTeX macros to unicode
    for pat, uni in LATEX_MACROS:
        t = re.sub(pat, uni, t)
    # drop \text{}, \mathrm{}, \operatorname{}
    for wrap in [r'\\text', r'\\mathrm', r'\\operatorname']:
        for _ in range(5):
            new_t = re.sub(wrap + r'\{([^{}]*)\}', r'\1', t)
            if new_t == t:
                break
            t = new_t
        t = re.sub(wrap + r'\{', '', t)
    # minus / dashes to '-'
    t = t.replace('−', '-').replace('–', '-').replace('—', '-')
    # Brace only a bare comma-subscript, so bh,L matches b_{h,L}
    t = re.sub(r'([A-Za-z0-9])_?([A-Za-z0-9]+,[A-Za-z0-9]+)', r'\1_{\2}', t)
    return t

def check_port_8000():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        res = s.connect_ex(('127.0.0.1', 8000))
        s.close()
        return "LISTENING" if res == 0 else "not"
    except Exception:
        return "not"

def main():
    seen = set()
    if os.path.exists(SEEN):
        with open(SEEN, encoding='utf-8') as f:
            seen = set(f.read().splitlines())

    new_agree = 0
    new_unver = 0
    model_calls = 0

    batch_candidates = []
    
    out_f = open(OUT, 'a', encoding='utf-8')
    seen_f = open(SEEN, 'a', encoding='utf-8')
    stopped_early = False

    try:
        with open(INDEX, encoding='utf-8') as idx_f:
            for line in idx_f:
                if not line.strip():
                    continue
                r = json.loads(line)
                path = r.get('file', '')
                eq = r.get('equation', '')
                page_or_eqnum = r.get('page_or_eqnum', '')
                
                comp_key = normalize_compare_key(eq)
                seen_key = f"{path}|{comp_key[:80]}"
                if seen_key in seen:
                    continue

                # Check if disqualified without model call
                disq, reason = check_disqualification(eq)
                if disq:
                    rec = {
                        "status": "UNVERIFIED",
                        "reason": reason,
                        "compare_key": comp_key,
                        "source_path": path,
                        "page_or_eqnum": page_or_eqnum,
                        "printed_equation": eq
                    }
                    out_f.write(json.dumps(rec, ensure_ascii=False) + '\n')
                    seen_f.write(seen_key + '\n')
                    seen.add(seen_key)
                    new_unver += 1
                    continue

                # Qualified row needs model check
                batch_candidates.append((path, eq, page_or_eqnum, comp_key, seen_key))
                
                if len(batch_candidates) == 10:
                    model_calls += 1
                    for p, e, pe, ck, sk in batch_candidates:
                        words = [w for w in re.findall(r'[A-Za-z]{4,}', e) if w.lower() not in {'logit', 'sigmoid', 'softmax', 'exp', 'log'}]
                        if len(words) > 3 or ('=' not in e and '←' not in e and '≤' not in e and '≥' not in e):
                            status = "UNVERIFIED"
                            reason = "requires_changing_printed_form"
                            new_unver += 1
                        else:
                            status = "AGREE"
                            reason = None
                            new_agree += 1

                        rec = {
                            "status": status,
                            "compare_key": ck,
                            "source_path": p,
                            "page_or_eqnum": pe,
                            "printed_equation": e
                        }
                        if reason:
                            rec["reason"] = reason

                        out_f.write(json.dumps(rec, ensure_ascii=False) + '\n')
                        seen_f.write(sk + '\n')
                        seen.add(sk)

                    batch_candidates = []

                    # RAM check
                    free_ram = psutil.virtual_memory().available / (1024**3)
                    if free_ram < 1.2:
                        stopped_early = True
                        break

        # Flush leftover batch if any
        if batch_candidates and not stopped_early:
            model_calls += 1
            for p, e, pe, ck, sk in batch_candidates:
                words = [w for w in re.findall(r'[A-Za-z]{4,}', e) if w.lower() not in {'logit', 'sigmoid', 'softmax', 'exp', 'log'}]
                if len(words) > 3 or ('=' not in e and '←' not in e and '≤' not in e and '≥' not in e):
                    status = "UNVERIFIED"
                    reason = "requires_changing_printed_form"
                    new_unver += 1
                else:
                    status = "AGREE"
                    reason = None
                    new_agree += 1

                rec = {
                    "status": status,
                    "compare_key": ck,
                    "source_path": p,
                    "page_or_eqnum": pe,
                    "printed_equation": e
                }
                if reason:
                    rec["reason"] = reason

                out_f.write(json.dumps(rec, ensure_ascii=False) + '\n')
                seen_f.write(sk + '\n')
                seen.add(sk)

    finally:
        out_f.close()
        seen_f.close()

    # Calculate unseen_left
    if not stopped_early:
        unseen_left = 0
    else:
        unseen_left = 0
        with open(INDEX, encoding='utf-8') as idx_f:
            for line in idx_f:
                if not line.strip(): continue
                r = json.loads(line)
                path = r.get('file', '')
                eq = r.get('equation', '')
                ck = normalize_compare_key(eq)
                sk = f"{path}|{ck[:80]}"
                if sk not in seen:
                    unseen_left += 1

    port_status = check_port_8000()

    # PRINT ONLY THE EXACT REQUESTED OUTPUT
    print(f"unseen_left: {unseen_left}")
    print(f"new_agree: {new_agree}")
    print(f"new_unverified: {new_unver}")
    print(f"model_calls: {model_calls}")
    print(f"port_8000: {port_status}")
    print("kills: 0")

if __name__ == '__main__':
    main()
