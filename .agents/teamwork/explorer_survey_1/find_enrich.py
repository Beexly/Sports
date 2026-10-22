import os

for root, dirs, files in os.walk(r"c:\Users\Garrett\Sports\packages\ingestion-pipeline"):
    for f in files:
        if f.endswith(".ts"):
            p = os.path.join(root, f)
            with open(p, "r", encoding="utf-8", errors="ignore") as fp:
                c = fp.read()
                if "enrichGameContext" in c or "restDays" in c:
                    print(f"ingestion-pipeline: {p}")

for root, dirs, files in os.walk(r"c:\Users\Garrett\Sports\workers\data-refresh"):
    for f in files:
        if f.endswith(".ts"):
            p = os.path.join(root, f)
            with open(p, "r", encoding="utf-8", errors="ignore") as fp:
                c = fp.read()
                if "enrichGameContext" in c or "restDays" in c:
                    print(f"data-refresh: {p}")
