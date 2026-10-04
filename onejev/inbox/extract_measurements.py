# Extractor #2: MEASUREMENTS. The class every other extractor is blind to.
#
# WHY THIS EXISTS
# blind_content_audit.py measured 372 of 3,600 sampled rows (10.3%) as invisible
# to every proxy in this session -- no web/shout/kebab/codey/latex/symbolic match
# -- and 156 of those were MEASUREMENTS: effect sizes, calibration numbers,
# sample sizes, confidence intervals, p-values.
#
#   CelebA**: SA -0.917 +- 0.001 vs TNP-D -0.877 (p = 0.001)
#   n=6778  48.86% CI [47.67%, 50.05%]  ROI -6.53%
#   df = E[r/(1+fr)], d^2gr/df^2 = -E[r^2/(1+fr)^2] < 0 (Prop 2.2, eq. 2.11)
#
# These are exactly what an engine needs and every gate I wrote scores them as
# noise: no operator token, no LaTeX, no Greek. Worse, the filters I proposed
# this session would have DESTROYED them -- the guard that ate
# 'sum_{i=1}^{+\infty} Pr(X=i) <= c' takes this whole class with it.
#
# So this is EXTRACTIVE, not selective: it adds rows to a new pool and never
# removes anything from an existing one. Source rows are stored VERBATIM.

import json
import os
import re
from collections import Counter

INBOX = os.path.dirname(os.path.abspath(__file__))
Q = os.path.join(INBOX, "mind-queue")
OUT = os.path.join(Q, "measurements.jsonl")
SEP = chr(92)

POOLS = [
    "agree-drain.jsonl",
    "git-tree-equations.jsonl",
    "markdown-clean-v3.jsonl",
    "unverified-recoverable.jsonl",
    "corpus-intelligence-clean.jsonl",
    "corpus-intelligence.jsonl",
    "corpus-prose-mixed.jsonl",
    "markdown-ambiguous.jsonl",
    "markdown-clean.jsonl",
    "markdown-clean-final.jsonl",
    "wave-index.jsonl",
]

# --- the shapes ---------------------------------------------------------
# A metric name: Brier, AUC, MAE, LogLoss, ROI, R^2, accuracy, coverage...
METRIC = (r"(?:Brier|AUC|auROC|AUPRC|MAE|RMSE|Log\s*Loss|logloss|log\s*loss|"
          r"R\^?2|accuracy|precision|recall|F1|ROI|Sharpe|PSI|ECE|MCE|CRPS|"
          r"Log\s*Score|hit\s*rate|coverage|calibration|win\s*rate|profit|"
          r"return|drawdown|latency|throughput|cost|rate|ratio|score|error|"
          r"p[- ]?value|e[- ]?value|\brho\b|\br\^?2\b|\bSD\b|\bse\b|CI|"
          r"MAPE|RMSLE|NDCG|MAP\b|IoU|FID|pnl|PnL|yield|turnover|edge)")

# A measured value with a number and usually a unit/percent/CI/p/n
VALUE = re.compile(
    r"(?:"
    r"[+\-±−]?\d+(?:\.\d+)?\s*(?:%|percent|bps|basis points)"
    r"|[+\-±−]?\d+(?:\.\d+)?\s*±\s*[+\-±−]?\d+(?:\.\d+)?"
    r"|(?:CI|ci|95%|confidence interval)\s*[\[\(]\s*[+\-±−]?\d+(?:\.\d+)?%?\s*,?\s*[+\-±−]?\d+(?:\.\d+)?%?"
    r"|\bn\s*=\s*\d[\d,]*"
    r"|\bp\s*[=<>≤≥]\s*0?\.\d+"
    r"|[+\-±−]?\d+(?:\.\d+)?\s*(?:%\s*(?:vs\.?|and)\s*)?[+\-±−]?\d+(?:\.\d+)?\s*%"
    r"|\d+(?:\.\d+)?\s*%"
    r")", re.I)

# Explicit inference markers
INFER = re.compile(r"\b(p\s*[<=]\s*0?\.\d+|p\s*-\s*value|significant|confidence\s+interval|\bCI\b|"
                   r"\bn\s*=\s*\d|±|\bSE\b|standard error|\bSD\b|\bn\s*of\s*\d|"
                   r"baseline|compared to|vs\.?\b|outperform|underperform|\bdelta\b)", re.I)

# Words that mean this is a RESULT, not a definition or a config line
RESULTY = re.compile(
    r"\b(found|observed|reported|measured|achiev|achieve[sd]?|improved|degraded|"
    r"outperform|underperform|baseline|versus|vs\.?|compared|result|empirical|"
    r"backtest|walk[- ]forward|holdout|out[- ]of[- ]sample|OOS|season|n\s*=\s*\d|"
    r"folds?|trials?|replicates?|bootstrap|seed|quantile|percentile|median|mean)\b", re.I)

# Junk that must never be captured even if it has a number
JUNKY = re.compile(
    r"(https?://|www\.|\]\(|=>|\bconst \b|\bfunction\b|\bimport \b|os\.getenv|"
    r"process\.env|className=|style=\{\{|var\(--|npm |yarn |pip install|"
    r"^\s*[{}\[\],;]\s*$)", re.I)

MIN = 24
MAX = 400


def score(e):
    """How much this looks like a REPORTED RESULT rather than a definition."""
    if not e or len(e) < MIN or len(e) > MAX:
        return 0
    if JUNKY.search(e):
        return 0
    has_val = bool(VALUE.search(e))
    has_inf = bool(INFER.search(e))
    has_res = bool(RESULTY.search(e))
    has_met = bool(re.search(METRIC, e, re.I))
    if not has_val:
        return 0
    # a value alone is not enough; needs corroboration from >=1 other signal
    s = 2 * has_val + 2 * has_inf + 1 * has_res + 1 * has_met
    return s


def eq_of(r):
    for k in ("equation", "printed_equation", "norm_a"):
        v = r.get(k)
        if v:
            return str(v)
    return ""


def path_of(r):
    for k in ("source_path", "path", "file"):
        v = r.get(k)
        if v:
            return str(v)
    return ""


def main():
    kept = []
    seen = set()
    stats = Counter()
    by_pool = Counter()

    for pool in POOLS:
        path = os.path.join(Q, pool)
        if not os.path.exists(path):
            stats["missing:" + pool] += 1
            continue
        n_in = 0
        with open(path, encoding="utf-8", errors="replace") as fh:
            for line in fh:
                line = line.strip()
                if not line or line.startswith("corpus-roots:"):
                    continue
                try:
                    r = json.loads(line)
                except Exception:
                    continue
                e = eq_of(r)
                if not e:
                    continue
                n_in += 1
                s = score(e)
                if s < 4:
                    continue
                k = (path_of(r), e)
                if k in seen:
                    stats["dup"] += 1
                    continue
                seen.add(k)
                kept.append({
                    "equation": e,
                    "source": path_of(r),
                    "pool": pool,
                    "status": "MEASUREMENT",
                    "evidence_score": s,
                })
                by_pool[pool] += 1
        stats["in:" + pool] = n_in

    with open(OUT, "w", encoding="utf-8") as fh:
        for r in kept:
            fh.write(json.dumps(r, ensure_ascii=False) + "\n")

    print(json.dumps({
        "kept": len(kept),
        "out": OUT,
        "by_pool": dict(by_pool),
        "scanned": {k[3:]: v for k, v in stats.items() if k.startswith("in:")},
        "dups": stats["dup"],
    }, indent=1))

    print("\n--- 15 samples (verify by eye) ---")
    import random
    rng = random.Random(99)
    for r in rng.sample(kept, min(15, len(kept))):
        print("  [%2d] %s" % (r["evidence_score"], r["equation"][:112].replace("\n", " ")))


if __name__ == "__main__":
    main()