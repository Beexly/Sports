import json, subprocess, sys

PRS = [937,922,909,892,891,889,888,887,884,883,879,876,918,917,916,915,914,913,911,907,906,903,902,898,886,885,882,881,878,875]
REPO = "C:/Users/Garrett/Sports-live"

def gh(args):
    r = subprocess.run(["gh"] + args, cwd=REPO, capture_output=True, text=True, shell=False)
    return r.stdout

rows = {}
for n in PRS:
    d = json.loads(gh(["pr","view",str(n),"--json","number,isDraft,title,statusCheckRollup"]))
    latest = {}
    for c in d.get("statusCheckRollup") or []:
        name = c.get("name") or c.get("context") or "(unnamed)"
        ts = c.get("completedAt") or c.get("startedAt") or ""
        st = c.get("conclusion") or c.get("state") or ""
        rq = c.get("isRequired")
        if name not in latest or ts > latest[name][0]:
            latest[name] = (ts, st, rq)
    BAD = ("FAILURE","ERROR","CANCELLED","TIMED_OUT")
    PEND = ("PENDING","IN_PROGRESS","QUEUED","WAITING","REQUESTED","")
    fails = sorted(k for k,(t,s,rq) in latest.items() if s in BAD)
    pends = sorted(k for k,(t,s,rq) in latest.items() if s in PEND)
    reqf  = sorted(k for k,(t,s,rq) in latest.items() if rq and s in BAD)
    reqp  = sorted(k for k,(t,s,rq) in latest.items() if rq and s in PEND)
    rows[n] = dict(num=n, draft=d["isDraft"], title=d["title"], fails=fails,
                   pends=pends, req_fail=reqf, req_pend=reqp)

green, pend, red = [], [], []
for n in PRS:
    o = rows[n]
    tag = "DRAFT" if o["draft"] else "READY"
    if o["fails"]:
        st = "RED"; red.append(n)
    elif o["pends"]:
        st = "PENDING"; pend.append(n)
    else:
        st = "GREEN"; green.append(n)
    print(f"#{o['num']} [{tag}] {st} | {o['title'][:58]}")
    if o["fails"]:
        print(f"     FAIL: {', '.join(o['fails'])}")
    if o["pends"]:
        print(f"     PEND: {', '.join(o['pends'])}")
    if o["req_fail"] or o["req_pend"]:
        print(f"     REQUIRED-status: fail={o['req_fail']} pend={o['req_pend']}")

print()
print("GREEN:", green)
print("PENDING:", pend)
print("RED:", red)
json.dump(rows, open(r"C:\Users\Garrett\AppData\Local\hermes\scratch\pr_ci_20260928.json","w"), indent=1)
