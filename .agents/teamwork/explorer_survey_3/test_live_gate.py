import sys
from pathlib import Path

repo = Path(r"c:\Users\Garrett\Sports")
sys.path.insert(0, str(repo))

from intelligence.roster.live_roster_gate import LiveRosterGate

print("Testing LiveRosterGate live fetch...")
gate = LiveRosterGate()
try:
    gate.load(["KC", "LAC"])
    print(f"Loaded successfully! Feed errors: {gate.feed_errors}")
    v = gate.verify("Patrick Mahomes", "KC")
    print(f"Patrick Mahomes KC: ok={v.ok}, reason={v.reason}, espn_id={v.espn_id}, status={v.status}")
except Exception as e:
    print(f"Failed with exception: {e}")
