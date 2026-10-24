import os

def search_text(root_dir, targets):
    for root, dirs, files in os.walk(root_dir):
        if any(ignored in root for ignored in [".git", "node_modules", ".worktrees", ".next"]):
            continue
        for file in files:
            if file.endswith((".ts", ".js", ".py", ".mjs")):
                path = os.path.join(root, file)
                try:
                    with open(path, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()
                        for t in targets:
                            if t in content:
                                print(f"Found '{t}' in {path}")
                except Exception as e:
                    pass

print("Searching for computeRestDays...")
search_text("c:\\Users\\Garrett\\Sports", ["computeRestDays", "enrichGameContext", "restDaysHome", "restDaysAway"])
