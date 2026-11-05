"""Verify Week 9 DFS packets contain no Stage 0-blocked player in any lineup."""
import glob
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from scripts.ops.preflight_live_roster_injury_gate import assert_lineup_clean, load_config  # noqa: E402

cfg = load_config()
extra_backups = {"Justin Fields"}
ok = True
for f in sorted(glob.glob(str(ROOT / "data/dfs/week9_*packet*.json"))):
    d = json.load(open(f, encoding="utf-8"))
    for lu in d["lineups"]:
        names = [p.get("name") or p.get("player") for p in lu["players"]]
        try:
            assert_lineup_clean(names, cfg)
            assert not (set(names) & extra_backups), "backup QB in lineup"
        except Exception as e:  # noqa: BLE001
            ok = False
            print("FAIL", Path(f).name, lu["index"], e)
        slots = [p.get("slot") for p in lu["players"]]
        print(Path(f).name, lu["index"], "$%d" % lu["salary"], lu["proj_sum"],
              [(n, s) if s else n for n, s in zip(names, slots)])
print("STAGE0 VERIFY:", "PASS" if ok else "FAIL")
sys.exit(0 if ok else 1)
