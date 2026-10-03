"""Stage-3 mint batch. Page-quoted identities only. None on bad input. No mind.jsonl."""
import math

def _finite(*xs):
    for x in xs:
        if isinstance(x, (list, tuple)):
            if not _finite(*x):
                return False
        else:
            try:
                if not math.isfinite(float(x)):
                    return False
            except (TypeError, ValueError):
                return False
    return True

def _weights(pi):
    if not pi or not _finite(*pi) or any(float(w) < 0 for w in pi):
        return False
    return abs(sum(float(w) for w in pi) - 1.0) <= 1e-9

def _entropy(p, base):
    h = 0.0
    for x in p:
        x = float(x)
        if x < 0 or x > 1:
            return None
        if x > 0:
            h -= x * math.log(x) / math.log(base)
    return h

def js_41(p, q, pi, base=2):
    if base not in (2, math.e) or not _weights(pi) or len(pi) != 2:
        return None
    if not _finite(*p, *q) or len(p) != len(q) or not p:
        return None
    m = [float(pi[0]) * float(a) + float(pi[1]) * float(b) for a, b in zip(p, q)]
    hp, hq, hm = _entropy(p, base), _entropy(q, base), _entropy(m, base)
    if None in (hp, hq, hm):
        return None
    return hm - float(pi[0]) * hp - float(pi[1]) * hq

def js_41_ln(p, q, pi):
    return js_41(p, q, pi, base=math.e)

def js_51(ps, pi, base=2):
    if not ps or len(ps) != len(pi) or len(ps) < 2 or not _weights(pi):
        return None
    n = len(ps[0])
    if any(len(p) != n or not _finite(*p) for p in ps):
        return None
    m = [0.0] * n
    for w, p in zip(pi, ps):
        for i, x in enumerate(p):
            m[i] += float(w) * float(x)
    hm = _entropy(m, base)
    if hm is None:
        return None
    acc = hm
    for w, p in zip(pi, ps):
        hp = _entropy(p, base)
        if hp is None:
            return None
        acc -= float(w) * hp
    return acc

def js_equal(p, q, base=2):
    return js_41(p, q, [0.5, 0.5], base=base)

def chen_h(c, alpha):
    if not _finite(c, alpha) or float(c) <= 0 or not (0 < float(alpha) < 1):
        return None
    a = abs(math.log(float(c)))
    return a * (1 + a ** (-float(alpha)))

def chen_kendall(theta, R, c, T):
    if not _finite(c, T) or float(c) <= 0 or float(T) < 0 or len(theta) != len(R) or len(theta) < 2:
        return None
    s = 0
    for i in range(len(theta)):
        for j in range(i + 1, len(theta)):
            s += int(theta[i] > theta[j] and R[i] > R[j])
            s += int(theta[i] < theta[j] and R[i] < R[j])
    return s + float(c) * float(T)

def divos_next_goal(l1, l2, T, t, side):
    if side not in ("home", "away") or not _finite(l1, l2, T, t):
        return None
    if float(l1) < 0 or float(l2) < 0 or float(t) > float(T):
        return None
    if float(t) == float(T):
        return 0.0
    lam = float(l1) + float(l2)
    if lam == 0:
        return 0.0
    num = float(l1) if side == "home" else float(l2)
    return (num / lam) * (1 - math.exp(-lam * (float(T) - float(t))))

def divos_odd_even(l1, l2):
    if not _finite(l1, l2) or float(l1) < 0 or float(l2) < 0:
        return None
    lam = float(l1) + float(l2)
    return math.exp(-lam) * math.cosh(lam), math.exp(-lam) * math.sinh(lam)

def aldous_sigma(x):
    if not _finite(x) or not (0 <= float(x) <= 1):
        return None
    return math.sin(math.pi * float(x)) / math.pi

def _erfinv(y):
    if y == 0:
        return 0.0
    lo, hi = -8.0, 8.0
    for _ in range(80):
        mid = 0.5 * (lo + hi)
        if math.erf(mid) < y:
            lo = mid
        else:
            hi = mid
    return 0.5 * (lo + hi)

def bass_sigma(x):
    if not _finite(x) or not (0 < float(x) < 1):
        return None
    z = math.sqrt(2) * _erfinv(2 * float(x) - 1)
    return math.exp(-0.5 * z * z) / math.sqrt(2 * math.pi)

def dpo_7(log_pi_w, log_pi_l, log_ref_w, log_ref_l, beta):
    if not _finite(log_pi_w, log_pi_l, log_ref_w, log_ref_l, beta) or float(beta) <= 0:
        return None
    z = float(beta) * ((float(log_pi_w) - float(log_ref_w)) - (float(log_pi_l) - float(log_ref_l)))
    return -math.log(1 / (1 + math.exp(-z)))

def ppo_clip_7(ratio, adv, eps):
    if not _finite(ratio, adv, eps) or float(eps) <= 0:
        return None
    r, a, e = float(ratio), float(adv), float(eps)
    clipped = min(max(r, 1 - e), 1 + e)
    return min(r * a, clipped * a)

def lora_3(W0, x, B, A):
    try:
        def mul(M, v):
            return [M[0][0] * v[0] + M[0][1] * v[1], M[1][0] * v[0] + M[1][1] * v[1]]
        h = [a + b for a, b in zip(mul(W0, x), mul(B, mul(A, x)))]
        return h if _finite(*h) else None
    except Exception:
        return None

def aci_2(alpha_t, gamma, alpha, err):
    if not _finite(alpha_t, gamma, alpha, err) or float(gamma) <= 0:
        return None
    return float(alpha_t) + float(gamma) * (float(alpha) - float(err))

_SRC = {
    "js_41": {"paper": "Lin 1991", "footer": 147, "equation_number": "4.1", "log_base": 2},
    "js_41_ln": {"paper": "Lin 1991", "footer": 147, "equation_number": "4.1", "log_base": "ln"},
    "js_51": {"paper": "Lin 1991", "footer": 149, "equation_number": "5.1", "log_base": 2},
    "js_equal": {"paper": "Lin 1991", "footer": 147, "equation_number": "4.1", "log_base": 2},
    "chen_h": {"paper": "arXiv:1710.06056", "footer": 8, "equation_number": "3.2", "log_base": None},
    "chen_kendall": {"paper": "arXiv:1710.06056", "footer": 2, "equation_number": "loss", "log_base": None},
    "divos_next_goal": {"paper": "arXiv:1811.03931", "footer": 20, "equation_number": "A1", "log_base": None},
    "divos_odd_even": {"paper": "arXiv:1811.03931", "footer": 20, "equation_number": "A1-table", "log_base": None},
    "bass_sigma": {"paper": "arXiv:2608.12291", "footer": 44, "equation_number": "sigma_B", "log_base": None},
    "aldous_sigma": {"paper": "arXiv:2608.12291", "footer": 44, "equation_number": "sigma_A", "log_base": None},
    "dpo_7": {"paper": "arXiv:2305.18290", "footer": None, "equation_number": "7", "log_base": None},
    "ppo_clip_7": {"paper": "arXiv:1707.06347", "footer": None, "equation_number": "7", "log_base": None},
    "lora_3": {"paper": "arXiv:2106.09685", "footer": None, "equation_number": "3", "log_base": None},
    "aci_2": {"paper": "arXiv:2106.00170", "footer": None, "equation_number": "2", "log_base": None},
}
_FNS = {k: globals()[k] for k in _SRC}

def get(id):
    return _FNS.get(id)

def ids():
    return sorted(_FNS)

def source(id):
    return _SRC.get(id)
