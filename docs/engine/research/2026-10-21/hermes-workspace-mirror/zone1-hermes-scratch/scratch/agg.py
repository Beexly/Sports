import json, collections

R = json.load(open(r"C:\Users\Garrett\AppData\Local\hermes\scratch\pr_ci.json"))
RED = {"FAILURE","ERROR","TIMED_OUT","CANCELLED","ACTION_REQUIRED","STARTUP_FAILURE","STALE"}
PEND = {"PENDING","QUEUED","IN_PROGRESS","WAITING","REQUESTED","EXPECTED"}

green, red, pend, nochk, err = [], [], [], [], []
fail_names = collections.Counter()
pend_names = collections.Counter()

for p in R:
    if p.get("error"):
        err.append(p); continue
    cs = p.get("checks") or []
    if not cs:
        nochk.append(p); continue
    rs = [c for c in cs if c["state"] in RED]
    ps = [c for c in cs if c["state"] in PEND]
    for c in rs: fail_names[c["name"]] += 1
    for c in ps: pend_names[c["name"]] += 1
    if rs: p["_red"] = rs
    if ps: p["_pend"] = ps
    (red if rs else pend if ps else green).append(p)

print(f"TOTAL={len(R)}  GREEN={len(green)}  RED={len(red)}  PENDING={len(pend)}  NO_CHECKS={len(nochk)}  ERR={len(err)}")
print(f"  of which DRAFT: green={sum(1 for p in green if p['isDraft'])} red={sum(1 for p in red if p['isDraft'])} pend={sum(1 for p in pend if p['isDraft'])} nochk={sum(1 for p in nochk if p['isDraft'])}")
print(f"  READY (non-draft): green={sum(1 for p in green if not p['isDraft'])} red={sum(1 for p in red if not p['isDraft'])}")

print("\n=== TOP FAILING CHECK NAMES ===")
for n, c in fail_names.most_common(25): print(f"  {c:4d}  {n}")

print("\n=== TOP PENDING CHECK NAMES ===")
for n, c in pend_names.most_common(10): print(f"  {c:4d}  {n}")

print("\n=== RED PRs (number | draft | created | red check names) ===")
for p in sorted(red, key=lambda x: -x["number"]):
    names = ", ".join(sorted({c['name'] for c in p['_red']}))
    print(f"#{p['number']} | {'DRAFT' if p['isDraft'] else 'READY'} | {p['createdAt'][:10]} | {len(p['_red'])}/{len(p['checks'])} red | {names[:150]}")

print("\n=== PENDING PRs (number | draft | created) ===")
for p in sorted(pend, key=lambda x: -x["number"]):
    names = ", ".join(sorted({c['name'] for c in p['_pend']}))[:120]
    print(f"#{p['number']} | {'DRAFT' if p['isDraft'] else 'READY'} | {p['createdAt'][:10]} | {names}")

print("\n=== NO CHECKS AT ALL (number | draft | created | branch) ===")
for p in sorted(nochk, key=lambda x: -x["number"]):
    print(f"#{p['number']} | {'DRAFT' if p['isDraft'] else 'READY'} | {p['createdAt'][:10]} | {p['headRefName']}")

print("\n=== ERRORS ===", len(err))
