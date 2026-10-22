import os

targets = ["restDaysHome", "restDaysAway", "computeRestDays"]
dirs_to_check = [
    r"c:\Users\Garrett\Sports\packages",
    r"c:\Users\Garrett\Sports\workers",
    r"c:\Users\Garrett\Sports\intelligence",
    r"c:\Users\Garrett\Sports\apps\web"
]

for d in dirs_to_check:
    for root, dirs, files in os.walk(d):
        if any(ig in root for ig in [".git", "node_modules", ".next", ".worktrees", "dist"]):
            continue
        for f in files:
            if f.endswith((".ts", ".js", ".py", ".mjs")):
                p = os.path.join(root, f)
                try:
                    with open(p, "r", encoding="utf-8", errors="ignore") as fp:
                        content = fp.read()
                        matches = [t for t in targets if t in content]
                        if matches:
                            print(f"{p}: matches {matches}")
                except Exception as e:
                    pass
