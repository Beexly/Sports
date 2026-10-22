import subprocess, json, os

SPORTS = "C:/Users/Garrett/Sports"
KEEP = {
    "C:/Users/Garrett/Sports",                 # main checkout
    "C:/Users/Garrett/Sports-wt-intel",        # motif branch work
    "C:/Users/Garrett/Sports-wt-pick-gate",    # active gate branch
    "C:/Users/Garrett/Sports/.worktrees/calib-boundary",  # active PR branch
}

def run(args, cwd=None):
    return subprocess.run(args, cwd=cwd, capture_output=True, text=True)

wt_out = run(["git", "worktree", "list", "--porcelain"], SPORTS).stdout
blocks = [b for b in wt_out.strip().split("\n\n") if b.strip()]
results = []
for b in blocks:
    path = None
    head = None
    branch = None
    for line in b.splitlines():
        if line.startswith("worktree "):
            path = line[len("worktree "):].strip()
        elif line.startswith("HEAD "):
            head = line[len("HEAD "):].strip()
        elif line.startswith("branch "):
            branch = line[len("branch refs/heads/"):].strip()
    results.append({"path": path, "head": head, "branch": branch})

report = []
for w in results:
    path = w["path"]
    if not path or path in KEEP or path.startswith("C:/Users/Garrett/Sports/.worktrees/"):
        if path not in KEEP:
            report.append({"path": path, "action": "skip-inner", "branch": w["branch"]})
        else:
            report.append({"path": path, "action": "KEEP", "branch": w["branch"]})
        continue
    if not os.path.isdir(path):
        report.append({"path": path, "action": "already-gone"})
        continue
    # uncommitted changes?
    st = run(["git", "status", "--porcelain"], path).stdout.strip()
    if st:
        report.append({"path": path, "action": "SKIP-DIRTY", "branch": w["branch"], "changes": st.count("\n") + 1})
        continue
    # branch fully pushed? (no local commits ahead of upstream)
    if w["branch"]:
        ahead = run(["git", "rev-list", "--count", f"origin/{w['branch']}..{w['branch']}"], SPORTS)
        if ahead.returncode != 0 or ahead.stdout.strip() != "0":
            report.append({"path": path, "action": "SKIP-UNPUSHED", "branch": w["branch"],
                           "ahead": ahead.stdout.strip() if ahead.returncode == 0 else "no-upstream"})
            continue
    else:
        # detached HEAD: check head exists on origin/main or any remote branch
        contains = run(["git", "branch", "-r", "--contains", w["head"]], SPORTS).stdout.strip()
        if not contains:
            report.append({"path": path, "action": "SKIP-DETACHED-UNPUSHED", "head": w["head"][:9]})
            continue
    rm = run(["git", "worktree", "remove", path], SPORTS)
    report.append({"path": path, "action": "REMOVED" if rm.returncode == 0 else "REMOVE-FAILED",
                   "branch": w["branch"], "err": rm.stderr.strip()[:120] if rm.returncode else None})

json.dump(report, open(r"C:\Users\Garrett\AppData\Local\hermes\scratch\gse-drive-review\worktree-prune.json", "w"), indent=0)
for r in report:
    print(r["action"], r["path"], r.get("branch") or "", r.get("err") or "")
