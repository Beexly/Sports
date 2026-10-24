import json, subprocess, sys, collections

REPO = "Beexly/Sports"
nums = json.loads(subprocess.run(
    ["gh","pr","list","--state","open","--json","number,isDraft,title,headRefName,createdAt",
     "--limit","500","--jq","."],
    cwd=r"C:\Users\Garrett\Sports-live", capture_output=True, text=True, check=True).stdout)

print(f"TOTAL_OPEN_PRS={len(nums)}", flush=True)

RED = {"FAILURE","ERROR","TIMED_OUT","CANCELLED","ACTION_REQUIRED","STARTUP_FAILURE","STALE"}
PEND = {"PENDING","QUEUED","IN_PROGRESS","WAITING","REQUESTED","EXPECTED"}
GREEN = {"SUCCESS","NEUTRAL","SKIPPED",""}

results = []
B = 20
for i in range(0, len(nums), B):
    chunk = nums[i:i+B]
    parts = []
    for j, p in enumerate(chunk):
        parts.append(
            f'p{j}: pullRequest(number:{p["number"]}){{'
            'isDraft statusCheckRollup{ contexts(first:100){ nodes{ '
            '__typename ... on CheckRun{ name conclusion status detailsUrl } '
            '... on StatusContext{ context state targetUrl } } } } }')
    q = 'query{ repository(owner:"' + REPO.split("/")[0] + '", name:"' + REPO.split("/")[1] + '"){ ' + " ".join(parts) + " } }"
    out = subprocess.run(["gh","api","graphql","-f","query="+q],
        cwd=r"C:\Users\Garrett\Sports-live", capture_output=True, text=True)
    if out.returncode != 0:
        print(f"BATCH_FAIL {i}: {out.stderr[:300]}", flush=True)
        for p in chunk:
            results.append({"number":p["number"],"isDraft":p["isDraft"],
                            "title":p["title"],"headRefName":p["headRefName"],
                            "createdAt":p["createdAt"],"error":"graphql"})
        continue
    data = (json.loads(out.stdout).get("data") or {}).get("repository")
    if data is None:
        errs = json.loads(out.stdout).get("errors")
        print(f"BATCH_ERR {i}: {str(errs)[:300]}", flush=True)
    for j, p in enumerate(chunk):
        node = (data or {}).get(f"p{j}") or {}
        roll = node.get("statusCheckRollup") or {}
        ctxs = [c for c in (roll.get("contexts",{}) or {}).get("nodes",[]) if c]
        rows = []
        for c in ctxs:
            if c.get("__typename") == "CheckRun":
                rows.append({"name": c.get("name"),
                             "state": (c.get("conclusion") or c.get("status") or "").upper(),
                             "url": c.get("detailsUrl")})
            else:
                rows.append({"name": c.get("context"),
                             "state": (c.get("state") or "").upper(),
                             "url": c.get("targetUrl")})
        results.append({"number":p["number"],"isDraft":p["isDraft"],"title":p["title"],
                        "headRefName":p["headRefName"],"createdAt":p["createdAt"],
                        "checks":rows,"error":None})
    print(f"batch {i//B+1}/{(len(nums)+B-1)//B} done", flush=True)

json.dump(results, open(r"C:\Users\Garrett\AppData\Local\hermes\scratch\pr_ci.json","w"), indent=1)
print("WROTE pr_ci.json", flush=True)
