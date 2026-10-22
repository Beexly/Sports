import json
from pathlib import Path
from collections import Counter

repo = Path(r"c:\Users\Garrett\Sports")
archive_dir = repo / "docs" / "data-sources" / "research" / "props-archive"
files = sorted(archive_dir.glob("*_20261018T09.json"))

first_file = files[0]
data = json.loads(first_file.read_text(encoding="utf-8"))
lines = data.get("lines", [])

print(f"File: {first_file.name}")
print(f"Total lines: {len(lines)}")
keys = set()
for l in lines:
    for k in l.keys():
        keys.add(k)
print(f"All keys across lines: {keys}")

# Check duplicates on (playerName, propMarket)
counts = Counter((l["playerName"], l["propMarket"]) for l in lines)
print(f"Unique (playerName, propMarket) pairs: {len(counts)}")
for pair, c in counts.most_common(10):
    print(f"  {pair}: {c} times")

# Compare the duplicates for Sam Darnold Total Passing Yards
darnold_lines = [l for l in lines if l["playerName"] == "Sam Darnold" and "Passing Yards (incl" in l["propMarket"]]
print(f"\nDarnold lines count: {len(darnold_lines)}")
for idx, dl in enumerate(darnold_lines):
    print(f"  [{idx}]: line={dl.get('line')}, openLine={dl.get('openLine')}, asOf={dl.get('asOf')}")
