"""Functions from the Gemini payload plus PDF reads this session. Not a pick.

Platt form is the survey fallback, not Platt 1999. Conformal Gamma_0.05 is not a function and is not here.
Distillation, PPO, LoRA, DPO equations were read from arXiv PDFs this session; printed page numbers were not visible.
"""
import math

def platt(s, b, c):
    vals = []
    for x in (s, b, c):
        if x is None:
            return None
        v = float(x)
        if not math.isfinite(v):
            return None
        vals.append(v)
    z = -(vals[1] * vals[0] + vals[2])
    if z > 60:
        return 0.0
    if z < -60:
        return 1.0
    return 1.0 / (1.0 + math.exp(z))

def murphy_partition(rel, res, unc):
    vals = []
    for x in (rel, res, unc):
        if x is None or not math.isfinite(float(x)):
            return None
        vals.append(float(x))
    if vals[0] < 0 or vals[2] < 0:
        return None
    return vals[0] - vals[1] + vals[2]

def bradley_terry(pi, pj):
    if pi is None or pj is None:
        return None
    pi, pj = float(pi), float(pj)
    if pi <= 0 or pj <= 0:
        return None
    return pi / (pi + pj)

def prospect_value(x, alpha, beta, lam):
    if any(v is None for v in (x, alpha, beta, lam)):
        return None
    x, alpha, beta, lam = map(float, (x, alpha, beta, lam))
    if not (0 < alpha <= 1 and 0 < beta <= 1 and lam > 1):
        return None
    if x >= 0:
        return x ** alpha
    return -lam * ((-x) ** beta)

def soft_targets(logits, temperature):
    if not logits or temperature is None or float(temperature) <= 0:
        return None
    t = float(temperature)
    scaled = [float(v) / t for v in logits]
    m = max(scaled)
    exps = [math.exp(v - m) for v in scaled]
    total = sum(exps)
    if total == 0:
        return None
    return [e / total for e in exps]

def ppo_clip_term(ratio, advantage, epsilon):
    if any(v is None for v in (ratio, advantage, epsilon)):
        return None
    r, a, e = float(ratio), float(advantage), float(epsilon)
    if e <= 0 or e >= 1:
        return None
    clipped = min(max(r, 1.0 - e), 1.0 + e)
    return min(r * a, clipped * a)

def lora_forward(frozen, low_rank, scale=1.0):
    if frozen is None or low_rank is None or len(frozen) != len(low_rank):
        return None
    return [float(w) + float(scale) * float(d) for w, d in zip(frozen, low_rank)]

def dpo_term(log_pi_w, log_pi_l, log_ref_w, log_ref_l, beta):
    vals = [log_pi_w, log_pi_l, log_ref_w, log_ref_l, beta]
    if any(v is None for v in vals):
        return None
    beta = float(beta)
    if beta <= 0:
        return None
    margin = beta * ((float(log_pi_w) - float(log_pi_l)) - (float(log_ref_w) - float(log_ref_l)))
    if margin >= 0:
        return math.log1p(math.exp(-margin))
    return -margin + math.log1p(math.exp(margin))

def dsm_sqerr(eps, eps_hat):
    if not eps or not eps_hat or len(eps) != len(eps_hat):
        return None
    return sum((float(a) - float(b)) ** 2 for a, b in zip(eps, eps_hat)) / len(eps)
