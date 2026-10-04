# Phase 2 -- build inbox/night/train.jsonl from GATE-PASSED rows only.
#
# Entry rules, exactly as specified:
#   * every row must pass the live gate (eq_recover_ineq + residual guard)
#   * a span ending on = is NULL, not completed  -> rejected
#   * empty think tags do not enter
#   * a Flash row marked FAIL does not enter
#   * a Grok row marked REJECT does not enter
#
# Local model (OneJev-9B on port 8000) writes reasoning + content per row.
# Its output is MAPPED onto the gate-passed row: the model never chooses which
# rows enter, only how they are explained. That keeps the kill gate meaningful.
#
# BANS: never opens brain/mind.jsonl, never reads Turner quarantine, never
# prints an API key, never kills port 8000, no DeepSeek-V4-Flash.

import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime

INBOX = os.path.dirname(os.path.abspath(__file__))
NIGHT = os.path.join(INBOX, "night")
Q = os.path.join(INBOX, "mind-queue")
TQ = os.path.join(NIGHT, "trace-queue.jsonl")
TRAIN = os.path.join(NIGHT, "train.jsonl")
PORT = 8000
SEP = chr(92)

sys.path.insert(0, INBOX)
from eq_recover_ineq import recover          # noqa: E402

RESIDUAL = ("aria-live=", "priced=true", "CLAUDE_PROVIDER=", "double_build_risk=",
            "facebook.com/tr?", "adfox", "action=finddisplayads", "pixel.gif",
            "className=", "entityId=", "slate_id", "session_token=", "user_id=")
NAN = re.compile(r"=\s*(?:NaN|nan|Inf|inf|None|null)\b")
ENDS_ON_OP = re.compile(r"[=<>+\-*/^,;:\s]$")

# --- peer vetoes --------------------------------------------------------
FAIL_TOKENS = ("FAIL", "REJECT")


def peer_veto_text():
    """Read peer rows. Returns a set of vetoed source strings."""
    veto = set()
    for peer in ("flash", "grok"):
        d = os.path.join(NIGHT, peer)
        if not os.path.isdir(d):
            continue
        for fn in os.listdir(d):
            if not fn.endswith(".jsonl"):
                continue
            try:
                with open(os.path.join(d, fn), encoding="utf-8", errors="replace") as fh:
                    for line in fh:
                        line = line.strip()
                        if not line:
                            continue
                        try:
                            r = json.loads(line)
                        except Exception:
                            continue
                        v = str(r.get("verdict") or r.get("status") or r.get("label") or "")
                        if any(t in v.upper() for t in FAIL_TOKENS):
                            for k in ("input", "equation", "text", "claim"):
                                if r.get(k):
                                    veto.add(str(r[k])[:200])
            except OSError:
                continue
    return veto


def gate_pass(equation):
    """The live gate. Returns (ok, reason)."""
    if not equation:
        return False, "empty"
    e = equation.strip()
    if not e:
        return False, "blank"
    if any(t in e for t in RESIDUAL):
        return False, "residual"
    if NAN.search(e):
        return False, "nan_degenerate"
    got = recover(e)
    if got["status"] != "EQUATION":
        return False, got["reason"]
    span = got["equation"] or ""
    if span.rstrip().endswith("=") or ENDS_ON_OP.search(span.rstrip()):
        return False, "ends_on_operator_is_null"
    if not span.strip():
        return False, "empty_span"
    return True, span


def health():
    try:
        with urllib.request.urlopen("http://127.0.0.1:%d/health" % PORT, timeout=8) as r:
            return json.loads(r.read().decode("utf-8", "replace"))
    except Exception as e:
        return {"error": str(e)[:120]}


def ask_local(prompt, timeout=90):
    """Ask OneJev-9B for reasoning + content. Returns (reasoning, content)."""
    body = {
        "model": "OneJev-9B.IQ4_XS",
        "temperature": 0.2,
        "max_tokens": 700,
        "messages": [
            {"role": "system",
             "content": "You explain a printed equation from a research corpus. "
                        "Reply with EXACTLY two blocks:\n"
                        "<reasoning>...</reasoning>\n"
                        "<content>...</content>\n"
                        "reasoning: why this holds, its domain bounds, and any caveat.\n"
                        "content: one plain sentence stating the equation's meaning."},
            {"role": "user", "content": prompt},
        ],
    }
    req = urllib.request.Request(
        "http://127.0.0.1:%d/chat/completions" % PORT,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read().decode("utf-8", "replace"))
    except (urllib.error.URLError, urllib.error.HTTPError, OSError) as e:
        return {"error": str(e)[:140]}


THINK = re.compile(r"<(reasoning|think|thinking)>(.*?)</\1>", re.S | re.I)
CONTENT = re.compile(r"<content>(.*?)</content>", re.S | re.I)


def parse_tags(text):
    """Extract reasoning and content. Empty think tags do NOT enter."""
    if not text:
        return "", ""
    r = " ".join(m.group(2).strip() for m in THINK.finditer(text))
    c = " ".join(m.group(1).strip() for m in CONTENT.finditer(text))
    if not c:
        # tolerate a missing <content> wrapper: take the remainder after the tag
        tail = re.sub(r"<(reasoning|think|thinking)>.*?</\1>", "", text, flags=re.S | re.I)
        c = re.sub(r"</?(?:reasoning|think|thinking|content)>", "", tail).strip()
    return r.strip(), c.strip()


def main():
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else 60
    os.makedirs(NIGHT, exist_ok=True)
    print("health:", json.dumps(health()))

    veto = peer_veto_text()
    print("peer vetoed strings: %d" % len(veto))

    rows = [json.loads(l) for l in open(TQ, encoding="utf-8", errors="replace") if l.strip()]
    stats = {"seen": 0, "gate_fail": 0, "peer_veto": 0, "no_tags": 0,
             "empty_reasoning": 0, "empty_content": 0, "accepted": 0}
    reasons = {}

    out = open(TRAIN, "w", encoding="utf-8")
    for r in rows:
        if stats["accepted"] >= limit:
            break
        stats["seen"] += 1
        eq = r.get("equation", "")
        if eq[:200] in veto:
            stats["peer_veto"] += 1
            continue
        ok, why = gate_pass(eq)
        if not ok:
            stats["gate_fail"] += 1
            reasons[why] = reasons.get(why, 0) + 1
            continue

        prompt = "Printed equation from a research corpus:\n%s\n\n" \
                 "Explain it. Both blocks required." % eq[:600]
        resp = ask_local(prompt)
        text = ""
        try:
            text = resp["choices"][0]["message"]["content"]
        except Exception:
            stats["no_tags"] += 1
            continue
        reasoning, content = parse_tags(text)
        if not reasoning.strip():
            stats["empty_reasoning"] += 1
            continue
        if not content.strip():
            stats["empty_content"] += 1
            continue

        out.write(json.dumps({
            "equation": why,
            "source": r.get("source"),
            "kind": r.get("kind"),
            "reasoning": reasoning,
            "content": content,
            "generated_by": "OneJev-9B.IQ4_XS@%d" % PORT,
            "ts": datetime.now().isoformat(timespec="seconds"),
        }, ensure_ascii=False) + "\n")
        out.flush()
        stats["accepted"] += 1
        time.sleep(0.4)
    out.close()

    print(json.dumps(stats, indent=1))
    print("gate reject reasons:", json.dumps(reasons, indent=1))
    print("\nwrote %s" % TRAIN)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())