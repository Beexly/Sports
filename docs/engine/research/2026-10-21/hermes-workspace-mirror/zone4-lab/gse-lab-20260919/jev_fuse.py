#!/usr/bin/env python3
"""JEV mill - route candidate batches through fusion panel + Jev guardrail.
Usage: python jev_fuse.py A-conformal-core B-online-aggregation   (batch names or 'all')
Writes: data/jev_fused_<batch>.txt, data/jev_audit.jsonl, data/jev_cost_log.jsonl,
        data/jev_panel_verdicts.json"""
import json, os, re, subprocess, sys, time, urllib.request, urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "data")
GATEWAY = "http://127.0.0.1:20128"
KEY = open(os.path.expanduser("~/.omniroute/chaos-launcher.key")).read().strip()
GUARD = os.path.expanduser("~") + os.sep + os.path.join("openrouter-setup", "scripts", "jev_guardrail.py")

sys.path.insert(0, HERE)
from jev_curate import C, BATCHES

JUDGE_PRICE = (0.15, 0.60)  # deepseek-v4.1-flash $/M in/out (live catalog 2026-09-19)
PANEL_EST = 0.006           # ESTIMATE: ~14 answering members, ~7 paid openrouter, ~2.5k in/0.8k out

CRITERIA = (
 "GSE judge: KEEP=method wire-ready now. MEASURE=promise but needs empirical test on NFL betting data "
 "(state what to test). IRRELEVANT=no GSE use. KILL-COUSIN=belongs to an already-killed family "
 "(Wasserstein-signal, intrinsic-dimension, DFA, Hawkes-tempo). "
 "Constraints: mu is market close; UQ=Mondrian bins {week1-4, QB-change, book-count, weather}; "
 "props use negative binomial (Poisson dead for TDs); NFL weeks are NON-exchangeable ordered rounds. "
 "OUTPUT FORMAT: one line per paper, exactly 'ARXIVID | VERDICT | <=12 word reason'. No other text, no invented numbers, "
 "use ONLY the IDs given."
)

def fusion(task):
    body = json.dumps({"model": "jev-classify-panel", "max_tokens": 4000,
                       "messages": [{"role": "user", "content": task}]}).encode()
    req = urllib.request.Request(GATEWAY + "/v1/chat/completions", data=body,
        headers={"Authorization": "Bearer " + KEY, "Content-Type": "application/json"})
    t0 = time.time()
    d = json.load(urllib.request.urlopen(req, timeout=280))
    msg = (d.get("choices") or [{}])[0].get("message") or {}
    c = msg.get("content")
    if isinstance(c, list): c = " ".join(p.get("text","") for p in c if isinstance(p, dict))
    return c or "", d.get("usage", {}), time.time() - t0

def guard(text):
    r = subprocess.run([sys.executable, GUARD, "-"], input=text.encode(),
                       capture_output=True, timeout=90)
    try:
        return json.loads(r.stdout.decode("utf-8", "ignore"))
    except Exception:
        return {"gate": {"pass": None, "reasons": ["parse-fail"]}, "raw": {}}

def extract_verdicts(text, ids):
    v = {}
    for line in text.splitlines():
        m = re.match(r"\s*([0-9]{4}\.[0-9]{4,5}|[a-z\-]+/[0-9]{7})\s*\|\s*(KEEP|MEASURE|IRRELEVANT|KILL-COUSIN)\b", line.strip(), re.I)
        if m and m.group(1) in ids:
            v[m.group(1)] = m.group(2).upper()
    return v

def run_batch(name):
    ids = BATCHES[name]
    pool = json.load(open(os.path.join(DATA, "jev_pool.json"), encoding="utf-8"))
    lines = [CRITERIA, "", "PAPERS:"]
    for aid in ids:
        e = pool.get(aid)
        if not e:
            print(f"  !! {aid} not in pool, skipping"); continue
        lines.append(f"{aid} | {e['title'][:130]} | {e['year']}")
    task = "\n".join(lines)
    text, usage, dt = fusion(task)
    open(os.path.join(DATA, f"jev_fused_{name}.txt"), "w", encoding="utf-8").write(text)
    g = guard(text)
    gate = g.get("gate", {})
    cls = g.get("classification", {}) or {}
    graw = (cls.get("raw", {}) or {}).get("answers", {}) or (g.get("raw", {}) or {}).get("answers", {}) or {}
    uns = cls.get("unsupported", graw.get("unsupported_number", {}).get("noul"))
    gnd = cls.get("groundedness", graw.get("groundedness", {}).get("choice"))
    gcost = ((g.get("raw", {}) or {}).get("usage", {}) or {}).get("cost")
    verdicts = extract_verdicts(text, set(ids))
    agree = sum(1 for a in ids if a in verdicts and C.get(a, ("", "", "", "", ""))[0] == verdicts[a])
    parsed = sum(1 for a in ids if a in verdicts)
    print(f"[{name}] fusion {dt:.0f}s | judge tok {usage.get('prompt_tokens')}/{usage.get('completion_tokens')} | "
          f"guardrail gate={gate.get('pass')} uns={uns} gnd={gnd} | panel parsed {parsed}/{len(ids)} agree {agree}")
    # audit log: one line per paper
    ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    with open(os.path.join(DATA, "jev_audit.jsonl"), "a", encoding="utf-8") as f:
        for aid in ids:
            mine = C.get(aid, ("IRRELEVANT",))[0]
            pv = verdicts.get(aid)
            decision = mine
            if gate.get("pass") is False:
                decision = f"HOLD-{mine}"
            f.write(json.dumps({"timestamp": ts, "arxiv_id": aid, "batch": name,
                "unsupported_probability": uns, "groundedness_score": gnd,
                "jev_verdict": pv, "decision": decision}) + "\n")
    pin = usage.get("prompt_tokens", 0); pout = usage.get("completion_tokens", 0)
    jcost = pin/1e6*JUDGE_PRICE[0] + pout/1e6*JUDGE_PRICE[1]
    gcost = gcost if gcost is not None else 0.0
    with open(os.path.join(DATA, "jev_cost_log.jsonl"), "a", encoding="utf-8") as f:
        f.write(json.dumps({"timestamp": ts, "batch": name, "fusion_seconds": round(dt,1),
            "judge_prompt_tokens": pin, "judge_completion_tokens": pout,
            "judge_cost_usd": round(jcost,6), "guardrail_cost_usd": gcost,
            "panel_cost_usd_est": PANEL_EST, "total_est_usd": round(jcost + gcost + PANEL_EST,6)}) + "\n")
    json.dump(verdicts, open(os.path.join(DATA, f"jev_panel_verdicts_{name}.json"), "w"), indent=1)
    return gate.get("pass"), uns, parsed, len(ids), agree

if __name__ == "__main__":
    args = sys.argv[1:] or ["all"]
    names = list(BATCHES) if args == ["all"] else args
    for n in names:
        run_batch(n)
