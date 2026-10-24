import os
from pathlib import Path

cards = ["NO@NYG-card.md", "TEN@IND-card.md"]
base_dir = Path(r"c:\Users\Garrett\Sports\docs\predictions\research\2026-10-18")

for c in cards:
    p = base_dir / c
    content = p.read_text(encoding="utf-8")
    lines = content.split("\n")
    print(f"\n==================== {c} ====================")
    for i, line in enumerate(lines[:85]):
        if any(k in line for k in ["Named thesis", "Cross-anchor", "Kalshi", "Book de-vig", "Prior", "Posterior", "Action Network", "injury_status_QB", "injury_status"]):
            print(f"  {line.strip()}")
