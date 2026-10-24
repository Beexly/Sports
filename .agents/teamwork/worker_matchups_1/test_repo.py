"""Test REPO resolution and build_matchups."""
from pathlib import Path
REPO = Path(__file__).resolve().parent
while REPO.name != "Sports" and REPO.parent != REPO:
    REPO = REPO.parent
print("Resolved REPO:", REPO)
assert (REPO / "docs/data-sources/research/2026-10-13/ngs/raw_statboard_receiving.json").exists()
