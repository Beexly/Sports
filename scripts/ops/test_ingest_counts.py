import json
import re
from pathlib import Path

ROOT = Path("C:/c/wt-week8-forensic")

# 1. Parse model registry
reg_path = ROOT / "packages/prediction-engine/src/model-registry.generated.ts"
text = reg_path.read_text(encoding="utf-8")
matches = list(re.finditer(r'\{id:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*lines:\s*(\d+),\s*tier:\s*"([^"]+)",\s*reason:\s*"([^"]+)",\s*exports:\s*(\[[^\]]*\])', text))
print("Model registry parsed count:", len(matches))

# 2. Parse MIND_CORPUS_3000.jsonl
corpus_path = ROOT / "packages/prediction-engine/data/MIND_CORPUS_3000.jsonl"
citable_items = []
with open(corpus_path, "r", encoding="utf-8") as f:
    for line in f:
        if line.strip():
            d = json.loads(line)
            if d.get("status") == "ACTIVE" and d.get("citable"):
                citable_items.append(d)
print("MIND Corpus active citable items:", len(citable_items))
