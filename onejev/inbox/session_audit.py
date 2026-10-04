# Session audit -- RE-VERIFY every load-bearing claim with a fresh tool call.
#
# The skill's rule: "Re-run the tool that produced the claim." Everything below
# is measured now, not carried forward from an earlier turn.

import json
import os
import subprocess
import sys

INBOX = r"C:\Users\Garrett\onejev\inbox"
Q = os.path.join(INBOX, "mind-queue")
HOME = r"C:\Users\Garrett"
PY = os.path.join(os.environ["LOCALAPPDATA"], "hermes", "hermes-agent", "venv",
                  "Scripts", "python.exe")
ok = []
bad = []
notes = []


def check(name, passed, detail=""):
    (ok if passed else bad).append((name, detail))
    print("%-6s %-44s %s" % ("PASS" if passed else "FAIL", name, detail[:70]))


def sh(cmd, cwd=HOME):
    r = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True, text=True,
                       errors="replace")
    return r.returncode, (r.stdout or "") + (r.stderr or "")


print("=" * 92)
print("1. GIT STATE")
print("=" * 92)
rc, o = sh("git rev-parse HEAD")
head = o.strip()
rc, o = sh("git rev-parse origin/Autonomous-Revenue-Engine")
remote = o.strip()
check("local == remote", head == remote, "%s / %s" % (head[:12], remote[:12]))
rc, o = sh('git status --porcelain onejev/inbox')
uncommitted = [l for l in o.splitlines() if l.strip()]
check("inbox tree clean", not uncommitted, "%d uncommitted" % len(uncommitted))
for l in uncommitted[:8]:
    print("        " + l)
rc, o = sh("git log --oneline -1")
print("        HEAD: " + o.strip())

print()
print("=" * 92)
print("2. THE USER'S OWN FILES ARE UNTOUCHED")
print("=" * 92)
for name, dl in [("eq_recover.py", "eq_recover (4).py"), ("corpus_gate.py", "corpus_gate.py"),
                 ("build_drain.py", "build_drain.py"), ("audit_drain.py", "audit_drain.py")]:
    a = os.path.join(INBOX, name)
    b = os.path.join(HOME, "Downloads", dl)
    same = False
    if os.path.exists(a) and os.path.exists(b):
        ta = open(a, "rb").read().replace(b"\r\n", b"\n")
        tb = open(b, "rb").read().replace(b"\r\n", b"\n")
        same = ta == tb
    check("%s matches Downloads copy" % name, same)

print()
print("=" * 92)
print("3. THE GATE SUITE (positive cases, from the USER's file, parsed not transcribed)")
print("=" * 92)
sys.path.insert(0, INBOX)
rc = subprocess.run([PY, os.path.join(INBOX, "verify_ineq_against_user_cases.py")],
                    capture_output=True, text=True, errors="replace", cwd=INBOX)
tail = (rc.stdout or "").strip().splitlines()[-1:] or [""]
check("user case suite identical", "IDENTICAL" in (rc.stdout or ""), tail[0][:60])
rc = subprocess.run([PY, os.path.join(INBOX, "eq_recover.py")],
                    capture_output=True, text=True, errors="replace", cwd=INBOX)
last = (rc.stdout or "").strip().splitlines()[-1:]
check("eq_recover.py own suite", last and last[0].strip() == "fails 0", last[0] if last else "")

print()
print("=" * 92)
print("4. GATE ALIGNMENT (the 357-row deletion class)")
print("=" * 92)
for w, e in [("build_drain.py", "enforce_audit_pass.py"), ("corpus_gate.py", "audit_drain.py")]:
    rc = subprocess.run([PY, os.path.join(INBOX, "check_gate_alignment.py"), w, e],
                        capture_output=True, text=True, errors="replace", cwd=INBOX)
    aligned = "ALIGNED" in (rc.stdout or "")
    check("%s vs %s" % (w, e), aligned,
          [l for l in (rc.stdout or "").splitlines() if "ALIGNED" in l or "MISMATCH" in l][:1])

print()
print("=" * 92)
print("5. CORPUS ARTIFACTS -- present, parseable, self-consistent")
print("=" * 92)
POOLS = {
    "equation-pool.jsonl": "equations",
    "measurements.jsonl": "measurements",
    "proxy-invisible.jsonl": "proxy-invisible",
    "labeled-sample.jsonl": "labelled draft",
    "agree-drain.jsonl": "AGREE drain",
    "git-tree-equations.jsonl": "git-tree",
    "arxiv-clean.jsonl": "arxiv",
    "markdown-clean-v3.jsonl": "markdown",
    "unverified-recoverable.jsonl": "salvaged",
    "corpus-intelligence-clean.jsonl": "corpus-intel",
    "downloads-research.jsonl": "downloads",
}
counts = {}
for f, desc in POOLS.items():
    p = os.path.join(Q, f)
    if not os.path.exists(p):
        check("pool %s" % f, False, "MISSING")
        continue
    n = bad_json = 0
    with open(p, encoding="utf-8", errors="replace") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            n += 1
            try:
                json.loads(line)
            except Exception:
                bad_json += 1
    counts[f] = n
    check("pool %-32s" % f, bad_json == 0, "%7d rows, %d unparseable" % (n, bad_json))

print()
print("=" * 92)
print("6. THE NEGATIVE CONTROL (does the gate reject known junk?)")
print("=" * 92)
rc = subprocess.run([PY, os.path.join(INBOX, "negative_control.py")],
                    capture_output=True, text=True, errors="replace", cwd=INBOX)
out = rc.stdout or ""
leaks = losses = None
for line in out.splitlines():
    if line.strip().startswith("LEAKS:"):
        leaks = line.strip()
    if line.strip().startswith("LOSSES:"):
        losses = line.strip()
print("        " + str(leaks))
print("        " + str(losses))
check("leak count recorded (may be nonzero)", leaks is not None)
notes.append("GATE LEAKS ARE KNOWN AND UNFIXED -- see negative_control.py")

print()
print("=" * 92)
print("7. QUARANTINE -- contaminated pools out of the queue, nothing deleted")
print("=" * 92)
qd = os.path.join(INBOX, "_quarantine")
if os.path.isdir(qd):
    files = os.listdir(qd)
    check("quarantine preserved", len(files) >= 4, "%d files" % len(files))
    for f in files:
        print("        " + f)
else:
    check("quarantine dir exists", False, "MISSING")
for f in ("gse_comp_intel.jsonl", "gse-competitive-intel.jsonl", "firecrawl_scores.jsonl",
          "academy_corpus.jsonl"):
    check("%s absent from queue" % f, not os.path.exists(os.path.join(Q, f)))

print()
print("=" * 92)
print("8. COVERAGE GAP (must stay empty; must not be reopened)")
print("=" * 92)
gap = os.path.join(INBOX, "coverage-gap.txt")
if os.path.exists(gap):
    n = len([l for l in open(gap, encoding="utf-8") if l.strip()])
    check("coverage-gap empty", n == 0, "%d lines" % n)
else:
    notes.append("coverage-gap.txt absent (join_coverage.py not re-run this session)")

print()
print("=" * 92)
print("9. PROTECTED PROCESSES (must be alive)")
print("=" * 92)
rc, o = sh('powershell -NoProfile -Command "(Get-Process llama-server -ErrorAction SilentlyContinue).Count"')
check("llama-server alive", o.strip() not in ("", "0"), "count=%s" % o.strip())
rc, o = sh('powershell -NoProfile -Command "(Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match \'mind_loop\' }).Count"')
check("mind_loop alive", o.strip() not in ("", "0"), "count=%s" % o.strip())
rc, o = sh('powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue).OwningProcess"')
check("port 8000 listening", bool(o.strip()), "pid=%s" % o.strip())

print()
print("=" * 92)
print("10. TURNER EXCLUSIONS (privileged material must stay out)")
print("=" * 92)
cat = os.path.join(INBOX, "categorize_unswept.py")
src = open(cat, encoding="utf-8", errors="replace").read() if os.path.exists(cat) else ""
check("Turner_Case_AI excluded in sweeper", "Turner_Case_AI" in src)
flt = os.path.join(INBOX, "filter_sweep_list.py")
src2 = open(flt, encoding="utf-8", errors="replace").read() if os.path.exists(flt) else ""
check("Documents/Codex excluded in filter", "Documents/Codex" in src2)
sw = os.path.join(INBOX, "_target", "sweep-filtered.txt")
if os.path.exists(sw):
    paths = [l.strip() for l in open(sw, encoding="utf-8", errors="replace")]
    leak = [p for p in paths if "Turner" in p]
    check("no Turner path in sweep list", not leak, "%d paths, %d Turner" % (len(paths), len(leak)))
else:
    check("sweep list exists", False, "MISSING")

print()
print("=" * 92)
print("SUMMARY")
print("=" * 92)
print("passed : %d" % len(ok))
print("failed : %d" % len(bad))
for n, d in bad:
    print("   FAIL %s  %s" % (n, d))
if notes:
    print("\nnotes:")
    for n in notes:
        print("   - " + n)